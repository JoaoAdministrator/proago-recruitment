// App.jsx
// Proago CRM — modular build (v2025-08-28 • Chat 10 updates)
// - Re-added Login (two accounts) with logo/name
// - Default tab = Inflow (not Planning)
// - Wages tab renamed to "Pay" (component file kept as Wages.jsx)
// - Header/Badge no-wrap fixes to keep text on one line

import React, { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";

// Shared helpers + storage keys
import {
  load, save, K, DEFAULT_SETTINGS,
  weekNumberISO, startOfWeekMon, titleCase
} from "./util";

// Pages
import Inflow from "./pages/Inflow";
import Recruiters from "./pages/Recruiters";
import Planning from "./pages/Planning";
import Wages from "./pages/Wages";     // shows "Pay" now
import Finances from "./pages/Finances";
import Settings from "./pages/Settings";

/* ──────────────────────────────────────────────────────────────────────────
  Login
────────────────────────────────────────────────────────────────────────── */
const LOGIN_KEY = "proago_login_v1";
const VALID_USERS = [
  { user: "Oscar", pass: "Sergio R4mos" },
  { user: "Joao",  pass: "Ruben Di4s"  },
];

const Login = ({ onOk }) => {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const ok = VALID_USERS.some(x => x.user === u && x.pass === p);
    if (!ok) return alert("Invalid credentials.");
    localStorage.setItem(LOGIN_KEY, JSON.stringify({ user: u, at: Date.now() }));
    onOk({ user: u });
  };
  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50">
      <form onSubmit={submit} className="w-[420px] max-w-[95vw] bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex items-center gap-3 mb-4">
          <img src="/proago-icon.png" alt="" className="h-9 w-9 rounded-full" onError={(e)=>e.currentTarget.style.display="none"} />
          <div className="font-semibold text-xl whitespace-nowrap" style={{ fontFamily: "Lora,serif" }}>
            Proago CRM
          </div>
        </div>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <label className="text-sm font-medium">Username</label>
            <input className="h-10 border rounded-md px-3" value={u} onChange={(e)=>setU(e.target.value)} required />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium">Password</label>
            <input className="h-10 border rounded-md px-3" value={p} onChange={(e)=>setP(e.target.value)} required type="password" />
          </div>
          <Button type="submit" style={{ background: "#d9010b", color: "white" }} className="mt-1">
            Sign in
          </Button>
        </div>
      </form>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  Shell (top nav + page container)
────────────────────────────────────────────────────────────────────────── */
const Shell = ({ tab, setTab, children, weekBadge }) => (
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
          <span className="font-semibold text-lg whitespace-nowrap" style={{ fontFamily: "Lora,serif" }}>
            Proago CRM
          </span>
          {weekBadge && <Badge variant="secondary" className="ml-3 whitespace-nowrap">{weekBadge}</Badge>}
        </div>

        <nav className="flex gap-2 justify-center w-full">
          {[
            ["inflow", "Inflow"],
            ["recruiters", "Recruiters"],
            ["planning", "Planning"],
            ["wages", "Pay"],        // label changed
            ["finances", "Finances"],
            ["settings", "Settings"],
          ].map(([key, label]) => (
            <Button
              key={key}
              onClick={() => setTab(key)}
              className="px-4"
              style={
                tab === key
                  ? { background: "#d9010b", color: "white" }
                  : { background: "#fca11c", color: "black" }
              }
            >
              {label}
            </Button>
          ))}
        </nav>
      </div>
    </header>

    <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
  </div>
);

/* ──────────────────────────────────────────────────────────────────────────
  App
────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOGIN_KEY)) || null; } catch { return null; }
  });

  // Tabs (default: Inflow)
  const [tab, setTab] = useState("inflow");

  // Global state (persisted)
  const [settings, setSettings]     = useState(load(K.settings,   DEFAULT_SETTINGS));
  const [pipeline, setPipeline]     = useState(load(K.pipeline,   { leads: [], interview: [], formation: [] }));
  const [recruiters, setRecruiters] = useState(load(K.recruiters, []));
  const [planning, setPlanning]     = useState(load(K.planning,   {}));
  const [history, setHistory]       = useState(load(K.history,    []));

  // Persist everything
  useEffect(() => save(K.settings, settings),     [settings]);
  useEffect(() => save(K.pipeline, pipeline),     [pipeline]);
  useEffect(() => save(K.recruiters, recruiters), [recruiters]);
  useEffect(() => save(K.planning, planning),     [planning]);
  useEffect(() => save(K.history, history),       [history]);

  const onLogout = () => { localStorage.removeItem(LOGIN_KEY); setSession(null); };

  // Hire from Formation → Recruiters (keep underlying fields, display words change elsewhere)
  const onHire = (lead) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `r_${Date.now()}`;
    const rec = {
      id,
      name: titleCase(lead.name || ""),
      role: "Rookie",            // underlying key kept; displayed as "Rank"
      crewCode: lead.crewCode || "",
      phone: lead.phone || "",
      email: lead.email || "",
      source: lead.source || "",
      isInactive: false,
    };
    setRecruiters((r) => [...r, rec]);
  };

  const badge = tab === "planning" ? `Week ${weekNumberISO(startOfWeekMon(new Date()))}` : "";

  if (!session) return <Login onOk={setSession} />;

  return (
    <Shell tab={tab} setTab={setTab} weekBadge={badge}>
      <div className="flex justify-end -mt-4 mb-4">
        <Button variant="outline" onClick={onLogout}>Logout</Button>
      </div>

      {tab === "inflow" && (
        <Inflow
          pipeline={pipeline}
          setPipeline={setPipeline}
          onHire={onHire}
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

      {tab === "wages" && <Wages recruiters={recruiters} history={history} />}

      {tab === "finances" && <Finances history={history} />}

      {tab === "settings" && (
        <Settings settings={settings} setSettings={setSettings} />
      )}
    </Shell>
  );
}
