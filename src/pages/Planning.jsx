// Planning.jsx — Full-size Edit Day, clean preview, typing-safe numeric fields (v2025-08-28)

import React, { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { clone, fmtISO, fmtUK, addDays, startOfWeekMon, weekNumberISO } from "../util";

const scoreColor = (v) => (v >= 3 ? "#10b981" : v >= 2 ? "#fbbf24" : "#ef4444");
const onlyNum = (s) => (s==="" ? "" : String(s).replace(/[^\d]/g,""));

export default function Planning({ recruiters, planning, setPlanning, history, setHistory }) {
  const [weekStart, setWeekStart] = useState(()=> fmtISO(startOfWeekMon(new Date())));
  const weekNum = weekNumberISO(new Date(weekStart));

  useEffect(() => {
    setPlanning(prev => {
      const next = clone(prev || {});
      if (!next[weekStart]) next[weekStart] = { days: {} };
      for (let i=0;i<7;i++){
        const d = fmtISO(addDays(new Date(weekStart), i));
        if (!next[weekStart].days[d]) next[weekStart].days[d] = { teams: [] };
      }
      return next;
    });
  }, [weekStart, setPlanning]);

  const dayData = (iso) => planning?.[weekStart]?.days?.[iso] ?? { teams: [] };

  // Edit Day
  const [editISO, setEditISO] = useState(null);
  const [draft, setDraft] = useState(null);

  const openEdit = (iso) => { setEditISO(iso); setDraft(clone(dayData(iso))); };
  const closeEdit = () => { setEditISO(null); setDraft(null); };

  const addTeam = () => setDraft(d => ({ ...d, teams: [...(d?.teams || []), { zone:"", project:"HF", shiftType:"D2D", rows: [] }] }));
  const delTeam = (ti) => setDraft(d => ({ ...d, teams: (d?.teams || []).filter((_,i)=> i!==ti) }));
  const setTeam = (ti, patch) => setDraft(d => { const t = clone(d.teams); t[ti] = { ...t[ti], ...patch }; return { ...d, teams: t }; });

  const usedIds = (d) => { const s = new Set(); (d?.teams||[]).forEach(t => (t.rows||[]).forEach(r => r.recruiterId && s.add(r.recruiterId))); return s; };
  const addRow = (ti) => setDraft(d => { const t = clone(d.teams); (t[ti].rows ||= []).push({ recruiterId:"", hours:"", commissionMult:"", score:"", box2_noDisc:"", box2_disc:"", box4_noDisc:"", box4_disc:"" }); return { ...d, teams: t }; });
  const delRow = (ti, ri) => setDraft(d => { const t = clone(d.teams); t[ti].rows = (t[ti].rows||[]).filter((_,i)=> i!==ri); return { ...d, teams: t }; });
  const setRow = (ti, ri, patch) => setDraft(d => { const t = clone(d.teams); t[ti].rows[ri] = { ...t[ti].rows[ri], ...patch }; return { ...d, teams: t }; });

  const saveDay = () => {
    const iso = editISO; if (!iso || !draft) return;
    setPlanning(prev => { const next = clone(prev || {}); next[weekStart].days[iso] = clone(draft); return next; });

    // history upsert (simple push; your Finances uses totals only)
    setHistory(prev => {
      let out = [...prev];
      (draft.teams||[]).forEach(t => {
        (t.rows||[]).forEach(r => {
          if (!r.recruiterId) return;
          out.push({
            dateISO: iso,
            recruiterId: r.recruiterId,
            recruiterName: recruiters.find(x=> x.id===r.recruiterId)?.name || "",
            location: t.zone || "",
            project: t.project || "HF",
            shiftType: t.shiftType || "D2D",
            hours: r.hours===""? undefined : Number(r.hours),
            commissionMult: r.commissionMult===""? undefined : Number(r.commissionMult),
            score: r.score===""? undefined : Number(r.score),
            box2_noDisc: r.box2_noDisc===""? undefined : Number(r.box2_noDisc),
            box2_disc:   r.box2_disc===""?   undefined : Number(r.box2_disc),
            box4_noDisc: r.box4_noDisc===""? undefined : Number(r.box4_noDisc),
            box4_disc:   r.box4_disc===""?   undefined : Number(r.box4_disc),
          });
        });
      });
      return out;
    });

    closeEdit();
  };

  const DayCard = ({ i }) => {
    const dISO = fmtISO(addDays(new Date(weekStart), i));
    const day = dayData(dISO);
    const weekday = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][i];

    return (
      <Card className="flex-1">
        {/* Gray bar with Date & Day */}
        <div className="px-4 py-2 bg-zinc-50 border-b">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{weekday}</div>
            <div className="text-sm text-zinc-600">{fmtUK(dISO)}</div>
          </div>
        </div>
        <CardContent className="grid gap-3 pt-3">
          {(day.teams || []).map((t, ti) => (
            <div key={ti} className="border rounded-lg p-2">
              <div className="text-center font-medium">{t.zone || "—"}</div> {/* zone centered, no project */}
              {(t.rows || []).length ? (
                <ul className="text-sm space-y-1 mt-1">
                  {t.rows.map((r, ri) => {
                    const rec = recruiters.find(x=> x.id===r.recruiterId);
                    const sc = r.score==="" || r.score==null ? "" : Number(r.score);
                    return (
                      <li key={ri} className="flex items-center justify-between">
                        <span>{rec?.name || ""}</span>
                        <span className="text-base font-medium" style={{ color: sc!=="" ? scoreColor(sc) : undefined }}>
                          {sc!=="" ? sc : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ))}

          <div className="flex justify-center pt-1">
            <Button variant="outline" size="sm" onClick={()=> openEdit(dISO)}>Edit Day</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid gap-4">
      {/* Week header (one line) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={()=> setWeekStart(fmtISO(addDays(new Date(weekStart), -7)))}><ChevronLeft className="h-4 w-4" /> Prev</Button>
          <Badge style={{ background:"#fca11c" }}>Week {weekNum}</Badge>
          <Button variant="outline" onClick={()=> setWeekStart(fmtISO(addDays(new Date(weekStart), +7)))}>Next <ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_,i)=> <DayCard key={i} i={i} />)}
      </div>

      {/* Full-size Edit Day */}
      <Dialog open={!!editISO} onOpenChange={(o)=> !o && closeEdit()}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-4">
          <DialogHeader><DialogTitle>Edit Day — {fmtUK(editISO || "")}</DialogTitle></DialogHeader>

          <div className="grid gap-3 h-[calc(90vh-5rem)] overflow-y-auto pr-1">
            {(draft?.teams || []).map((t, ti) => {
              const used = usedIds(draft||{});
              return (
                <div key={ti} className="border rounded-xl p-3">
                  {/* Team header */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <div className="grid gap-1"><Label>Zone</Label><Input className="h-9" value={t.zone} onChange={(e)=> setTeam(ti, { zone: e.target.value })}/></div>
                    <div className="grid gap-1"><Label>Project</Label>
                      <select className="h-9 border rounded-md px-2" value={t.project} onChange={(e)=> setTeam(ti, { project: e.target.value })}><option>HF</option></select>
                    </div>
                    <div className="grid gap-1"><Label>Shift Type</Label>
                      <select className="h-9 border rounded-md px-2" value={t.shiftType} onChange={(e)=> setTeam(ti, { shiftType: e.target.value })}>
                        <option value="D2D">Door-to-Door</option><option value="EVENT">Events</option>
                      </select>
                    </div>
                    <div className="flex items-end justify-end"><Button variant="destructive" size="sm" onClick={()=> delTeam(ti)}><X className="h-4 w-4 mr-1" /> Remove</Button></div>
                  </div>

                  {/* Rows — show ONLY after Add Recruiter clicked (i.e., when rows exist) */}
                  {!!(t.rows||[]).length && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-zinc-50">
                          <tr>
                            <th className="p-2 text-left">Recruiter</th>
                            <th className="p-2 text-right">Hours</th>
                            <th className="p-2 text-right">Mult</th>
                            <th className="p-2 text-right">Score</th>
                            <th className="p-2 text-right">B2 No</th>
                            <th className="p-2 text-right">B2 Disc</th>
                            <th className="p-2 text-right">B4 No</th>
                            <th className="p-2 text-right">B4 Disc</th>
                            <th className="p-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(t.rows||[]).map((r, ri) => (
                            <tr key={ri} className="border-t">
                              <td className="p-2">
                                <select className="h-9 border rounded-md px-2 min-w-52" value={r.recruiterId} onChange={(e)=> setRow(ti, ri, { recruiterId: e.target.value })}>
                                  <option value="">Select…</option>
                                  {recruiters.map(rec => {
                                    const taken = used.has(rec.id) && rec.id !== r.recruiterId;
                                    return <option key={rec.id} value={rec.id} disabled={taken}>{rec.name}{taken ? " (already assigned)" : ""}</option>;
                                  })}
                                </select>
                              </td>
                              <td className="p-2 text-right"><Input className="w-28 h-9 text-right" inputMode="numeric" value={r.hours ?? ""} onChange={(e)=> setRow(ti, ri, { hours: onlyNum(e.target.value) })}/></td>
                              <td className="p-2 text-right">
                                <select className="h-9 border rounded-md px-2" value={r.commissionMult ?? ""} onChange={(e)=> setRow(ti, ri, { commissionMult: onlyNum(e.target.value) })}>
                                  <option value="">—</option><option value="1">100%</option><option value="1.25">125%</option><option value="1.5">150%</option><option value="2">200%</option>
                                </select>
                              </td>
                              <td className="p-2 text-right"><Input className="w-28 h-9 text-right" inputMode="numeric" value={r.score ?? ""} onChange={(e)=> setRow(ti, ri, { score: onlyNum(e.target.value) })}/></td>
                              <td className="p-2 text-right"><Input className="w-28 h-9 text-right" inputMode="numeric" value={r.box2_noDisc ?? ""} onChange={(e)=> setRow(ti, ri, { box2_noDisc: onlyNum(e.target.value) })}/></td>
                              <td className="p-2 text-right"><Input className="w-28 h-9 text-right" inputMode="numeric" value={r.box2_disc ?? ""} onChange={(e)=> setRow(ti, ri, { box2_disc: onlyNum(e.target.value) })}/></td>
                              <td className="p-2 text-right"><Input className="w-28 h-9 text-right" inputMode="numeric" value={r.box4_noDisc ?? ""} onChange={(e)=> setRow(ti, ri, { box4_noDisc: onlyNum(e.target.value) })}/></td>
                              <td className="p-2 text-right"><Input className="w-28 h-9 text-right" inputMode="numeric" value={r.box4_disc ?? ""} onChange={(e)=> setRow(ti, ri, { box4_disc: onlyNum(e.target.value) })}/></td>
                              <td className="p-2 text-right"><Button variant="outline" size="sm" onClick={()=> delRow(ti, ri)}><X className="h-4 w-4" /></Button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button variant="outline" size="sm" onClick={()=> addRow(ti)}><Plus className="h-4 w-4 mr-1" /> Add Recruiter</Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3">
            <Button variant="outline" size="sm" onClick={addTeam}><Plus className="h-4 w-4 mr-1" /> Add Team</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeEdit}>Cancel</Button>
              <Button style={{ background:"#d9010b", color:"white" }} onClick={saveDay}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
