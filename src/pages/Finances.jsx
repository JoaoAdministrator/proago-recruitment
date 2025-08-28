// Finances.jsx — Chat 9 baseline + requested tweaks only
// • Full month names
// • Recruiter breakdown: add Shifts column; remove Project Type & Location
// • Box2/Box4: No Discount / Discount columns
// • Profit = Income − (Wages + Bonus)
// • Keep alignment across Year → Month → Week → Day → Recruiter

import React, { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { load, K, fmtISO, fmtUK, startOfWeekMon, weekNumberISO, monthKey, monthFull, toMoney } from "../util";

const DEFAULT_SETTINGS = load(K.settings, null) || {
  hourlyRateBands: [{ effectiveFrom: "2025-01-01", rate: 15 }],
  conversionType: {
    D2D:   { noDiscount: { box2:120, box4:240 }, discount:{ box2:90, box4:180 } },
    EVENT: { noDiscount: { box2:140, box4:260 }, discount:{ box2:100, box4:200 } },
  },
};

const rateForDate = (dateISO)=>{
  const bands = (DEFAULT_SETTINGS.hourlyRateBands||[]).slice().sort((a,b)=>a.effectiveFrom.localeCompare(b.effectiveFrom));
  const d = dateISO || new Date().toISOString().slice(0,10);
  let picked = bands[0]?.rate ?? 15;
  for (const b of bands) if (d >= b.effectiveFrom) picked = b.rate;
  return Number(picked||0);
};
const rookieCommission = (box2)=>{ const t={0:0,1:0,2:25,3:40,4:70,5:85,6:120,7:135,8:175,9:190,10:235}; return box2<=10 ? (t[box2]??0) : 235 + (box2-10)*15; };
const defaultHoursByRank = (rank)=> rank==="Sales Manager"?8 : rank==="Team Captain"?8 : rank==="Pool Captain"?7 : 6;
const multiplierByRank   = (rank)=> rank==="Sales Manager"?2.0:rank==="Team Captain"?1.5:rank==="Pool Captain"?1.25:1.0;

export default function Finances({ history }) {
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [openMonth, setOpenMonth] = useState({});
  const [openWeek, setOpenWeek] = useState({});
  const [openDay, setOpenDay] = useState({});

  const rowsYear = useMemo(()=>{
    const start=`${year}-01-01`, end=`${year}-12-31`;
    const rows=(history||[]).filter(h=>{ const d=h.dateISO||h.date; return d>=start && d<=end; });
    const map=new Map();
    rows.forEach(r=>{ const key=`${r.recruiterId||""}|${r.dateISO||r.date}|${r._rowKey??-1}`; if(!map.has(key)) map.set(key,r); });
    return Array.from(map.values());
  }, [history, year]);

  const byMonth = useMemo(()=>{
    const out={}; rowsYear.forEach(r=>{ const ym=monthKey(r.dateISO||r.date); (out[ym] ||= []).push(r); }); return out;
  }, [rowsYear]);

  const matrix = DEFAULT_SETTINGS.conversionType;

  const calcIncome = (row)=>{
    const type = row.shiftType==="EVENT" ? "EVENT" : "D2D";
    const m = matrix[type] || matrix.D2D;
    const b2n=+row.box2_noDisc||0, b2d=+row.box2_disc||0, b4n=+row.box4_noDisc||0, b4d=+row.box4_disc||0;
    return b2n*(m.noDiscount?.box2||0) + b2d*(m.discount?.box2||0) + b4n*(m.noDiscount?.box4||0) + b4d*(m.discount?.box4||0);
  };
  const calcWages = (row)=>{ const hrs=(row.hours!==""&&row.hours!=null) ? +row.hours : defaultHoursByRank(row.roleAtShift||"Rookie"); const rate=rateForDate(row.dateISO); return hrs*rate; };
  const calcBonus = (row)=>{ const box2=(+row.box2_noDisc||0)+(+row.box2_disc||0); const mult=(row.commissionMult!==""&&row.commissionMult!=null)?+row.commissionMult:multiplierByRank(row.roleAtShift); return rookieCommission(box2)*mult; };

  const summarizeRows = (rows)=>{
    let shifts=0, score=0, box2=0, box4=0, wages=0, income=0, bonus=0;
    const detail=rows.map((r,i)=>{
      const inc=calcIncome(r), wag=calcWages(r), bon=calcBonus(r);
      const b2=(+r.box2_noDisc||0)+(+r.box2_disc||0), b4=(+r.box4_noDisc||0)+(+r.box4_disc||0);
      const sc=+r.score||0, prof=inc-(wag+bon);
      return {...r, score:sc, income:inc, wages:wag, bonus:bon, profit:prof, b2, b4, _k:r._rowKey??i};
    });
    detail.forEach(d=>{ shifts+=1; score+=d.score; box2+=d.b2; box4+=d.b4; wages+=d.wages; income+=d.income; bonus+=d.bonus; });
    return { shifts, score, box2, box4, wages, income, bonus, profit: income-(wages+bonus), detail };
  };

  const yearTotals = summarizeRows(rowsYear);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Year</Label>
          <select className="h-10 border rounded-md px-2" value={year} onChange={e=>setYear(+e.target.value)}>
            {Array.from({length:6}).map((_,i)=>{ const y=new Date().getUTCFullYear()-3+i; return <option key={y} value={y}>{y}</option>; })}
          </select>
        </div>
        <div className="text-sm text-muted-foreground">
          Shifts {yearTotals.shifts} • Score {yearTotals.score} • Box2 {yearTotals.box2} • Box4 {yearTotals.box4} • Wages €{toMoney(yearTotals.wages)} • Income €{toMoney(yearTotals.income)} • <span style={{color: yearTotals.profit>0?"#10b981":yearTotals.profit<0?"#ef4444":undefined}}>Profit €{toMoney(yearTotals.profit)}</span>
        </div>
      </div>

      {Object.keys(byMonth).sort().map(ym=>{
        const monthRows = byMonth[ym];
        const byWeek = {};
        monthRows.forEach(r=>{ const wk=fmtISO(startOfWeekMon(new Date(r.dateISO||r.date))); (byWeek[wk] ||= []).push(r); });
        const monthSum = summarizeRows(monthRows);

        return (
          <div key={ym} className="border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-50">
              <div className="font-medium">{monthFull(ym)}</div>
              <div className="flex items-center gap-4">
                <div className="text-sm">Shifts {monthSum.shifts}</div>
                <div className="text-sm">Score {monthSum.score}</div>
                <div className="text-sm">Box2 {monthSum.box2}</div>
                <div className="text-sm">Box4 {monthSum.box4}</div>
                <div className="text-sm">Wages €{toMoney(monthSum.wages)}</div>
                <div className="text-sm">Income €{toMoney(monthSum.income)}</div>
                <div className="text-sm" style={{color: monthSum.profit>0?"#10b981":monthSum.profit<0?"#ef4444":undefined}}>Profit €{toMoney(monthSum.profit)}</div>
                <Button size="sm" variant="outline" onClick={()=>setOpenMonth(s=>({...s,[ym]:!s[ym]}))}>{openMonth[ym]?"Hide":"Expand"}</Button>
              </div>
            </div>

            {openMonth[ym] && (
              <div className="p-3">
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
                      {Object.keys(byWeek).sort().map(wk=>{
                        const wkRows=byWeek[wk], byDay={}; wkRows.forEach(r=>{ (byDay[r.dateISO||r.date] ||= []).push(r); });
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
                              <td className="p-2 text-right" style={{color: wkSum.profit>0?"#10b981":wkSum.profit<0?"#ef4444":undefined}}>{toMoney(wkSum.profit)}</td>
                              <td className="p-2 text-right"><Button size="sm" variant="outline" onClick={()=>setOpenWeek(s=>({...s,[wk]:!s[wk]}))}>{openWeek[wk]?"Hide":"View"}</Button></td>
                            </tr>

                            {openWeek[wk] && (
                              <tr>
                                <td colSpan={9} className="p-0">
                                  <div className="px-3 pb-3">
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
                                          {Object.keys(byDay).sort().map(dk=>{
                                            const dRows = byDay[dk]; const dSum = summarizeRows(dRows);
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
                                                  <td className="p-2 text-right" style={{color: dSum.profit>0?"#10b981":dSum.profit<0?"#ef4444":undefined}}>{toMoney(dSum.profit)}</td>
                                                  <td className="p-2 text-right">
                                                    <Button size="sm" variant="outline" onClick={()=>setOpenDay(s=>({...s,[dk]:!s[dk]}))}>{openDay[dk]?"Hide":"Details"}</Button>
                                                  </td>
                                                </tr>

                                                {openDay[dk] && (
                                                  <tr>
                                                    <td colSpan={9} className="p-0">
                                                      <div className="px-2 pb-3">
                                                        <div className="overflow-x-auto border rounded-lg">
                                                          <table className="min-w-full text-sm">
                                                            <thead className="bg-zinc-50">
                                                              <tr>
                                                                <th className="p-2 text-left">Recruiter</th>
                                                                <th className="p-2 text-right">Shifts</th>
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
                                                              {dSum.detail.map((r,i)=>(
                                                                <tr key={`${r.recruiterId||i}_${r._k||i}`} className="border-t">
                                                                  <td className="p-2">{r.recruiterName||r.recruiterId||"—"}</td>
                                                                  <td className="p-2 text-right">1</td>
                                                                  <td className="p-2 text-right">{Number(r.score||0).toFixed(2)}</td>
                                                                  <td className="p-2 text-right">{Number(r.box2_noDisc)||0}</td>
                                                                  <td className="p-2 text-right">{Number(r.box2_disc)||0}</td>
                                                                  <td className="p-2 text-right">{Number(r.box4_noDisc)||0}</td>
                                                                  <td className="p-2 text-right">{Number(r.box4_disc)||0}</td>
                                                                  <td className="p-2 text-right">{toMoney(calcWages(r))}</td>
                                                                  <td className="p-2 text-right">{toMoney(calcIncome(r))}</td>
                                                                  <td className="p-2 text-right">{toMoney(calcBonus(r))}</td>
                                                                  <td className="p-2 text-right" style={{color:r.profit>0?"#10b981":r.profit<0?"#ef4444":undefined}}>{toMoney(r.profit)}</td>
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
      })}
    </div>
  );
}
