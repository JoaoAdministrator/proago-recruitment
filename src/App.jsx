// App.jsx
// Proago CRM — modular build (v2025-08-28 • Chat 9 glue)

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
import Wages from "./pages/Wages";
import Finances from "./pages/Finances";
import Settings from "./pages/Settings";

// ──────────────────────────────────────────────────────────────────────────
// Shell (top nav + page container)
// ──────────────────────────────────────────────────────────────────────────
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
          <span className="font-semibold text-lg" style={{ fontFamily: "Lora,serif" }}>
            Proago CRM
          </span>
          {weekBadge && <Badge variant="secondary" className="ml-3">{weekBadge}</Badge>}
        </div>

        <nav className="flex gap-2 justify-center w-full">
          {[
            ["inflow", "Inflow"],
            ["recruiters", "Recruiters"],
            ["planning", "Planning"],
            ["wages", "Wages"],
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

// ──────────────────────────────────────────────────────────────────────────
// App root
// ──────────────────────────────────────────────────────────────────────────
export default function App() {
  // Tabs
  const [tab, setTab] = useState("planning");

  // Global state (persisted)
  const [settings, setSettings]     = useState(load(K.settings,   DEFAULT_SETTINGS));
  const [pipeline, setPipeline]     = useState(load(K.pipeline,   { leads: [], interview: [], formation: [] }));
  const [recruiters, setRecruiters] = useState(load(K.recruiters, []));
  const [planning, setPlanning]     = useState(load(K.planning,   {}));
  const [history, setHistory]       = useState(load(K.history,    []));

  // Persist everything
  useEffect(() => save(K.settings, settings),   [settings]);
  useEffect(() => save(K.pipeline, pipeline),   [pipeline]);
  useEffect(() => save(K.recruiters, recruiters), [recruiters]);
  useEffect(() => save(K.planning, planning),   [planning]);
  useEffect(() => save(K.history, history),     [history]);

  // Hire from Formation → Recruiters (always Rookie, crewcode 5 digits, keep phone/email/source)
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
    setRecruiters((r) => [...r, rec]);
  };

  const badge = tab === "planning" ? `Week ${weekNumberISO(startOfWeekMon(new Date()))}` : "";

  return (
    <Shell tab={tab} setTab={setTab} weekBadge={badge}>
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
