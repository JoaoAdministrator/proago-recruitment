// pages/Inflow.jsx
// Based on last night's file — only incremental fixes: column alignment, centered Source/Calls,
// Calls moved next to Actions, arrow-only buttons, + Add black/white, Import (Indeed) wired,
// New Lead full width, Cancel left of Save, Mobile textbox, validation: Mobile OR Email.

import React, { useEffect, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { load, save, K, fmtISO, parseIndeedFiles } from "../util";
import { ChevronUp, ChevronDown, Upload } from "lucide-react";

const PREFIXES = ["+352","+351","+34","+44","+33","+49","+39","+40","+31","+32","+1"];

const emptyLead = () => ({
  id: "",
  name: "",
  email: "",
  mobile: "",
  mobilePrefix: "+352",
  source: "",
  appliedAtISO: fmtISO(new Date()),
  timeHHmm: "",
  calls: 0,
  notes: "",
  interviewAtISO: "",
  formationAtISO: "",
});

export default function Inflow() {
  const [leads, setLeads] = useState(() => load(K.leads, []));
  const [interview, setInterview] = useState(() => load("proago_interview_v1", []));
  const [formation, setFormation] = useState(() => load("proago_formation_v1", []));

  useEffect(() => save(K.leads, leads), [leads]);
  useEffect(() => save("proago_interview_v1", interview), [interview]);
  useEffect(() => save("proago_formation_v1", formation), [formation]);

  const fileRef = useRef(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState(emptyLead());

  async function handleImportIndeedJSON(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const fileContents = await Promise.all(
      files.map((f) => f.text().then((text) => ({ name: f.name, text })))
    );
    const { results, errors } = parseIndeedFiles(fileContents);
    const filtered = results.filter(l => (l.mobile && l.mobile.trim()) || (l.email && l.email.trim()));
    setLeads(prev => {
      const next = [...prev];
      for (const lead of filtered) {
        const exists = next.some(x =>
          (lead.email && x.email && x.email.toLowerCase() === lead.email.toLowerCase()) ||
          (lead.mobile && x.mobile && x.mobile.replace(/\s+/g,"") === lead.mobile.replace(/\s+/g,""))
        );
        if (!exists) next.push(lead);
      }
      return next;
    });
    if (errors.length) alert(`Imported ${filtered.length} lead(s). ${errors.length} failed (see console).`);
    event.target.value = "";
  }

  const colgroupLeads = (
    <colgroup>
      <col style={{ width: "20%" }} />
      <col style={{ width: "14%" }} />
      <col style={{ width: "16%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "6%" }} />
      <col style={{ width: "10%" }} />
    </colgroup>
  );
  const colgroupOther = (
    <colgroup>
      <col style={{ width: "20%" }} />
      <col style={{ width: "14%" }} />
      <col style={{ width: "16%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "12%" }} />
      <col style={{ width: "10%" }} />
      <col style={{ width: "16%" }} />
    </colgroup>
  );

  const moveLeadToInterview = (i) => {
    setLeads(prev => {
      const next = [...prev];
      const [row] = next.splice(i, 1);
      row.interviewAtISO = row.interviewAtISO || fmtISO(new Date());
      setInterview(itv => [row, ...itv]);
      return next;
    });
  };
  const moveInterviewToFormation = (i) => {
    setInterview(prev => {
      const next = [...prev];
      const [row] = next.splice(i, 1);
      row.formationAtISO = row.formationAtISO || fmtISO(new Date());
      setFormation(f => [row, ...f]);
      return next;
    });
  };
  const moveInterviewBackToLeads = (i) => {
    setInterview(prev => {
      const next = [...prev];
      const [row] = next.splice(i, 1);
      setLeads(l => [row, ...l]);
      return next;
    });
  };
  const moveFormationBackToInterview = (i) => {
    setFormation(prev => {
      const next = [...prev];
      const [row] = next.splice(i, 1);
      setInterview(l => [row, ...l]);
      return next;
    });
  };

  const openAdd = () => {
    setDraft({
      ...emptyLead(),
      id:
        (typeof crypto !== "undefined" && crypto.randomUUID)
          ? crypto.randomUUID()
          : `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      appliedAtISO: fmtISO(new Date()),
    });
    setAddOpen(true);
  };

  const saveLead = () => {
    const d = draft;
    if (!(d.mobile?.trim() || d.email?.trim())) {
      alert("Please provide at least Mobile or Email.");
      return;
    }
    const mergedMobile = (d.mobilePrefix || "") + (d.mobile || "");
    const row = { ...d, mobile: mergedMobile };
    setLeads(prev => [row, ...prev]);
    setAddOpen(false);
  };

  const CellCenter = ({ children }) => <td className="p-2 text-center align-middle">{children}</td>;

  const headerShared = (
    <>
      <th className="p-2 text-left">Name</th>
      <th className="p-2 text-left">Mobile</th>
      <th className="p-2 text-left">Email</th>
      <th className="p-2 text-center">Source</th>
      <th className="p-2 text-center">Date</th>
      <th className="p-2 text-center">Time</th>
    </>
  );

  return (
    <div className="grid gap-4">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div />
        <div className="flex gap-2">
          <Button onClick={openAdd} className="h-10" style={{ background: "black", color: "white" }}>
            + Add
          </Button>
          <Button className="h-10" style={{ background: "black", color: "white" }} onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Import
          </Button>
          <input ref={fileRef} type="file" accept="application/json" multiple className="hidden" onChange={handleImportIndeedJSON}/>
        </div>
      </div>

      {/* Leads */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            {colgroupLeads}
            <thead className="bg-zinc-50">
              <tr>
                {headerShared}
                <th className="p-2 text-center">Calls</th>
                <th className="p-2 text-right pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((r, i) => (
                <tr key={r.id || i} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.mobile}</td>
                  <td className="p-2">{r.email}</td>
                  <CellCenter>{r.source || "—"}</CellCenter>
                  <CellCenter>{r.appliedAtISO || "—"}</CellCenter>
                  <CellCenter>{r.timeHHmm || "—"}</CellCenter>
                  <CellCenter>{r.calls ?? 0}</CellCenter>
                  <td className="p-2 pr-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => moveLeadToInterview(i)} title="Move to Interview">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!leads.length && (
                <tr><td colSpan={8} className="p-4 text-center text-zinc-500">No leads yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Interview */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            {colgroupOther}
            <thead className="bg-zinc-50">
              <tr>{headerShared}<th className="p-2 text-right pr-3">Actions</th></tr>
            </thead>
            <tbody>
              {interview.map((r, i) => (
                <tr key={r.id || i} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.mobile}</td>
                  <td className="p-2">{r.email}</td>
                  <CellCenter>{r.source || "—"}</CellCenter>
                  <CellCenter>{r.interviewAtISO || "—"}</CellCenter>
                  <CellCenter>{r.timeHHmm || "—"}</CellCenter>
                  <td className="p-2 pr-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => moveInterviewBackToLeads(i)} title="Back to Leads">
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => moveInterviewToFormation(i)} title="Move to Formation">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!interview.length && (
                <tr><td colSpan={7} className="p-4 text-center text-zinc-500">No interviews yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Formation */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            {colgroupOther}
            <thead className="bg-zinc-50">
              <tr>{headerShared}<th className="p-2 text-right pr-3">Actions</th></tr>
            </thead>
            <tbody>
              {formation.map((r, i) => (
                <tr key={r.id || i} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2">{r.mobile}</td>
                  <td className="p-2">{r.email}</td>
                  <CellCenter>{r.source || "—"}</CellCenter>
                  <CellCenter>{r.formationAtISO || "—"}</CellCenter>
                  <CellCenter>{r.timeHHmm || "—"}</CellCenter>
                  <td className="p-2 pr-3 text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => moveFormationBackToInterview(i)} title="Back to Interview">
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      {/* "Hire" looks like move; still hires on click */}
                      <Button size="sm" style={{ background: "#fca11c", color: "black" }} onClick={() => alert(`${r.name || "Recruiter"} hired!`)}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!formation.length && (
                <tr><td colSpan={7} className="p-4 text-center text-zinc-500">No formations yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add Lead dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="!w-[95vw] !max-w-[95vw] sm:!max-w-[1000px] h-[85vh] p-4" style={{ width: "95vw", maxWidth: "1000px" }}>
          <DialogHeader><DialogTitle>+ Add Lead</DialogTitle></DialogHeader>
          <div className="grid gap-3 h-[calc(85vh-6.5rem)] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="grid gap-1"><Label>Name</Label><Input value={draft.name} onChange={(e)=>setDraft(d=>({...d,name:e.target.value}))}/></div>
              <div className="grid gap-1"><Label>Email</Label><Input value={draft.email} onChange={(e)=>setDraft(d=>({...d,email:e.target.value}))}/></div>
              <div className="grid gap-1">
                <Label>Mobile</Label>
                <div className="flex gap-2">
                  <select className="h-9 border rounded-md px-2" value={draft.mobilePrefix} onChange={(e)=>setDraft(d=>({...d,mobilePrefix:e.target.value}))}>
                    {PREFIXES.map((p)=>(<option key={p} value={p}>{p}</option>))}
                  </select>
                  <Input value={draft.mobile} onChange={(e)=>setDraft(d=>({...d,mobile:e.target.value}))}/>
                </div>
              </div>
              <div className="grid gap-1">
                <Label>Source</Label>
                <select className="h-9 border rounded-md px-2" value={draft.source} onChange={(e)=>setDraft(d=>({...d,source:e.target.value}))}>
                  <option value="">Select…</option><option>Indeed</option><option>Referral</option><option>Walk-in</option><option>Other</option>
                </select>
              </div>
              <div className="grid gap-1"><Label>Date</Label><Input type="date" value={draft.appliedAtISO} onChange={(e)=>setDraft(d=>({...d,appliedAtISO:e.target.value}))}/></div>
              <div className="grid gap-1"><Label>Time</Label><Input className="h-9 pr-1" placeholder="HH:MM" value={draft.timeHHmm} onChange={(e)=>setDraft(d=>({...d,timeHHmm:e.target.value}))}/></div>
              <div className="grid gap-1 md:col-span-3"><Label>Notes</Label><textarea className="border rounded-md w-full h-28 p-2" value={draft.notes} onChange={(e)=>setDraft(d=>({...d,notes:e.target.value}))}/></div>
            </div>
          </div>
          <DialogFooter className="mt-3">
            <div className="flex items-center justify-between w-full">
              <div><Button variant="outline" onClick={()=>setAddOpen(false)}>Cancel</Button></div>
              <div><Button style={{ background: "#d9010b", color: "white" }} onClick={saveLead}>Save</Button></div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
