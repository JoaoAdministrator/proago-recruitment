import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, LogOut, Settings as SettingsIcon, Download, Upload, Check, CalendarClock, Users, ListChecks, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// --------------------------------------------------
// Brand & Auth
// --------------------------------------------------
const BRAND = {
  primary: "#d9010b",
  secondary: "#eb2a2a",
  accent: "#fca11c",
  white: "#ffffff",
};

const AUTH_USER = "Administrator";
const AUTH_PASS = "Sergio R4mos";
const AUTH_SESSION_KEY = "proago_auth_session";

// --------------------------------------------------
// Utilities
// --------------------------------------------------
const formatDateISO = (d) => d.toISOString().slice(0, 10);
const startOfWeekMonday = (date = new Date()) => {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

// --------------------------------------------------
// Seed data (safe defaults; persisted in localStorage)
// --------------------------------------------------
const seedRecruiters = [
  { id: "r1", name: "Oscar", crewCode: "OSC", role: "Promoter", avg: 2.3, allTime: 318 },
  { id: "r2", name: "Patrick", crewCode: "PAT", role: "Rookie", avg: 1.4, allTime: 27 },
  { id: "r3", name: "Gilles", crewCode: "GIL", role: "Promoter", avg: 1.9, allTime: 122 },
  { id: "r4", name: "Yanis", crewCode: "YAN", role: "Pool Captain", avg: 2.1, allTime: 203 },
];

const seedLeads = [
  { id: "l1", name: "Jessica Rodrigues", phone: "+352 621 123 456", source: "Indeed", notes: "Met @ Opkorn", crew: "OSC" },
  { id: "l2", name: "Marie Valentin", phone: "+352 661 222 333", source: "Referral", notes: "Spoke FR/EN", crew: "PAT" },
];

// --------------------------------------------------
// Local storage helpers
// --------------------------------------------------
const load = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// Keys
const K = {
  recruiters: "proago_recruiters",
  pipeline: "proago_pipeline", // {leads:[...], interview:[...], formation:[...], bin:[...]}
  planning: "proago_planning", // hash by weekStartISO
};

// initialize defaults on first load
const ensureDefaults = () => {
  if (!load(K.recruiters)) save(K.recruiters, seedRecruiters);
  if (!load(K.pipeline)) save(K.pipeline, { leads: seedLeads, interview: [], formation: [], bin: [] });
  if (!load(K.planning)) save(K.planning, {});
};

// --------------------------------------------------
// Small UI helpers
// --------------------------------------------------
const SectionTitle = ({ icon: Icon, title, right }) => (
  <div className="flex items-center justify-between mb-3">
    <div className="flex gap-2 items-center">
      {Icon && <Icon className="h-5 w-5" />}
      <h3 className="font-semibold text-lg">{title}</h3>
    </div>
    <div>{right}</div>
  </div>
);

const Field = ({ label, children, className = "" }) => (
  <div className={`grid gap-1 ${className}`}>
    <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
    {children}
  </div>
);

// --------------------------------------------------
// Auth Gate
// --------------------------------------------------
const AuthGate = ({ onAuthed }) => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const sess = sessionStorage.getItem(AUTH_SESSION_KEY);
    if (sess === "1") onAuthed();
  }, [onAuthed]);

  const submit = (e) => {
    e.preventDefault();
    if (user === AUTH_USER && pass === AUTH_PASS) {
      sessionStorage.setItem(AUTH_SESSION_KEY, "1");
      onAuthed();
    } else {
      setError("Incorrect credentials");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-zinc-50 to-zinc-100">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl" style={{ color: BRAND.primary }}>Proago Recruitment</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3">
            <Field label="Username">
              <Input autoComplete="off" value={user} onChange={(e) => setUser(e.target.value)} />
            </Field>
            <Field label="Password">
              <Input autoComplete="new-password" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="mt-2" style={{ background: BRAND.primary }}>Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// --------------------------------------------------
// Navigation Tabs Shell
// --------------------------------------------------
const Shell = ({ tab, setTab, onLogout, children }) => (
  <div className="min-h-screen bg-white">
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded" style={{ background: BRAND.primary }} />
          <span className="font-semibold">Proago Recruitment</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon"><SettingsIcon className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={onLogout}><LogOut className="h-4 w-4 mr-1" />Logout</Button>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="interview">Interview</TabsTrigger>
            <TabsTrigger value="formation">Formation</TabsTrigger>
            <TabsTrigger value="bin">Bin</TabsTrigger>
            <TabsTrigger value="recruiters">Recruiters</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6">
      {children}
    </main>
  </div>
);

// --------------------------------------------------
// Pipeline shared table & move logic
// --------------------------------------------------
const PipelineTable = ({ items, onMove, onDelete, next, prev }) => (
  <div className="overflow-x-auto border rounded-xl">
    <table className="min-w-full text-sm">
      <thead className="bg-zinc-50">
        <tr>
          <th className="text-left p-3">Name</th>
          <th className="text-left p-3">Phone</th>
          <th className="text-left p-3">Source</th>
          <th className="text-left p-3">Crew</th>
          <th className="text-left p-3">Notes</th>
          <th className="text-right p-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((x) => (
          <tr key={x.id} className="border-t">
            <td className="p-3 font-medium">{x.name}</td>
            <td className="p-3">{x.phone}</td>
            <td className="p-3">{x.source}</td>
            <td className="p-3"><Badge>{x.crew || "-"}</Badge></td>
            <td className="p-3">{x.notes || ""}</td>
            <td className="p-3">
              <div className="flex gap-2 justify-end">
                {prev && <Button variant="outline" size="sm" onClick={() => onMove(x, prev)}>Back</Button>}
                {next && <Button size="sm" style={{ background: BRAND.primary }} onClick={() => onMove(x, next)}>Move to {next}</Button>}
                <Button variant="destructive" size="sm" onClick={() => onDelete(x)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PipelinePage = () => {
  const [data, setData] = useState(load(K.pipeline, { leads: [], interview: [], formation: [], bin: [] }));
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", phone: "", source: "Indeed", notes: "", crew: "" });

  const savePipe = (next) => { setData(next); save(K.pipeline, next); };

  const move = (item, to) => {
    const columns = ["leads", "interview", "formation", "bin"];
    const from = columns.find((c) => data[c].some((z) => z.id === item.id));
    if (!from) return;
    const nextData = structuredClone(data);
    nextData[from] = nextData[from].filter((z) => z.id !== item.id);
    nextData[to].push(item);
    savePipe(nextData);
  };

  const del = (item) => {
    const cols = ["leads", "interview", "formation", "bin"];
    const nextData = structuredClone(data);
    cols.forEach((c) => (nextData[c] = nextData[c].filter((z) => z.id !== item.id)));
    savePipe(nextData);
  };

  const addLead = () => {
    if (!draft.name.trim()) return;
    const lead = { id: crypto.randomUUID(), ...draft };
    const next = { ...data, leads: [lead, ...data.leads] };
    savePipe(next);
    setDraft({ name: "", phone: "", source: "Indeed", notes: "", crew: "" });
    setCreateOpen(false);
  };

  return (
    <div className="grid gap-6">
      <SectionTitle icon={ListChecks} title="Pipeline" right={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Lead</Button>} />
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        {(["leads", "interview", "formation", "bin"]).map((col) => (
          <Card key={col} className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">{col}</span>
                <Badge variant={col === "bin" ? "destructive" : "default"}>{data[col].length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PipelineTable
                items={data[col]}
                onMove={move}
                onDelete={del}
                prev={col === "leads" ? null : col === "interview" ? "leads" : col === "formation" ? "interview" : "formation"}
                next={col === "bin" ? null : col === "formation" ? "bin" : col === "interview" ? "formation" : "interview"}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Lead</DialogTitle>
            <DialogDescription>Add a new candidate lead.</DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Full name"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="Phone"><Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
            <Field label="Source">
              <Select value={draft.source} onValueChange={(v) => setDraft({ ...draft, source: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indeed">Indeed</SelectItem>
                  <SelectItem value="Street">Street</SelectItem>
                  <SelectItem value="Referral">Referral</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Crew code (optional)"><Input value={draft.crew} onChange={(e) => setDraft({ ...draft, crew: e.target.value.toUpperCase() })} /></Field>
            <div className="md:col-span-2"><Field label="Notes"><Input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={addLead} style={{ background: BRAND.primary }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// --------------------------------------------------
// Recruiters
// --------------------------------------------------
const roles = ["Rookie", "Promoter", "Pool Captain", "Team Captain", "Manager"];

const RecruitersPage = () => {
  const [recs, setRecs] = useState(load(K.recruiters, seedRecruiters));
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);

  useEffect(() => save(K.recruiters, recs), [recs]);

  const upsert = () => {
    if (!edit?.name) return;
    setRecs((prev) => {
      const exists = prev.some((r) => r.id === edit.id);
      const next = exists ? prev.map((r) => (r.id === edit.id ? edit : r)) : [{ ...edit, id: crypto.randomUUID() }, ...prev];
      return next;
    });
    setOpen(false);
    setEdit(null);
  };

  const del = (id) => setRecs((prev) => prev.filter((r) => r.id !== id));

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(recs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `recruiters_${formatDateISO(new Date())}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const importJSON = (file) => {
    const fr = new FileReader();
    fr.onload = () => {
      try { const data = JSON.parse(fr.result); if (Array.isArray(data)) setRecs(data); } catch {}
    };
    fr.readAsText(file);
  };

  return (
    <div className="grid gap-6">
      <SectionTitle icon={Users} title="Recruiters" right={
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportJSON}><Download className="h-4 w-4 mr-1" />Export</Button>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJSON(e.target.files[0])} />
            <span className="px-3 py-2 border rounded-md inline-flex items-center"><Upload className="h-4 w-4 mr-1" />Import</span>
          </label>
          <Button onClick={() => { setEdit({ name: "", crewCode: "", role: "Rookie", avg: 1.0, allTime: 0 }); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
      } />

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Crew</th>
              <th className="text-left p-3">Role</th>
              <th className="text-right p-3">Avg</th>
              <th className="text-right p-3">All‑time</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recs.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3"><Badge>{r.crewCode}</Badge></td>
                <td className="p-3">{r.role}</td>
                <td className="p-3 text-right">{Number(r.avg).toFixed(2)}</td>
                <td className="p-3 text-right">{r.allTime}</td>
                <td className="p-3">
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setEdit(r); setOpen(true); }}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => del(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Edit recruiter" : "New recruiter"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Crew code"><Input value={edit.crewCode} onChange={(e) => setEdit({ ...edit, crewCode: e.target.value.toUpperCase() })} /></Field>
              <Field label="Role">
                <Select value={edit.role} onValueChange={(v) => setEdit({ ...edit, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Average (sales/day)"><Input type="number" step="0.1" value={edit.avg} onChange={(e) => setEdit({ ...edit, avg: Number(e.target.value) })} /></Field>
              <Field label="All‑time sales"><Input type="number" value={edit.allTime} onChange={(e) => setEdit({ ...edit, allTime: Number(e.target.value) })} /></Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={upsert} style={{ background: BRAND.primary }}><Check className="h-4 w-4 mr-1"/>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// --------------------------------------------------
// Planning (teams, one shift/day, weekly cap 5, weekly/day averages)
// --------------------------------------------------
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const sanitizeDay = (val) => {
  if (!val || typeof val !== "object") return { A: null, B: null };
  return { A: val.A ?? null, B: val.B ?? null };
};

const useWeek = () => {
  const [anchor, setAnchor] = useState(startOfWeekMonday());
  const weekStartISO = formatDateISO(anchor);
  const weekLabel = `${formatDateISO(anchor)} → ${formatDateISO(addDays(anchor, 6))}`;
  const nextWeek = () => setAnchor(addDays(anchor, 7));
  const prevWeek = () => setAnchor(addDays(anchor, -7));
  const days = DAYS.map((_, i) => formatDateISO(addDays(anchor, i)));
  return { weekStartISO, weekLabel, days, nextWeek, prevWeek };
};

const PlanningPage = () => {
  const recs = load(K.recruiters, seedRecruiters);
  const { weekStartISO, weekLabel, days, nextWeek, prevWeek } = useWeek();
  const [store, setStore] = useState(load(K.planning, {})); // { [weekStartISO]: { assignments, metrics } }
  const [picker, setPicker] = useState({ open: false, day: null, team: null });
  const rawWeek = store[weekStartISO] || { assignments: {}, metrics: {} };

  // Normalize the shape defensively in case of older/corrupt data
  const assignments = useMemo(() => {
    const base = {};
    days.forEach((d) => (base[d] = { A: null, B: null }));
    const merged = { ...base };
    const src = rawWeek.assignments || {};
    Object.keys(base).forEach((d) => (merged[d] = sanitizeDay(src[d])));
    return merged;
  }, [rawWeek.assignments, days]);

  const metrics = useMemo(() => ({ ...(rawWeek.metrics || {}) }), [rawWeek.metrics]);

  // Count assigned shifts per recruiter (defensive against undefined days)
  const assignedCounts = useMemo(() => {
    return Object.values(assignments).reduce((acc, dayObj) => {
      const safe = sanitizeDay(dayObj);
      ["A", "B"].forEach((t) => {
        const id = safe[t];
        if (id) acc[id] = (acc[id] || 0) + 1;
      });
      return acc;
    }, {});
  }, [assignments]);

  const savePlanning = (next) => {
    const payload = { ...store, [weekStartISO]: next };
    setStore(payload);
    save(K.planning, payload);
  };

  const openPicker = (day, team) => setPicker({ open: true, day, team });
  const closePicker = () => setPicker({ open: false, day: null, team: null });

  const canAssign = (recId, day) => {
    if (!day) return true; // dialog render safety
    const pair = sanitizeDay(assignments[day]);
    // One shift per day per recruiter
    const dayTaken = [pair.A, pair.B].includes(recId);
    if (dayTaken) return false;
    // Weekly cap 5
    const weekly = assignedCounts[recId] || 0;
    if (weekly >= 5) return false;
    return true;
  };

  const assign = (recId) => {
    if (!picker.day || !picker.team) return;
    if (!canAssign(recId, picker.day)) return;
    const dayObj = sanitizeDay(assignments[picker.day]);
    const next = {
      assignments: {
        ...assignments,
        [picker.day]: { ...dayObj, [picker.team]: recId },
      },
      metrics,
    };
    savePlanning(next);
    closePicker();
  };

  const unassign = (day, team) => {
    const dayObj = sanitizeDay(assignments[day]);
    const next = {
      assignments: {
        ...assignments,
        [day]: { ...dayObj, [team]: null },
      },
      metrics,
    };
    savePlanning(next);
  };

  const setMetric = (day, team, field, value) => {
    const key = `${day}_${team}`;
    const next = {
      assignments,
      metrics: { ...metrics, [key]: { ...(metrics[key] || {}), [field]: value } },
    };
    savePlanning(next);
  };

  const teamRow = (day) => (
    <tr key={day} className="border-t">
      <td className="p-3 font-medium text-sm whitespace-nowrap w-28">{day}</td>
      {["A", "B"].map((team) => {
        const pair = sanitizeDay(assignments[day]);
        const recId = pair[team];
        const rec = recs.find((r) => r.id === recId);
        const key = `${day}_${team}`;
        const m = metrics[key] || {};
        const avg = Number(m.avg ?? (rec?.avg ?? 0));
        const sales = Number(m.sales ?? 0);
        return (
          <td key={team} className="p-3">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">Team {team}</Badge>
                {recId ? (
                  <Button size="xs" variant="outline" onClick={() => unassign(day, team)}>Unassign</Button>
                ) : (
                  <Button size="xs" onClick={() => openPicker(day, team)}>Assign</Button>
                )}
              </div>
              <div className="flex items-center justify-between border rounded-lg p-2">
                <div>
                  <div className="text-sm">{rec ? rec.name : <span className="text-muted-foreground">— unassigned —</span>}</div>
                  {rec && <div className="text-xs text-muted-foreground">{rec.role} • {rec.crewCode}</div>}
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Avg</div>
                  <Input className="h-8 w-20 text-right" type="number" step="0.1" value={avg}
                         onChange={(e) => setMetric(day, team, "avg", Number(e.target.value))} />
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Sales</div>
                  <Input className="h-8 w-20 text-right" type="number" value={sales}
                         onChange={(e) => setMetric(day, team, "sales", Number(e.target.value))} />
                </div>
              </div>
            </div>
          </td>
        );
      })}
    </tr>
  );

  const totals = useMemo(() => {
    // compute daily & weekly aggregates from metrics
    const dayTotals = days.reduce((acc, d) => {
      const sums = ["A", "B"].map((t) => metrics[`${d}_${t}`] || {});
      const sales = sums.reduce((s, x) => s + Number(x.sales || 0), 0);
      const avg = sums.reduce((s, x) => s + Number(x.avg || 0), 0);
      acc[d] = { sales, avg };
      return acc;
    }, {});
    const weeklySales = Object.values(dayTotals).reduce((s, x) => s + x.sales, 0);
    const weeklyAvg = Object.values(dayTotals).reduce((s, x) => s + x.avg, 0);
    return { dayTotals, weeklySales, weeklyAvg };
  }, [metrics, days]);

  const exportWeek = () => {
    const payload = { weekStartISO, assignments, metrics };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `planning_${weekStartISO}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const importWeek = (file) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const data = JSON.parse(fr.result);
        const rawA = data.assignments || {};
        // sanitize imported structure
        const fixed = {};
        days.forEach((d) => { fixed[d] = sanitizeDay(rawA[d]); });
        savePlanning({ assignments: fixed, metrics: data.metrics || {} });
      } catch {}
    };
    fr.readAsText(file);
  };

  // Runtime sanity checks (pseudo-tests) to catch shape issues in dev
  useEffect(() => {
    const anyBad = Object.entries(assignments).some(([d, v]) => !v || typeof v !== "object" || !("A" in v) || !("B" in v));
    console.assert(!anyBad, "Planning assignments contained invalid day objects and were sanitized.");
  }, [assignments]);

  return (
    <div className="grid gap-6">
      <SectionTitle icon={CalendarClock} title="Planning" right={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={prevWeek}><ChevronLeft className="h-4 w-4"/></Button>
          <div className="px-3 py-2 border rounded-md text-sm bg-zinc-50">{weekLabel}</div>
          <Button variant="outline" onClick={nextWeek}><ChevronRight className="h-4 w-4"/></Button>
          <Button variant="outline" onClick={exportWeek}><Download className="h-4 w-4 mr-1"/>Export week</Button>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importWeek(e.target.files[0])} />
            <span className="px-3 py-2 border rounded-md inline-flex items-center"><Upload className="h-4 w-4 mr-1"/>Import</span>
          </label>
        </div>
      } />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Week overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left p-3 w-28">Date</th>
                  <th className="text-left p-3">Team A</th>
                  <th className="text-left p-3">Team B</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => teamRow(d))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-zinc-50">
                  <td className="p-3 font-semibold">Totals</td>
                  <td className="p-3" colSpan={2}>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {days.map((d) => (
                        <div key={d} className="px-2 py-1 border rounded-md bg-white">
                          <span className="font-medium mr-2">{d.slice(5)}</span>
                          <span className="text-muted-foreground">Sales: {totals.dayTotals[d]?.sales ?? 0}</span>
                          <span className="mx-2">•</span>
                          <span className="text-muted-foreground">Avg: {(totals.dayTotals[d]?.avg ?? 0).toFixed?.(1) ?? Number(totals.dayTotals[d]?.avg ?? 0).toFixed(1)}</span>
                        </div>
                      ))}
                      <div className="px-2 py-1 border rounded-md bg-white font-semibold">Weekly Sales: {totals.weeklySales}</div>
                      <div className="px-2 py-1 border rounded-md bg-white font-semibold">Weekly Avg Sum: {totals.weeklyAvg.toFixed(1)}</div>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly cap tracking (max 5 shifts / recruiter)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {recs.map((r) => (
              <div key={r.id} className="border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.role} • {r.crewCode}</div>
                </div>
                <Badge variant={(assignedCounts[r.id] || 0) >= 5 ? "destructive" : "secondary"}>{assignedCounts[r.id] || 0} / 5</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={picker.open} onOpenChange={(o) => !o && closePicker()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign recruiter</DialogTitle>
            {picker.day && <DialogDescription>Pick a recruiter for {picker.day} (Team {picker.team}). One shift/day. Weekly cap 5.</DialogDescription>}
          </DialogHeader>
          <div className="grid gap-2 max-h-[50vh] overflow-auto">
            {recs.map((r) => {
              const weekly = assignedCounts[r.id] || 0;
              const pair = sanitizeDay(assignments[picker.day] || {});
              const dayTaken = [pair.A, pair.B].includes(r.id);
              const blocked = weekly >= 5 || dayTaken;
              const onPick = () => {
                if (weekly >= 5) { alert("This recruiter reached the weekly cap (5)."); return; }
                if (dayTaken) { alert("This recruiter is already assigned on this day."); return; }
                assign(r.id);
              };
              return (
                <button key={r.id} onClick={onPick}
                        title={weekly >= 5 ? "Reached weekly cap" : dayTaken ? "Already assigned this day" : "Assign"}
                        className={`text-left px-3 py-2 rounded-lg border flex items-center justify-between ${blocked ? "opacity-50 cursor-not-allowed" : "hover:bg-zinc-50"}`}>
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.role} • {r.crewCode}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div>Avg {Number(r.avg).toFixed(1)}</div>
                    <div>
                      <Badge variant={weekly >= 5 ? "destructive" : "secondary"}>
                        {weekly} / 5{weekly >= 5 ? " (cap)" : ""}
                      </Badge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePicker}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// --------------------------------------------------
// Root App
// --------------------------------------------------
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState("planning");

  useEffect(() => { ensureDefaults(); }, []);

  const logout = () => { sessionStorage.removeItem(AUTH_SESSION_KEY); setAuthed(false); };

  if (!authed) return <AuthGate onAuthed={() => setAuthed(true)} />;

  return (
    <Shell tab={tab} setTab={setTab} onLogout={logout}>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsContent value="leads"><PipelinePage /></TabsContent>
        <TabsContent value="interview"><PipelinePage /></TabsContent>
        <TabsContent value="formation"><PipelinePage /></TabsContent>
        <TabsContent value="bin"><PipelinePage /></TabsContent>
        <TabsContent value="recruiters"><RecruitersPage /></TabsContent>
        <TabsContent value="planning"><PlanningPage /></TabsContent>
      </Tabs>
    </Shell>
  );
}
