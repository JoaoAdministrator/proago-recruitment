// Wages.jsx — Role->Rank everywhere + safe inputs already applied (v2025-08-28d)
import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { titleCaseFirstOnBlur, passthrough, normalizeNumericOnBlur } from "../util";

export default function Wages({ recruiters = [], payouts = [], setPayouts }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recruiters;
    return recruiters.filter(r =>
      [r.name, r.crewcode, r.rank].some(v => String(v || "").toLowerCase().includes(q))
    );
  }, [recruiters, query]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Pay</CardTitle>
        <Input
          placeholder="Search by Name / Crewcode / Rank"
          value={query}
          onChange={passthrough(setQuery)}
          onBlur={(e)=> setQuery(titleCaseFirstOnBlur(e.target.value))}
          className="max-w-sm"
        />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Name</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Crewcode</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Rank</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Hours Wages</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Bonus Wages</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Total Pay</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const p = payouts.find(x => x.recruiterId === r.id) || {};
                const hoursWages = Number(p.hoursWages || 0);
                const bonusWages = Number(p.bonusWages || 0);
                const total = hoursWages + bonusWages;

                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 text-center">{r.name}</td>
                    <td className="px-3 py-2 text-center">{r.crewcode}</td>
                    <td className="px-3 py-2 text-center">{r.rank || "-"}</td>
                    <td className="px-3 py-2 text-center">
                      <Input
                        inputMode="decimal"
                        value={p.hoursWages ?? ""}
                        onChange={passthrough((v)=> setPayouts(prev => up(prev, r.id, "hoursWages", v)))}
                        onBlur={(e)=> setPayouts(prev => up(prev, r.id, "hoursWages", normalizeNumericOnBlur(e.target.value)))}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Input
                        inputMode="decimal"
                        value={p.bonusWages ?? ""}
                        onChange={passthrough((v)=> setPayouts(prev => up(prev, r.id, "bonusWages", v)))}
                        onBlur={(e)=> setPayouts(prev => up(prev, r.id, "bonusWages", normalizeNumericOnBlur(e.target.value)))}
                      />
                    </td>
                    <td className="px-3 py-2 text-center font-semibold">{total.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <Button variant="secondary">Details</Button>
                    </td>
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

function up(prev, recruiterId, key, value) {
  const next = [...prev];
  const i = next.findIndex(x => x.recruiterId === recruiterId);
  if (i === -1) next.push({ recruiterId, [key]: value });
  else next[i] = { ...next[i], [key]: value };
  return next;
}
