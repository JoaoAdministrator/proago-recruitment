// Recruiters.jsx — Rank wording, header alignment, black Deactivate, full-size Info, one-letter fix (v2025-08-28)

import React, { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { MODAL_SIZES, avgColor, last5ScoresFor, passthrough, titleCaseFirstOnBlur } from "../util";

export default function Recruiters({ recruiters, setRecruiters, history }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return recruiters;
    return recruiters.filter(r => [r.name, r.crewCode, r.rank || r.role].some(v => String(v||"").toLowerCase().includes(s)));
  }, [q, recruiters]);

  const scores5 = (id) => last5ScoresFor(history, id);
  const average = (arr) => arr.length ? (arr.reduce((a,b)=>a+b,0) / arr.length).toFixed(1) : "0.0";

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recruiters</CardTitle>
          <Input className="max-w-sm" placeholder="Search by Name / Crewcode / Rank" value={q} onChange={passthrough(setQ)} onBlur={(e)=> setQ(titleCaseFirstOnBlur(e.target.value))}/>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr className="text-center">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Crewcode</th>
                  <th className="px-3 py-2">Rank</th>
                  <th className="px-3 py-2">Last 5</th>
                  <th className="px-3 py-2">Average</th>
                  <th className="px-3 py-2">Box2</th>
                  <th className="px-3 py-2">Box4</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r => {
                  const s5 = scores5(r.id);
                  return (
                    <tr key={r.id} className="border-t text-center">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2">{r.crewCode}</td>
                      <td className="px-3 py-2">
                        <Input value={r.rank ?? r.role ?? ""} onChange={(e)=>{
                          const v = e.target.value;
                          setRecruiters(rs => rs.map(x => x.id===r.id ? { ...x, rank: v, role: v } : x)); // keep both in sync
                        }} onBlur={(e)=>{
                          const v = titleCaseFirstOnBlur(e.target.value);
                          setRecruiters(rs => rs.map(x => x.id===r.id ? { ...x, rank: v, role: v } : x));
                        }}/>
                      </td>
                      <td className="px-3 py-2">{s5.join("-") || "—"}</td>
                      <td className="px-3 py-2" style={{ color: avgColor(average(s5)) }}>{average(s5)}</td>
                      <td className="px-3 py-2">{/* Box2 (8w) placeholder */}</td>
                      <td className="px-3 py-2">{/* Box4 (8w) placeholder */}</td>
                      <td className="px-3 py-2 space-x-2">
                        <Button variant="secondary" onClick={()=> { setSel(r); setOpen(true); }}>Info</Button>
                        <Button className="bg-black text-white hover:opacity-80" onClick={()=>{
                          setRecruiters(rs => rs.map(x => x.id===r.id ? { ...x, isInactive: !x.isInactive } : x));
                        }}>{r.isInactive ? "Activate" : "Deactivate"}</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info — same large workbench size as Edit Day */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={MODAL_SIZES.workbench.className}>
          <div className={MODAL_SIZES.workbench.contentClass}>
            <DialogHeader className="sticky top-0 bg-white/80 backdrop-blur z-10 border-b">
              <DialogTitle>Recruiter Info — {sel?.name || ""}</DialogTitle>
            </DialogHeader>
            {!sel ? <div className="p-6 text-center text-zinc-500">No recruiter selected.</div> : (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border">
                  <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div><b>Crewcode:</b> {sel.crewCode}</div>
                    <div><b>Rank:</b> {sel.rank ?? sel.role ?? "Rookie"}</div>
                    <div><b>Mobile:</b> {sel.mobile || "—"}</div>
                    <div><b>Email:</b> {sel.email || "—"}</div>
                    <div><b>Source:</b> {sel.source || "—"}</div>
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-sm text-zinc-600">Last 5: {scores5(sel.id).join(" - ") || "No data"}</div>
                    <div className="text-sm">Average: {average(scores5(sel.id))}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
