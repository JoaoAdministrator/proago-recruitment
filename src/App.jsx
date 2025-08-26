// App.jsx — Proago Recruitment v4 (your requested tweaks)
// - Inflow: remove "Phone" as a source option; Indeed import stays
// - Recruiters: last5 list, avg color (>=3 green, >=2 yellow, <2 red),
//               sort/filter, Fire/Rehire, Box2% & Box4% (last 8 weeks)
// - Planning: grid fits Mon→Sun on screen, team labels A/B/C,
//             location focus bug fixed, score input numeric (no spinner),
//             role badge, crewcode hidden, UK-style dates (DD/MM/YY)
// - Nav: active tab #d9010b, others #fca11c

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
  recruiters: "proago_recruiters_v4", // [{id,name,crewCode,role,isFired}]
  pipeline: "proago_pipeline_v4",     // {leads:[], interview:[], formation:[]}
  history: "proago_history_v4",       // [{dateISO,recruiterId,location,score,box2,box4}]
  planning: "proago_planning_v4",     // { [weekISO]: { days: { [dateISO]: { teams:[{name,location,members:[]}] } } } }
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
// Display as DD/MM/YY
const fmtUK = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${String(y).slice(2)}`;
};

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
const last5Scores = (history, id) => {
  return history
    .filter((h) => h.recruiterId === id && typeof h.score === "number")
    .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
    .slice(0, 5)
    .map((h) => Number(h.score) || 0);
};
const last5Avg = (history, id) => {
  const arr = last5Scores(history, id);
  if (!arr.length) return 0;
  return arr.reduce((s, n) => s + n, 0) / arr.length;
};
// last 8 weeks window from today
const isWithinLastWeeks = (iso, weeks = 8) => {
  const d = new Date(iso);
  const today = new Date();
  const diff = (today - d) / (1000 * 3600 * 24);
  return diff >= 0 && diff <= weeks * 7;
};
const boxPercentsLast8w = (history, id) => {
  const rows = history.filter(
    (h) => h.recruiterId === id && isWithinLastWeeks(h.dateISO, 8)
  );
  const totalSales = rows.reduce((s, r) => s + (Number(r.score) || 0), 0);
  const totalB2 = rows.reduce((s, r) => s + (Number(r.box2) || 0), 0);
  const totalB4 = rows.reduce((s, r) => s + (Number(r.box4) || 0), 0);
  const pct = (num, den) => (den > 0 ? (num / den) * 100 : 0);
  return {
    b2: pct(totalB2, totalSales),
    b4: pct(totalB4, totalSales),
  };
};

/* ──────────────────────────────────────────────────────────────────────────
  Import normalization — supports our shape OR Indeed JSON
────────────────────────────────────────────────────────────────────────── */
function normalizeImportedJson(raw) {
  if (raw && Array.isArray(raw.leads) && Array.isArray(raw.interview) && Array.isArray(raw.formation)) {
    return raw;
  }
  const looksLikeIndeedOne =
    raw && typeof raw === "object" &&
    raw.applicant && (raw.applicant.fullName || raw.applicant.phoneNumber);

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
                  : { background: "#fca11c", color: "#000" }
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
              <option>Other</option>
              {/* Phone removed as requested */}
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
                id:
                  typeof crypto !== "undefined" && crypto.randomUUID
                    ? crypto.randomUUID()
                    : String(Date.now() + Math.random()),
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
    let code = prompt("Crewcode (your chosen code):");
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
  Recruiters (last5 list, avg color, sort/filter, fire, Box2/4%)
────────────────────────────────────────────────────────────────────────── */
const roles = ["Rookie", "Promoter", "Pool Captain", "Team Captain", "Manager"];

const Recruiters = ({ recruiters, setRecruiters, history, setHistory }) => {
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);
  const [sortBy, setSortBy] = useState("name"); // name | crew | role | avg | b2 | b4
  const [sortDir, setSortDir] = useState("asc"); // asc | desc
  const [status, setStatus] = useState("active"); // active | fired | all

  const avgColor = (n) =>
    n >= 3 ? "#10b981" : n >= 2 ? "#fbbf24" : "#ef4444";

  const decorate = (r) => {
    const last5 = last5Scores(history, r.id);
    const avg = last5.length ? last5.reduce((s, n) => s + n, 0) / last5.length : 0;
    const { b2, b4 } = boxPercentsLast8w(history, r.id);
    return { ...r, _avg: avg, _last5: last5, _b2: b2, _b4: b4 };
  };

  const filtered = recruiters
    .filter((r) =>
      status === "all" ? true : status === "active" ? !r.isFired : !!r.isFired
    )
    .map(decorate)
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "crew":
          return String(a.crewCode || "").localeCompare(String(b.crewCode || "")) * dir;
        case "role":
          return String(a.role || "").localeCompare(String(b.role || "")) * dir;
        case "avg":
          return (a._avg - b._avg) * dir;
        case "b2":
          return (a._b2 - b._b2) * dir;
        case "b4":
          return (a._b4 - b._b4) * dir;
        default:
          return String(a.name || "").localeCompare(String(b.name || "")) * dir;
      }
    });

  const fireToggle = (id) =>
    setRecruiters((all) =>
      all.map((r) => (r.id === id ? { ...r, isFired: !r.isFired } : r))
    );

  const del = (id) => {
    if (!confirm("Delete recruiter? History will be kept.")) return;
    setRecruiters(recruiters.filter((r) => r.id !== id));
  };

  // History inline editors (location/score/box2/box4)
  const updateHistField = (recId, dateISO, key, raw) => {
    setHistory((h) =>
      upsertHistory(h, {
        recruiterId: recId,
        dateISO,
        [key]:
          key === "score" || key === "box2" || key === "box4"
            ? raw === "" ? undefined : Number(raw)
            : raw,
      })
    );
  };

  return (
    <div className="grid gap-4">
      {/* Sort & filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <Label>Sort by</Label>
        <select
          className="h-10 border rounded-md px-2"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Name</option>
          <option value="crew">Crewcode</option>
          <option value="role">Role</option>
          <option value="avg">Average</option>
          <option value="b2">Box2%</option>
          <option value="b4">Box4%</option>
        </select>
        <select
          className="h-10 border rounded-md px-2"
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value)}
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
        <div className="ml-4" />
        <Label>Status</Label>
        <select
          className="h-10 border rounded-md px-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="active">Active</option>
          <option value="fired">Fired</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Crewcode</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Last 5</th>
              <th className="p-3 text-right">Average</th>
              <th className="p-3 text-right">Box2%</th>
              <th className="p-3 text-right">Box4%</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">
                  <button className="underline" onClick={() => setDetail(r)}>
                    {r.name}
                  </button>
                </td>
                <td className="p-3">{r.crewCode}</td>
                <td className="p-3">{r.role}</td>
                <td className="p-3">
                  {r._last5.length ? r._last5.join("–") : "—"}
                </td>
                <td className="p-3 text-right" style={{ color: avgColor(r._avg) }}>
                  {r._avg.toFixed(2)}
                </td>
                <td className="p-3 text-right">{r._b2.toFixed(1)}%</td>
                <td className="p-3 text-right">{r._b4.toFixed(1)}%</td>
                <td className="p-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setEdit(r)}>
                      <Edit3 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      style={{ background: r.isFired ? "#10b981" : "#eb2a2a", color: "white" }}
                      onClick={() => fireToggle(r.id)}
                    >
                      {r.isFired ? "Rehire" : "Fire"}
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

      {/* History modal (scrollable + Box2/4 editors) */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {detail?.name} — {detail?.crewCode}
            </DialogTitle>
            <DialogDescription>All-time shifts (edit fields to save)</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto border rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Location</th>
                  <th className="p-2 text-right">Score</th>
                  <th className="p-2 text-right">Box 2</th>
                  <th className="p-2 text-right">Box 4</th>
                </tr>
              </thead>
              <tbody>
                {history
                  .filter((h) => h.recruiterId === detail?.id)
                  .sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1))
                  .map((h, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{fmtUK(h.dateISO)}</td>
                      <td className="p-2">
                        <Input
                          defaultValue={h.location || ""}
                          onBlur={(e) =>
                            updateHistField(detail.id, h.dateISO, "location", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          defaultValue={h.score ?? ""}
                          onBlur={(e) =>
                            updateHistField(detail.id, h.dateISO, "score", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          defaultValue={h.box2 ?? ""}
                          onBlur={(e) =>
                            updateHistField(detail.id, h.dateISO, "box2", e.target.value)
                          }
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          defaultValue={h.box4 ?? ""}
                          onBlur={(e) =>
                            updateHistField(detail.id, h.dateISO, "box4", e.target.value)
                          }
                        />
                      </td>
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
  Planning — Mon→Sun grid fits screen; team A/B/C; focus fix; role badge
────────────────────────────────────────────────────────────────────────── */
const ensureWeek = (state, weekISO) => {
  const base = state[weekISO] || { days: {} };
  for (let i = 0; i < 7; i++) {
    const dateISO = fmtISO(addDays(new Date(weekISO), i));
    if (!base.days[dateISO]) {
      base.days[dateISO] = { teams: [{ name: "A", location: "", members: [] }] };
    }
  }
  return { ...state, [weekISO]: base };
};

const Planning = ({ recruiters, planning, setPlanning, history, setHistory }) => {
  const [weekStart, setWeekStart] = useState(() => fmtISO(startOfWeekMon(new Date())));

  // Ensure structure exists ONCE per week change
  useEffect(() => {
    setPlanning((p) => (p[weekStart] ? p : ensureWeek(p, weekStart)));
  }, [weekStart, setPlanning]);

  const weekObj = planning[weekStart] || { days: {} };
  const weekNum = weekNumberISO(new Date(weekStart));

  const addTeam = (dateISO) => {
    setPlanning((prev) => {
      const next = structuredClone(prev);
      if (!next[weekStart]) Object.assign(next, ensureWeek(next, weekStart));
      const teams = next[weekStart].days[dateISO].teams;
      const name = String.fromCharCode(65 + teams.length); // A, B, C...
      teams.push({ name, location: "", members: [] });
      return next;
    });
  };

  const setLocation = (dateISO, ti, val) => {
    setPlanning((prev) => {
      const next = structuredClone(prev);
      if (!next[weekStart]) Object.assign(next, ensureWeek(next, weekStart));
      next[weekStart].days[dateISO].teams[ti].location = val;
      return next;
    });
  };

  const assignMember = (dateISO, ti, recruiterId) => {
    setPlanning((prev) => {
      const next = structuredClone(prev);
      if (!next[weekStart]) Object.assign(next, ensureWeek(next, weekStart));
      const day = next[weekStart].days[dateISO];
      const exists = day.teams.some((t) => t.members.includes(recruiterId));
      if (exists) {
        alert("This recruiter is already assigned this day.");
        return prev;
      }
      day.teams[ti].members.push(recruiterId);
      return next;
    });
  };

  const unassignMember = (dateISO, ti, recruiterId) => {
    setPlanning((prev) => {
      const next = structuredClone(prev);
      if (!next[weekStart]) Object.assign(next, ensureWeek(next, weekStart));
      const mem = next[weekStart].days[dateISO].teams[ti].members;
      next[weekStart].days[dateISO].teams[ti].members = mem.filter((id) => id !== recruiterId);
      return next;
    });
  };

  const setScore = (dateISO, ti, recruiterId, val) => {
    const rec = recruiters.find((r) => r.id === recruiterId);
    const location =
      (planning[weekStart] &&
        planning[weekStart].days[dateISO] &&
        planning[weekStart].days[dateISO].teams[ti].location) ||
      "";
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
    const day = weekObj.days[d] || { teams: [] };
    return (
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}{" "}
              <span className="text-sm text-zinc-500">({fmtUK(d)})</span>
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
                    className="w-44"
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
                        {/* role badge for recognition */}
                        <Badge variant="secondary">{r?.role || "—"}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label>Score</Label>
                        <Input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="w-20"
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
                      const taken =
                        (weekObj.days[d]?.teams || []).some((tm) => tm.members.includes(r.id));
                      return (
                        <option key={r.id} value={r.id} disabled={taken}>
                          {r.name} ({r.role})
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

      {/* On desktop fits 7 columns; wraps on smaller screens */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 xl:grid-cols-7">
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
                next[i] = { ...next[i], name: rec.name, role: rec.role, crewCode: rec.crewCode, isFired: false };
                return next;
              }
              return [
                ...all,
                {
                  id:
                    typeof crypto !== "undefined" && crypto.randomUUID
                      ? crypto.randomUUID()
                      : String(Date.now() + Math.random()),
                  name: rec.name,
                  crewCode: rec.crewCode,
                  role: rec.role,
                  isFired: false,
                },
              ];
            });
          }}
        />
      )}
      {tab === "recruiters" && (
        <Recruiters
          recruiters={recruiters}
          setRecruiters={setRecruiters}
          history={history}
          setHistory={setHistory}
        />
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
