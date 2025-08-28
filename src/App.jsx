// Proago CRM — App.jsx (modularized)
// Notes: imports pages from /pages, helpers from /util

import React, { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";

import Inflow from "./pages/Inflow";
import Recruiters from "./pages/Recruiters";
import Planning from "./pages/Planning";
import Wages from "./pages/Wages";
import Finances from "./pages/Finances";
import Settings from "./pages/Settings";

import {
  load, save, K, DEFAULT_SETTINGS, rateForDate,
  startOfWeekMon, weekNumberISO, fmtISO, titleCase
} from "./util";

/* ──────────────────────────────────────────────────────────────────────────
  Auth (Login + Gate)
────────────────────────────────────────────────────────────────────────── */
const AUTH_USERS = { Oscar: "Sergio R4mos", Joao: "Rub3n Dias" };
const AUTH_SESSION_KEY = "proago_auth_session";
const SALARY_SESSION_KEY = "proago_salary_gate";
const FINANCE_SESSION_KEY = "proago_finance_gate";
const SETTINGS_SESSION_KEY = "proago_settings_gate";

const Login = ({ onOk }) => {
  const [u, setU] = useState(""), [p, setP] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (AUTH_USERS[u] && AUTH_USERS[u] === p) {
      localStorage.setItem(AUTH_SESSION_KEY, btoa(`${u}:${Date.now()}`));
      onOk();
    } else alert("Invalid credentials");
  };
  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50">
      <form onSubmit={submit} className="p-6 border rounded-lg bg-white shadow">
        <h1 className="text-lg font-bold mb-3">Proago CRM</h1>
        <input className="border p-2 mb-2 w-full" placeholder="Username"
          value={u} onChange={(e) => setU(e.target.value)} />
        <input className="border p-2 mb-2 w-full" placeholder="Password" type="password"
          value={p} onChange={(e) => setP(e.target.value)} />
        <Button style={{ background: "#d9010b", color: "white" }}>Login</Button>
      </form>
    </div>
  );
};

const Gate = ({ storageKey, label, onOk }) => {
  const [u, setU] = useState(""), [p, setP] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (AUTH_USERS[u] && AUTH_USERS[u] === p) {
      localStorage.setItem(storageKey, btoa(`${u}:${Date.now()}`));
      onOk();
    } else alert("Invalid credentials");
  };
  return (
    <div className="grid place-items-center p-6 border rounded-xl bg-white">
      <form onSubmit={submit} className="flex gap-2">
        <input className="border p-2" placeholder="Username"
          value={u} onChange={(e) => setU(e.target.value)} />
        <input className="border p-2" placeholder="Password" type="password"
          value={p} onChange={(e) => setP(e.target.value)} />
        <Button style={{ background: "#d9010b", color: "white" }}>Unlock {label}</Button>
      </form>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  Shell (Navigation)
────────────────────────────────────────────────────────────────────────── */
const Shell = ({ tab, setTab, onLogout, children, weekBadge }) => (
  <div className="min-h-screen">
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg">Proago CRM</span>
          {weekBadge && <Badge variant="secondary" className="ml-3">{weekBadge}</Badge>}
        </div>
        <nav className="flex gap-2 justify-center w-full">
          {[
            ["inflow", "Inflow"],
            ["recruiters", "Recruiters"],
            ["planning", "Planning"],
            ["salary", "Wages"],
            ["finances", "Finances"],
          ].map(([key, label]) => (
            <Button
              key={key}
              onClick={() => setTab(key)}
              style={tab === key ? { background: "#d9010b", color: "white" }
                : { background: "#fca11c", color: "black" }}
            >{label}</Button>
          ))}
          <Button variant="ghost" onClick={() => setTab("settings")}>Settings</Button>
          <Button variant="ghost" onClick={onLogout}>Logout</Button>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
  </div>
);

/* ──────────────────────────────────────────────────────────────────────────
  Root App
────────────────────────────────────────────────────────────────────────── */
export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem(AUTH_SESSION_KEY));
  const [tab, setTab] = useState("planning");

  const [settings, setSettings] = useState(load(K.settings, DEFAULT_SETTINGS));
  const [pipeline, setPipeline] = useState(load(K.pipeline, { leads: [], interview: [], formation: [] }));
  const [recruiters, setRecruiters] = useState(load(K.recruiters, []));
  const [planning, setPlanning] = useState(load(K.planning, {}));
  const [history, setHistory] = useState(load(K.history, []));

  useEffect(() => save(K.settings, settings), [settings]);
  useEffect(() => save(K.pipeline, pipeline), [pipeline]);
  useEffect(() => save(K.recruiters, recruiters), [recruiters]);
  useEffect(() => save(K.planning, planning), [planning]);
  useEffect(() => save(K.history, history), [history]);

  if (!authed) return <Login onOk={() => setAuthed(true)} />;
  const onLogout = () => { localStorage.removeItem(AUTH_SESSION_KEY); setAuthed(false); };

  const onHire = (lead) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `r_${Date.now()}`;
    const rec = {
      id,
      name: titleCase(lead.name || ""),
      role: "Rookie",
      crewCode: lead.crewCode || "",
      phone: lead.phone || "",
      email: lead.email || "",
      source: lead.source || "",
      isInactive: false,
    };
    setRecruiters(r => [...r, rec]);
  };

  const badge = tab === "planning" ? `Week ${weekNumberISO(startOfWeekMon(new Date()))}` : "";

  return (
    <Shell tab={tab} setTab={setTab} onLogout={onLogout} weekBadge={badge}>
      {tab === "inflow" && <Inflow pipeline={pipeline} setPipeline={setPipeline} onHire={onHire} />}
      {tab === "recruiters" && <Recruiters recruiters={recruiters} setRecruiters={setRecruiters} history={history} setHistory={setHistory} />}
      {tab === "planning" && <Planning recruiters={recruiters} planning={planning} setPlanning={setPlanning} history={history} setHistory={setHistory} />}

      {tab === "salary" && (
        localStorage.getItem(SALARY_SESSION_KEY)
          ? <Wages recruiters={recruiters} history={history} />
          : <Gate storageKey={SALARY_SESSION_KEY} label="Wages" onOk={() => { }} />
      )}

      {tab === "finances" && (
        localStorage.getItem(FINANCE_SESSION_KEY)
          ? <Finances history={history} />
          : <Gate storageKey={FINANCE_SESSION_KEY} label="Finances" onOk={() => { }} />
      )}

      {tab === "settings" && (
        localStorage.getItem(SETTINGS_SESSION_KEY)
          ? <Settings settings={settings} setSettings={setSettings} />
          : <Gate storageKey={SETTINGS_SESSION_KEY} label="Settings" onOk={() => { }} />
      )}
    </Shell>
  );
}
