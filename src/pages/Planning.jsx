// Planning.jsx — Proago CRM (Final Sync Build v2025-08-28e)
// - Edit Day modal uses large workbench size (same as Recruiter Info)
// - B2s/B4s input bug fixed (no formatting while typing; clean on blur)
// - Recruiter rows hidden until "Add Recruiter" clicked
// - Preview card: zone centered, project removed, date/day header gray background
// - Maintains linkage: saving pushes rows into `history` consumed by Finances

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  MODAL_SIZES,
  titleCaseFirstOnBlur,
  normalizeNumericOnBlur,
  passthrough,
  fmtUK,
} from "../util";

export default function Planning({
  weekStartISO,
  setWeekStartISO,
  days,
  setDays,
  history,
  setHistory,
}) {
  const [editingIndex, setEditingIndex] = useState(null);

  const weekDates = useMemo(() => {
    const base = new Date(weekStartISO);
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [weekStartISO]);

  const openEdit = (idx) => setEditingIndex(idx);
  const closeEdit = () => setEditingIndex(null);

  const updateDayField = (idx, key, value) => {
    setDays((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const pushRecruiter = (idx, rec) => {
    setDays((prev) => {
      const next = [...prev];
      const day = { ...next[idx] };
      day.recruiters = [...(day.recruiters || []), rec];
      // clear temp inputs
      day.tmpRecruiter = "";
      day.tmpHours = "";
      day.tmpScore = "";
      next[idx] = day;
      return next;
    });
  };

  const persistDayToHistory = (idx) => {
    const d = days[idx];
    const dateISO = d.dateISO || weekDates[idx];
    const rows = (d.recruiters || []).map((r, i) => ({
      _rowKey: i,
      dateISO,
      zone: d.zone || "",
      recruiterId: r.id || r.recruiterId || null,
      recruiterName: r.name || "",
      score: Number(r.score || 0),
      hours: Number(r.hours || 0),
      // Split unknowns as "no discount" by default; editable later in Finances
      box2_noDisc: Number(d.b2s || 0),
      box2_disc: 0,
      box4_noDisc: Number(d.b4s || 0),
      box4_disc: 0,
      roleAtShift: r.rank || r.role || "Rookie",
      shiftType: "D2D",
      project: "HF",
      location: d.zone || "",
      commissionMult: "",
    }));
    if (rows.length === 0) return;
    setHistory((prev) => [...prev, ...rows]);
  };

  return (
    <div className="grid gap-4">
      {/* Week Controls */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Planning</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => shiftWeek(setWeekStartISO, weekStartISO, -7)}>
              ◀ Prev
            </Button>
            <input
              className="h-10 border rounded-md px-2"
              type="date"
              value={weekStartISO}
              onChange={passthrough((v) => setWeekStartISO(v))}
            />
            <Button variant="outline" onClick={() => shiftWeek(setWeekStartISO, weekStartISO, +7)}>
              Next ▶
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {days.map((day, idx) => (
              <DayCard
                key={idx}
                idx={idx}
                dateISO={weekDates[idx]}
                zone={day.zone}
                b2s={day.b2s}
                b4s={day.b4s}
                recruiters={day.recruiters || []}
                onEdit={() => openEdit(idx)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* EDIT DAY — large shared workbench */}
      <Dialog open={editingIndex != null} onOpenChange={(v) => !v && closeEdit()}>
        <DialogContent className={MODAL_SIZES.workbench.className}>
          <div className={MODAL_SIZES.workbench.contentClass}>
            <DialogHeader className="sticky top-0 bg-white/80 backdrop-blur z-10 border-b">
              <DialogTitle>Edit Day</DialogTitle>
            </DialogHeader>

            {editingIndex != null && (
              <div className="p-6 space-y-6">
                {/* Core Fields */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600">Zone</label>
                    <Input
                      value={days[editingIndex].zone || ""}
                      onChange={passthrough((v) => updateDayField(editingIndex, "zone", v))}
                      onBlur={(e) => updateDayField(editingIndex, "zone", titleCaseFirstOnBlur(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">B2s</label>
                    <Input
                      inputMode="decimal"
                      value={days[editingIndex].b2s ?? ""}
                      onChange={passthrough((v) => updateDayField(editingIndex, "b2s", v))}
                      onBlur={(e) => updateDayField(editingIndex, "b2s", normalizeNumericOnBlur(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">B4s</label>
                    <Input
                      inputMode="decimal"
                      value={days[editingIndex].b4s ?? ""}
                      onChange={passthrough((v) => updateDayField(editingIndex, "b4s", v))}
                      onBlur={(e) => updateDayField(editingIndex, "b4s", normalizeNumericOnBlur(e.target.value))}
                    />
                  </div>
                </div>

                {/* Recruiters (only after clicking the button) */}
                <RecruitersEditor
                  day={days[editingIndex]}
                  onAdd={(rec) => pushRecruiter(editingIndex, rec)}
                />

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={closeEdit}>Close</Button>
                  <Button
                    className="bg-black text-white hover:opacity-90"
                    onClick={() => {
                      persistDayToHistory(editingIndex);
                      closeEdit();
                    }}
                  >
                    Save To History
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------- Day Card -------------------- */

function DayCard({ idx, dateISO, zone, b2s, b4s, recruiters, onEdit }) {
  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Date/Day header with gray background */}
      <div className="bg-zinc-50 px-4 py-2 flex items-center justify-between">
        <div className="font-medium">{fmtUK(dateISO)}</div>
        <div className="text-sm text-gray-600">Day {idx + 1}</div>
      </div>

      <div className="p-4 space-y-2">
        {/* Zone centered, no project */}
        <div className="text-center text-lg font-semibold">{zone || "—"}</div>

        <div className="text-sm text-gray-600 flex items-center justify-center gap-4">
          <span>B2s: {Number(b2s || 0)}</span>
          <span>B4s: {Number(b4s || 0)}</span>
          <span>Recs: {recruiters.length}</span>
        </div>

        <div className="pt-2">
          <Button variant="outline" onClick={onEdit}>Edit Day</Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Recruiters Editor -------------------- */

function RecruitersEditor({ day, onAdd }) {
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(day.tmpRecruiter || "");
  const [hours, setHours] = useState(day.tmpHours || "");
  const [score, setScore] = useState(day.tmpScore || "");

  const add = () => {
    if (!name.trim()) return;
    onAdd({
      id: null,
      name: titleCaseFirstOnBlur(name.trim()),
      hours: Number(hours || 0),
      score: Number(score || 0),
      rank: "Rookie",
    });
    setName("");
    setHours("");
    setScore("");
  };

  return (
    <div className="space-y-3">
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Add Recruiter
      </Button>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-600">Recruiter</label>
            <Input
              value={name}
              onChange={passthrough(setName)}
              onBlur={(e) => setName(titleCaseFirstOnBlur(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Hours</label>
            <Input
              inputMode="decimal"
              value={hours}
              onChange={passthrough(setHours)}
              onBlur={(e) => setHours(normalizeNumericOnBlur(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Score</label>
            <Input
              inputMode="decimal"
              value={score}
              onChange={passthrough(setScore)}
              onBlur={(e) => setScore(normalizeNumericOnBlur(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={add}>Add</Button>
          </div>
        </div>
      )}

      {/* Current recruiters list */}
      {(day.recruiters || []).length > 0 && (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-right">Hours</th>
                <th className="p-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {day.recruiters.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-right">{Number(r.hours || 0).toFixed(2)}</td>
                  <td className="p-2 text-right">{Number(r.score || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* -------------------- Helpers -------------------- */
function shiftWeek(setWeekStartISO, currentISO, deltaDays) {
  const d = new Date(currentISO);
  d.setDate(d.getDate() + deltaDays);
  d.setHours(0, 0, 0, 0);
  setWeekStartISO(d.toISOString().slice(0, 10));
}
