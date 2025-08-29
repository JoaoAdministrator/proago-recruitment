// pages/Recruiters.jsx
// Based on last night — updates: table (Name, Rank acr, Form, Average, Box 2, Box 4, Actions),
// "Form" oldest→left newest→right, sorting Rank→Average→Box2→Box4,
// Info dialog top row = Picture, Name, Crewcode, Rank, Mobile, Email, Source, Pay (month),
// All-Time Scores read from Planning history (newest first), Include Inactive toggle like Pay, trash removed.

import React, { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { toRankAcr, rankOrderValue, monthKey, monthLabel, toMoney } from "../util";

const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

const lastScores = (history, recruiterId, n = 5) => {
  const rows = history.filter(h => h.recruiterId === recruiterId).sort((a,b)=> (a.dateISO < b.dateISO ? 1 : -1));
  const vals = rows.map(r => Number(r.score || 0)).slice(0, n);
  return vals.slice().reverse(); // oldest left → newest right
};

const totalsFromHistory = (history, recruiterId) => {
  const rows = history.filter(h => h.recruiterId === recruiterId);
  let b2 = 0, b4 = 0, scores = [];
  rows.forEach(r => {
    const s = Number(r.score || 0);
    const b2n = Number(r.box2_noDisc || 0), b2d = Number(r.box2_disc || 0);
    const b4n = Number(r.box4_noDisc || 0), b4d = Number(r.box4_disc || 0);
    scores.push(s); b2 += b2n + b2d; b4 += b4n + b4d;
  });
  return { b2, b4, avg: avg(scores) };
};

const payForMonth = (history, recruiter, ym) => {
  const rows = history.filter(h => h.recruiterId === recruiter.id && monthKey(h.dateISO || h.date) === ym);
  const wages = rows.reduce((s, r) => s + Number(r._wages || 0), 0);
  const bonus = rows.reduce((s, r) => s + Number(r._bonus || 0), 0);
  return wages + bonus;
};

export default function Recruiters({ recruiters = [], setRecruiters, history = [], settings }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active"); // active | inactive | all
  const [viewId, setViewId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recruiters.filter(r => {
      const isInactive = !!r.isInactive;
      if (status === "active" && isInactive) return false;
      if (status === "inactive" && !isInactive) return false;
      if (!q) return true;
      return (
        (r.name || "").toLowerCase().includes(q) ||
        (r.crewcode || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q) ||
        (r.mobile || "").toLowerCase().includes(q)
      );
    });
  }, [recruiters, query, status]);

  const rows = useMemo(() => {
    return filtered
      .map(r => {
        const form5 = lastScores(history, r.id, 5);
        const totals = totalsFromHistory(history, r.id);
        return { r, form5, avg: totals.avg || 0, b2: totals.b2 || 0, b4: totals.b4 || 0, rankAcr: toRankAcr(r.role) };
      })
      .sort((A, B) => {
        const ra = rankOrderValue(A.r.role), rb = rankOrderValue(B.r.role);
        if (rb !== ra) return rb - ra;
        if (B.avg !== A.avg) return B.avg - A.avg;
        if (B.b2 !== A.b2) return B.b2 - A.b2;
        if (B.b4 !== A.b4) return B.b4 - A.b4;
        return (A.r.name || "").localeCompare(B.r.name || "");
      });
  }, [filtered, history]);

  const openInfo = (id) => setViewId(id);
  const closeInfo = () => setViewId(null);

  const colgroup = (
    <colgroup>
      <col style={{ width: "28%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "18%" }} />
      <col style={{ width: "14%" }} />
      <col style={{ width: "14%" }} />
      <col style={{ width: "14%" }} />
    </colgroup>
  );

  const activeYm = monthKey(new Date().toISOString());

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recruiters</CardTitle>
          <div className="flex items-center gap-2">
            <select className="h-10 border rounded-md px-2" value={status} onChange={(e)=>setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="all">All</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input placeholder="Search by name, crewcode, email, mobile…" className="w-full md:max-w-sm" value={query} onChange={(e)=>setQuery(e.target.value)}/>
        </CardContent>
      </Card>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm table-fixed">
          {colgroup}
          <thead className="bg-zinc-50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-center">Rank</th>
              <th className="p-3 text-center">Form</th>
              <th className="p-3 text-center">Average</th>
              <th className="p-3 text-center">Box 2</th>
              <th className="p-3 text-center">Box 4</th>
              <th className="p-3 text-right pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, form5, avg, b2, b4 }) => (
              <tr key={r.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-zinc-200 overflow-hidden shrink-0">
                      {r.photoUrl ? <img src={r.photoUrl} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="truncate">{r.name || "—"}</div>
                  </div>
                </td>
                <td className="p-3 text-center">{toRankAcr(r.role)}</td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1">
                    {form5.length ? form5.map((s,i)=>(<Badge key={i} className="min-w-[24px] justify-center">{Number.isFinite(s)?s:"—"}</Badge>)) : <span className="text-zinc-400">—</span>}
                  </div>
                </td>
                <td className="p-3 text-center">{avg ? avg.toFixed(2) : "—"}</td>
                <td className="p-3 text-center">{b2}</td>
                <td className="p-3 text-center">{b4}</td>
                <td className="p-3 pr-3 text-right">
                  <Button variant="outline" size="sm" onClick={()=>openInfo(r.id)}>Info</Button>
                </td>
              </tr>
            ))}
            {!rows.length && (<tr><td colSpan={7} className="p-4 text-center text-zinc-500">No recruiters.</td></tr>)}
          </tbody>
        </table>
      </div>

      {/* Info Dialog */}
      <Dialog open={!!viewId} onOpenChange={(open)=>!open && closeInfo()}>
        <DialogContent className="!w-[95vw] !max-w-[95vw] sm:!max-w-[1200px] h-[90vh] p-4">
          {(() => {
            const r = recruiters.find(x => x.id === viewId);
            if (!r) return null;
            const ym = activeYm;
            const payNow = toMoney(payForMonth(history, r, ym));
            const personShifts = history.filter(h => h.recruiterId === r.id).sort((a,b)=> (a.dateISO < b.dateISO ? 1 : -1)); // newest first
            return (
              <>
                <DialogHeader className="mb-2"><DialogTitle>Info</DialogTitle></DialogHeader>
                <div className="grid gap-4 h-[calc(90vh-6.5rem)] overflow-y-auto pr-1">
                  <div className="border rounded-xl p-3">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-zinc-200 overflow-hidden shrink-0">
                          {r.photoUrl ? <img src={r.photoUrl} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                        <div className="font-medium truncate">{r.name || "—"}</div>
                      </div>
                      <div className="truncate"><div className="text-xs text-zinc-500">Crewcode</div><div className="font-medium">{r.crewcode || "—"}</div></div>
                      <div className="truncate"><div className="text-xs text-zinc-500">Rank</div><div className="font-medium">{toRankAcr(r.role)}</div></div>
                      <div className="truncate"><div className="text-xs text-zinc-500">Mobile</div><div className="font-medium">{r.mobile || "—"}</div></div>
                      <div className="truncate"><div className="text-xs text-zinc-500">Email</div><div className="font-medium">{r.email || "—"}</div></div>
                      <div className="truncate"><div className="text-xs text-zinc-500">Source</div><div className="font-medium">{r.source || "—"}</div></div>
                      <div className="truncate"><div className="text-xs text-zinc-500">Pay</div><div className="font-medium">€{payNow}</div><div className="text-xs text-zinc-500">{monthLabel(ym)}</div></div>
                    </div>
                  </div>

                  <div className="border rounded-xl overflow-hidden">
                    <div className="px-3 py-2 bg-zinc-50 font-medium">All-Time Scores</div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-zinc-50">
                          <tr>
                            <th className="p-2 text-left">Date</th>
                            <th className="p-2 text-left">Zone</th>
                            <th className="p-2 text-left">Project</th>
                            <th className="p-2 text-left">Shift</th>
                            <th className="p-2 text-right">Hours</th>
                            <th className="p-2 text-right">Mult</th>
                            <th className="p-2 text-right">Score</th>
                            <th className="p-2 text-right">Box 2</th>
                            <th className="p-2 text-right">Box 2*</th>
                            <th className="p-2 text-right">Box 4</th>
                            <th className="p-2 text-right">Box 4*</th>
                          </tr>
                        </thead>
                        <tbody>
                          {personShifts.map((s, i) => (
                            <tr key={`${s.recruiterId}_${s._rowKey || i}`} className="border-t">
                              <td className="p-2">{(s.dateISO || "").slice(8,10)}/{(s.dateISO || "").slice(5,7)}/{(s.dateISO || "").slice(2,4)}</td>
                              <td className="p-2">{s.location || "—"}</td>
                              <td className="p-2">{s.project || "Hello Fresh"}</td>
                              <td className="p-2">{s.shiftType || "D2D"}</td>
                              <td className="p-2 text-right">{s.hours ?? "—"}</td>
                              <td className="p-2 text-right">{s.commissionMult ?? "—"}</td>
                              <td className="p-2 text-right">{s.score ?? "—"}</td>
                              <td className="p-2 text-right">{(Number(s.box2_noDisc) || 0)}</td>
                              <td className="p-2 text-right">{(Number(s.box2_disc) || 0)}</td>
                              <td className="p-2 text-right">{(Number(s.box4_noDisc) || 0)}</td>
                              <td className="p-2 text-right">{(Number(s.box4_disc) || 0)}</td>
                            </tr>
                          ))}
                          {!personShifts.length && (
                            <tr><td colSpan={11} className="p-3 text-center text-zinc-500">No shifts recorded.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end"><Button variant="outline" onClick={closeInfo}>Close</Button></div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
