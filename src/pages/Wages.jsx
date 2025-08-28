// Wages.jsx — Proago CRM (Final Sync Build v2025-08-28f)
// - Tab/UI label “Pay”
// - Top-level table: Name | Hours Wages | Bonus Wages | Total Pay | Actions
// - Removed Crewcode & Rank columns; no standalone Hours column
// - One-letter typing bug fixed (no formatting while typing; clean on blur)

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
      String(r.name || "").toLowerCase().includes(q)
    );
  }, [recruiters, query]);

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Pay</CardTitle>
        <Input
          placeholder="Search by Name"
          value={query}
          onChange={passthrough(setQuery)}
          onBlur={(e) => setQuery(titleCaseFirstOnBlur(e.target.value))}
          className="max-w-sm"
        />
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2 text-center text-xs text-gray-600">Name</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Hours Wages</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Bonus Wages</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Total Pay</th>
                <th className="px-3 py-2 text-center text-xs text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const p = payouts.find((x) => x.recruiterId === r.id) || {};
                const hoursWages = Number(p.hoursWages || 0);
                const bonusWages = Number(p.bonusWages || 0);
                const total = hoursWages + bonusWages;

                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 text-center">{r.name}</td>

                    {/* Hours Wages */}
                    <td className="px-3 py-2 text-center">
                      <Input
                        inputMode="decimal"
                        value={p.hoursWages ?? ""}
                        onChange={passthrough((v) =>
                          setPayouts((prev) => up(prev, r.id, "hoursWages", v))
                        )}
                        onBlur={(e) =>
                          setPayouts((prev) =>
                            up(prev, r.id, "hoursWages", normalizeNumericOnBlur(e.target.value))
                          )
                        }
                      />
                    </td>

                    {/* Bonus Wages */}
                    <td className="px-3 py-2 text-center">
                      <Input
                        inputMode="decimal"
                        value={p.bonusWages ?? ""}
                        onChange={passthrough((v) =>
                          setPayouts((prev) => up(prev, r.id, "bonusWages", v))
                        )}
                        onBlur={(e) =>
                          setPayouts((prev) =>
                            up(prev, r.id, "bonusWages", normalizeNumericOnBlur(e.target.value))
                          )
                        }
                      />
                    </td>

                    {/* Total Pay */}
                    <td className="px-3 py-2 text-center font-semibold">
                      {total.toFixed(2)}
                    </td>

                    {/* Actions */}
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

/* -------------------- helpers -------------------- */

// immutably update payouts by recruiterId
function up(prev, recruiterId, key, value) {
  const next = [...prev];
  const i = next.findIndex((x) => x.recruiterId === recruiterId);
  if (i === -1) next.push({ recruiterId, [key]: value });
  else next[i] = { ...next[i], [key]: value };
  return next;
}
