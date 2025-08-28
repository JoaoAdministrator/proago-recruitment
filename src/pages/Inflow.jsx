// Inflow.jsx — Visual Revert (keep functional fixes)
import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { passthrough, titleCaseFirstOnBlur, normalizeNumericOnBlur, PHONE_PREFIXES } from "../util";

export default function Inflow({ leads, setLeads }) {
  const [draft, setDraft] = useState({
    name: "", email: "", mobilePrefix: "+352", mobileNumber: "",
    source: "", dateISO: "", timeHHMM: "", calls: 0,
  });

  const addLead = () => {
    const now = new Date();
    const dateISO = draft.dateISO || toISO(now);
    const timeHHMM = draft.timeHHMM || toTime(now);
    const newLead = {
      id: crypto.randomUUID(),
      name: titleCaseFirstOnBlur(draft.name),
      email: draft.email.trim(),
      mobile: `${draft.mobilePrefix}${(draft.mobileNumber || "").replace(/\s+/g, "")}`,
      source: draft.source ? titleCaseFirstOnBlur(draft.source) : "Unknown",
      dateISO, timeHHMM, calls: clampCalls(draft.calls),
      interviewDateISO: "", interviewTimeHHMM: "",
      formationDateISO: "", formationTimeHHMM: "", notes: "",
    };
    setLeads(prev => [newLead, ...prev]);
    setDraft(d => ({ ...d, name:"",email:"",mobileNumber:"",source:"",dateISO:"",timeHHMM:"",calls:0 }));
  };

  const updateLead = (id, patch) => setLeads(prev => prev.map(l => l.id===id?{...l,...patch}:l));

  const columns = [
    { key: "name", label: "Name" },
    { key: "mobile", label: "Mobile" },
    { key: "email", label: "Email" },
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "source", label: "Source" },
    { key: "calls", label: "Calls" },
    { key: "actions", label: "Actions" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Leads</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <Input placeholder="Name" value={draft.name}
              onChange={passthrough(v=>setDraft(d=>({...d,name:v})))}
              onBlur={e=>setDraft(d=>({...d,name:titleCaseFirstOnBlur(e.target.value)}))} />
            <Input type="email" placeholder="Email" value={draft.email}
              onChange={e=>setDraft(d=>({...d,email:e.target.value}))}
              onBlur={e=>setDraft(d=>({...d,email:e.target.value.trim()}))} />
            <div className="flex gap-2">
              <select className="border rounded-md px-2 h-10" value={draft.mobilePrefix}
                onChange={passthrough(v=>setDraft(d=>({...d,mobilePrefix:v})))}>
                {PHONE_PREFIXES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <Input inputMode="tel" placeholder="Mobile Number" value={draft.mobileNumber}
                onChange={passthrough(v=>setDraft(d=>({...d,mobileNumber:v})))}
                onBlur={e=>setDraft(d=>({...d,mobileNumber:normalizeNumericOnBlur(e.target.value)}))} />
            </div>
            <Input type="date" value={draft.dateISO} onChange={passthrough(v=>setDraft(d=>({...d,dateISO:v})))} />
            <Input type="time" value={draft.timeHHMM} onChange={passthrough(v=>setDraft(d=>({...d,timeHHMM:v})))} />
            <Input placeholder="Source" value={draft.source}
              onChange={passthrough(v=>setDraft(d=>({...d,source:v})))}
              onBlur={e=>setDraft(d=>({...d,source:titleCaseFirstOnBlur(e.target.value)}))} />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Calls</label>
            <select className="border rounded-md h-10 px-2" value={String(draft.calls)}
              onChange={passthrough(v=>setDraft(d=>({...d,calls:clampCalls(Number(v))})))}>
              <option value="0">0</option><option value="1">1</option>
              <option value="2">2</option><option value="3">3</option>
            </select>
            <Button onClick={addLead} className="ml-auto bg-black text-white hover:opacity-90">Add Lead</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr>{columns.map(c=>(
                  <th key={c.key} className="px-3 py-2 text-xs font-semibold text-gray-700 text-center">{c.label}</th>
                ))}</tr>
              </thead>
              <tbody>
                {leads.map(lead=>(
                  <tr key={lead.id} className="border-t">
                    <td className="px-3 py-2 text-center">
                      <Input value={lead.name||""}
                        onChange={passthrough(v=>updateLead(lead.id,{name:v}))}
                        onBlur={e=>updateLead(lead.id,{name:titleCaseFirstOnBlur(e.target.value)})}/>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <select className="border rounded-md px-2 h-10" value={prefix(lead.mobile)}
                          onChange={passthrough(v=>updateLead(lead.id,{mobile:v+number(lead.mobile)}))}>
                          {PHONE_PREFIXES.map(p=><option key={p.value} value={p.value}>{p.value}</option>)}
                        </select>
                        <Input inputMode="tel" value={number(lead.mobile)}
                          onChange={passthrough(v=>updateLead(lead.id,{mobile:prefix(lead.mobile)+v}))}
                          onBlur={e=>updateLead(lead.id,{mobile:prefix(lead.mobile)+normalizeNumericOnBlur(e.target.value)})}/>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Input type="email" value={lead.email||""}
                        onChange={passthrough(v=>updateLead(lead.id,{email:v}))}
                        onBlur={e=>updateLead(lead.id,{email:e.target.value.trim()})}/>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Input type="date" value={lead.dateISO||""}
                        onChange={passthrough(v=>updateLead(lead.id,{dateISO:v}))}/>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Input type="time" value={lead.timeHHMM||""}
                        onChange={passthrough(v=>updateLead(lead.id,{timeHHMM:v}))}/>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Input value={lead.source||""}
                        onChange={passthrough(v=>updateLead(lead.id,{source:v}))}
                        onBlur={e=>updateLead(lead.id,{source:titleCaseFirstOnBlur(e.target.value)})}/>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <select className="border rounded-md h-10 px-2" value={String(lead.calls??0)}
                        onChange={passthrough(v=>updateLead(lead.id,{calls:clampCalls(Number(v))}))}>
                        <option value="0">0</option><option value="1">1</option>
                        <option value="2">2</option><option value="3">3</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center space-x-2">
                      <Button className="bg-white text-gray-800 border hover:bg-gray-50">Info</Button>
                      <Button className="border-0" style={{background:"#fca11c",color:"#000"}} onClick={()=>moveToInterview(lead,setLeads)}>Move</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Stage title="Interview" leads={leads} setLeads={setLeads} stage="interview"/>
      <Stage title="Formation" leads={leads} setLeads={setLeads} stage="formation"/>
    </div>
  );
}

function Stage({ title, leads, setLeads, stage }) {
  const rows = leads.filter(l=>l._stage===stage);
  const update = (id, patch)=> setLeads(prev=>prev.map(l=>l.id===id?{...l,...patch}:l));
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-center">Name</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-center">Mobile</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-center">Email</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-center">Date</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-center">Time</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-center">Notes</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-700 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length===0 ? (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={7}>No entries.</td></tr>
              ) : rows.map(lead=>(
                <tr key={lead.id} className="border-t">
                  <td className="px-3 py-2 text-center">{lead.name}</td>
                  <td className="px-3 py-2 text-center">{lead.mobile||"—"}</td>
                  <td className="px-3 py-2 text-center">
                    <Input type="email" value={lead.email||""}
                      onChange={passthrough(v=>update(lead.id,{email:v}))}
                      onBlur={e=>update(lead.id,{email:e.target.value.trim()})}/>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Input type="date" value={lead[`${stage}DateISO`]||""}
                      onChange={passthrough(v=>update(lead.id,{[`${stage}DateISO`]:v}))}/>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Input type="time" value={lead[`${stage}TimeHHMM`]||""}
                      onChange={passthrough(v=>update(lead.id,{[`${stage}TimeHHMM`]:v}))}/>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Input value={lead.notes||""}
                      onChange={passthrough(v=>update(lead.id,{notes:v}))}
                      onBlur={e=>update(lead.id,{notes:titleCaseFirstOnBlur(e.target.value)})}/>
                  </td>
                  <td className="px-3 py-2 text-center space-x-2">
                    <Button className="bg-white text-gray-800 border hover:bg-gray-50" onClick={()=>update(lead.id,{_stage:undefined})}>Back</Button>
                    <Button className="bg-black text-white hover:opacity-90">Done</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function moveToInterview(lead,setLeads){ setLeads(prev=>prev.map(l=>l.id===lead.id?{...l,_stage:"interview"}:l)); }
function toISO(d){ const z=new Date(d); z.setHours(0,0,0,0); return z.toISOString().slice(0,10); }
function toTime(d){ const z=new Date(d); const hh=String(z.getHours()).padStart(2,"0"); const mm=String(z.getMinutes()).padStart(2,"0"); return `${hh}:${mm}`; }
function clampCalls(n){ const x=Number(n||0); return x<0?0:x>3?3:x; }
function prefix(full){ if(!full) return "+352"; const m=full.match(/^\+?\d+/); return m?(m[0].startsWith("+")?m[0]:"+")+"" : "+352"; }
function number(full){ if(!full) return ""; return String(full).replace(/^\+?\d+/,""); }
