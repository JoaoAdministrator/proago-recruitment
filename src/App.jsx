// App.jsx
// Proago CRM — global Nunito font, Lora for nav+logout+login title, logout beside settings,
// Finances requires re-login

import React, { useEffect, useState } from "react";
import Inflow from "./pages/Inflow";
import Recruiters from "./pages/Recruiters";
import Planning from "./pages/Planning";
import Wages from "./pages/Wages"; // Pay
import Finances from "./pages/Finances";
import Settings from "./pages/Settings";

import { Button } from "./components/ui/button";
import { load, save, K, DEFAULT_SETTINGS } from "./util";

// ---------- Fonts ----------
function useFonts() {
  useEffect(() => {
    const links = [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Lora:wght@500;600&family=Nunito:wght@400;600;700&display=swap",
      },
    ];
    const els = links.map((attrs) => {
      const el = document.createElement("link");
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      document.head.appendChild(el);
      return el;
    });
    return () => els.forEach((el) => document.head.removeChild(el));
  }, []);
}

// ---------- Auth ----------
const LOGIN_KEY = "proago_login_v1";
const VALID_USERS = [
  { user: "Oscar", pass: "Sergio R4mos" },
  { user: "Joao", pass: "Ruben Di4s" },
];

const Login = ({ title = "Proago CRM", onOk }) => {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  return (
    <div
      className="min-h-screen grid place-items-center bg-zinc-50"
      style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const ok = VALID_USERS.some((x) => x.user === u && x.pass === p);
          if (!ok) return alert("Invalid credentials.");
          onOk({ user: u });
        }}
        className="w-[420px] max-w-[95vw] bg-white rounded-2xl p-6 shadow-sm border"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <div
            className="text-xl font-bold tracking-wide"
            style={{ fontFamily: "Lora, serif" }}
          >
            {title}
          </div>
        </div>
        <div className="grid gap-3">
          <div className="grid gap-1">
            <label className="text-sm">Username</label>
            <input
              className="h-10 border rounded-md px-3"
              value={u}
              onChange={(e) => setU(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm">Password</label>
            <input
              className="h-10 border rounded-md px-3"
              value={p}
              onChange={(e) => setP(e.target.value)}
              type="password"
            />
          </div>
          <Button
            type="submit"
            style={{ background: "#d9010b", color: "white" }}
            className="h-10"
          >
            Login
          </Button>
        </div>
      </form>
    </div>
  );
};

export default function App() {
  useFonts();

  const [auth, setAuth] = useState(null);
  const [active, setActive] = useState("Inflow");

  const doLogin = ({ user }) => {
    const obj = { user, at: Date.now() };
    localStorage.setItem(LOGIN_KEY, JSON.stringify(obj));
    setAuth(obj);
  };
  const logout = () => {
    localStorage.removeItem(LOGIN_KEY);
    setAuth(null);
    setActive("Inflow");
  };

  // Extra login for Finances
  const [finAuthToken, setFinAuthToken] = useState(0);
  const [finLoginStep, setFinLoginStep] = useState(false);

  const [settings, setSettings] = useState(() => load(K.settings, DEFAULT_SETTINGS));
  useEffect(() => save(K.settings, settings), [settings]);

  const navBtn = "px-3 h-10 rounded-md";
  const lora = { fontFamily: "Lora, serif" };

  if (!auth) return <Login title="Proago CRM" onOk={doLogin} />;

  const Page = () => {
    if (active === "Inflow") return <Inflow />;
    if (active === "Recruiters") return <Recruiters />;
    if (active === "Planning") return <Planning />;
    if (active === "Pay") return <Wages />;
    if (active === "Finances") {
      if (finLoginStep === false) {
        setFinLoginStep(true);
        return null;
      }
      if (finLoginStep === true && finAuthToken === 0) {
        return (
          <Login
            title="Finances — Login"
            onOk={() => {
              setFinAuthToken(Date.now());
              setFinLoginStep(false);
            }}
          />
        );
      }
      return <Finances />;
    }
    if (active === "Settings") return <Settings settings={settings} setSettings={setSettings} />;
    return null;
  };

  return (
    <div style={{ fontFamily: "Nunito, system-ui, sans-serif" }} className="min-h-screen bg-white">
      <header className="border-b bg-white">
        <div className="max-w-[1400px] mx-auto px-3">
          <div className="flex items-center justify-between h-14">
            <div className="text-lg font-bold tracking-tight">Proago CRM</div>

            <nav className="flex items-center gap-2">
              {["Inflow", "Recruiters", "Planning", "Pay", "Finances", "Settings"].map((tab) => {
                const isActive = active === tab;
                if (tab === "Settings") {
                  return (
                    <button
                      key={tab}
                      onClick={() => setActive(tab)}
                      className={`${navBtn} border`}
                      style={{ ...lora, background: "white", color: "black" }}
                    >
                      {tab}
                    </button>
                  );
                }
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setActive(tab);
                      if (tab === "Finances") {
                        setFinAuthToken(0);
                        setFinLoginStep(false);
                      }
                    }}
                    className={navBtn}
                    style={{
                      ...lora,
                      background: isActive ? "#d9010b" : "#eb2a2a",
                      color: "white",
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActive("Settings")}
                className={`${navBtn} border`}
                style={{ ...lora, background: "white", color: "black" }}
              >
                Settings
              </button>
              <button
                onClick={logout}
                className={navBtn}
                style={{ ...lora, background: "white", color: "black", border: "1px solid #e5e7eb" }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-3">
        <Page />
      </main>
    </div>
  );
}
