// App.jsx — Proago CRM (Chat 9 base + requested changes only)
//
// Changes:
// • Default tab = "inflow" (open in Leads)
// • Login screen kept (Oscar/Sergio R4mos, Joao/Ruben Di4s)
// • Tabs show “Pay” instead of “Wages”
// • Week badge kept on one line; “Proago CRM” on one line

import React, { useEffect, useMemo, useState } from "react";
import Inflow from "./pages/Inflow";
import Recruiters from "./pages/Recruiters";
import Planning from "./pages/Planning";
import Wages from "./pages/Wages";   // UI label shows Pay
import Finances from "./pages/Finances";
import Settings from "./pages/Settings";

import { BRAND, load, save, K, startOfWeekMon, weekNumberISO } from "./util";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";

const TABS = [
  { key: "inflow", label: "Inflow" },
  { key: "recruiters", label: "Recruiters" },
  { key: "planning", label: "Planning" },
  { key: "wages", label: "Pay" },          // label change only
  { key: "finances", label: "Finances" },
  { key: "settings", label: "Settings" },
];

const USERS = [
  { u: "Oscar", p: "Sergio R4mos" },
  { u: "Joao",  p: "Ruben Di4s"   },
];

export default function App() {
  // ---------- Auth ----------
  const [auth, setAuth] = useState(() => load(K.auth, null));
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  useEffect(() => save(K.auth, auth), [auth]);

  const tryLogin = () => {
    const ok = USERS.some(x => x.u === u && x.p === p);
    if (!ok) return alert("Invalid credentials");
    setAuth({ user: u, at: Date.now() });
    setU(""); setP("");
  };

  // ---------- State ----------
  const [tab, setTab] = useState("inflow"); // open in Leads by default ✅
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
  const [history, setHistory] = useState(() => load(K.history, []));
  const [payouts, setPayouts] = useState(() => load(K.payouts, []));
  const [settings, setSettings] = useState(() => load(K.settings, null));

  useEffect(() => save(K.leads, leads), [leads]);
  useEffect(() => save(K.recruiters, recruiters), [recruiters]);
  useEffect(() => save(K.planning, planning), [planning]);
  useEffect(() => save(K.history, history), [history]);
  useEffect(() => save(K.payouts, payouts), [payouts]);
  useEffect(() => save(K.settings, settings), [settings]);

  const weekBadge = useMemo(() => `Week ${weekNumberISO(new Date(planning.weekStartISO))}`, [planning.weekStartISO]);

  if (!auth) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-xl shadow border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div style={{width:28,height:28,borderRadius:6,background:`linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`}} />
            <div className="text-xl font-semibold" style={{whiteSpace:"nowrap"}}>Proago CRM</div>
          </div>
          <div className="space-y-3">
            <label className="block text-sm text-gray-600">Username</label>
            <input className="w-full border rounded-md px-3 h-10" value={u} onChange={e=>setU(e.target.value)} />
            <label className="block text-sm text-gray-600">Password</label>
            <input className="w-full border rounded-md px-3 h-10" type="password" value={p} onChange={e=>setP(e.target.value)} />
          </div>
          <div className="mt-5 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Oscar / <span className="font-mono">Sergio R4mos</span><br/>
              Joao / <span className="font-mono">Ruben Di4s</span>
            </div>
            <Button onClick={tryLogin} className="bg-black text-white hover:opacity-90">Login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{width:28,height:28,borderRadius:6,background:`linear-gradient(135deg, ${BRAND.primary}, ${BRAND.secondary})`}} />
            <div className="text-lg font-semibold" style={{whiteSpace:"nowrap"}}>Proago CRM</div>
            <Badge style={{ background: BRAND.accent, color: "#000" }}>{weekBadge}</Badge>
          </div>
          <nav className="flex items-center gap-1">
            {TABS.map(t=>(
              <button key={t.key} onClick={()=>setTab(t.key)}
                className={`px-3 py-2 rounded-md text-sm font-medium ${tab===t.key?"bg-black text-white":"hover:bg-gray-100 text-gray-700"}`}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Hi, {auth.user}</span>
            <Button variant="outline" onClick={()=>setAuth(null)}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab==="inflow" && <Inflow leads={leads} setLeads={setLeads} recruiters={recruiters} setRecruiters={setRecruiters} />}
        {tab==="recruiters" && <Recruiters recruiters={recruiters} setRecruiters={setRecruiters} history={history} />}
        {tab==="planning" && (
          <Planning
            weekStartISO={planning.weekStartISO}
            setWeekStartISO={(iso)=>setPlanning(p=>({...p,weekStartISO:iso}))}
            days={planning.days}
            setDays={(updater)=>setPlanning(p=>({...p,days: typeof updater==="function" ? updater(p.days) : updater}))}
            history={history}
            setHistory={setHistory}
          />
        )}
        {tab==="wages" && <Wages recruiters={recruiters} payouts={payouts} setPayouts={setPayouts} />}
        {tab==="finances" && <Finances history={history} />}
        {tab==="settings" && <Settings settings={settings} setSettings={setSettings} />}
      </main>
    </div>
  );
}

function toISO(d){ const z=new Date(d); z.setHours(0,0,0,0); return z.toISOString().slice(0,10); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
