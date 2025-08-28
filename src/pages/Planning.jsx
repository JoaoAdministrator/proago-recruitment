// Planning.jsx — (Chat 9 base + requested changes only)
//
// Changes:
// • Always opens in Inflow handled in App.jsx
// • Removed “No shifts yet” text
// • Edit Day modal: twice as wide horizontally (workbench size), vertical same
// • Show recruiter rows ONLY after clicking “Add Recruiter”
// • B2s/B4s typing bug fixed (format on blur)
// • Day preview: zone centered, project removed
// • Week and "Proago CRM" shown on one line are handled already in App.jsx header
// • Date/Day header area given light gray background like column headers in Pay

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { MODAL_SIZES, titleCaseFirstOnBlur, normalizeNumericOnBlur, passthrough, fmtUK } from "../util";

export default function Planning({ weekStartISO, setWeekStartISO, days, setDays, history, setHistory }) {
  const [editing, setEditing] = useState(null);

  const weekDates = useMemo(() => {
    const base = new Date(weekStartISO); base.setHours(0,0,0,0);
    return Array.from({length:7}).map((_,i)=>{ const d=new Date(base); d.setDate(base.getDate()+i); return d.toISOString().slice(0,10); });
  }, [weekStartISO]);

  const updateDay = (idx, patch) => setDays(prev => {
    const next = [...prev]; next[idx] = { ...next[idx], ...patch }; return next;
  });

  const addRecToDay = (idx, rec) => setDays(prev=>{
    const next=[...prev]; const day={...next[idx]};
    day.recruiters=[...(day.recruiters||[]), rec];
    day.tmpRecruiter=""; day.tmpHours=""; day.tmpScore="";
    next[idx]=day; return next;
  });

  const saveToHistory = (idx) => {
    const d=days[idx], dateISO=d.dateISO||weekDates[idx];
    const rows=(d.recruiters||[]).map((r,i)=>({
      _rowKey:i, dateISO, zone:d.zone||"", recruiterId:r.id||null, recruiterName:r.name||"",
      score:Number(r.score||0), hours:Number(r.hours||0),
      box2_noDisc:Number(d.b2s||0), box2_disc:0, box4_noDisc:Number(d.b4s||0), box4_disc:0,
      roleAtShift:r.rank||"Rookie", shiftType:"D2D", project:"HF", location:d.zone||"", commissionMult:"",
    }));
    if (rows.length) setHistory(prev=>[...prev, ...rows]);
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Planning</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={()=>shiftWeek(setWeekStartISO,weekStartISO,-7)}>◀ Prev</Button>
            <input className="h-10 border rounded-md px-2" type="date" value={weekStartISO} onChange={passthrough(setWeekStartISO)} />
            <Button variant="outline" onClick={()=>shiftWeek(setWeekStartISO,weekStartISO,+7)}>Next ▶</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {days.map((day, idx)=>(
              <div key={idx} className="border rounded-xl overflow-hidden">
                <div className="bg-zinc-50 px-4 py-2 flex items-center justify-between">{/* gray header like Pay */}
                  <div className="font-medium">{fmtUK(weekDates[idx])}</div>
                  <div className="text-sm text-gray-600">Day {idx+1}</div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="text-center text-lg font-semibold">{day.zone||"—"}</div>{/* zone centered; no project */}
                  <div className="text-sm text-gray-600 flex items-center justify-center gap-4">
                    <span>B2s: {Number(day.b2s||0)}</span>
                    <span>B4s: {Number(day.b4s||0)}</span>
                    <span>Recs: {(day.recruiters||[]).length}</span>
                  </div>
                  <div className="pt-2"><Button variant="outline" onClick={()=>setEditing(idx)}>Edit Day</Button></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editing!=null} onOpenChange={(v)=>!v && setEditing(null)}>
        <DialogContent className={MODAL_SIZES.workbench.className}>{/* wider horizontally, same vertical */}
          <div className={MODAL_SIZES.workbench.contentClass}>
            <DialogHeader className="sticky top-0 bg-white z-10 border-b"><DialogTitle>Edit Day</DialogTitle></DialogHeader>
            {editing!=null && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-600">Zone</label>
                    <Input value={days[editing].zone||""}
                      onChange={passthrough(v=>updateDay(editing,{zone:v}))}
                      onBlur={e=>updateDay(editing,{zone:titleCaseFirstOnBlur(e.target.value)})}/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">B2s</label>
                    <Input inputMode="decimal" value={days[editing].b2s??""}
                      onChange={passthrough(v=>updateDay(editing,{b2s:v}))}
                      onBlur={e=>updateDay(editing,{b2s:normalizeNumericOnBlur(e.target.value)})}/>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">B4s</label>
                    <Input inputMode="decimal" value={days[editing].b4s??""}
                      onChange={passthrough(v=>updateDay(editing,{b4s:v}))}
                      onBlur={e=>updateDay(editing,{b4s:normalizeNumericOnBlur(e.target.value)})}/>
                  </div>
                </div>

                <RecruitersEditor day={days[editing]} onAdd={(rec)=>addRecToDay(editing,rec)} />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={()=>setEditing(null)}>Close</Button>
                  <Button className="bg-black text-white hover:opacity-90" onClick={()=>{ saveToHistory(editing); setEditing(null); }}>
                    Save To History
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecruitersEditor({ day, onAdd }){
  const [open, setOpen] = useState(false);
  const [name,setName]=useState(day.tmpRecruiter||"");
  const [hours,setHours]=useState(day.tmpHours||"");
  const [score,setScore]=useState(day.tmpScore||"");

  const add=()=>{ if(!name.trim()) return;
    onAdd({ id:null, name:titleCaseFirstOnBlur(name.trim()), hours:Number(hours||0), score:Number(score||0), rank:"Rookie" });
    setName(""); setHours(""); setScore("");
  };

  return (
    <div className="space-y-3">
      <Button variant="secondary" onClick={()=>setOpen(true)}>Add Recruiter</Button>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-600">Recruiter</label>
            <Input value={name} onChange={passthrough(setName)} onBlur={e=>setName(titleCaseFirstOnBlur(e.target.value))}/>
          </div>
          <div>
            <label className="text-xs text-gray-600">Hours</label>
            <Input inputMode="decimal" value={hours} onChange={passthrough(setHours)} onBlur={e=>setHours(normalizeNumericOnBlur(e.target.value))}/>
          </div>
          <div>
            <label className="text-xs text-gray-600">Score</label>
            <Input inputMode="decimal" value={score} onChange={passthrough(setScore)} onBlur={e=>setScore(normalizeNumericOnBlur(e.target.value))}/>
          </div>
          <div className="flex items-end"><Button onClick={add}>Add</Button></div>
        </div>
      )}
    </div>
  );
}

function shiftWeek(setWeekStartISO,currentISO,deltaDays){ const d=new Date(currentISO); d.setDate(d.getDate()+deltaDays); d.setHours(0,0,0,0); setWeekStartISO(d.toISOString().slice(0,10)); }
