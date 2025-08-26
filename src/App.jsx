// App.jsx — Proago Recruitment v3 (with Indeed Import)
// One file. Replace your src/App.jsx with this.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Badge } from "./components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import {
  Download,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Edit3,
  Plus,
  X,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
  Auth
────────────────────────────────────────────────────────────────────────── */
const AUTH_USER = "Administrator";
const AUTH_PASS = "Sergio R4mos";
const AUTH_SESSION_KEY = "proago_auth_session";

/* ──────────────────────────────────────────────────────────────────────────
  Storage helpers & keys
────────────────────────────────────────────────────────────────────────── */
const load = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

const K = {
  recruiters: "proago_recruiters_v3",
  pipeline: "proago_pipeline_v3",
  history: "proago_history_v3",
  planning: "proago_planning_v3",
};

/* ──────────────────────────────────────────────────────────────────────────
  Dates & helpers
────────────────────────────────────────────────────────────────────────── */
const fmtISO = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfWeekMon = (date = new Date()) => {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};
const weekNumberISO = (date) => {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const diff = target - firstThursday;
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
};
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* ──────────────────────────────────────────────────────────────────────────
  History helpers (NO duplicate rows: upsert by date+recruiter)
────────────────────────────────────────────────────────────────────────── */
const upsertHistory = (history, entry) => {
  const i = history.findIndex(
    (h) => h.recruiterId === entry.recruiterId && h.dateISO === entry.dateISO
  );
  if (i >= 0) {
    history[i] = { ...history[i], ...entry };
  } else {
    history.push(entry);
  }
  return [...history];
};
const last5Avg = (history, id) => {
  const recent = history
    .filter((h) => h.recruiterId === id && typeof h.score === "number")
    .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
    .slice(0, 5);
  if (!recent.length) return 0;
  return recent.reduce((s, h) => s + (Number(h.score) || 0), 0) / recent.length;
};

/* ──────────────────────────────────────────────────────────────────────────
  Import normalization — accepts our shape OR Indeed JSON
────────────────────────────────────────────────────────────────────────── */
// Accepts our app shape OR Indeed application JSON (single or array) and normalizes to {leads, interview, formation}
function normalizeImportedJson(raw) {
  // Case A: already our shape
  if (raw && Array.isArray(raw.leads) && Array.isArray(raw.interview) && Array.isArray(raw.formation)) {
    return raw;
  }

  // Indeed one object
  const looksLikeIndeedOne =
    raw && typeof raw === "object" &&
    raw.applicant && (raw.applicant.fullName || raw.applicant.phoneNumber);

  // Indeed array
  const looksLikeIndeedArray =
    Array.isArray(raw) &&
    raw.length > 0 &&
    raw[0] && raw[0].applicant && (raw[0].applicant.fullName || raw[0].applicant.phoneNumber);

  const toLead = (obj) => {
    const a = obj.applicant || {};
    const name = (a.fullName || "").trim();
    const phone = (a.phoneNumber || "").toString().replace(/\s+/g, " ").trim();
    return {
      id: `lead_${obj.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()))}`,
      name,
      phone,
      source: "Indeed",
    };
  };

  if (looksLikeIndeedOne) {
    return { leads: [toLead(raw)], interview: [], formation: [] };
  }
  if (looksLikeIndeedArray) {
    return { leads: raw.map(toLead), interview: [], formation: [] };
  }

  // Plain array of simple objects {name,phone,source}
  if (Array.isArray(raw)) {
    return {
      leads: raw.map((r, i) => ({
        id: r.id || `lead_${i}_${Date.now()}`,
        name: r.name || "",
        phone: r.phone || "",
        source: r.source || "Import",
      })),
      interview: [],
      formation: [],
    };
  }

  throw new Error("Unsupported import file format.");
}

