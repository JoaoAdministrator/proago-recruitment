// Finances.jsx — Proago CRM (Final Sync Build v2025-08-28g)
// - Full month names (August, …)
// - Columns aligned across Year → Month → Week → Day → Recruiter
// - Rank wording consistent (was Role)
// - Box2/Box4 split (No Discount / Discount) + Bonus at recruiter level
// - Profit = Income − (Wages + Bonus)
// - Safe input & pure calculations (no formatting while typing)

import React, { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import {
  load, save, K, DEFAULT_SETTINGS, rateForDate,
  fmtISO, fmtUK, startOfWeekMon, weekNumberISO, monthKey, monthFull, toMoney
} from "../util";

const profitColor = (v) => (v > 0 ? "#10b981" : v < 0 ? "#ef4444" : undefined);

// Basic commission ladder; can be extended or moved to Settings if needed
const rookieCommission = (box2) => {
  const t = {0:0,1:0,2:25,3:40,4:70,5:85,6:120,7:135,8:175,9:190,10:235};
  if (box2 <= 10) return t[box2] ?? 0;
  return 235 + (box2 - 10) * 15;
};

export default function Finances({ history }) {
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [openMonth, setOpenMonth] = useState({}); // "YYYY-MM" => bool
  const [openWeek, setOpenWeek] = useState({});   // weekStartISO => bool
  const [openDay, setOpenDay] = useState({});     // dateISO => bool

  // Load settings (conversion matrix + rate bands)
  const settings = load(K.settings, DEFAULT_SETTINGS);
  const matrix = settings.conversionType || DEFAULT_SETTINGS.conversionType;

  // Filter rows for selected year (by dateISO)
  const rowsYear = useMemo(() => {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    const rows = (history || []).filter(h => {
      const d = h.dateISO || h.date;
      return d >= start && d <= end;
    });
    // De-duplicate by (recruiterId,dateISO,_rowKey)
    const map = new Map();
    rows.forEach(r => {
      const key = `${r.recruiterId || ""}|${r.dateISO || r.date}|${r._rowKey ?? -1}`;
      if (!map.has(key)) map.set(key, r);
    });
    return Array.from(map.values());
  }, [history, year]);

  // Group year → months
  const byMonth = useMemo(() => {
    const out = {};
    rowsYear.forEach(r => {
      const ym = monthKey(r.dateISO || r.date);
      (out[ym] ||= []).push(r);
    });
    return out;
  }, [rowsYear]);

  const ymKeys = Object.keys(byMonth).sort();

  // Calculations
  const calcIncome = (row) => {
    const type = row.shiftType === "EVENT" ? "EVENT" : "D2D";
    const m = matrix[type] || matrix.D2D;
    const b2n = Number(row.box2_noDisc) || 0, b2d = Number(row.box2_disc) || 0;
    const b4n = Number(row.box4_noDisc) || 0, b4d = Number(row.box4_disc) || 0;
    return b2n * (m.noDiscount?.box2 || 0) + b2d * (m.discount?.box2 || 0)
         + b4n * (m.noDiscount?.box4 || 0) + b4d * (m.discount?.box4 || 0);
  };

  const calcWages = (row) => {
    const hrs = (row.hours !== "" && row.hours != null) ? Number(row.hours) : defaultHoursByRank(row.roleAtShift || "Rookie");
    const rate = rateForDate(settings, row.dateISO);
    return hrs * rate;
  };

  const calcBonus = (row, roleAtShift) => {
    const box2 = (Number(row.box2_noDisc) || 0) + (Number(row.box2_disc) || 0);
    const mult = (row.commissionMult !== "" && row.commissionMult != null)
      ? Number(row.commissionMult)
      : multiplierByRank(roleAtShift);
    return rookieCommission(box2) * mult;
  };

  const summarizeRows = (rows) => {
    let shifts = 0, score = 0, box2 = 0, box4 = 0, wages = 0, income = 0, bonus = 0;
    const detail = rows.map((r, i) => {
      const inc = calcIncome(r);
      const wag = calcWages(r);
      const bon = calcBonus(r, r.roleAtShift);
      const b2 = (Number(r.box2_noDisc) || 0) + (Number(r.box2_disc) || 0);
      const b4 = (Number(r.box4_noDisc) || 0) + (Number(r.box4_disc) || 0);
      const sc = Number(r.score) || 0;
      const prof = inc - (wag + bon);
      return { ...r, score: sc, income: inc, wages: wag, bonus: bon, profit: prof, b2, b4, _k: r._rowKey ?? i };
    });
    detail.forEach(d => {
      shifts += 1;
      score  += d.score;
      box2   += d.b2;
      box4   += d.b4;
      wages  += d.wages;
      income += d.income;
      bonus  += d.bonus;
    });
    return { shifts, score, box2, box4, wages, income, bonus, profit: income - (wages + bonus), detail };
  };

  const yearTotals = summarizeRows(rowsYear);

  return (
    <div className="grid gap-4">
      {/* Year picker + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Year</Label>
          <select
            className="h-10 border rounded-md px-2"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {Array.from({ length: 6 }).map((_, i) => {
              const y = new Date().getUTCFullYear() - 3 + i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
        <div className="text-sm text-muted-foreground">
          Shifts {yearTotals.shifts} • Score {yearTotals.score} • Box2 {yearTotals.box2} • Box4 {yearTotals.box4} • Wages €{toMoney(yearTotals.wages)} • Income €{toMoney(yearTotals.income)} • <span style={{ color: profitColor(yearTotals.profit) }}>Profit €{toMoney(yearTotals.profit)}</span>
        </div>
      </div>

      {ymKeys.length === 0 ? (
        <div className="text-sm text-muted-foreground">No data for {year}</div>
      ) : (
        ymKeys.map(ym => {
          const monthRows = byMonth[ym];

          // Group month → weeks (Monday start)
          const byWeek = {};
          monthRows.forEach(r => {
            const wkStart = fmtISO(startOfWeekMon(new Date(r.dateISO || r.date)));
            (byWeek[wkStart] ||= []).push(r);
          });
          const wkKeys = Object.keys(byWeek).sort();

          const monthSum = summarizeRows(monthRows);

          return (
            <div key={ym} className="border rounded-xl overflow-hidden">
              {/* Month header */}
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-50">
                <div className="font-medium">{monthFull(ym)}</div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">Shifts {monthSum.shifts}</div>
                  <div className="text-sm">Score {monthSum.score}</div>
                  <div className="text-sm">Box2 {monthSum.box2}</div>
                  <div className="text-sm">Box4 {monthSum.box4}</div>
                  <div className="text-sm">Wages €{toMoney(monthSum.wages)}</div>
                  <div className="text-sm">Income €{toMoney(monthSum.income)}</div>
                  <div className="text-sm" style={{ color: profitColor(monthSum.profit) }}>Profit €{toMoney(monthSum.profit)}</div>
                  <Button size="sm" variant="outline" onClick={() => setOpenMonth(s => ({ ...s, [ym]: !s[ym] }))}>
                    {openMonth[ym] ? "Hide" : "Expand"}
                  </Button>
                </div>
              </div>

              {openMonth[ym] && (
                <div className="p-3">
                  {/* Weeks table */}
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="p-2 text-left">Week</th>
                          <th className="p-2 text-right">Shifts</th>
                          <th className="p-2 text-right">Score</th>
                          <th className="p-2 text-right">Box2</th>
                          <th className="p-2 text-right">Box4</th>
                          <th className="p-2 text-right">Wages</th>
                          <th className="p-2 text-right">Income</th>
                          <th className="p-2 text-right">Profit</th>
                          <th className="p-2 text-right">Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.keys(byWeek).sort().map(wk => {
                          const wkRows = byWeek[wk];

                          // Group week → days
                          const byDay = {};
                          wkRows.forEach(r => { (byDay[r.dateISO || r.date] ||= []).push(r); });
                          const dayKeys = Object.keys(byDay).sort();

                          const wkSum = summarizeRows(wkRows);

                          return (
                            <React.Fragment key={wk}>
                              <tr className="border-t">
                                <td className="p-2">Week {weekNumberISO(new Date(wk))}</td>
                                <td className="p-2 text-right">{wkSum.shifts}</td>
                                <td className="p-2 text-right">{wkSum.score}</td>
                                <td className="p-2 text-right">{wkSum.box2}</td>
                                <td className="p-2 text-right">{wkSum.box4}</td>
                                <td className="p-2 text-right">{toMoney(wkSum.wages)}</td>
                                <td className="p-2 text-right">{toMoney(wkSum.income)}</td>
                                <td className="p-2 text-right" style={{ color: profitColor(wkSum.profit) }}>{toMoney(wkSum.profit)}</td>
                                <td className="p-2 text-right">
                                  <Button size="sm" variant="outline" onClick={() => setOpenWeek(s => ({ ...s, [wk]: !s[wk] }))}>
                                    {openWeek[wk] ? "Hide" : "View"}
                                  </Button>
                                </td>
                              </tr>

                              {openWeek[wk] && (
                                <tr>
                                  <td colSpan={9} className="p-0">
                                    <div className="px-3 pb-3">
                                      {/* Days table */}
                                      <div className="overflow-x-auto border rounded-lg">
                                        <table className="min-w-full text-sm">
                                          <thead className="bg-zinc-50">
                                            <tr>
                                              <th className="p-2 text-left">Date</th>
                                              <th className="p-2 text-right">Shifts</th>
                                              <th className="p-2 text-right">Score</th>
                                              <th className="p-2 text-right">Box2</th>
                                              <th className="p-2 text-right">Box4</th>
                                              <th className="p-2 text-right">Wages</th>
                                              <th className="p-2 text-right">Income</th>
                                              <th className="p-2 text-right">Profit</th>
                                              <th className="p-2 text-right">Shifts</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {dayKeys.map(dk => {
                                              const dSum = summarizeRows(byDay[dk]);
                                              return (
                                                <React.Fragment key={dk}>
                                                  <tr className="border-t">
                                                    <td className="p-2">{fmtUK(dk)}</td>
                                                    <td className="p-2 text-right">{dSum.shifts}</td>
                                                    <td className="p-2 text-right">{dSum.score}</td>
                                                    <td className="p-2 text-right">{dSum.box2}</td>
                                                    <td className="p-2 text-right">{dSum.box4}</td>
                                                    <td className="p-2 text-right">{toMoney(dSum.wages)}</td>
                                                    <td className="p-2 text-right">{toMoney(dSum.income)}</td>
                                                    <td className="p-2 text-right" style={{ color: profitColor(dSum.profit) }}>{toMoney(dSum.profit)}</td>
                                                    <td className="p-2 text-right">
                                                      <Button size="sm" variant="outline" onClick={() => setOpenDay(s => ({ ...s, [dk]: !s[dk] }))}>
                                                        {openDay[dk] ? "Hide" : "Details"}
                                                      </Button>
                                                    </td>
                                                  </tr>

                                                  {openDay[dk] && (
                                                    <tr>
                                                      <td colSpan={9} className="p-0">
                                                        <div className="px-2 pb-3">
                                                          {/* Recruiter shift breakdown (Bonus included) */}
                                                          <div className="overflow-x-auto border rounded-lg">
                                                            <table className="min-w-full text-sm">
                                                              <thead className="bg-zinc-50">
                                                                <tr>
                                                                  <th className="p-2 text-left">Recruiter</th>
                                                                  <th className="p-2 text-left">Project</th>
                                                                  <th className="p-2 text-left">Type</th>
                                                                  <th className="p-2 text-left">Location</th>
                                                                  <th className="p-2 text-right">Score</th>
                                                                  <th className="p-2 text-right">Box2 No Discount</th>
                                                                  <th className="p-2 text-right">Box2 Discount</th>
                                                                  <th className="p-2 text-right">Box4 No Discount</th>
                                                                  <th className="p-2 text-right">Box4 Discount</th>
                                                                  <th className="p-2 text-right">Wages</th>
                                                                  <th className="p-2 text-right">Income</th>
                                                                  <th className="p-2 text-right">Bonus</th>
                                                                  <th className="p-2 text-right">Profit</th>
                                                                </tr>
                                                              </thead>
                                                              <tbody>
                                                                {dSum.detail.map((r, i) => (
                                                                  <tr key={`${r.recruiterId || i}_${r._k || i}`} className="border-t">
                                                                    <td className="p-2">{r.recruiterName || r.recruiterId || "—"}</td>
                                                                    <td className="p-2">{r.project || "HF"}</td>
                                                                    <td className="p-2">{r.shiftType || "D2D"}</td>
                                                                    <td className="p-2">{r.location || "—"}</td>
                                                                    <td className="p-2 text-right">{Number(r.score ?? 0).toFixed(2)}</td>
                                                                    <td className="p-2 text-right">{Number(r.box2_noDisc) || 0}</td>
                                                                    <td className="p-2 text-right">{Number(r.box2_disc) || 0}</td>
                                                                    <td className="p-2 text-right">{Number(r.box4_noDisc) || 0}</td>
                                                                    <td className="p-2 text-right">{Number(r.box4_disc) || 0}</td>
                                                                    <td className="p-2 text-right">{toMoney(calcWages(r))}</td>
                                                                    <td className="p-2 text-right">{toMoney(calcIncome(r))}</td>
                                                                    <td className="p-2 text-right">{toMoney(calcBonus(r, r.roleAtShift))}</td>
                                                                    <td className="p-2 text-right" style={{ color: profitColor(r.profit) }}>{toMoney(r.profit)}</td>
                                                                  </tr>
                                                                ))}
                                                              </tbody>
                                                            </table>
                                                          </div>
                                                        </div>
                                                      </td>
                                                    </tr>
                                                  )}
                                                </React.Fragment>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* -------------------- helpers -------------------- */
function defaultHoursByRank(rank) {
  if (rank === "Sales Manager") return 8;
  if (rank === "Team Captain") return 8;
  if (rank === "Pool Captain") return 7;
  return 6; // Rookie / Promoter
}

function multiplierByRank(rank) {
  if (rank === "Sales Manager") return 2.0;
  if (rank === "Team Captain") return 1.5;
  if (rank === "Pool Captain") return 1.25;
  return 1.0; // Rookie / Promoter
}
