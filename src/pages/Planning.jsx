// Planning.jsx — Edit Day width x2, B2s/B4s fixed, show recruiter rows only after click, preview tweaks (centered Zone, remove Project), week/title single-line (v2025-08-28d)

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { MODAL_SIZES, titleCaseFirstOnBlur, passthrough, normalizeNumericOnBlur } from "../util";

export default function Planning({ week, days, setDays }) {
  const [editing, setEditing] = useState(null);

  const updateDayField = (dayIndex, key, value) => {
    setDays((prev) => {
      const copy = [...prev];
      const d = { ...copy[dayIndex], [key]: value };
      copy[dayIndex] = d;
      return copy;
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="whitespace-nowrap">{/* one line */}Planning</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {(days || []).map((d, i) => (
              <div key={i} className="border rounded">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50">
                  <div className="text-sm font-semibold whitespace-nowrap">{d.dateStr} • {d.dayStr}</div>
                  <Button size="sm" onClick={() => setEditing(i)}>Edit</Button>
                </div>
                <div className="p-3">
                  <div className="text-center font-medium">{/* Zone centered; Project removed */}{d.zone || "—"}</div>
                  <div className="mt-2 grid grid-cols-3 text-xs text-gray-600 bg-gray-50 rounded">
                    <div className="py-1 text-center">Shifts</div>
                    <div className="py-1 text-center">B2s</div>
                    <div className="py-1 text-center">B4s</div>
                  </div>
                  <div className="grid grid-cols-3">
                    <div className="py-1 text-center">{d.recruiters?.length || 0}</div>
                    <div className="py-1 text-center">{d.b2s ?? 0}</div>
                    <div className="py-1 text-center">{d.b4s ?? 0}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* EDIT DAY — large horizontal size via util */}
      <Dialog open={editing != null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className={`${MODAL_SIZES.workbench.className}`}>
          <div className={MODAL_SIZES.workbench.contentClass}>
            <DialogHeader className="sticky top-0 bg-white/80 backdrop-blur z-10 border-b">
              <DialogTitle>Edit Day</DialogTitle>
            </DialogHeader>

            {editing != null && (
              <div className="p-6 space-y-6">
                {/* Zone + B2s + B4s */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-600">Zone</label>
                    <Input
                      value={days[editing].zone || ""}
                      onChange={passthrough((v) => updateDayField(editing, "zone", v))}
                      onBlur={(e) => updateDayField(editing, "zone", titleCaseFirstOnBlur(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">B2s</label>
                    <Input
                      inputMode="decimal"
                      value={days[editing].b2s ?? ""}
                      onChange={passthrough((v) => updateDayField(editing, "b2s", v))}
                      onBlur={(e) => updateDayField(editing, "b2s", normalizeNumericOnBlur(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">B4s</label>
                    <Input
                      inputMode="decimal"
                      value={days[editing].b4s ?? ""}
                      onChange={passthrough((v) => updateDayField(editing, "b4s", v))}
                      onBlur={(e) => updateDayField(editing, "b4s", normalizeNumericOnBlur(e.target.value))}
                    />
                  </div>
                </div>

                {/* Recruiters — only appears after clicking Add Recruiter */}
                <RecruitersBlock dayIndex={editing} day={days[editing]} updateDayField={updateDayField} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecruitersBlock({ dayIndex, day, updateDayField }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-3">
      <Button variant="secondary" onClick={() => setShow(true)}>Add Recruiter</Button>
      {show && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-600">Recruiter</label>
            <Input
              value={day.tmpRecruiter || ""}
              onChange={(e) => updateDayField(dayIndex, "tmpRecruiter", e.target.value)}
              onBlur={(e) => updateDayField(dayIndex, "tmpRecruiter", titleCaseFirstOnBlur(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Hours</label>
            <Input
              inputMode="decimal"
              value={day.tmpHours ?? ""}
              onChange={(e) => updateDayField(dayIndex, "tmpHours", e.target.value)}
              onBlur={(e) => updateDayField(dayIndex, "tmpHours", normalizeNumericOnBlur(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Score</label>
            <Input
              inputMode="decimal"
              value={day.tmpScore ?? ""}
              onChange={(e) => updateDayField(dayIndex, "tmpScore", e.target.value)}
              onBlur={(e) => updateDayField(dayIndex, "tmpScore", normalizeNumericOnBlur(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => {
                const rec = {
                  id: crypto.randomUUID(),
                  name: day.tmpRecruiter || "",
                  hours: Number(day.tmpHours || 0),
                  score: Number(day.tmpScore || 0),
                };
                updateDayField(dayIndex, "recruiters", [...(day.recruiters || []), rec]);
                updateDayField(dayIndex, "tmpRecruiter", "");
                updateDayField(dayIndex, "tmpHours", "");
                updateDayField(dayIndex, "tmpScore", "");
              }}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
