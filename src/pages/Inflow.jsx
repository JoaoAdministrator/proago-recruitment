// Inflow.jsx — Proago CRM (Final Sync Build v2025-08-28c)
// - Leads: Date + Time columns; Source before Calls
// - Auto Date/Time on add (unless provided by import)
// - Mobile with prefix dropdown (+352, +33, ...), numeric clean on blur
// - Email typing bug fixed
// - Interview & Formation dates independent

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  passthrough,
  titleCaseFirstOnBlur,
  normalizeNumericOnBlur,
  emailOnChange,
  PHONE_PREFIXES,
  fmtUK,
} from "../util";

export default function Inflow({ leads, setLeads }) {
  // Draft lead form
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    mobilePrefix: "+352",
    mobileNumber: "",
    source: "",
    // Optional: allow manual set (e.g., when import provides)
    dateISO: "",  // YYYY-MM-DD
    timeHHMM: "", // HH:MM
    calls: 0,
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
      dateISO,          // Lead date (application/entry)
      timeHHMM,         // Lead time (application/entry)
      calls: clampCalls(draft.calls),
      // Independent scheduling fields:
      interviewDateISO: "",
      interviewTimeHHMM: "",
      formationDateISO: "",
      formationTimeHHMM: "",
      notes: "",
    };

    setLeads(prev => [newLead, ...prev]);
    setDraft({
      name: "",
      email: "",
      mobilePrefix: draft.mobilePrefix,
      mobileNumber: "",
      source: "",
      dateISO: "",
      timeHHMM: "",
      calls: 0,
    });
  };

  const updateLead = (id, patch) => {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  };

  const columns = useMemo(() => ([
    { key: "name", label: "Name" },
    { key: "mobile", label: "Mobile" },
    { key: "email", label: "Email" },
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "source", label: "Source" },
    { key: "calls", label: "Calls" },
    { key: "actions", label: "Actions" },
  ]), []);

  return (
    <div className="space-y-6">
      {/* Add Lead */}
      <Card>
        <CardHeader><CardTitle>Leads</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            {/* Name */}
            <Input
              placeholder="Name"
              value={draft.name}
              onChange={passthrough((v) => setDraft(d => ({ ...d, name: v })))}
              onBlur={(e) => setDraft(d => ({ ...d, name: titleCaseFirstOnBlur(e.target.value) }))}
            />

            {/* Email */}
            <Input
              type="email"
              placeholder="Email"
              value={draft.email}
              onChange={(e)=> setDraft(d => ({...d, email: e.target.value}))} // no transform while typing
              onBlur={(e)=> setDraft(d => ({...d, email: e.target.value.trim()}))}
            />

            {/* Mobile: prefix + number */}
            <div className="flex gap-2">
              <select
                className="border rounded-md px-2 h-10"
                value={draft.mobilePrefix}
                onChange={passthrough((v)=> setDraft(d => ({...d, mobilePrefix: v})))}
              >
                {PHONE_PREFIXES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <Input
                inputMode="tel"
                placeholder="Mobile Number"
                value={draft.mobileNumber}
                onChange={passthrough((v)=> setDraft(d => ({...d, mobileNumber: v})))}
                onBlur={(e)=> setDraft(d => ({...d, mobileNumber: normalizeNumericOnBlur(e.target.value)}))}
              />
            </div>

            {/* Date & Time */}
            <Input
              type="date"
              value={draft.dateISO}
              onChange={passthrough((v)=> setDraft(d => ({...d, dateISO: v})))}
            />
            <Input
              type="time"
              value={draft.timeHHMM}
              onChange={passthrough((v)=> setDraft(d => ({...d, timeHHMM: v})))}
            />

            {/* Source */}
            <Input
              placeholder="Source"
              value={draft.source}
              onChange={passthrough((v)=> setDraft(d => ({...d, source: v})))}
              onBlur={(e)=> setDraft(d => ({...d, source: titleCaseFirstOnBlur(e.target.value)}))}
            />
          </div>

          {/* Calls & Add */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Calls</label>
            <select
              className="border rounded-md h-10 px-2"
              value={String(draft.calls)}
              onChange={passthrough((v)=> setDraft(d => ({...d, calls: clampCalls(Number(v))})))}
            >
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>

            <Button onClick={addLead} className="ml-auto bg-black text-white hover:opacity-90">
              Add Lead
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  {columns.map(c => (
                    <th key={c.key} className="px-3 py-2 text-xs font-semibold text-gray-600 text-center">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id} className="border-t">
                    {/* Name */}
                    <td className="px-3 py-2 text-center">
                      <Input
                        value={lead.name || ""}
                        onChange={passthrough((v)=> updateLead(lead.id, { name: v }))}
                        onBlur={(e)=> updateLead(lead.id, { name: titleCaseFirstOnBlur(e.target.value) })}
                      />
                    </td>

                    {/* Mobile */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-2 justify-center">
                        <select
                          className="border rounded-md px-2 h-10"
                          value={extractPrefix(lead.mobile)}
                          onChange={passthrough((v)=> updateLead(lead.id, { mobile: v + extractNumber(lead.mobile) }))}
                        >
                          {PHONE_PREFIXES.map(p => (
                            <option key={p.value} value={p.value}>{p.value}</option>
                          ))}
                        </select>
                        <Input
                          inputMode="tel"
                          value={extractNumber(lead.mobile)}
                          onChange={passthrough((v)=> updateLead(lead.id, { mobile: extractPrefix(lead.mobile) + v }))}
                          onBlur={(e)=> updateLead(lead.id, { mobile: extractPrefix(lead.mobile) + normalizeNumericOnBlur(e.target.value) })}
                        />
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-3 py-2 text-center">
                      <Input
                        type="email"
                        value={lead.email || ""}
                        onChange={passthrough((v)=> updateLead(lead.id, { email: v }))}
                        onBlur={(e)=> updateLead(lead.id, { email: e.target.value.trim() })}
                      />
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2 text-center">
                      <Input
                        type="date"
                        value={lead.dateISO || ""}
                        onChange={passthrough((v)=> updateLead(lead.id, { dateISO: v }))}
                      />
                    </td>

                    {/* Time */}
                    <td className="px-3 py-2 text-center">
                      <Input
                        type="time"
                        value={lead.timeHHMM || ""}
                        onChange={passthrough((v)=> updateLead(lead.id, { timeHHMM: v }))}
                      />
                    </td>

                    {/* Source */}
                    <td className="px-3 py-2 text-center">
                      <Input
                        value={lead.source || ""}
                        onChange={passthrough((v)=> updateLead(lead.id, { source: v }))}
                        onBlur={(e)=> updateLead(lead.id, { source: titleCaseFirstOnBlur(e.target.value) })}
                      />
                    </td>

                    {/* Calls */}
                    <td className="px-3 py-2 text-center">
                      <select
                        className="border rounded-md h-10 px-2"
                        value={String(lead.calls ?? 0)}
                        onChange={passthrough((v)=> updateLead(lead.id, { calls: clampCalls(Number(v)) }))}
                      >
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 text-center space-x-2">
                      <Button
                        className="bg-white text-gray-800 border hover:bg-gray-50"
                        onClick={() => alert(JSON.stringify(lead, null, 2))}
                      >
                        Info
                      </Button>
                      <Button
                        className="border-0"
                        style={{ background: "#fca11c", color: "#000" }}
                        onClick={() => moveToInterview(lead, setLeads)}
                      >
                        Move
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Interview Section */}
      <StageSection
        title="Interview"
        leads={leads}
        setLeads={setLeads}
        stageKeyPrefix="interview"
      />

      {/* Formation Section */}
      <StageSection
        title="Formation"
        leads={leads}
        setLeads={setLeads}
        stageKeyPrefix="formation"
      />
    </div>
  );
}

/* -------------------- Stage (Interview / Formation) -------------------- */

function StageSection({ title, leads, setLeads, stageKeyPrefix }) {
  const stageLeads = leads.filter(l => l._stage === stageKeyPrefix);

  const update = (id, patch) => {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));
  };

  const backToLeads = (id) => {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, _stage: undefined } : l)));
  };

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center">Name</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center">Mobile</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center">Email</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center">Date</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center">Time</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center">Notes</th>
                <th className="px-3 py-2 text-xs font-semibold text-gray-600 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stageLeads.length === 0 ? (
                <tr><td className="px-3 py-6 text-center text-gray-500" colSpan={7}>No entries.</td></tr>
              ) : stageLeads.map(lead => (
                <tr key={lead.id} className="border-t">
                  <td className="px-3 py-2 text-center">{lead.name}</td>
                  <td className="px-3 py-2 text-center">{lead.mobile || "—"}</td>
                  <td className="px-3 py-2 text-center">
                    <Input
                      type="email"
                      value={lead.email || ""}
                      onChange={passthrough((v)=> update(lead.id, { email: v }))}
                      onBlur={(e)=> update(lead.id, { email: e.target.value.trim() })}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Input
                      type="date"
                      value={lead[`${stageKeyPrefix}DateISO`] || ""}
                      onChange={passthrough((v)=> update(lead.id, { [`${stageKeyPrefix}DateISO`]: v }))}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Input
                      type="time"
                      value={lead[`${stageKeyPrefix}TimeHHMM`] || ""}
                      onChange={passthrough((v)=> update(lead.id, { [`${stageKeyPrefix}TimeHHMM`]: v }))}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Input
                      value={lead.notes || ""}
                      onChange={passthrough((v)=> update(lead.id, { notes: v }))}
                      onBlur={(e)=> update(lead.id, { notes: titleCaseFirstOnBlur(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-2 text-center space-x-2">
                    <Button className="bg-white text-gray-800 border hover:bg-gray-50" onClick={() => update(lead.id, { _stage: undefined })}>
                      Back
                    </Button>
                    <Button className="bg-black text-white hover:opacity-90">
                      Done
                    </Button>
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

/* -------------------- Helpers -------------------- */

function moveToInterview(lead, setLeads) {
  setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, _stage: "interview" } : l)));
}

function toISO(d) {
  const z = new Date(d);
  z.setHours(0, 0, 0, 0);
  return z.toISOString().slice(0, 10);
}

function toTime(d) {
  const z = new Date(d);
  const hh = String(z.getHours()).padStart(2, "0");
  const mm = String(z.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function clampCalls(n) {
  const x = Number(n || 0);
  return x < 0 ? 0 : x > 3 ? 3 : x;
}

function extractPrefix(full) {
  if (!full) return "+352";
  const m = full.match(/^\+?\d+/);
  return m ? (m[0].startsWith("+") ? m[0] : `+${m[0]}`) : "+352";
}

function extractNumber(full) {
  if (!full) return "";
  return String(full).replace(/^\+?\d+/, "");
}
