// Recruiters.jsx — Visual Revert (keep functional fixes)
import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Info } from "lucide-react";
import { titleCaseFirstOnBlur, passthrough, MODAL_SIZES, avgColor, boxPercentsLast8w, last5ScoresFor } from "../util";

export default function Recruiters({ recruiters = [], setRecruiters = ()=>{}, history = [] }) {
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  const info = (r) => { setSelected(r); setOpen(true); };
  const toggleActive = (r) => setRecruiters(rs=>rs.map(x=>x.id===r.id?{...x,isInactive:!x.isInactive}:x));

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
                          {r.isInactive?"Activate":"Deactivate"}
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
        <DialogContent className={MODAL_SIZES.workbench.className}>
          <div className={MODAL_SIZES.workbench.contentClass}>
            <DialogHeader><DialogTitle>Recruiter Info — {selected?.name}</DialogTitle></DialogHeader>
            {selected && (
              <div className="grid gap-4 md:grid-cols-2 p-2">
                <div className="space-y-2">
                  <div><b>Crewcode:</b> {selected.crewCode}</div>
                  <div><b>Rank:</b> {selected.rank}</div>
                  <div><b>Mobile:</b> {selected.mobile}</div>
                  <div><b>Email:</b> {selected.email}</div>
                  <div><b>Status:</b> {selected.isInactive ? "Inactive" : "Active"}</div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Performance</h4>
                  <p>Last 5 scores: {last5ScoresFor(history, selected.id).join(" - ") || "No data"}</p>
                  <p>Average: <span style={{color:avgColor(last5ScoresFor(history, selected.id))}}>
                    {avg(last5ScoresFor(history, selected.id))}
                  </span></p>
                  <p>Box2 (8w): {boxPercentsLast8w(history, selected.id).b2.toFixed(1)}%</p>
                  <p>Box4 (8w): {boxPercentsLast8w(history, selected.id).b4.toFixed(1)}%</p>
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
