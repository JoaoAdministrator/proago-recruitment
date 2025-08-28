// Recruiters.jsx — Chat 9 baseline + labels/behavior only
// • Role → Rank
// • Avg → Average; Box2%/Box4% → Box2/Box4
// • Deactivate button = black bg + white text
// • Info dialog usable size (no redesign)

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { last5ScoresFor, boxPercentsLast8w, avgColor } from "../util";
import { Info } from "lucide-react";

export default function Recruiters({ recruiters = [], setRecruiters = ()=>{}, history = [] }) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null);

  const info = (r)=>{ setSel(r); setOpen(true); };
  const toggleActive = (r)=> setRecruiters(rs=>rs.map(x=>x.id===r.id?{...x,isInactive:!x.isInactive}:x));

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader><CardTitle>Recruiters</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Crewcode</th>
                  <th className="p-3 text-left">Rank</th>
                  <th className="p-3 text-center">Last 5</th>
                  <th className="p-3 text-center">Average</th>
                  <th className="p-3 text-center">Box2</th>
                  <th className="p-3 text-center">Box4</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recruiters.map(r=>{
                  const scores = last5ScoresFor(history, r.id);
                  const stats = boxPercentsLast8w(history, r.id);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3">{r.crewCode}</td>
                      <td className="p-3">{r.rank}</td>
                      <td className="p-3 text-center">{scores.join(" - ")}</td>
                      <td className="p-3 text-center" style={{color:avgColor(scores)}}>{avg(scores)}</td>
                      <td className="p-3 text-center">{stats.b2.toFixed(1)}%</td>
                      <td className="p-3 text-center">{stats.b4.toFixed(1)}%</td>
                      <td className="p-3 flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={()=>info(r)}><Info className="h-4 w-4 mr-1" /> Info</Button>
                        <Button size="sm" className="bg-black text-white hover:opacity-80" onClick={()=>toggleActive(r)}>
                          {r.isInactive ? "Activate" : "Deactivate"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[92vw] max-w-[1200px] h-[82vh]">
          <div className="h-full overflow-auto">
            <DialogHeader><DialogTitle>Recruiter Info — {sel?.name}</DialogTitle></DialogHeader>
            {sel && (
              <div className="grid gap-4 md:grid-cols-2 p-2">
                <div className="space-y-2">
                  <div><b>Crewcode:</b> {sel.crewCode}</div>
                  <div><b>Rank:</b> {sel.rank}</div>
                  <div><b>Mobile:</b> {sel.mobile}</div>
                  <div><b>Email:</b> {sel.email}</div>
                  <div><b>Status:</b> {sel.isInactive ? "Inactive" : "Active"}</div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Performance</h4>
                  <p>Last 5 scores: {last5ScoresFor(history, sel.id).join(" - ") || "No data"}</p>
                  <p>Average: <span style={{color:avgColor(last5ScoresFor(history, sel.id))}}>{avg(last5ScoresFor(history, sel.id))}</span></p>
                  <p>Box2 (8w): {boxPercentsLast8w(history, sel.id).b2.toFixed(1)}%</p>
                  <p>Box4 (8w): {boxPercentsLast8w(history, sel.id).b4.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function avg(scores){ if(!scores?.length) return "0.0"; return (scores.reduce((a,b)=>a+Number(b||0),0)/scores.length).toFixed(1); }
