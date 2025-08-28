// Finances.jsx — Rank everywhere, aligned headers, Box2/Box4 (Disc/No Disc), shifts column; safe inputs (v2025-08-28d)

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { titleCaseFirstOnBlur, passthrough, normalizeNumericOnBlur } from "../util";

export default function Finances({ tree, updateMetric }) {
  const [query, setQuery] = useState("");
  const yearKeys = useMemo(() => Object.keys(tree?.year || {}).sort(), [tree]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Finances</CardTitle>
        <Input
          placeholder="Search recruiter (Name / Crewcode / Rank)"
          value={query}
          onChange={passthrough(setQuery)}
          onBlur={(e) => setQuery(titleCaseFirstOnBlur(e.target.value))}
          className="max-w-sm"
        />
      </CardHeader>

      <CardContent className="space-y-6">
        {yearKeys.map((yy) => (
          <YearBlock key={yy} y={yy} data={tree.year[yy]} query={query} updateMetric={updateMetric} />
        ))}
      </CardContent>
    </Card>
  );
}

function YearBlock({ y, data, query, updateMetric }) {
  const monthKeys = useMemo(() => Object.keys(data.months || {}), [data]);
  return (
    <div className="border rounded">
      <div className="px-4 py-2 font-semibold bg-gray-50">{y}</div>
      <div className="divide-y">
        {monthKeys.map((mk) => (
          <MonthBlock key={mk} y={y} m={mk} data={data.months[mk]} query={query} updateMetric={updateMetric} />
        ))}
      </div>
    </div>
  );
}

function MonthBlock({ y, m, data, query, updateMetric }) {
  const weekKeys = useMemo(() => Object.keys(data.weeks || {}), [data]);

  return (
    <div>
      <div className="px-4 py-2 font-medium">{m}</div>
      <div className="divide-y">
        {weekKeys.map((wk) => (
          <WeekBlock key={wk} y={y} m={m} w={wk} data={data.weeks[wk]} query={query} updateMetric={updateMetric} />
        ))}
      </div>
    </div>
  );
}

function WeekBlock({ y, m, w, data, query, updateMetric }) {
  const recruiters = useMemo(() => {
    const list = data.recruiters || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [r.name, r.crewcode, r.rank].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [data, query]);

  return (
    <div className="p-4">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            {[
              "Recruiter","Crewcode","Rank","Shifts","Score",
              "Box2 (No Discount)","Box2 (Discount)","Box4 (No Discount)","Box4 (Discount)",
              "Wages","Income","Profit",
            ].map((h) => (
              <th key={h} className="px-3 py-2 text-center text-xs text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recruiters.map((r, idx) => (
            <tr key={`${r.id}-${idx}`} className="border-t">
              <td className="px-3 py-2 text-center">
                <Input
                  value={r.name || ""}
                  onChange={passthrough((v) => updateMetric("recruiter", { y, m, w, id: r.id }, "name", v))}
                  onBlur={(e) => updateMetric("recruiter", { y, m, w, id: r.id }, "name", titleCaseFirstOnBlur(e.target.value))}
                />
              </td>
              <td className="px-3 py-2 text-center">{r.crewcode}</td>
              <td className="px-3 py-2 text-center">
                <Input
                  value={r.rank || ""}
                  onChange={passthrough((v) => updateMetric("recruiter", { y, m, w, id: r.id }, "rank", v))}
                  onBlur={(e) => updateMetric("recruiter", { y, m, w, id: r.id }, "rank", titleCaseFirstOnBlur(e.target.value))}
                />
              </td>
              <td className="px-3 py-2 text-center">
                <Input
                  inputMode="numeric"
                  value={r.shifts ?? ""}
                  onChange={passthrough((v) => updateMetric("recruiter", { y, m, w, id: r.id }, "shifts", v))}
                  onBlur={(e) => updateMetric("recruiter", { y, m, w, id: r.id }, "shifts", normalizeNumericOnBlur(e.target.value))}
                />
              </td>
              <td className="px-3 py-2 text-center">{Number(r.score ?? 0).toFixed(2)}</td>
              <td class
