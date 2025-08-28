// Inflow.jsx — swap Source/Calls, add Date+Time, Mobile with prefix menu, independent Interview/Formation times, bug-free inputs (v2025-08-28d)

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { titleCaseFirstOnBlur, passthrough, emailOnChange, normalizeNumericOnBlur } from "../util";

const PREFIXES = ["+352", "+33", "+32", "+49", "+34", "+351"];

export default function Inflow({ leads, setLeads }) {
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    prefix: "+352",
    mobile: "",
    source: "",
    calls: 0,
    interviewAt: "",
    formationAt: "",
  });

  const addLead = () => {
    const nowISO = new Date().toISOString();
    setLeads((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: titleCaseFirstOnBlur(draft.name),
        email: draft.email.trim(),
        mobile: `${draft.prefix}${draft.mobile.replace(/\s+/g, "")}`,
        prefix: draft.prefix,
        source: draft.source,
        calls: Number(draft.calls || 0),
        createdAt: nowISO,     // Lead Date
        createdTime: nowISO,   // Lead Time (kept separate for display)
        interviewAt: draft.interviewAt || "",
        formationAt: draft.formationAt || "",
      },
    ]);
    setDraft({
      name: "",
      email: "",
      prefix: draft.prefix,
      mobile: "",
      source: "",
      calls: 0,
      interviewAt: "",
      formationAt: "",
    });
  };

  const rows = useMemo(() => leads || [], [leads]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Lead */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Input
            placeholder="Name"
            value={draft.name}
            onChange={passthrough((v) => setDraft((d) => ({ ...d, name: v })))}
            onBlur={(e) =>
              setDraft((d) => ({ ...d, name: titleCaseFirstOnBlur(e.target.value) }))
            }
          />
          <Input
            type="email"
            placeholder="Email"
            value={draft.email}
            onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
            onBlur={(e) =>
              setDraft((d) => ({ ...d, email: e.target.value.trim() }))
            }
          />

          <div className="flex gap-2">
            <select
              className="border rounded px-2"
              value={draft.prefix}
              onChange={(e) => setDraft((d) => ({ ...d, prefix: e.target.value }))}
            >
              {PREFIXES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <Input
              inputMode="tel"
              placeholder="Mobile"
              value={draft.mobile}
              onChange={passthrough((v) => setDraft((d) => ({ ...d, mobile: v })))}
              onBlur={(e) =>
                setDraft((d) => ({
                  ...d,
                  mobile: normalizeNumericOnBlur(e.target.value),
                }))
              }
            />
          </div>

          {/* Source before Calls (swapped as requested) */}
          <Input
            placeholder="Source"
            value={draft.source}
            onChange={passthrough((v) => setDraft((d) => ({ ...d, source: v })))}
            onBlur={(e) =>
              setDraft((d) => ({ ...d, source: titleCaseFirstOnBlur(e.target.value) }))
            }
          />
          <Input
            inputMode="numeric"
            placeholder="Calls (0–3)"
            value={draft.calls}
            onChange={passthrough((v) => setDraft((d) => ({ ...d, calls: v })))}
            onBlur={(e) =>
              setDraft((d) => ({ ...d, calls: normalizeNumericOnBlur(e.target.value) }))
            }
          />
          <Button onClick={addLead}>Add Lead</Button>
        </div>

        {/* Independent scheduling (no coupling between Lead / Interview / Formation) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            type="datetime-local"
            value={draft.interviewAt}
            onChange={(e) => setDraft((d) => ({ ...d, interviewAt: e.target.value }))}
            placeholder="Interview — Date & Time"
          />
          <Input
            type="datetime-local"
            value={draft.formationAt}
            onChange={(e) => setDraft((d) => ({ ...d, formationAt: e.target.value }))}
            placeholder="Formation — Date & Time"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2 text-center text-xs text-gray-600">Name</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Email</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Mobile</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Source</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Calls</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Date</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Time</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Interview</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Formation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const created = r.createdAt ? new Date(r.createdAt) : null;
                const dateStr = created
                  ? created.toLocaleDateString("en-GB")
                  : "-";
                const timeStr = created
                  ? created.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                  : "-";
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 text-center">{r.name}</td>
                    <td className="px-3 py-2 text-center">{r.email}</td>
                    <td className="px-3 py-2 text-center">{r.mobile}</td>
                    <td className="px-3 py-2 text-center">{r.source}</td>
                    <td className="px-3 py-2 text-center">{r.calls ?? 0}</td>
                    <td className="px-3 py-2 text-center">{dateStr}</td>
                    <td className="px-3 py-2 text-center">{timeStr}</td>
                    <td className="px-3 py-2 text-center">{r.interviewAt || "-"}</td>
                    <td className="px-3 py-2 text-center">{r.formationAt || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