/* ──────────────────────────────────────────────────────────────────────────
  Auth gate
────────────────────────────────────────────────────────────────────────── */
const Login = ({ onOk }) => {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (u === AUTH_USER && p === AUTH_PASS) {
      sessionStorage.setItem(AUTH_SESSION_KEY, "1");
      onOk();
    } else alert("Invalid credentials");
  };
  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: "Lora,serif" }}>
            Proago Recruitment
          </CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-1">
              <Label>Username</Label>
              <Input value={u} onChange={(e) => setU(e.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label>Password</Label>
              <Input
                type="password"
                value={p}
                onChange={(e) => setP(e.target.value)}
              />
            </div>
            <Button style={{ background: "#d9010b" }}>Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  Shell (tabs with your colors + icon)
────────────────────────────────────────────────────────────────────────── */
const Shell = ({ tab, setTab, onLogout, children, weekBadge }) => (
  <div className="min-h-screen">
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/proago-icon.png"
            alt="Proago"
            className="h-7 w-7 rounded-full"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <span className="font-semibold text-lg" style={{ fontFamily: "Lora,serif" }}>
            Proago Recruitment
          </span>
          {weekBadge && (
            <Badge variant="secondary" className="ml-3">
              {weekBadge}
            </Badge>
          )}
        </div>
        <nav className="flex gap-2">
          {[
            ["inflow", "Inflow"],
            ["recruiters", "Recruiters"],
            ["planning", "Planning"],
          ].map(([key, label]) => (
            <Button
              key={key}
              onClick={() => setTab(key)}
              className="px-4"
              style={
                tab === key
                  ? { background: "#d9010b", color: "white" }
                  : { background: "#f7f7f7" }
              }
            >
              {label}
            </Button>
          ))}
          <Button variant="ghost" onClick={onLogout}>
            Logout
          </Button>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
  </div>
);

/* ──────────────────────────────────────────────────────────────────────────
  Inflow (Pipeline) — Import (supports Indeed) + Add Lead dialog
────────────────────────────────────────────────────────────────────────── */
const AddLeadDialog = ({ open, onOpenChange, onSave }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("Indeed");
  const reset = () => {
    setName("");
    setPhone("");
    setSource("Indeed");
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
          <DialogDescription>Only Name, Phone and Source are required.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="grid gap-1">
            <Label>Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-1">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="grid gap-1 md:col-span-2">
            <Label>Source</Label>
            <select
              className="h-10 border rounded-md px-2"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option>Indeed</option>
              <option>Street</option>
              <option>Referral</option>
              <option>Phone</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            style={{ background: "#d9010b", color: "white" }}
            onClick={() => {
              if (!name.trim()) return alert("Name required");
              const lead = {
                id: (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())),
                name: name.trim(),
                phone: phone.trim(),
                source: source.trim(),
              };
              onSave(lead);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Inflow = ({ pipeline, setPipeline, onHire }) => {
  const fileRef = useRef(null);
  const [addOpen, setAddOpen] = useState(false);

  const move = (item, from, to) => {
    const next = structuredClone(pipeline);
    next[from] = next[from].filter((x) => x.id !== item.id);
    next[to].push(item);
    setPipeline(next);
  };
  const del = (item, from) => {
    if (!confirm("Delete this entry?")) return;
    const next = structuredClone(pipeline);
    next[from] = next[from].filter((x) => x.id !== item.id);
    setPipeline(next);
  };
  const hire = (item) => {
    let code = prompt("Crewcode (numbers or text you decide):");
    if (code == null) return;
    code = String(code).trim();
    const role = prompt("Role (default Rookie):", "Rookie") || "Rookie";
    onHire({ ...item, crewCode: code, role });
    const next = structuredClone(pipeline);
    next.formation = next.formation.filter((x) => x.id !== item.id);
    setPipeline(next);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(pipeline, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pipeline.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // NEW: import handler using normalizeImportedJson (supports Indeed JSON)
  const onImportPipeline = (file) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const data = JSON.parse(fr.result);
        const normalized = normalizeImportedJson(data);
        setPipeline(normalized);
        alert("Import done ✅");
      } catch (err) {
        console.error(err);
        alert("Import failed: " + (err?.message || "Invalid file"));
      }
    };
    fr.readAsText(file);
  };

  const Column = ({ title, keyName, prev, nextKey, extra }) => (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge>{pipeline[keyName].length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Source</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pipeline[keyName].map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="p-3 font-medium">{x.name}</td>
                  <td className="p-3">{x.phone}</td>
                  <td className="p-3">{x.source}</td>
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      {prev && (
                        <Button variant="outline" size="sm" onClick={() => move(x, keyName, prev)}>
                          Back
                        </Button>
                      )}
                      {nextKey && (
                        <Button
                          size="sm"
                          style={{ background: "#d9010b", color: "white" }}
                          onClick={() => move(x, keyName, nextKey)}
                        >
                          Move →
                        </Button>
                      )}
                      {extra && extra(x)}
                      <Button variant="destructive" size="sm" onClick={() => del(x, keyName)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Inflow</h3>
        <div className="flex items-center gap-2">
          <Button onClick={exportJSON}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && onImportPipeline(e.target.files[0])}
          />
          <Button style={{ background: "#d9010b", color: "white" }} onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Lead
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Column title="Leads" keyName="leads" nextKey="interview" />
        <Column title="Interview" keyName="interview" prev="leads" nextKey="formation" />
        <Column
          title="Formation"
          keyName="formation"
          prev="interview"
          extra={(x) => (
            <Button size="sm" onClick={() => hire(x)}>
              <UserPlus className="h-4 w-4 mr-1" />
              Hire
            </Button>
          )}
        />
      </div>

      <AddLeadDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={(lead) =>
          setPipeline((p) => ({ ...p, leads: [lead, ...p.leads] }))
        }
      />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  Recruiters (Crewcode + Edit dialog)
────────────────────────────────────────────────────────────────────────── */
const roles = ["Rookie", "Promoter", "Pool Captain", "Team Captain", "Manager"];

const Recruiters = ({ recruiters, setRecruiters, history }) => {
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);

  const avg = (id) => last5Avg(history, id).toFixed(2);

  const del = (id) => {
    if (!confirm("Delete recruiter? History will be kept.")) return;
    setRecruiters(recruiters.filter((r) => r.id !== id));
  };

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Crewcode</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-right">Average</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recruiters.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">
                  <button className="underline" onClick={() => setDetail(r)}>
                    {r.name}
                  </button>
                </td>
                <td className="p-3">{r.crewCode}</td>
                <td className="p-3">{r.role}</td>
                <td className="p-3 text-right">{avg(r.id)}</td>
                <td className="p-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setEdit(r)}>
                      <Edit3 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => del(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* History modal (scrollable) */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.name} — {detail?.crewCode}</DialogTitle>
            <DialogDescription>All-time shifts</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Location</th>
                  <th className="p-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {history
                  .filter((h) => h.recruiterId === detail?.id)
                  .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
                  .map((h, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{h.dateISO}</td>
                      <td className="p-2">{h.location || "—"}</td>
                      <td className="p-2 text-right">{h.score ?? "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button onClick={() => setDetail(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!edit} onOpenChange={() => setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit recruiter</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Full name</Label>
              <Input
                value={edit?.name || ""}
                onChange={(e) => setEdit((x) => ({ ...x, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <Label>Crewcode</Label>
              <Input
                value={edit?.crewCode ?? ""}
                onChange={(e) => setEdit((x) => ({ ...x, crewCode: e.target.value }))}
              />
            </div>
            <div className="grid gap-1">
              <Label>Role</Label>
              <select
                className="h-10 border rounded-md px-2"
                value={edit?.role || "Rookie"}
                onChange={(e) => setEdit((x) => ({ ...x, role: e.target.value }))}
              >
                {roles.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button
              style={{ background: "#d9010b", color: "white" }}
              onClick={() => {
                setRecruiters((all) =>
                  all.map((r) => (r.id === edit.id ? edit : r))
                );
                setEdit(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  Planning — Mon→Sun, horizontal columns, week persistence, teams
────────────────────────────────────────────────────────────────────────── */
const ensureWeek = (state, weekISO) => {
  const base = state[weekISO] || { days: {} };
  for (let i = 0; i < 7; i++) {
    const dateISO = fmtISO(addDays(new Date(weekISO), i));
    if (!base.days[dateISO]) {
      base.days[dateISO] = { teams: [{ name: "Team A", location: "", members: [] }] };
    }
  }
  return { ...state, [weekISO]: base };
};

const Planning = ({ recruiters, planning, setPlanning, history, setHistory }) => {
  const [weekStart, setWeekStart] = useState(() => fmtISO(startOfWeekMon(new Date())));
  useEffect(() => setPlanning((p) => ensureWeek(p, weekStart)), [weekStart]);

  const weekObj = ensureWeek(planning, weekStart)[weekStart];
  const weekNum = weekNumberISO(new Date(weekStart));

  const addTeam = (dateISO) => {
    const next = structuredClone(planning);
    ensureWeek(next, weekStart);
    const teams = next[weekStart].days[dateISO].teams;
    const name = `Team ${String.fromCharCode(65 + teams.length)}`;
    teams.push({ name, location: "", members: [] });
    setPlanning(next);
  };
  const setLocation = (dateISO, ti, val) => {
    const next = structuredClone(planning);
    ensureWeek(next, weekStart);
    next[weekStart].days[dateISO].teams[ti].location = val;
    setPlanning(next);
  };
  const assignMember = (dateISO, ti, recruiterId) => {
    const next = structuredClone(planning);
    ensureWeek(next, weekStart);
    const day = next[weekStart].days[dateISO];
    const exists = day.teams.some((t) => t.members.includes(recruiterId));
    if (exists) return alert("This recruiter is already assigned this day.");
    day.teams[ti].members.push(recruiterId);
    setPlanning(next);
  };
  const unassignMember = (dateISO, ti, recruiterId) => {
    const next = structuredClone(planning);
    ensureWeek(next, weekStart);
    next[weekStart].days[dateISO].teams[ti].members = next[weekStart].days[
      dateISO
    ].teams[ti].members.filter((id) => id !== recruiterId);
    setPlanning(next);
  };
  const setScore = (dateISO, ti, recruiterId, val) => {
    const rec = recruiters.find((r) => r.id === recruiterId);
    const location = ensureWeek(planning, weekStart)[weekStart].days[dateISO].teams[ti]
      .location;
    setHistory((h) =>
      upsertHistory(h, {
        dateISO,
        recruiterId,
        recruiterName: rec?.name || "",
        crewCode: rec?.crewCode,
        location,
        score: val === "" ? undefined : Number(val),
      })
    );
  };

  const dayTotals = (dateISO) => {
    const items = history.filter((x) => x.dateISO === dateISO && typeof x.score === "number");
    const sales = items.reduce((a, b) => a + (Number(b.score) || 0), 0);
    const avg = items.length ? sales / items.length : 0;
    return { sales, avg };
  };
  const weekSales = () => {
    let total = 0;
    for (let i = 0; i < 7; i++) {
      total += dayTotals(fmtISO(addDays(new Date(weekStart), i))).sales;
    }
    return total;
  };

  const DayCol = ({ i }) => {
    const d = fmtISO(addDays(new Date(weekStart), i));
    const day = weekObj.days[d];
    return (
      <Card className="min-w-[360px] flex-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {DAYS[i]} <span className="text-sm text-zinc-500">({d.slice(5)})</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => addTeam(d)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Team
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {day.teams.map((t, ti) => (
            <div key={ti} className="border rounded-xl p-3 grid gap-3">
              <div className="flex items-center justify-between">
                <Badge>{t.name}</Badge>
                <div className="flex items-center gap-2">
                  <Label className="mr-2">Location</Label>
                  <Input
                    className="w-48"
                    value={t.location}
                    onChange={(e) => setLocation(d, ti, e.target.value)}
                    placeholder="Zone"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                {t.members.map((id) => {
                  const r = recruiters.find((x) => x.id === id);
                  const hist = history.find((h) => h.recruiterId === id && h.dateISO === d);
                  return (
                    <div key={id} className="flex items-center justify-between border rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r?.name || "—"}</span>
                        <Badge variant="secondary">{r?.crewCode}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>Score</Label>
                        <Input
                          type="number"
                          className="w-24"
                          defaultValue={hist?.score ?? ""}
                          onBlur={(e) => setScore(d, ti, id, e.target.value)}
                        />
                        <Button variant="outline" size="sm" onClick={() => unassignMember(d, ti, id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <div className="flex gap-2 items-center">
                  <select
                    className="h-10 border rounded-md px-2 flex-1"
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      assignMember(d, ti, val);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Add recruiter…</option>
                    {recruiters.map((r) => {
                      const taken = day.teams.some((tm) => tm.members.includes(r.id));
                      return (
                        <option key={r.id} value={r.id} disabled={taken}>
                          {r.name} ({r.crewCode})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="text-sm text-muted-foreground">Daily average (all recruiters)</div>
                <Badge variant="secondary">{dayTotals(d).avg.toFixed(2)}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setWeekStart(fmtISO(addDays(new Date(weekStart), -7)))}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Badge style={{ background: "#fca11c" }}>Week {weekNum}</Badge>
          <Button variant="outline" onClick={() => setWeekStart(fmtISO(addDays(new Date(weekStart), 7)))}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Weekly Total Sales: <strong>{weekSales()}</strong>
        </div>
      </div>

      {/* horizontal day columns */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <DayCol key={i} i={i} />
        ))}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  Main App
────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [authed, setAuthed] = useState(sessionStorage.getItem(AUTH_SESSION_KEY) === "1");
  const [tab, setTab] = useState("inflow");

  const [pipeline, setPipeline] = useState(
    load(K.pipeline, { leads: [], interview: [], formation: [] })
  );
  const [recruiters, setRecruiters] = useState(load(K.recruiters, []));
  const [planning, setPlanning] = useState(load(K.planning, {}));
  const [history, setHistory] = useState(load(K.history, []));

  useEffect(() => save(K.pipeline, pipeline), [pipeline]);
  useEffect(() => save(K.recruiters, recruiters), [recruiters]);
  useEffect(() => save(K.planning, planning), [planning]);
  useEffect(() => save(K.history, history), [history]);

  const onLogout = () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    setAuthed(false);
  };

  if (!authed) return <Login onOk={() => setAuthed(true)} />;

  const weekBadge = tab === "planning" ? `Week ${weekNumberISO(startOfWeekMon(new Date()))}` : "";

  return (
    <Shell tab={tab} setTab={setTab} onLogout={onLogout} weekBadge={weekBadge}>
      {tab === "inflow" && (
        <Inflow
          pipeline={pipeline}
          setPipeline={setPipeline}
          onHire={(rec) => {
            setRecruiters((all) => {
              const i = all.findIndex((r) => String(r.crewCode) === String(rec.crewCode));
              if (i >= 0) {
                const next = [...all];
                next[i] = { ...next[i], name: rec.name, role: rec.role, crewCode: rec.crewCode };
                return next;
              }
              return [...all, { id: (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())), name: rec.name, crewCode: rec.crewCode, role: rec.role }];
            });
          }}
        />
      )}
      {tab === "recruiters" && (
        <Recruiters recruiters={recruiters} setRecruiters={setRecruiters} history={history} />
      )}
      {tab === "planning" && (
        <Planning
          recruiters={recruiters}
          planning={planning}
          setPlanning={setPlanning}
          history={history}
          setHistory={setHistory}
        />
      )}
    </Shell>
  );
}
