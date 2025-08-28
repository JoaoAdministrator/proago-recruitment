// Proago CRM — App.jsx (Final Sync Build v2025-08-28a)
// - Default tab = Inflow
// - Login restored (Oscar/Sergio R4mos, Joao/Ruben Di4s)
// - Tabs: Inflow → Recruiters → Planning → Pay → Finances → Settings
// - Brand colors + single-line header + week badge on one line
// - Uses full month names via util helpers
// - Keeps linkages intact across pages

import React, { useEffect, useMemo, useState } from "react";
import Inflow from "./pages/Inflow";
import Recruiters from "./pages/Recruiters";
import Planning from "./pages/Planning";
import Wages from "./pages/Wages"; // UI label shows "Pay"
import Finances from "./pages/Finances";
import Settings from "./pages/Settings";

import { BRAND, fmtUK, weekNumberISO, startOfWeekMon, load, save, K, DEFAULT_SETTINGS } from "./util";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";

const TABS = [
  { key: "inflow", label: "Inflow" },
  { key: "recruiters", label: "Recruiters" },
  { key: "planning", label: "Planning" },
  { key: "wages", label: "Pay" },
  { key: "finances", label: "Finances" },
  { key: "settings", label: "Settings" },
];

const USERS = [
  { u: "Oscar", p: "Sergio R4mos" },
  { u: "Joao", p: "Ruben Di4s" },
];

export default function App() {
  // ---------- Auth ----------
  const [auth, setAuth] = useState(() => load(K.auth, null));
  const [uDraft, setUDraft] = useState("");
  const [pDraft, setPDraft] = useState("");

  useEffect(() => save(K.auth, auth), [auth]);

  // ---------- App State ----------
  const [tab, setTab] = useState("inflow"); // default = Inflow
  const [leads, setLeads] = useState(() => load(K.leads, []));
  const [recruiters, setRecruiters] = useState(() => load(K.recruiters, []));
  const [planning, setPlanning] = useState(() => load(K.planning, {
    weekStartISO: toISO(startOfWeekMon(new Date())),
    days: Array.from({ length: 7 }).map((_, i) => ({
      dateISO: toISO(addDays(startOfWeekMon(new Date()), i)),
      zone: "",
      b2s: "",
      b4s: "",
      recruiters: [],
    })),
  }));
  const [history, setHistory] = useState(() => load(K.history, [])); // used by Finances
  const [payouts, setPayouts] = useState(() => load(K.payouts, []));
  const [settings, setSettings] = useState(() => load(K.settings, DEFAULT_SETTINGS));

  // persist
  useEffect(() => save(K.leads, leads), [leads]);
  useEffect(() => save(K.recruiters, recruiters), [recruiters]);
  useEffect(() => save(K.planning, planning), [planning]);
  useEffect(() => save(K.history, history), [history]);
  useEffect(() => save(K.payouts, payouts), [payouts]);
  useEffect(() => save(K.settings, settings), [settings]);

  // ---------- Week Badge ----------
  const weekBadge = useMemo(() => {
    const wk = weekNumberISO(new Date(planning.weekStartISO));
    return `Week ${wk}`; // single line
  }, [planning.weekStartISO]);

  // ---------- Handlers ----------
  const onLogout = () => setAuth(null);

  const tryLogin = () => {
    const ok = USERS.some(x => x.u === uDraft && x.p === pDraft);
    if (ok) {
      setAuth({ user: uDraft, at: Date.now() });
      setUDraft("");
      setPDraft("");
    } else {
      alert("Invalid credentials");
    }
  };

  // ---------- Gate ----------
  if (!auth) {
    return (
      <AuthScreen
        u={uDraft}
        p={pDraft}
        setU={setUDraft}
        setP={setPDraft}
        onLogin={tryLogin}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div className="text-lg font-semibold tracking-wide" style={{ whiteSpace: "nowrap" }}>
              Proago CRM
            </div>
            <Badge style={{ background: BRAND.accent, color: "#000" }}>{weekBadge}</Badge>
          </div>
          <nav className="flex items-center gap-1">
            {TABS.map(t => (
              <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
              </TabButton>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Hi, {auth.user}</span>
            <Button variant="outline" onClick={onLogout}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === "inflow" && (
          <Inflow
            leads={leads}
            setLeads={setLeads}
            recruiters={recruiters}
            setRecruiters={setRecruiters}
          />
        )}
        {tab === "recruiters" && (
          <Recruiters data={recruiters} setData={setRecruiters} />
        )}
        {tab === "planning" && (
          <Planning
            weekStartISO={planning.weekStartISO}
            setWeekStartISO={(iso) => setPlanning(p => ({ ...p, weekStartISO: iso }))}
            days={planning.days}
            setDays={(updater) =>
              setPlanning(p => ({ ...p, days: typeof updater === "function" ? updater(p.days) : updater }))
            }
            history={history}
            setHistory={setHistory}
          />
        )}
        {tab === "wages" && (
          <Wages recruiters={recruiters} payouts={payouts} setPayouts={setPayouts} />
        )}
        {tab === "finances" && (
          <Finances history={history} />
        )}
        {tab === "settings" && (
          <Settings settings={settings} setSettings={setSettings} />
        )}
      </main>
    </div>
  );
}

/* -------------------- UI bits -------------------- */

const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded-md text-sm font-medium ${
      active
        ? "bg-black text-white"
        : "hover:bg-gray-100 text-gray-700"
    }`}
  >
    {children}
  </button>
);

const Logo = () => (
  <div
    aria-hidden
    style={{
      width: 28,
      height: 28,
      borderRadius: 6,
      background: `linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`,
    }}
  />
);

function AuthScreen({ u, p, setU, setP, onLogin }) {
  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Logo />
          <div className="text-xl font-semibold" style={{ whiteSpace: "nowrap" }}>Proago CRM</div>
        </div>
        <div className="space-y-3">
          <label className="block text-sm text-gray-600">Username</label>
          <input
            className="w-full border rounded-md px-3 h-10"
            value={u}
            onChange={(e) => setU(e.target.value)}
            onBlur={(e) => setU(e.target.value.trim())}
            placeholder="Oscar or Joao"
          />
          <label className="block text-sm text-gray-600">Password</label>
          <input
            className="w-full border rounded-md px-3 h-10"
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
            onBlur={(e) => setP(e.target.value)}
            placeholder="Enter password"
          />
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Oscar / <span className="font-mono">Sergio R4mos</span><br />
            Joao / <span className="font-mono">Ruben Di4s</span>
          </div>
          <Button onClick={onLogin} className="bg-black text-white hover:opacity-90">Login</Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- small date helpers -------------------- */
function toISO(d) {
  const z = new Date(d);
  z.setHours(0,0,0,0);
  return z.toISOString().slice(0,10);
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
