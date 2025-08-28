// App.jsx — Login restored, default tab = Leads, global role->rank migration, full month names (v2025-08-28d)

import React, { useEffect, useMemo, useState } from "react";
import Inflow from "./pages/Inflow.jsx";
import Recruiters from "./pages/Recruiters.jsx";
import Planning from "./pages/Planning.jsx";
import Wages from "./pages/Wages.jsx";
import Finances from "./pages/Finances.jsx";
import Settings from "./pages/Settings.jsx";
import { BRAND, migrateRoleToRank, fullMonthName } from "./util";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";

const TABS = ["Inflow","Recruiters","Planning","Pay","Finances","Settings"]; // “Wages” shows “Pay” in UI

const USERS = {
  Oscar: "Sergio R4mos",
  Joao: "Ruben Di4s",
};

export default function App() {
  // ---------- Auth ----------
  const [user, setUser] = useState(null);
  const [u, setU] = useState("");
  const [p, setP] = useState("");

  const login = (e) => {
    e?.preventDefault?.();
    if (USERS[u] && USERS[u] === p) {
      setUser(u);
      setU("");
      setP("");
    } else {
      alert("Invalid credentials");
    }
  };

  // ---------- App State ----------
  const [tab, setTab] = useState("Inflow"); // default opens in Leads
  const [leads, setLeads] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [days, setDays] = useState([]); // planning days
  const [financeTree, setFinanceTree] = useState({ year: {} });
  const [payouts, setPayouts] = useState([]);

  // ---------- Migrations: role -> rank everywhere ----------
  useEffect(() => {
    setRecruiters((prev) => prev.map((r) => migrateRoleToRank({ ...r })));
    // planning day recruiters
    setDays((prev) =>
      prev.map((d) => ({
        ...d,
        recruiters: (d.recruiters || []).map((r) => migrateRoleToRank({ ...r })),
      }))
    );
    // finance tree recruiters
    setFinanceTree((prev) => {
      const copy = JSON.parse(JSON.stringify(prev || { year: {} }));
      Object.values(copy.year || {}).forEach((y) =>
        Object.values(y.months || {}).forEach((m) =>
          Object.values(m.weeks || {}).forEach((w) => {
            w.recruiters = (w.recruiters || []).map((r) => migrateRoleToRank(r));
          })
        )
      );
      return copy;
    });
  }, []); // run once on mount

  // ---------- Week badge (single line) ----------
  const currentWeekLabel = useMemo(() => {
    // Example label “Week 34 • August 2025”
    const now = new Date();
    const aug = fullMonthName(now, "en-GB");
    const week = getISOWeek(now);
    return `Week ${week} • ${aug} ${now.getFullYear()}`;
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form
          onSubmit={login}
          className="bg-white shadow rounded p-6 w-full max-w-sm border"
        >
          <div className="flex items-center gap-2 mb-4">
            <div
              className="h-8 w-8 rounded-full"
              style={{ background: BRAND.accent }}
              aria-hidden
            />
            <h1 className="text-xl font-bold whitespace-nowrap">Proago CRM</h1>
          </div>
          <label className="text-xs text-gray-600">Username</label>
          <Input className="mb-3" value={u} onChange={(e) => setU(e.target.value)} />
          <label className="text-xs text-gray-600">Password</label>
          <Input
            className="mb-4"
            type="password"
            value={p}
            onChange={(e) => setP(e.target.value)}
          />
          <Button className="w-full bg-[color:var(--btn,black)]" type="submit">
            Log In
          </Button>
          <div className="mt-3 text-xs text-gray-500">
            Logins: Oscar / Sergio R4mos • Joao / Ruben Di4s
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold whitespace-nowrap">Proago CRM</h1>
          <div className="flex items-center gap-2">
            <Badge>{currentWeekLabel}</Badge>
            <Button variant="secondary" onClick={() => setUser(null)}>
              Logout
            </Button>
          </div>
        </div>
        {/* Centered shell nav */}
        <nav className="mx-auto max-w-7xl px-2 pb-2">
          <div className="flex gap-2 flex-wrap">
            {TABS.map((t) => (
              <Button
                key={t}
                variant={tab === t ? "default" : "secondary"}
                onClick={() => setTab(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </nav>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === "Inflow" && (
          <Inflow leads={leads} setLeads={setLeads} />
        )}
        {tab === "Recruiters" && (
          <Recruiters data={recruiters} setData={setRecruiters} />
        )}
        {tab === "Planning" && (
          <Planning week={currentWeekLabel} days={days} setDays={setDays} />
        )}
        {tab === "Pay" && (
          <Wages recruiters={recruiters} payouts={payouts} setPayouts={setPayouts} />
        )}
        {tab === "Finances" && (
          <Finances tree={financeTree} updateMetric={updateFinances(setFinanceTree)} />
        )}
        {tab === "Settings" && <Settings />}
      </main>
    </div>
  );
}

// ISO week number
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Mutator for finances (keeps shape)
function updateFinances(setTree) {
  return (scope, keys, field, value) => {
    setTree((prev) => {
      const next = JSON.parse(JSON.stringify(prev || { year: {} }));
      const { y, m, w, id } = keys;
      const week = next.year[y].months[m].weeks[w];
      if (scope === "recruiter") {
        week.recruiters = (week.recruiters || []).map((r) =>
          r.id === id ? { ...r, [field]: value } : r
        );
      }
      return next;
    });
  };
}
