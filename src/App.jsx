// App.jsx — Proago CRM (v2025-08-29)
// Updates in this version:
// • Header: Logout moved to the right, next to Settings
// • Rank display uses acronyms (RK, PR, PC, TC, SM, BM) everywhere
// • Project label switched from "HF" to "Hello Fresh"
// • Wages tab label still “Pay”
// • Plumbs Settings with onClearPlanningHistory

import React, { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import {
  load, save, K, DEFAULT_SETTINGS,
  weekNumberISO, startOfWeekMon, titleCase
} from "./util";

// Pages
import Inflow from "./pages/Inflow";
import Recruiters from "./pages/Recruiters";
import Planning from "./pages/Planning";
import Wages from "./pages/Wages";
import Finances from "./pages/Finances";
import Settings from "./pages/Settings";

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

const Shell = ({ tab, setTab, children, weekBadge, onLogout }) => (
  <div className="min-h-screen">
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        {/* Left: Brand */}
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

        {/* Middle: Nav */}
        <nav className="flex gap-2 justify-center">
          {[
            ["inflow", "Inflow"],
            ["recruiters", "Recruiters"],
            ["planning", "Planning"],
            ["wages", "Pay"],
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

        {/* Right: Settings + Logout */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setTab("settings")}
            className="px-3"
            style={tab === "settings" ? { background: "#d9010b", color: "white" } : { background: "#fca11c", color: "black" }}
          >
            Settings
          </Button>
          <Button variant="outline" onClick={onLogout}>Logout</Button>
        </div>
      </div>
    </header>

    <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
  </div>
);

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOGIN_KEY)) || null; } catch { return null; }
  });

  const [tab, setTab] = useState("inflow");

  const [settings, setSettings]     = useState(load(K.settings,   DEFAULT_SETTINGS));
  const [pipeline, setPipeline]     = useState(load(K.pipeline,   { leads: [], interview: [], formation: [] }));
  const [recruiters, setRecruiters] = useState(load(K.recruiters, []));
  const [planning, setPlanning]     = useState(load(K.planning,   {}));
  const [history, setHistory]       = useState(load(K.history,    []));

  useEffect(() => save(K.settings, settings),     [settings]);
  useEffect(() => save(K.pipeline, pipeline),     [pipeline]);
  useEffect(() => save(K.recruiters, recruiters), [recruiters]);
  useEffect(() => save(K.planning, planning),     [planning]);
  useEffect(() => save(K.history, history),       [history]);

  const onLogout = () => { localStorage.removeItem(LOGIN_KEY); setSession(null); };

  const onHire = (lead) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `r_${Date.now()}`;
    const rec = {
      id,
      name: titleCase(lead.name || ""),
      role: lead.role || "Rookie",
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
    <Shell tab={tab} setTab={setTab} weekBadge={badge} onLogout={onLogout}>
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
        <Settings
          settings={settings}
          setSettings={setSettings}
          onClearPlanningHistory={() => setHistory([])}
        />
      )}
    </Shell>
  );
}
