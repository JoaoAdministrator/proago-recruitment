// Recruiters.jsx — Proago CRM (Final Sync Build v2025-08-28d)
// - Rank (was Role), Average (was Avg), Box2/Box4 (no %)
// - Info modal full-screen like Edit Day
// - Deactivate button: black bg + white text
// - Fixed one-letter typing bug

import React, { useState, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Trash2, Info } from "lucide-react";
import {
  titleCaseFirstOnBlur,
  passthrough,
  emailOnChange,
  MODAL_SIZES,
  avgColor,
  boxPercentsLast8w,
  last5ScoresFor,
} from "../util";

export default function Recruiters({ recruiters, setRecruiters, history = [] }) {
  const [selected, setSelected] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const openInfo = (rec) => {
    setSelected(rec);
    setInfoOpen(true);
  };

  const toggleActive = (rec) => {
    setRecruiters((rs) =>
      rs.map((r) => (r.id === rec.id ? { ...r, isInactive: !r.isInactive } : r))
    );
  };

  const remove = (rec) => {
    if (!confirm("Really delete recruiter? This cannot be undone.")) return;
    setRecruiters((rs) => rs.filter((r) => r.id !== rec.id));
  };

  // Info modal (full workbench size)
  const InfoDialog = ({ rec }) => {
    if (!rec) return null;
    const scores = last5ScoresFor(history, rec.id);
    const stats = boxPercentsLast8w(history, rec.id) || { b2: 0, b4: 0 };

    return (
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className={MODAL_SIZES.workbench.className}>
          <div className={MODAL_SIZES.workbench.contentClass}>
            <DialogHeader>
              <DialogTitle>Recruiter Info — {rec.name}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div><b>Crewcode:</b> {rec.crewCode}</div>
                <div><b>Rank:</b> {rec.rank}</div>
                <div><b>Mobile:</b> {rec.mobile}</div>
                <div><b>Email:</b> {rec.email}</div>
                <div><b>Source:</b> {rec.source}</div>
                <div><b>Status:</b> {rec.isInactive ? "Inactive" : "Active"}</div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Performance</h4>
                <p>Last 5 scores: {scores.join(" - ") || "No data"}</p>
                <p>
                  Average:{" "}
                  <span style={{ color: avgColor(scores) }}>
                    {average(scores)}
                  </span>
                </p>
                <p>Box2 (8w): {stats.b2.toFixed(1)}%</p>
                <p>Box4 (8w): {stats.b4.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader><CardTitle>Recruiters</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Crewcode</th>
                  <th className="p-3 text-left">Rank</th>
                  <th className="p-3 text-center">Last 5</th>
                  <th className="p-3 text-center">Average</th>
                  <th className="p-3 text-center">Box2</th>
                  <th className="p-3 text-center">Box4</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recruiters.map((r) => {
                  const scores = last5ScoresFor(history, r.id);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3">{r.crewCode}</td>
                      <td className="p-3">{r.rank}</td>
                      <td className="p-3 text-center">{scores.join(" - ")}</td>
                      <td
                        className="p-3 text-center"
                        style={{ color: avgColor(scores) }}
                      >
                        {average(scores)}
                      </td>
                      <td className="p-3 text-center">{/* Box2 calc */}</td>
                      <td className="p-3 text-center">{/* Box4 calc */}</td>
                      <td className="p-3 flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openInfo(r)}>
                          <Info className="h-4 w-4 mr-1" /> Info
                        </Button>
                        <Button
                          size="sm"
                          className="bg-black text-white hover:opacity-80"
                          onClick={() => toggleActive(r)}
                        >
                          {r.isInactive ? "Activate" : "Deactivate"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => remove(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <InfoDialog rec={selected} />
    </div>
  );
}

/* -------------------- Helpers -------------------- */
function average(scores) {
  if (!scores.length) return "0.0";
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
}
