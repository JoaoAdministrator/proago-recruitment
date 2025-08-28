// App.jsx — Proago CRM (v2025-08-28 sync) • Default tab=Inflow • Login screen • "Wages" label→"Pay"

import React, { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { load, save, K, DEFAULT_SETTINGS, titleCase, weekNumberISO, startOfWeekMon, USERS } from "./util";

// Pages
import Inflow from "./pages/Inflow";
import Recruiters from "./pages/Recruiters";
import Planning from "./pages/Planning";
import Wages from "./pages/Wages";
import Finances from "./pages/Finances";
import Settings from "./pages/Settings";

/* ───────────── Shell ───────────── */
const Shell = ({ tab, setTab, children, weekBadge }) => (
  <div className="min-h-screen">
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/proago-icon.png" alt="Proago" className="h-7 w-7 rounded-full" onError={(e)=> (e.currentTarget.style.display="none")} />
          <span className="font-semibold text-lg whitespace-nowrap" style={{ fontFamily: "Lora,serif" }}>Proago CRM</span>
          {weekBadge && <Badge variant="secondary" className="ml-3 whitespace-nowrap">{weekBadge}</Badge>}
        </div>
        <nav className="flex gap-2 justify-center w-full">
          {[
            ["inflow", "Inflow"],
            ["recruiters", "Recruiters"],
            ["planning", "Planning"],
            ["wages", "Pay"],      // label changed
            ["finances", "Finances"],
            ["settings", "Settings"],
          ].map(([key, label]) => (
            <Button key={key} onClick={() => setTab(key)} className="px-4"
              style={tab===key ? { background:"#d9010b", color:"white" } : { background:"#fca11c", color:"black" }}>
              {label}
            </Button>
          ))}
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
  </div>
);

/* ───────────── Login ───────────── */
const Login = ({ onLogin }) => {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm border rounded-xl p-6 space-y-4 text-center">
        <img src="/proago-icon.png" alt="Proago" className="h-16 w-16 mx-auto rounded-full" onError={(e)=> (e.currentTarget.style.display="none")} />
        <div className="text-2xl font-semibold" style={{ fontFamily:"Lora,serif" }}>Proago CRM</div>
        <input className="h-10 border rounded-md px-3 w-full" placeholder="Username" value={u} onChange={(e)=> setU(e.target.value)} />
        <input className="h-10 border rounded-md px-3 w-full" placeholder="Password" type="password" value={p} onChange={(e)=> setP(e.target.value)} />
        <Button style={{ background:"#d9010b", color:"white" }} className="w-full"
          onClick={()=>{
            const ok = USERS.some(x => x.u===u && x.p===p);
            if (!ok) { alert("Invalid credentials"); return; }
            onLogin(u);
          }}>
          Log In
        </Button>
      </div>
    </div>
  );
};

/* ───────────── Root ───────────── */
export default function App() {
  const [tab, setTab] = useState("inflow"); // default to Inflow
  const [authUser, setAuthUser] = useState(load(K.auth, null));

  // Global state
  const [settings, setSettings]     = useState(load(K.settings,   DEFAULT_SETTINGS));
  const [pipeline, setPipeline]     = useState(load(K.pipeline,   { leads: [], interview: [], formation: [] }));
  const [recruiters, setRecruiters] = useState(load(K.recruiters, []));
  const [planning, setPlanning]     = useState(load(K.planning,   {}));
  const [history, setHistory]       = useState(load(K.history,    []));

  useEffect(()=> save(K.settings, settings),   [settings]);
  useEffect(()=> save(K.pipeline, pipeline),   [pipeline]);
  useEffect(()=> save(K.recruiters, recruiters), [recruiters]);
  useEffect(()=> save(K.planning, planning),   [planning]);
  useEffect(()=> save(K.history, history),     [history]);

  const onLogin = (u) => { setAuthUser(u); save(K.auth, u); };
  const onLogout = () => { setAuthUser(null); save(K.auth, null); };

  // Hire from Formation → Recruiters
  const onHire = (lead) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `r_${Date.now()}`;
    const rec = {
      id,
      name: titleCase(lead.name || ""),
      rank: "Rookie",              // renamed
      role: "Rookie",              // keep in sync for backward compatibility
      crewCode: lead.crewCode || "",
      mobile: lead.mobile || lead.phone || "",
      email: lead.email || "",
      source: lead.source || "",
      isInactive: false,
    };
    setRecruiters((r) => [...r, rec]);
  };

  const badge = tab === "planning" ? `Week ${weekNumberISO(startOfWeekMon(new Date()))}` : "";

  if (!authUser) return <Login onLogin={onLogin} />;

  return (
    <Shell tab={tab} setTab={setTab} weekBadge={badge}>
      {tab === "inflow" && <Inflow pipeline={pipeline} setPipeline={setPipeline} onHire={onHire} />}
      {tab === "recruiters" && <Recruiters recruiters={recruiters} setRecruiters={setRecruiters} history={history} setHistory={setHistory} />}
      {tab === "planning" && <Planning recruiters={recruiters} planning={planning} setPlanning={setPlanning} history={history} setHistory={setHistory} />}
      {tab === "wages" && <Wages recruiters={recruiters} history={history} />}
      {tab === "finances" && <Finances history={history} />}
      {tab === "settings" && <Settings settings={settings} setSettings={setSettings} />}
      <div className="mt-8 flex justify-end">
        <Button variant="outline" onClick={onLogout}>Log Out</Button>
      </div>
    </Shell>
  );
}
