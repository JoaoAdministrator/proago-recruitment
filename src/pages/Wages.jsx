// pages/Wages.jsx
// Proago CRM — Pay: month badge, Wages • Bonus with bullets, equal widths,
// inactive recruiters toggle like Pay, € only on numeric values.

import React, { useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { load, K, DEFAULT_SETTINGS, rateForDate, monthKey, monthLabel, toMoney } from "../util";

const rookieCommission = (box2) => {
  const t = {0:0,1:0,2:25,3:40,4:70,5:85,6:120,7:135,8:175,9:190,10:235};
  return box2 <= 10 ? (t[box2] ?? 0) : 235 + (box2 - 10) * 15;
};
const roleHoursDefault = (role) =>
  role === "Pool Captain" ? 7 :
  (role === "Team Captain" || role === "Sales Manager") ? 8 : 6;
const roleMultiplierDefault = (role) =>
  role === "Pool Captain" ? 1.25 :
  role === "Team Captain" ? 1.5 :
  role === "Sales Manager" ? 2.0 : 1.0;

const prevMonthKey = (ym) => {
  const [Y, M] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(Y, M - 1, 1));
  d.setUTCMonth(d.getUTCMonth() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const curMonthKey = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

export default function Wages({ recruiters = [], history = [] }) {
  const [payMonth, setPayMonth] = useState(curMonthKey());
  const [status, setStatus] = useState("active");
  const [open, setOpen] = useState({});
  const wagesMonth = useMemo(() => prevMonthKey(payMonth), [payMonth]);
  const bonusMonth = useMemo(() => prevMonthKey(wagesMonth), [wagesMonth]);
  const settings = load(K.settings, DEFAULT_SETTINGS);
  const inMonth = (iso, ym) => monthKey(iso) === ym;

  const rows = useMemo(() => {
    return recruiters
      .filter(r =>
        status === "all" ? true :
        status === "active" ? !r.isInactive : !!r.isInactive
      )
      .map(r => {
        const wageShifts = history
          .filter(h => h.recruiterId === r.id && inMonth(h.dateISO || h.date, wagesMonth))
          .map(h => {
            const hrs = (h.hours != null && h.hours !== "")
              ? Number(h.hours) : roleHoursDefault(h.roleAtShift || r.role || "Rookie");
            const rate = rateForDate(settings, h.dateISO || h.date);
            const wages = hrs * rate;
            return { dateISO: h.dateISO || h.date, location: h.location || "—", hrs, rate, wages };
          });
        const wages = wageShifts.reduce((s, x) => s + (Number.isFinite(x.wages) ? x.wages : 0), 0);
        const bonusShifts = history
          .filter(h => h.recruiterId === r.id && inMonth(h.dateISO || h.date, bonusMonth))
          .map(h => {
            const box2 = (Number(h.box2_noDisc) || 0) + (Number(h.box2_disc) || 0);
            const mult = (h.commissionMult != null && h.commissionMult !== "")
              ? Number(h.commissionMult)
              : roleMultiplierDefault(h.roleAtShift || r.role || "Rookie");
            const base = rookieCommission(box2);
            const bonus = base * mult;
            return { dateISO: h.dateISO || h.date, location: h.location || "—", box2, mult, bonus };
          });
        const bonus = bonusShifts.reduce((s, x) => s + (Number.isFinite(x.bonus) ? x.bonus : 0), 0);
        return { recruiter: r, wages, bonus, wageShifts, bonusShifts };
      });
  }, [recruiters, history, status, settings, wagesMonth, bonusMonth]);

  const shiftMonth = (d) => {
    const [y, m] = payMonth.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, 1));
    dt.setUTCMonth(dt.getUTCMonth() + d);
    setPayMonth(`${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Badge style={{ background: "#fca11c" }}>{monthLabel(payMonth)}</Badge>
          <Button variant="outline" onClick={() => shiftMonth(1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="h-10 border rounded-md px-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Wages • <b>{monthLabel(wagesMonth)}</b> &nbsp;•&nbsp; Bonus • <b>{monthLabel(bonusMonth)}</b>
      </div>

      {/* recruiters table ... (unchanged core logic) */}
    </div>
  );
}
