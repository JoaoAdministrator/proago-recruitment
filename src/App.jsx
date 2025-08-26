import React, { useEffect, useMemo, useState } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Badge } from "./components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import {
  Download,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ───────────────────────────────
// Auth
// ───────────────────────────────
const AUTH_USER = "Administrator";
const AUTH_PASS = "Sergio R4mos";
const AUTH_SESSION_KEY = "proago_auth_session";

// ───────────────────────────────
// Storage helpers
// ───────────────────────────────
const load = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

const K = {
  recruiters: "proago_recruiters",
  pipeline: "proago_pipeline",
  history: "proago_history",
  planning: "proago_planning",
};

// ───────────────────────────────
// Pipeline
// ───────────────────────────────
function Pipeline({ pipeline, setPipeline, onHire }) {
  const move = (id, from, to) => {
    const item = pipeline[from].find((x) => x.id === id);
    if (!item) return;
    setPipeline({
      ...pipeline,
      [from]: pipeline[from].filter((x) => x.id !== id),
      [to]: [...pipeline[to], item],
    });
  };
  const remove = (id, from) => {
    if (!window.confirm("Delete this lead?")) return;
    setPipeline({
      ...pipeline,
      [from]: pipeline[from].filter((x) => x.id !== id),
    });
  };
  const hire = (id) => {
    const item = pipeline.formation.find((x) => x.id === id);
    if (!item) return;
    const crewCode = prompt("Enter CrewCode for new recruiter:");
    if (!crewCode) return;
    const role = prompt("Enter role (default Rookie):") || "Rookie";
    onHire({ ...item, crewCode, role });
    setPipeline({
      ...pipeline,
      formation: pipeline.formation.filter((x) => x.id !== id),
    });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(pipeline)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pipeline.json";
    a.click();
  };
  const importJson = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setPipeline(JSON.parse(reader.result));
      } catch {
        alert("Invalid JSON");
      }
    };
    reader.readAsText(file);
  };

  const cols = ["leads", "interview", "formation"];
  const labels = { leads: "Leads", interview: "Interview", formation: "Formation" };

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 justify-end">
        <Button onClick={exportJson}>
          <Download className="w-4 h-4 mr-1" /> Export
        </Button>
        <label>
          <input type="file" hidden onChange={importJson} />
          <Button>
            <Upload className="w-4 h-4 mr-1" /> Import
          </Button>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {cols.map((col) => (
          <Card key={col}>
            <CardHeader className="flex justify-between">
              <CardTitle>{labels[col]}</CardTitle>
              <Badge>{pipeline[col].length}</Badge>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Source</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pipeline[col].map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.phone}</td>
                      <td>{p.source}</td>
                      <td className="flex gap-1">
                        {col !== "leads" && (
                          <Button size="xs" onClick={() => move(p.id, col, "leads")}>
                            Back
                          </Button>
                        )}
                        {col === "leads" && (
                          <Button size="xs" onClick={() => move(p.id, "leads", "interview")}>
                            →
                          </Button>
                        )}
                        {col === "interview" && (
                          <Button
                            size="xs"
                            onClick={() => move(p.id, "interview", "formation")}
                          >
                            →
                          </Button>
                        )}
                        {col === "formation" && (
                          <Button size="xs" onClick={() => hire(p.id)}>
                            Hire
                          </Button>
                        )}
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => remove(p.id, col)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────
// Recruiters
// ───────────────────────────────
function Recruiters({ recruiters, setRecruiters, history }) {
  const [modal, setModal] = useState(null);

  const last5avg = (id) => {
    const recHist = history.filter((h) => h.recruiterId === id).slice(-5);
    if (!recHist.length) return 0;
    return (
      recHist.reduce((s, h) => s + (Number(h.score) || 0), 0) / recHist.length
    ).toFixed(2);
  };

  const remove = (id) => {
    if (!window.confirm("Delete recruiter? History will remain.")) return;
    setRecruiters(recruiters.filter((r) => r.id !== id));
  };

  return (
    <div className="p-4">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Name</th>
            <th>CrewCode</th>
            <th>Role</th>
            <th>Last5 Avg</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {recruiters.map((r) => (
            <tr key={r.id}>
              <td>
                <button
                  className="underline"
                  onClick={() => setModal(r.id)}
                >
                  {r.name}
                </button>
              </td>
              <td>{r.crewCode}</td>
              <td>{r.role}</td>
              <td>{last5avg(r.id)}</td>
              <td>
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => remove(r.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!modal} onOpenChange={() => setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shift history</DialogTitle>
          </DialogHeader>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Location</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {history
                .filter((h) => h.recruiterId === modal)
                .map((h, i) => (
                  <tr key={i}>
                    <td>{h.date}</td>
                    <td>{h.location}</td>
                    <td>{h.score}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <DialogFooter>
            <Button onClick={() => setModal(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ───────────────────────────────
// Planning
// ───────────────────────────────
function Planning({ recruiters, history, setHistory }) {
  const [week, setWeek] = useState(0);

  const weekDates = useMemo(() => {
    const today = new Date();
    const first = new Date(today.setDate(today.getDate() - today.getDay())); // Sunday start
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [week]);

  const addScore = (date, rec, location, score) => {
    setHistory([
      ...history,
      { date, recruiterId: rec.id, recruiterName: rec.name, crewCode: rec.crewCode, location, score: Number(score) },
    ]);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={() => setWeek(week - 1)}>
          <ChevronLeft /> Prev
        </Button>
        <div className="font-bold">Week {week}</div>
        <Button onClick={() => setWeek(week + 1)}>
          Next <ChevronRight />
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Recruiter</th>
              <th>Location</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {weekDates.map((date) =>
              recruiters.map((r) => (
                <tr key={date + r.id}>
                  <td>{date}</td>
                  <td>{r.name}</td>
                  <td>
                    <Input
                      placeholder="Location"
                      onBlur={(e) => addScore(date, r, e.target.value, 0)}
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      placeholder="Score"
                      onBlur={(e) =>
                        addScore(date, r, "", e.target.value)
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ───────────────────────────────
// Main App
// ───────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(
    !!localStorage.getItem(AUTH_SESSION_KEY)
  );
  const [tab, setTab] = useState("pipeline");

  const [pipeline, setPipeline] = useState(
    load(K.pipeline, { leads: [], interview: [], formation: [] })
  );
  const [recruiters, setRecruiters] = useState(load(K.recruiters, []));
  const [history, setHistory] = useState(load(K.history, []));

  useEffect(() => save(K.pipeline, pipeline), [pipeline]);
  useEffect(() => save(K.recruiters, recruiters), [recruiters]);
  useEffect(() => save(K.history, history), [history]);

  if (!authed) {
    const login = (e) => {
      e.preventDefault();
      const u = e.target.user.value;
      const p = e.target.pass.value;
      if (u === AUTH_USER && p === AUTH_PASS) {
        localStorage.setItem(AUTH_SESSION_KEY, "1");
        setAuthed(true);
      } else {
        alert("Invalid credentials");
      }
    };
    return (
      <div className="flex h-screen items-center justify-center">
        <form onSubmit={login} className="space-y-2 border p-6 rounded-md">
          <div>
            <Label>Username</Label>
            <Input name="user" />
          </div>
          <div>
            <Label>Password</Label>
            <Input name="pass" type="password" />
          </div>
          <Button type="submit">Login</Button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <header className="flex justify-between p-2 border-b">
        <div className="font-serif font-bold text-lg">Proago Recruitment</div>
        <nav className="flex gap-2">
          {["pipeline", "recruiters", "planning"].map((t) => (
            <Button
              key={t}
              variant={tab === t ? "default" : "outline"}
              onClick={() => setTab(t)}
            >
              {t}
            </Button>
          ))}
          <Button
            variant="ghost"
            onClick={() => {
              localStorage.removeItem(AUTH_SESSION_KEY);
              setAuthed(false);
            }}
          >
            Logout
          </Button>
        </nav>
      </header>

      {tab === "pipeline" && (
        <Pipeline
          pipeline={pipeline}
          setPipeline={setPipeline}
          onHire={(rec) =>
            setRecruiters([
              ...recruiters.filter((r) => r.id !== rec.id),
              { id: rec.id, name: rec.name, crewCode: rec.crewCode, role: rec.role },
            ])
          }
        />
      )}
      {tab === "recruiters" && (
        <Recruiters
          recruiters={recruiters}
          setRecruiters={setRecruiters}
          history={history}
        />
      )}
      {tab === "planning" && (
        <Planning
          recruiters={recruiters}
          history={history}
          setHistory={setHistory}
        />
      )}
    </div>
  );
}
