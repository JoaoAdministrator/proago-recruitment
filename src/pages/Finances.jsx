// Finances.jsx
// Proago CRM — Finances (v2025-08-28, Chat 9)
// Monthly → Weekly → Daily → Shifts drilldown
// Columns aligned: Shifts | Score | Box2 | Box4 | Wages | Income | Profit
// Profit at every level = Income − (Wages + Bonus) at the lowest (recruiter) level

import React, { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import {
  load, K, DEFAULT_SETTINGS, rateForDate,
  fmtISO, fmtUK, startOfWeekMon, weekNumberISO, monthKey, monthLabel, toMoney
} from "../util";

/* ----- Local helpers (kept here so page works standalone) ----- */
const roleHoursDefault = (role) =>
  role === "Pool Captain" ? 7 : (role === "Team Captain" || role === "Sales Manager") ? 8 : 6;

const rookieCommission = (box2) => {
  const t = {0:0,1:0,2:25,3:40,4:70,5:85,6:120,7:135,8:175,9:190,10:235};
  if (box2 <= 10) return t[box2] ?? 0;
  return 235 + (box2 - 10) * 15;
};

const boxTotals = (row) => {
  const b2 = (Number(row.box2_noDisc) || 0) + (Number(row.box2_disc) || 0);
  const b4 = (Number(row.box4_noDisc) || 0) + (Number(row.box4_disc) || 0);
  return { b2, b4 };
};

const profitColor = (v) => (v > 0 ? "#10b981" : v < 0 ? "#ef4444" : undefined);

/* ----- Finances Component ----- */
export default function Finances({ history }) {
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [openMonth, setOpenMonth] = useState({}); // "YYYY-MM" => bool
  const [openWeek, setOpenWeek] = useState({});   // weekStartISO => bool
  const [openDay, setOpenDay] = useState({});     // dateISO => bool

  // Load settings for matrix + bands
  const settings = load(K.settings, DEFAULT_SETTINGS);
  const matrix = settings.conversionType || DEFAULT_SETTINGS.conversionType;

  // Income per row (uses conversion matrix + discount split)
  const calcIncome = (row) => {
    const type = row.shiftType === "EVENT" ? "EVENT" : "D2D";
    const m = matrix[type] || matrix.D2D;
    const b2n = Number(row.box2_noDisc) || 0, b2d = Number(row.box2_disc) || 0;
    const b4n = Number(row.box4_noDisc) || 0, b4d = Number(row.box4_disc) || 0;
    return b2n * (m.noDiscount?.box2 || 0) + b2d * (m.discount?.box2 || 0)
         + b4n * (m.noDiscount?.box4 || 0) + b4d * (m.discount?.box4 || 0);
  };

  // Wages per row (hours × rate band) — still needed to compute profit at higher levels
  const calcWages = (row) => {
    const hrs = (row.hours !== "" && row.hours != null) ? Number(row.hours) : roleHoursDefault(row.roleAtShift || "Rookie");
    const rate = rateForDate(settings, row.dateISO);
    return hrs * rate;
  };

  // Bonus per row (based on Box2 and commission multiplier)
  const calcBonus = (row, roleAtShift) => {
    const box2 = (Number(row.box2_noDisc) || 0) + (Number(row.box2_disc) || 0);
    const mult = (row.commissionMult !== "" && row.commissionMult != null)
      ? Number(row.commissionMult)
      : (
          roleAtShift === "Pool Captain" ? 1.25 :
          roleAtShift === "Team Captain" ? 1.5 :
          roleAtShift === "Sales Manager" ? 2.0 : 1.0
        );
    return rookieCommission(box2) * mult;
  };

  // Filter year + de-duplicate by (recruiterId,dateISO,_rowKey)
  const rowsYear = useMemo(() => {
    const start = `${year}-01-01`, end = `${year}-12-31`;
    const rows = history.filter(h => (h.dateISO || h.date) >= start && (h.dateISO || h.date) <= end);
    const map = new Map();
    rows.forEach(r => {
      const key = `${r.recruiterId || ""}|${r.dateISO || r.date}|${r._rowKey ?? -1}`;
      if (!map.has(key)) map.set(key, r);
    });
    return Array.from(map.values());
  }, [history, year]);

  // Group by month → by week (Monday start) → by day
  const byMonth = useMemo(() => {
    const out = {};
    rowsYear.forEach(r => {
      const ym = monthKey(r.dateISO || r.date);
      (out[ym] ||= []).push(r);
    });
    return out;
  }, [rowsYear]);

  const ymKeys = Object.keys(byMonth).sort();

  // Summaries
  const summarizeRows = (rows) => {
    let shifts = 0, score = 0, box2 = 0, box4 = 0, wages = 0, income = 0, bonus = 0;
    const detail = rows.map(r => {
      const inc = calcIncome(r);
      const wag = calcWages(r);
      const bon = calcBonus(r, r.roleAtShift);
      const { b2, b4 } = boxTotals(r);
      return {
        ...r,
        score: Number(r.score) || 0,
        income: inc,
        wages: wag,
        bonus: bon,
        profit: inc - (wag + bon),
        b2, b4
      };
    });
    detail.forEach(d => {
      shifts += 1;
      score += d.score;
      box2 += d.b2;
      box4 += d.b4;
      wages += d.wages;
      income += d.income;
      bonus += d.bonus;
    });
    return { shifts, score, box2, box4, wages, income, bonus, profit: income - (wages + bonus), detail };
  };

  // Year totals
  const yearTotals = summarizeRows(rowsYear);

  return (
    <div className="grid gap-4">
      {/* Year picker + totals */}
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
          Shifts {yearTotals.shifts} • Score {yearTotals.score} • Box2 {yearTotals.box2} • Box4 {yearTotals.box4} • Wages €
          {toMoney(yearTotals.wages)} • Income €{toMoney(yearTotals.income)} • <span style={{ color: profitColor(yearTotals.profit) }}>Profit €{toMoney(yearTotals.profit)}</span>
        </div>
      </div>

      {ymKeys.length === 0 ? (
        <div className="text-sm text-muted-foreground">No data for {year}</div>
      ) : (
        ymKeys.map(ym => {
          const monthRows = byMonth[ym];

          // Group month into weeks
          const byWeek = {};
          monthRows.forEach(r => {
            const wkStart = fmtISO(startOfWeekMon(new Date(r.dateISO || r.date)));
            (byWeek[wkStart] ||= []).push(r);
          });
          const wkKeys = Object.keys(byWeek).sort();

          const monthSum = summarizeRows(monthRows);

          return (
            <div key={ym} className="border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-50">
                <div className="font-medium">{monthLabel(ym)}</div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">Shifts {monthSum.shifts}</div>
                  <div className="text-sm">Score {monthSum.score}</div>
                  <div className="text-sm">Box2 {monthSum.box2}</div>
                  <div className="text-sm">Box4 {monthSum.box4}</div>
                  <div className="text-sm">Wages €{toMoney(monthSum.wages)}</div>
                  <div className="text-sm">Income €{toMoney(monthSum.income)}</div>
                  <div className="text-sm" style={{ color: profitColor(monthSum.profit) }}>
                    Profit €{toMoney(monthSum.profit)}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setOpenMonth(s => ({ ...s, [ym]: !s[ym] }))}>
                    {openMonth[ym] ? "Hide" : "Expand"}
                  </Button>
                </div>
              </div>

              {openMonth[ym] && (
                <div className="p-3">
                  {/* Weeks table (aligned headings) */}
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
                        {wkKeys.map(wk => {
                          const wkRows = byWeek[wk];

                          // Group into days
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
                                      {/* Days table (aligned headings) */}
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
                                                          {/* Recruiter shift breakdown (no Rate/Hours, add Bonus) */}
                                                          <div className="overflow-x-auto border rounded-lg">
                                                            <table className="min-w-full text-sm">
                                                              <thead className="bg-zinc-50">
                                                                <tr>
                                                                  <th className="p-2 text-left">Recruiter</th>
                                                                  <th className="p-2 text-left">Project</th>
                                                                  <th className="p-2 text-left">Type</th>
                                                                  <th className="p-2 text-left">Location</th>
                                                                  <th className="p-2 text-right">Score</th>
                                                                  <th className="p-2 text-right">B2 No</th>
                                                                  <th className="p-2 text-right">B2 Disc</th>
                                                                  <th className="p-2 text-right">B4 No</th>
                                                                  <th className="p-2 text-right">B4 Disc</th>
                                                                  <th className="p-2 text-right">Wages</th>
                                                                  <th className="p-2 text-right">Income</th>
                                                                  <th className="p-2 text-right">Bonus</th>
                                                                  <th className="p-2 text-right">Profit</th>
                                                                </tr>
                                                              </thead>
                                                              <tbody>
                                                                {dSum.detail.map((r, i) => (
                                                                  <tr key={`${r.recruiterId || i}_${r._rowKey || i}`} className="border-t">
                                                                    <td className="p-2">{r.recruiterName || r.recruiterId || "—"}</td>
                                                                    <td className="p-2">{r.project || "HF"}</td>
                                                                    <td className="p-2">{r.shiftType || "D2D"}</td>
                                                                    <td className="p-2">{r.location || "—"}</td>
                                                                    <td className="p-2 text-right">{r.score}</td>
                                                                    <td className="p-2 text-right">{Number(r.box2_noDisc) || 0}</td>
                                                                    <td className="p-2 text-right">{Number(r.box2_disc) || 0}</td>
                                                                    <td className="p-2 text-right">{Number(r.box4_noDisc) || 0}</td>
                                                                    <td className="p-2 text-right">{Number(r.box4_disc) || 0}</td>
                                                                    <td className="p-2 text-right">{toMoney(r.wages)}</td>
                                                                    <td className="p-2 text-right">{toMoney(r.income)}</td>
                                                                    <td className="p-2 text-right">{toMoney(r.bonus)}</td>
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
