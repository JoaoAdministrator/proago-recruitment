// Recruiters.jsx
// Proago CRM component (updated build v2025-08-28 with Chat 9 changes)

import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Edit3, Trash2 } from "lucide-react";
import { titleCase, avgColor, clone } from "../util";

export default function Recruiters({ recruiters, setRecruiters, history, setHistory }) {
  const [selected, setSelected] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const openInfo = (rec) => {
    setSelected(rec);
    setInfoOpen(true);
  };

  const toggleActive = (rec) => {
    setRecruiters(rs =>
      rs.map(r => r.id === rec.id ? { ...r, isInactive: !r.isInactive } : r)
    );
  };

  const remove = (rec) => {
    if (!confirm("Really delete recruiter? This cannot be undone.")) return;
    setRecruiters(rs => rs.filter(r => r.id !== rec.id));
  };

  const last5Scores = (recId) => {
    const scores = history.filter(h => h.recruiterId === recId).slice(-5).map(h => h.score);
    return scores;
  };

  const average = (scores) => {
    if (!scores.length) return 0;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  // monthly revenue & wages from history
  const thisMonthStats = (recId) => {
    const now = new Date();
    const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const rows = history.filter(h => h.recruiterId === recId && h.date.startsWith(ym));
    const wages = rows.reduce((s, r) => s + (r.wages || 0), 0);
    const revenue = rows.reduce((s, r) => s + (r.income || 0), 0);
    return { wages, revenue };
  };

  const InfoDialog = ({ rec }) => {
    if (!rec) return null;
    const scores = last5Scores(rec.id);
    const stats = thisMonthStats(rec.id);

    return (
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recruiter Info — {titleCase(rec.name)}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="flex gap-4">
              <div>
                <input type="file" accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setRecruiters(rs =>
                        rs.map(r => r.id === rec.id ? { ...r, photo: reader.result } : r)
                      );
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                {rec.photo && <img src={rec.photo} alt="profile" className="h-32 mt-2 rounded" />}
              </div>
              <div className="grid gap-2">
                <div><b>Crewcode:</b> {rec.crewCode}</div>
                <div><b>Role:</b> {rec.role}</div>
                <div><b>Phone:</b> {rec.phone}</div>
                <div><b>Email:</b> {rec.email}</div>
                <div><b>Source:</b> {rec.source}</div>
                <div><b>This Month Wages:</b> €{stats.wages.toFixed(2)}</div>
                <div><b>This Month Revenue:</b> €{stats.revenue.toFixed(2)}</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold">Performance</h4>
              <p>Last 5 scores: {scores.join(" - ") || "No data"}</p>
              <p>Average: <span style={{ color: avgColor(average(scores)) }}>{average(scores)}</span></p>
              <p>Box2% (8w): {/* calc Box2% */}</p>
              <p>Box4% (8w): {/* calc Box4% */}</p>
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
                  <th className="p-3">Crewcode</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Last 5</th>
                  <th className="p-3">Avg</th>
                  <th className="p-3">Box2%</th>
                  <th className="p-3">Box4%</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recruiters.map(r => {
                  const scores = last5Scores(r.id);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 font-medium">{titleCase(r.name)}</td>
                      <td className="p-3">{r.crewCode}</td>
                      <td className="p-3">{r.role}</td>
                      <td className="p-3">{scores.join("-")}</td>
                      <td className="p-3" style={{ color: avgColor(average(scores)) }}>{average(scores)}</td>
                      <td className="p-3">{/* Box2% calc */}</td>
                      <td className="p-3">{/* Box4% calc */}</td>
                      <td className="p-3 flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => openInfo(r)}>Info</Button>
                        <Button size="sm" style={{ background: "#fca11c", color: "black" }} onClick={() => toggleActive(r)}>
                          {r.isInactive ? "Activate" : "Deactivate"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => remove(r)}>
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
