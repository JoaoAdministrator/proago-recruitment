// Proago CRM — App.jsx (v2025-08-26 build: planning/finances/salary fixes + strict phone prefixes)

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Badge } from "./components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "./components/ui/dialog";
import {
  Download, Upload, Trash2, ChevronLeft, ChevronRight, UserPlus, Edit3, Plus, X, Lock, ChevronDown
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
  App data/version (one-time reset to kill ghost data)
────────────────────────────────────────────────────────────────────────── */
const DATA_VERSION = "proago_v7_reset_2025_08_26";
const VERSION_KEY = "proago_data_version";

/* ──────────────────────────────────────────────────────────────────────────
  Auth (persist with localStorage)
────────────────────────────────────────────────────────────────────────── */
const AUTH_USERS = { Oscar: "Sergio R4mos", Joao: "Rub3n Dias" };
const AUTH_SESSION_KEY = "proago_auth_session";     // global app gate
const SALARY_SESSION_KEY = "proago_salary_gate";    // re-auth for Salary
const FINANCE_SESSION_KEY = "proago_finance_gate";  // re-auth for Finances

/* ──────────────────────────────────────────────────────────────────────────
  Storage helpers & keys
────────────────────────────────────────────────────────────────────────── */
const load = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const clone = typeof structuredClone === "function"
  ? structuredClone
  : (obj) => JSON.parse(JSON.stringify(obj));

const K = {
  recruiters: "proago_recruiters_v6",
  pipeline: "proago_pipeline_v5",
  history: "proago_history_v5",
  planning: "proago_planning_v5",
  settings: "proago_settings_v1",
};

/* ──────────────────────────────────────────────────────────────────────────
  Dates & helpers (UTC-safe; UI shows DD/MM/YY)
────────────────────────────────────────────────────────────────────────── */
const parseISO = (iso) => { const [y,m,d]=iso.split("-").map(Number); return new Date(Date.UTC(y,m-1,d)); };
const fmtISO = (d) => new Date(Date.UTC(
  d.getUTCFullYear?.() ?? d.getFullYear(),
  d.getUTCMonth?.() ?? d.getMonth(),
  d.getUTCDate?.() ?? d.getDate()
)).toISOString().slice(0,10);
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate()+n); return x; };
const startOfWeekMon = (date=new Date()) => {
  const d = new Date(Date.UTC(
    date.getUTCFullYear?.() ?? date.getFullYear(),
    date.getUTCMonth?.() ?? date.getMonth(),
    date.getUTCDate?.() ?? date.getDate()
  ));
  const day = (d.getUTCDay()+6)%7; d.setUTCDate(d.getUTCDate()-day); d.setUTCHours(0,0,0,0); return d;
};
const weekNumberISO = (date) => {
  const d = new Date(Date.UTC(
    date.getUTCFullYear?.() ?? date.getFullYear(),
    date.getUTCMonth?.() ?? date.getMonth(),
    date.getUTCDate?.() ?? date.getDate()
  ));
  d.setUTCHours(0,0,0,0);
  d.setUTCDate(d.getUTCDate()+3-((d.getUTCDay()+6)%7));
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(),0,4));
  firstThursday.setUTCDate(firstThursday.getUTCDate()+3-((firstThursday.getUTCDay()+6)%7));
  return 1 + Math.round(((d-firstThursday)/86400000)/7);
};
const fmtUK = (iso) => { if(!iso) return ""; const [y,m,d]=iso.split("-"); return `${d}/${m}/${String(y).slice(2)}`; };
const monthKey = (iso) => iso.slice(0,7);
const currentMonthKey = () => { const d=new Date(); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`; };
const prevMonthKey = (ym) => { const [Y,M]=ym.split("-").map(Number); const d=new Date(Date.UTC(Y,M-1,1)); d.setUTCMonth(d.getUTCMonth()-1); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`; };
const monthLabel = (ym) => { const [y,m]=ym.split("-").map(Number); return new Date(Date.UTC(y,m-1,1)).toLocaleDateString(undefined,{month:"short",year:"numeric",timeZone:"UTC"}); };

/* ──────────────────────────────────────────────────────────────────────────
  Roles, hours, multipliers
────────────────────────────────────────────────────────────────────────── */
const ROLES = ["Rookie", "Promoter", "Pool Captain", "Team Captain", "Sales Manager"];
const roleHoursDefault = (role) =>
  role==="Pool Captain" ? 7 : (role==="Team Captain"||role==="Sales Manager") ? 8 : 6;
const roleMultiplierDefault = (role) =>
  role==="Pool Captain" ? 1.25 : role==="Team Captain" ? 1.5 : role==="Sales Manager" ? 2.0 : 1.0;

/* ──────────────────────────────────────────────────────────────────────────
  Phone/name normalization + flags (STRICT prefixes)
────────────────────────────────────────────────────────────────────────── */
const FLAG_BY_CC = { "+352":"🇱🇺", "+33":"🇫🇷", "+32":"🇧🇪", "+49":"🇩🇪" };
const ALLOWED_CCS = Object.keys(FLAG_BY_CC);

const titleCase = (s="") =>
  s.trim()
   .toLowerCase()
   .replace(/\s+/g," ")
   .split(" ")
   .map(w => w ? w[0].toUpperCase()+w.slice(1) : "")
   .join(" ");

const normalizeDigits = (raw="") => raw.replace(/[()\-\.\s]/g,"").replace(/^00/,"+");

const detectCC = (raw="") => {
  const s = normalizeDigits(raw);
  const cc = ALLOWED_CCS.find(cc => s.startsWith(cc));
  return cc || "";
};

const formatPhoneByCountry = (raw="") => {
  let s = normalizeDigits(raw);
  if(!s.startsWith("+")) return { display:"", flag:"", cc:"", ok:false }; // must start with +
  const cc = detectCC(s);
  if (!cc) return { display:"", flag:"", cc:"", ok:false }; // reject
  const flag = FLAG_BY_CC[cc] || "";
  let rest = s.slice(cc.length);
  // spacing rules
  if (cc === "+352") { // LU
    rest = rest.replace(/^(\d{3})(\d{3})(\d{3})$/,"$1 $2 $3")
               .replace(/^(\d{3})(\d{2})(\d{3})$/,"$1 $2 $3");
  } else if (cc === "+33" || cc === "+32") { // FR/BE: 2s
    rest = rest.replace(/(\d{2})(?=\d)/g,"$1 ").trim();
  } else if (cc === "+49") { // DE: 3-3- rest
    rest = rest.replace(/^(\d{3})(\d{3})(\d{3,})$/,"$1 $2 $3");
  }
  return { display: `${cc} ${rest}`.trim(), flag, cc, ok:true };
};

/* ──────────────────────────────────────────────────────────────────────────
  Settings (defaults + finance matrix)
────────────────────────────────────────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  defaultHourlyRate: 15.63,
  projects: ["HF"],
  financeMatrix: {
    D2D: {
      noDiscount: { box2: 95,  box4: 125 },
      discount:   { box2: 80,  box4: 110 },
    },
    EVENT: {
      noDiscount: { box2: 60,  box4: 70 },
      discount:   { box2: 45,  box4: 55 },
    },
  },
};

const toMoney = (n) => (Number(n||0)).toFixed(2);

/* ──────────────────────────────────────────────────────────────────────────
  History helpers (upsert; last5; Box2/4% in last 8 weeks)
────────────────────────────────────────────────────────────────────────── */
const upsertHistory = (history, entry) => {
  const i = history.findIndex(
    (h) => h.recruiterId === entry.recruiterId && h.dateISO === entry.dateISO
  );
  if (i >= 0) history[i] = { ...history[i], ...entry };
  else history.push(entry);
  return [...history];
};
const last5Scores = (history, id) =>
  history
    .filter((h) => h.recruiterId === id && typeof h.score === "number")
    .sort((a,b)=> (a.dateISO < b.dateISO ? 1 : -1))
    .slice(0,5)
    .map((h) => Number(h.score)||0);

const isWithinLastWeeks = (iso, weeks=8) => {
  const d = parseISO(iso);
  const today = startOfWeekMon(new Date());
  const diff = (today - d) / 86400000;
  return diff >= 0 && diff <= weeks*7;
};
const boxPercentsLast8w = (history, id) => {
  const rows = history.filter((h)=> h.recruiterId===id && isWithinLastWeeks(h.dateISO,8));
  const totalSales = rows.reduce((s,r)=> s+(Number(r.score)||0), 0);
  const totalB2 = rows.reduce((s,r)=> s+(Number(r.box2)||0), 0);
  const totalB4 = rows.reduce((s,r)=> s+(Number(r.box4)||0), 0);
  const pct = (n,d) => d>0 ? (n/d)*100 : 0;
  return { b2: pct(totalB2,totalSales), b4: pct(totalB4,totalSales) };
};

/* ──────────────────────────────────────────────────────────────────────────
  Import normalization — supports our shape OR Indeed JSON
  (Title Case names + STRICT phone prefixes, rejects invalid)
────────────────────────────────────────────────────────────────────────── */
function normalizeImportedJson(raw) {
  const shapeLead = (r,i)=> {
    const name = titleCase(r.name || r.applicant?.fullName || "");
    const phoneRaw = r.phone || r.applicant?.phoneNumber || "";
    const norm = formatPhoneByCountry(phoneRaw);
    if (!norm.ok) throw new Error("Found invalid phone prefix in import (only +352/+33/+32/+49 allowed).");
    return {
      id: r.id || `lead_${i}_${Date.now()}`,
      name,
      phone: norm.display,
      flag: norm.flag,
      source: (r.source || "Indeed"),
    };
  };
  if (raw && Array.isArray(raw.leads) && Array.isArray(raw.interview) && Array.isArray(raw.formation)) {
    return {
      leads: raw.leads.map(shapeLead),
      interview: raw.interview.map(shapeLead),
      formation: raw.formation.map(shapeLead)
    };
  }
  const looksLikeIndeedOne = raw && typeof raw === "object" && raw.applicant && (raw.applicant.fullName || raw.applicant.phoneNumber);
  const looksLikeIndeedArray = Array.isArray(raw) && raw.length>0 && raw[0]?.applicant && (raw[0].applicant.fullName || raw[0].applicant.phoneNumber);

  if (looksLikeIndeedOne) return { leads: [shapeLead(raw,0)], interview: [], formation: [] };
  if (looksLikeIndeedArray) return { leads: raw.map(shapeLead), interview: [], formation: [] };

  if (Array.isArray(raw)) return { leads: raw.map(shapeLead), interview: [], formation: [] };
  throw new Error("Unsupported import file format.");
}

/* ──────────────────────────────────────────────────────────────────────────
  Auth gates (Login + reusable Gate + CredentialDialog)
────────────────────────────────────────────────────────────────────────── */
const Login = ({ onOk }) => {
  const [u,setU]=useState(""), [p,setP]=useState("");
  const submit=(e)=>{ e.preventDefault();
    if (AUTH_USERS[u] && AUTH_USERS[u]===p) { localStorage.setItem(AUTH_SESSION_KEY,u); onOk(); }
    else alert("Invalid credentials");
  };
  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader>
          <CardTitle style={{ fontFamily: "Lora,serif" }}>Proago CRM</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-1"><Label>Username</Label>
              <Input value={u} onChange={(e)=>setU(e.target.value)} placeholder="Oscar or Joao"/></div>
            <div className="grid gap-1"><Label>Password</Label>
              <Input type="password" value={p} onChange={(e)=>setP(e.target.value)} /></div>
            <Button style={{ background:"#d9010b", color:"white" }}>Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const Gate = ({ storageKey, label, onOk }) => {
  const [u,setU]=useState(""), [p,setP]=useState("");
  const submit=(e)=>{ e.preventDefault();
    if (AUTH_USERS[u] && AUTH_USERS[u]===p) { localStorage.setItem(storageKey, `${u}_${Date.now()}`); onOk(); }
    else alert("Invalid credentials");
  };
  return (
    <div className="grid place-items-center p-6 border rounded-xl bg-white">
      <div className="flex items-center gap-2 mb-3"><Lock className="h-4 w-4"/><span className="font-medium">{label}</span></div>
      <form onSubmit={submit} className="flex gap-2 w-full max-w-xl">
        <Input placeholder="Oscar or Joao" value={u} onChange={(e)=>setU(e.target.value)} />
        <Input type="password" placeholder="Password" value={p} onChange={(e)=>setP(e.target.value)} />
        <Button style={{ background:"#d9010b", color:"white" }}>Unlock</Button>
      </form>
    </div>
  );
};

const CredentialDialog = ({ open, label = "Confirm with credentials", onCancel, onSuccess }) => {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const submit = (e) => {
    e.preventDefault();
    if (AUTH_USERS[u] && AUTH_USERS[u] === p) onSuccess();
    else alert("Invalid credentials");
  };
  return (
    <Dialog open={open} onOpenChange={() => onCancel?.()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>Enter your Proago credentials to continue.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-2">
          <div className="grid gap-1">
            <Label>Username</Label>
            <Input value={u} onChange={(e) => setU(e.target.value)} placeholder="Oscar or Joao" />
          </div>
          <div className="grid gap-1">
            <Label>Password</Label>
            <Input type="password" value={p} onChange={(e) => setP(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onCancel?.()}>Cancel</Button>
            <Button style={{ background: "#d9010b", color: "white" }} type="submit">Confirm</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  Shell (Proago CRM in the top row; Settings like Logout)
────────────────────────────────────────────────────────────────────────── */
const Shell = ({ tab, setTab, onLogout, children, weekBadge }) => (
  <div className="min-h-screen">
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/proago-icon.png" alt="Proago" className="h-7 w-7 rounded-full"
               onError={(e)=> (e.currentTarget.style.display = "none")} />
          <span className="font-semibold text-lg" style={{ fontFamily:"Lora,serif" }}>Proago CRM</span>
          {weekBadge && <Badge variant="secondary" className="ml-3">{weekBadge}</Badge>}
        </div>
        <nav className="flex gap-2">
          {[
            ["inflow","Inflow"],
            ["recruiters","Recruiters"],
            ["planning","Planning"],
            ["salary","Salary"],
            ["finances","Finances"],
          ].map(([key,label])=>(
            <Button
              key={key}
              onClick={()=>setTab(key)}
              className="px-4"
              style={ tab===key ? { background:"#d9010b", color:"white" } : { background:"#fca11c", color:"#000" } }
            >{label}</Button>
          ))}
          <Button variant="ghost" onClick={()=>setTab("settings")}>Settings</Button>
          <Button variant="ghost" onClick={onLogout}>Logout</Button>
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
  </div>
);

/* ──────────────────────────────────────────────────────────────────────────
  Inflow (Pipeline) — with STRICT prefixes + Title Case + Flags
────────────────────────────────────────────────────────────────────────── */
const AddLeadDialog = ({ open, onOpenChange, onSave }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("Indeed");

  const reset = () => { setName(""); setPhone(""); setSource("Indeed"); };

  const normalized = phone ? formatPhoneByCountry(phone) : {display:"",flag:"",ok:false};
  return (
    <Dialog open={open} onOpenChange={(v)=>{ reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
          <DialogDescription>Only Name, Phone and Source are required.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1"><Label>Full name</Label>
            <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Flandrina Melvin"/></div>
          <div className="grid gap-1"><Label>Phone</Label>
            <Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+352 691 012 345"/></div>
          <div className="text-sm text-zinc-600">{normalized.flag} {normalized.display}</div>
          <div className="grid gap-1">
            <Label>Source</Label>
            <select className="h-10 border rounded-md px-2" value={source} onChange={(e)=>setSource(e.target.value)}>
              <option>Indeed</option>
              <option>Street</option>
              <option>Referral</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button>
          <Button style={{background:"#d9010b",color:"white"}} onClick={()=>{
            const nm = titleCase(name);
            if(!nm) return alert("Name required");
            const norm = formatPhoneByCountry(phone);
            if(!norm.ok) return alert("Phone must start with +352, +33, +32 or +49.");
            const lead = {
              id: (crypto.randomUUID? crypto.randomUUID() : String(Date.now()+Math.random())),
              name: nm,
              phone: norm.display,
              source: source.trim(),
              flag: norm.flag
            };
            onSave(lead); onOpenChange(false);
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Inflow = ({ pipeline, setPipeline, onHire }) => {
  const fileRef = useRef(null);
  const [addOpen, setAddOpen] = useState(false);

  const move=(item,from,to)=>{ const next=clone(pipeline); next[from]=next[from].filter(x=>x.id!==item.id); next[to].push(item); setPipeline(next); };
  const del=(item,from)=>{ if(!confirm("Delete?")) return; const next=clone(pipeline); next[from]=next[from].filter(x=>x.id!==item.id); setPipeline(next); };
  const hire=(item)=>{ let code=prompt("Crewcode:"); if(!code) return; const role=prompt("Role (default Rookie):","Rookie")||"Rookie"; onHire({...item, crewCode:code, role}); const next=clone(pipeline); next.formation=next.formation.filter(x=>x.id!==item.id); setPipeline(next); };

  const exportJSON=()=>{ const blob=new Blob([JSON.stringify(pipeline,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="pipeline.json"; a.click(); URL.revokeObjectURL(url); };
  const onImport=(file)=>{ const fr=new FileReader(); fr.onload=()=>{ try{
      const data=JSON.parse(fr.result); const normalized=normalizeImportedJson(data);
      setPipeline(normalized); alert("Import done ✅");
    }catch(err){ alert("Import failed: "+(err?.message||"Invalid file")); } }; fr.readAsText(file); };

  const Column=({title,keyName,prev,nextKey,extra})=>(
    <Card className="border-2">
      <CardHeader><CardTitle className="flex justify-between"><span>{title}</span><Badge>{pipeline[keyName].length}</Badge></CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50"><tr><th className="p-3 text-left">Name</th><th className="p-3">Phone</th><th className="p-3">Source</th><th className="p-3 text-right">Actions</th></tr></thead>
            <tbody>
              {pipeline[keyName].map((x)=>(
                <tr key={x.id} className="border-t">
                  <td className="p-3 font-medium">{titleCase(x.name)}</td>
                  <td className="p-3">{x.flag ? <span className="mr-1">{x.flag}</span> : null}{formatPhoneByCountry(x.phone).display}</td>
                  <td className="p-3">{x.source}</td>
                  <td className="p-3 flex gap-2 justify-end">
                    {prev && <Button size="sm" variant="outline" onClick={()=>move(x,keyName,prev)}>Back</Button>}
                    {nextKey && <Button size="sm" style={{background:"#d9010b",color:"white"}} onClick={()=>move(x,keyName,nextKey)}>→</Button>}
                    {extra && extra(x)}
                    <Button size="sm" variant="destructive" onClick={()=>del(x,keyName)}><Trash2 className="h-4 w-4"/></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (<div className="grid gap-4">
    <div className="flex justify-between"><h3>Inflow</h3><div className="flex gap-2">
      <Button onClick={exportJSON}><Download className="h-4 w-4 mr-1"/>Export</Button>
      <Button onClick={()=>fileRef.current?.click()}><Upload className="h-4 w-4 mr-1"/>Import</Button>
      <input ref={fileRef} type="file" hidden accept="application/json" onChange={(e)=>e.target.files?.[0]&&onImport(e.target.files[0])}/>
      <Button style={{background:"#d9010b",color:"white"}} onClick={()=>setAddOpen(true)}><Plus className="h-4 w-4 mr-1"/>Add Lead</Button>
    </div></div>
    <div className="grid md:grid-cols-3 gap-4">
      <Column title="Leads" keyName="leads" nextKey="interview"/>
      <Column title="Interview" keyName="interview" prev="leads" nextKey="formation"/>
      <Column title="Formation" keyName="formation" prev="interview" extra={(x)=><Button size="sm" onClick={()=>hire(x)}><UserPlus className="h-4 w-4 mr-1"/>Hire</Button>}/>
    </div>
    <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onSave={(lead)=>setPipeline((p)=>({...p,leads:[lead,...p.leads]}))}/>
  </div>);
};
/* ──────────────────────────────────────────────────────────────────────────
  Recruiters (with last5, avg colors, Box2/Box4%, history editor; location read-only)
────────────────────────────────────────────────────────────────────────── */
const Recruiters = ({ recruiters, setRecruiters, history, setHistory }) => {
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);

  // credential-gated per-row delete in history
  const [credOpen, setCredOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // { recruiterId, dateISO }
  const requestDeleteHistory = (recruiterId, dateISO) => { setPendingDelete({ recruiterId, dateISO }); setCredOpen(true); };
  const performDeleteHistory = () => {
    const { recruiterId, dateISO } = pendingDelete || {};
    if (!recruiterId || !dateISO) { setCredOpen(false); setPendingDelete(null); return; }
    setHistory((h) => h.filter((row) => !(row.recruiterId === recruiterId && row.dateISO === dateISO)));
    setCredOpen(false); setPendingDelete(null);
  };

  const avgColor = (n) => (n >= 3 ? "#10b981" : n >= 2 ? "#fbbf24" : "#ef4444");
  const box2Color = (pct) => (pct >= 70 ? "#10b981" : "#ef4444");
  const box4Color = (pct) => (pct >= 40 ? "#10b981" : "#ef4444");

  const last5ScoresMemo = useMemo(() => (id) => last5Scores(history,id), [history]);
  const decorate = (r) => {
    const last5 = last5ScoresMemo(r.id);
    const avg = last5.length ? last5.reduce((s,n)=>s+n,0)/last5.length : 0;
    const { b2, b4 } = boxPercentsLast8w(history,r.id);
    return { ...r, _last5:last5, _avg:avg, _b2:b2, _b4:b4 };
  };
  const decorated = recruiters.map(decorate);

  const del=(id)=>{ if(!confirm("Delete recruiter? History will be kept.")) return;
    setRecruiters(recruiters.filter(r=>r.id!==id)); };

  const updateHistField=(recId,dateISO,key,raw)=>{
    if (key==="location") return; // location is read-only here (change via Planning)
    setHistory((h)=> upsertHistory(h,{ recruiterId:recId, dateISO,
      [key]: (["score","box2","box4","hours","commissionMult"].includes(key)? (raw===""?undefined:Number(raw)) : raw)
    }));
  };

  return (<div className="grid gap-4">
    <div className="overflow-x-auto border rounded-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50">
          <tr>
            <th className="p-3">Name</th><th className="p-3">Crewcode</th><th className="p-3">Role</th>
            <th className="p-3">Last 5</th><th className="p-3 text-right">Average</th>
            <th className="p-3 text-right">Box2</th><th className="p-3 text-right">Box4</th>
            <th className="p-3">Phone</th><th className="p-3">Contract</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {decorated.map((r)=>(
            <tr key={r.id} className="border-t">
              <td className="p-3 font-medium"><button className="underline" onClick={()=>setDetail(r)}>{r.name}</button></td>
              <td className="p-3">{r.crewCode}</td>
              <td className="p-3">{r.role}</td>
              <td className="p-3">{r._last5.length? r._last5.join("–"):"—"}</td>
              <td className="p-3 text-right" style={{color:avgColor(r._avg)}}>{r._avg.toFixed(2)}</td>
              <td className="p-3 text-right" style={{color:box2Color(r._b2)}}>{r._b2.toFixed(1)}%</td>
              <td className="p-3 text-right" style={{color:box4Color(r._b4)}}>{r._b4.toFixed(1)}%</td>
              <td className="p-3">{r.phone}</td>
              <td className="p-3">{r.contract||"—"}</td>
              <td className="p-3 flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={()=>setEdit(r)}><Edit3 className="h-4 w-4"/>Edit</Button>
                <Button size="sm" variant="destructive" onClick={()=>del(r.id)}><Trash2 className="h-4 w-4"/></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* History modal */}
    <Dialog open={!!detail} onOpenChange={()=>setDetail(null)}>
      <DialogContent className="max-w-5xl">
        <DialogHeader><DialogTitle>{detail?.name} — {detail?.crewCode}</DialogTitle><DialogDescription>All-time shifts (location read-only here)</DialogDescription></DialogHeader>
        <div className="max-h-[70vh] overflow-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Location</th>
                <th className="p-2 text-right">Hours</th>
                <th className="p-2 text-right">Mult</th>
                <th className="p-2 text-right">Score</th>
                <th className="p-2 text-right">Box2</th>
                <th className="p-2 text-right">Box4</th>
                <th className="p-2 text-right">Delete</th>
              </tr>
            </thead>
            <tbody>
              {history
                .filter(h=>h.recruiterId===detail?.id)
                .sort((a,b)=>a.dateISO<b.dateISO?1:-1)
                .map((h,i)=>(
                <tr key={i} className="border-t">
                  <td className="p-2">{fmtUK(h.dateISO)}</td>
                  <td className="p-2">
                    <select defaultValue={h.roleAtShift||detail?.role||"Rookie"} className="h-9 border rounded-md px-2" onChange={(e)=>updateHistField(detail.id,h.dateISO,"roleAtShift",e.target.value)}>
                      {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <Input value={h.location||""} readOnly title="Edit location via Planning" />
                  </td>
                  <td className="p-2 text-right"><Input defaultValue={h.hours??""} inputMode="numeric" onBlur={(e)=>updateHistField(detail.id,h.dateISO,"hours",e.target.value)}/></td>
                  <td className="p-2 text-right"><Input defaultValue={h.commissionMult??""} inputMode="decimal" onBlur={(e)=>updateHistField(detail.id,h.dateISO,"commissionMult",e.target.value)}/></td>
                  <td className="p-2 text-right"><Input defaultValue={h.score??""} inputMode="numeric" onBlur={(e)=>updateHistField(detail.id,h.dateISO,"score",e.target.value)}/></td>
                  <td className="p-2 text-right"><Input defaultValue={h.box2??""} inputMode="numeric" onBlur={(e)=>updateHistField(detail.id,h.dateISO,"box2",e.target.value)}/></td>
                  <td className="p-2 text-right"><Input defaultValue={h.box4??""} inputMode="numeric" onBlur={(e)=>updateHistField(detail.id,h.dateISO,"box4",e.target.value)}/></td>
                  <td className="p-2 text-right">
                    <Button variant="destructive" size="sm" onClick={()=>requestDeleteHistory(detail.id, h.dateISO)} title="Delete this history row">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter><Button onClick={()=>setDetail(null)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <CredentialDialog
      open={credOpen}
      label="Confirm to delete history entry"
      onCancel={() => { setCredOpen(false); setPendingDelete(null); }}
      onSuccess={performDeleteHistory}
    />

    {/* Edit recruiter */}
    <Dialog open={!!edit} onOpenChange={()=>setEdit(null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit recruiter</DialogTitle></DialogHeader>
        <div className="grid gap-2">
          <Label>Name</Label><Input value={edit?.name||""} onChange={(e)=>setEdit({...edit,name:e.target.value})}/>
          <Label>Crewcode</Label><Input value={edit?.crewCode||""} onChange={(e)=>setEdit({...edit,crewCode:e.target.value})}/>
          <Label>Phone</Label><Input value={edit?.phone||""} onChange={(e)=>setEdit({...edit,phone:e.target.value})}/>
          <Label>Role</Label>
          <select className="h-10 border rounded-md px-2" value={edit?.role||"Rookie"} onChange={(e)=>setEdit({...edit,role:e.target.value})}>
            {ROLES.map(r=><option key={r}>{r}</option>)}
          </select>
          <Label>Contract</Label>
          <select className="h-10 border rounded-md px-2" value={edit?.contract||""} onChange={(e)=>setEdit({...edit,contract:e.target.value})}>
            <option value="">—</option><option>CDD</option><option>CDI</option>
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setEdit(null)}>Cancel</Button>
          <Button style={{background:"#d9010b",color:"white"}} onClick={()=>{
            setRecruiters(all=>all.map(r=>r.id===edit.id?{...edit, name:titleCase(edit.name)}:r));
            setEdit(null);
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>);
};

/* ──────────────────────────────────────────────────────────────────────────
  Planning — compact preview + Edit Day modal
  - Zone has: name, project, shiftType
  - Per recruiter row: recruiterId, hours, commissionMult, score, box2, box4
  - Preview shows Score (colored like Recruiters) + Project
────────────────────────────────────────────────────────────────────────── */
const ensureWeek = (state, weekISO) => {
  const safe = state && typeof state === "object" ? state : {};
  const base = safe[weekISO] && typeof safe[weekISO] === "object" ? safe[weekISO] : { days: {} };
  if (!base.days || typeof base.days !== "object") base.days = {};

  for (let i = 0; i < 7; i++) {
    const dateISO = fmtISO(addDays(parseISO(weekISO), i));
    if (!base.days[dateISO]) {
      base.days[dateISO] = { zones: [] };
    } else {
      // migrate legacy day.teams -> zones if present
      const day = base.days[dateISO];
      if (day && Array.isArray(day.teams)) {
        const zones = (day.teams || []).map((t) => ({
          name: t?.location || "",
          project: "HF",
          shiftType: "D2D",
          rows: (t?.members || []).map((rid) => ({
            recruiterId: rid || "",
            hours: undefined,
            commissionMult: undefined,
            score: undefined,
            box2: undefined,
            box4: undefined,
          })),
        }));
        base.days[dateISO] = { zones };
      } else if (!Array.isArray(day?.zones)) {
        base.days[dateISO] = { zones: [] };
      }
    }
  }
  return { ...safe, [weekISO]: base };
};

const Planning = ({ recruiters, planning, setPlanning, history, setHistory }) => {
  const [weekStart, setWeekStart] = useState(() => fmtISO(startOfWeekMon(new Date())));
  const weekNum = weekNumberISO(parseISO(weekStart));

  useEffect(() => { setPlanning((p) => ensureWeek(p || {}, weekStart)); }, [weekStart, setPlanning]);

  const getDay = (iso) => {
    const wk = planning?.[weekStart];
    const days = wk?.days && typeof wk.days === "object" ? wk.days : {};
    return days[iso] && typeof days[iso] === "object" ? days[iso] : { zones: [] };
  };

  const rById = (id) => recruiters.find((r) => r.id === id);
  const multipliers = [
    { label: "100%", val: 1.0 }, { label: "125%", val: 1.25 },
    { label: "150%", val: 1.5 }, { label: "200%", val: 2.0 },
  ];
  const shiftTypes = [{ label: "Door-to-Door", val: "D2D" }, { label: "Events", val: "EVENT" }];

  // Edit Day modal state
  const [editDateISO, setEditDateISO] = useState(null);
  const [draftDay, setDraftDay] = useState(null); // { zones:[{name, project, shiftType, rows:[...]}] }

  const openEditDay = (dateISO) => {
    const d = clone(getDay(dateISO));
    // initialize defaults for new zones if empty
    if (!d.zones || !d.zones.length) {
      d.zones = [{ name: "Luxembourg, Gare", project: "HF", shiftType: "D2D", rows: [] }];
    } else {
      d.zones = d.zones.map(z => ({ project: "HF", shiftType: "D2D", ...z }));
    }
    setEditDateISO(dateISO);
    setDraftDay(d);
  };
  const closeEditDay = () => { setEditDateISO(null); setDraftDay(null); };

  // Draft mutations
  const addZone = () => setDraftDay((d) => ({ ...d, zones: [...(d?.zones || []), { name: "Luxembourg, Gare", project: "HF", shiftType: "D2D", rows: [] }] }));
  const delZone = (zi) => setDraftDay((d) => ({ ...d, zones: (d?.zones || []).filter((_, i) => i !== zi) }));
  const setZoneField = (zi, patch) => setDraftDay((d) => { const zones = clone(d.zones || []); zones[zi] = { ...zones[zi], ...patch }; return { ...d, zones }; });
  const addRow = (zi) => setDraftDay((d) => { const zones=clone(d.zones||[]); (zones[zi].rows ||= []).push({
    recruiterId: "", hours: undefined, commissionMult: undefined, score: undefined, box2: undefined, box4: undefined,
  }); return { ...d, zones }; });
  const delRow = (zi, ri) => setDraftDay((d) => { const zones=clone(d.zones||[]); zones[zi].rows=(zones[zi].rows||[]).filter((_,i)=>i!==ri); return { ...d, zones }; });
  const setRow = (zi, ri, patch) => setDraftDay((d) => { const zones=clone(d.zones||[]); zones[zi].rows[ri] = { ...zones[zi].rows[ri], ...patch }; return { ...d, zones }; });

  // Save day → planning + history upserts
  const saveDay = () => {
    if (!draftDay) return;
    const dateISO = editDateISO;

    // Validate box sums
    for (const z of draftDay.zones || []) {
      for (const row of z.rows || []) {
        const sc = Number(row.score || 0);
        const b2 = Number(row.box2 || 0);
        const b4 = Number(row.box4 || 0);
        if (b2 > sc || b4 > sc || b2 + b4 > sc) {
          alert("Box2/Box4 cannot exceed Score (and Box2 + Box4 ≤ Score).");
          return;
        }
      }
    }

    setPlanning((prev) => {
      const next = clone(prev || {});
      if (!next[weekStart]) Object.assign(next, ensureWeek(next, weekStart));
      next[weekStart].days[dateISO] = clone(draftDay);
      return next;
    });

    setHistory((h) => {
      let out = [...h];
      (draftDay.zones || []).forEach((z) => {
        (z.rows || []).forEach((row) => {
          if (!row.recruiterId) return;
          const rec = rById(row.recruiterId);
          out = upsertHistory(out, {
            dateISO,
            recruiterId: row.recruiterId,
            recruiterName: rec?.name || "",
            crewCode: rec?.crewCode,
            location: z.name || "",
            score: row.score === "" ? undefined : Number(row.score || 0),
            box2: row.box2 === "" ? undefined : Number(row.box2 || 0),
            box4: row.box4 === "" ? undefined : Number(row.box4 || 0),
            project: z.project || "HF",
            shiftType: z.shiftType || "D2D",
            hours: row.hours === "" ? undefined : (row.hours != null ? Number(row.hours) : undefined),
            commissionMult: row.commissionMult == null ? undefined : Number(row.commissionMult),
            roleAtShift: rec?.role || "Rookie",
          });
        });
      });
      return out;
    });

    closeEditDay();
  };

  const scoreColor = (v) => (v >= 3 ? "#10b981" : v >= 2 ? "#fbbf24" : "#ef4444");

  const DayCard = ({ i }) => {
    const dISO = fmtISO(addDays(parseISO(weekStart), i));
    const day = getDay(dISO);
    return (
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}{" "}
              <span className="text-sm text-zinc-500">({fmtUK(dISO)})</span>
            </span>
            <Button variant="outline" size="sm" onClick={() => openEditDay(dISO)}>
              Edit Day
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {day.zones && day.zones.length > 0 ? (
            day.zones.map((z, zi) => (
              <div key={zi} className="border rounded-lg p-2">
                <div className="text-xs uppercase text-zinc-500 mb-1">Zone</div>
                <div className="font-medium mb-2">{z.name || "—"} <span className="text-xs text-zinc-600">• Project: {z.project || "HF"}</span></div>
                {(z.rows || []).length > 0 ? (
                  <ul className="text-sm space-y-1">
                    {z.rows.map((row, ri) => {
                      const rec = rById(row.recruiterId);
                      const histRow = history.find(h => h.recruiterId===row.recruiterId && h.dateISO===dISO);
                      const sc = row.score ?? histRow?.score;
                      return (
                        <li key={ri} className="flex items-center justify-between">
                          <span>{rec?.name || "Recruiter"}</span>
                          <span className="text-zinc-600" style={{color: typeof sc==="number" ? scoreColor(Number(sc)) : undefined}}>
                            {typeof sc === "number" ? sc : "—"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-sm text-zinc-500">No recruiters</div>
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No shifts yet</div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setWeekStart(fmtISO(addDays(parseISO(weekStart), -7)))}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Badge style={{ background: "#fca11c" }}>Week {weekNum}</Badge>
          <Button variant="outline" onClick={() => setWeekStart(fmtISO(addDays(parseISO(weekStart), 7)))}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => <DayCard key={i} i={i} />)}
      </div>

      {/* Edit Day modal */}
      <Dialog open={!!editDateISO} onOpenChange={(open) => { if (!open) closeEditDay(); }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Edit Day — {fmtUK(editDateISO || "")}</DialogTitle>
            <DialogDescription>Add Zones and Recruiters. Values saved per shift; Zone holds Project & Type.</DialogDescription>
          </DialogHeader>

          {/* Zones list */}
          <div className="grid gap-3">
            {(draftDay?.zones || []).map((z, zi) => (
              <div key={zi} className="border rounded-xl p-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                  <div className="grid gap-1">
                    <Label>Zone</Label>
                    <Input className="h-9" value={z.name} onChange={(e) => setZoneField(zi, { name: e.target.value })} placeholder="Luxembourg, Gare" />
                  </div>
                  <div className="grid gap-1">
                    <Label>Project</Label>
                    <select className="h-9 border rounded-md px-2" value={z.project || "HF"} onChange={(e)=>setZoneField(zi,{project:e.target.value})}>
                      {(load(K.settings, DEFAULT_SETTINGS).projects || ["HF"]).map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label>Shift Type</Label>
                    <select className="h-9 border rounded-md px-2" value={z.shiftType || "D2D"} onChange={(e)=>setZoneField(zi,{shiftType:e.target.value})}>
                      {shiftTypes.map(t => <option key={t.val} value={t.val}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="p-2 text-left">Recruiter</th>
                        <th className="p-2 text-right">Hours</th>
                        <th className="p-2 text-right">Mult</th>
                        <th className="p-2 text-right">Score</th>
                        <th className="p-2 text-right">Box2</th>
                        <th className="p-2 text-right">Box4</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(z.rows || []).map((row, ri) => (
                        <tr key={ri} className="border-t">
                          <td className="p-2">
                            <select className="h-9 border rounded-md px-2 min-w-48" value={row.recruiterId} onChange={(e) => setRow(zi, ri, { recruiterId: e.target.value })}>
                              <option value="">Select…</option>
                              {recruiters.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                            </select>
                          </td>
                          <td className="p-2 text-right">
                            <Input className="w-20 h-9" inputMode="numeric" value={row.hours ?? ""} onChange={(e) => setRow(zi, ri, { hours: e.target.value })} placeholder="6/7/8" />
                          </td>
                          <td className="p-2 text-right">
                            <select className="h-9 border rounded-md px-2" value={row.commissionMult ?? ""} onChange={(e) => setRow(zi, ri, { commissionMult: e.target.value ? Number(e.target.value) : "" })}>
                              <option value="">—</option>
                              {multipliers.map((m) => (<option key={m.val} value={m.val}>{m.label}</option>))}
                            </select>
                          </td>
                          <td className="p-2 text-right">
                            <Input className="w-20 h-9" inputMode="numeric" value={row.score ?? ""} onChange={(e) => setRow(zi, ri, { score: e.target.value })} />
                          </td>
                          <td className="p-2 text-right">
                            <Input className="w-20 h-9" inputMode="numeric" value={row.box2 ?? ""} onChange={(e) => setRow(zi, ri, { box2: e.target.value })} />
                          </td>
                          <td className="p-2 text-right">
                            <Input className="w-20 h-9" inputMode="numeric" value={row.box4 ?? ""} onChange={(e) => setRow(zi, ri, { box4: e.target.value })} />
                          </td>
                          <td className="p-2 text-right">
                            <Button variant="outline" size="sm" onClick={() => delRow(zi, ri)}><X className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => addRow(zi)}><Plus className="h-4 w-4 mr-1" /> Add Recruiter</Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3">
            <Button variant="outline" size="sm" onClick={addZone}><Plus className="h-4 w-4 mr-1" /> Add Zone</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeEditDay}>Cancel</Button>
              <Button style={{ background:"#d9010b", color:"white" }} onClick={saveDay}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
/* ──────────────────────────────────────────────────────────────────────────
  Salary — month nav, hours & Box2 commissions (+ Wages column)
────────────────────────────────────────────────────────────────────────── */
const rookieCommission = (box2) => {
  const t = {0:0,1:0,2:25,3:40,4:70,5:85,6:120,7:135,8:175,9:190,10:235};
  if (box2 <= 10) return t[box2] ?? 0;
  return 235 + (box2 - 10) * 15;
};

const Salary = ({ recruiters, history }) => {
  const [payMonth, setPayMonth] = useState(currentMonthKey());
  const [status, setStatus] = useState("all");

  const monthShift = (ym, delta) => {
    const [y,m] = ym.split("-").map(Number);
    const d = new Date(Date.UTC(y,m-1,1));
    d.setUTCMonth(d.getUTCMonth()+delta);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
  };

  const workMonth = prevMonthKey(payMonth);
  const commMonth = prevMonthKey(workMonth);
  const inMonth = (iso, ym) => monthKey(iso) === ym;

  const defaultRate = load(K.settings, DEFAULT_SETTINGS).defaultHourlyRate || DEFAULT_SETTINGS.defaultHourlyRate;

  const rows = recruiters
    .filter(r => status==="all" ? true : status==="active" ? !r.isInactive : !!r.isInactive)
    .map(r => {
      const hRows = history.filter(x => x.recruiterId===r.id && inMonth(x.dateISO, workMonth));
      const rolesWorked = Array.from(new Set(hRows.map(x => x.roleAtShift || r.role || "Rookie")));
      const hours = hRows.reduce((s,row)=>s + (row.hours ?? roleHoursDefault(row.roleAtShift||r.role||"Rookie")),0);
      const wages = hours * defaultRate;

      const cRows = history.filter(x => x.recruiterId===r.id && inMonth(x.dateISO, commMonth));
      const bonus = cRows.reduce((s,row)=>{
        const b2 = Number(row.box2)||0;
        const base = rookieCommission(b2);
        const mult = row.commissionMult ?? roleMultiplierDefault(row.roleAtShift||r.role||"Rookie");
        return s + base*mult;
      },0);
      return { recruiter:r, hours, wages, bonus, rolesWorked };
    });

  const exportCSV = () => {
    const hdr=["Name","Crewcode","Role(s)",`Hours (${monthLabel(workMonth)})`,`Wages € (${monthLabel(workMonth)})`,`Bonus € (${monthLabel(commMonth)})`];
    const lines=[hdr.join(",")];
    rows.forEach(({recruiter:r,hours,wages,bonus,rolesWorked})=>{
      lines.push([`"${r.name}"`,`"${r.crewCode||""}"`,`"${rolesWorked.join("/")||r.role||"Rookie"}"`,hours,toMoney(wages),toMoney(bonus)].join(","));
    });
    const blob=new Blob([lines.join("\n")],{type:"text/csv"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download=`salary_${payMonth}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={()=>setPayMonth(monthShift(payMonth,-1))}><ChevronLeft className="h-4 w-4"/>Prev</Button>
          <Badge style={{background:"#fca11c"}}>Payday 15 {monthLabel(payMonth)}</Badge>
          <Button variant="outline" onClick={()=>setPayMonth(monthShift(payMonth,1))}>Next<ChevronRight className="h-4 w-4"/></Button>
        </div>
        <div className="flex gap-2 items-center">
          <Label>Status</Label>
          <select className="h-10 border rounded-md px-2" value={status} onChange={(e)=>setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
          <Button onClick={exportCSV}><Download className="h-4 w-4 mr-1"/>Export CSV</Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Hours & Wages from <strong>{monthLabel(workMonth)}</strong> • Bonus from <strong>{monthLabel(commMonth)}</strong>
      </div>

      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50"><tr>
            <th className="p-3 text-left">Name</th>
            <th className="p-3 text-left">Crewcode</th>
            <th className="p-3 text-left">Role(s)</th>
            <th className="p-3 text-right">Hours</th>
            <th className="p-3 text-right">Wages €</th>
            <th className="p-3 text-right">Bonus €</th>
          </tr></thead>
          <tbody>
            {rows.map(({recruiter:r,hours,wages,bonus,rolesWorked})=>(
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">{r.crewCode}</td>
                <td className="p-3">{rolesWorked.join("/") || r.role || "Rookie"}</td>
                <td className="p-3 text-right">{hours}</td>
                <td className="p-3 text-right">{toMoney(wages)}</td>
                <td className="p-3 text-right">{toMoney(bonus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  Finances — weekly profit per Proago rules
  Columns (and dropdown detail) in this order:
  Shifts | Score | Box2 | Box4 | Wages | Income | Profit
  Profit green if >0, red if <0
────────────────────────────────────────────────────────────────────────── */
const Finances = ({ history }) => {
  const [weekStart, setWeekStart] = useState(()=>fmtISO(startOfWeekMon(new Date())));
  const [expanded, setExpanded] = useState({}); // iso => bool
  const settings = load(K.settings, DEFAULT_SETTINGS);
  const matrix = settings.financeMatrix || DEFAULT_SETTINGS.financeMatrix;
  const defaultRate = settings.defaultHourlyRate || DEFAULT_SETTINGS.defaultHourlyRate;

  const calcIncome = (row) => {
    const type = row.shiftType==="EVENT" ? "EVENT":"D2D";
    const discKey = row.welcomeDiscount ? "discount":"noDiscount";
    const m = matrix[type]?.[discKey] || matrix.D2D.noDiscount;
    const b2 = Number(row.box2)||0; const b4 = Number(row.box4)||0;
    return b2*(m.box2||0)+ b4*(m.box4||0);
  };
  const calcWages = (row) => {
    const hrs = row.hours ?? roleHoursDefault(row.roleAtShift||"Rookie");
    const rate = defaultRate;
    return hrs*rate;
  };

  const makeDayTotal = (iso) => {
    const rows = history.filter(h=>h.dateISO===iso);
    let income=0,wages=0,score=0,box2=0,box4=0,shifts=0;
    const detail = rows.map(r=>{
      const inc = calcIncome(r);
      const wag = calcWages(r);
      const prof = inc - wag;
      return {
        name: r.recruiterName || r.recruiterId,
        score: Number(r.score)||0,
        box2: Number(r.box2)||0,
        box4: Number(r.box4)||0,
        wages: wag,
        income: inc,
        profit: prof,
      };
    });
    rows.forEach(r=>{
      income+=calcIncome(r); wages+=calcWages(r);
      score+=Number(r.score)||0; box2+=Number(r.box2)||0; box4+=Number(r.box4)||0; shifts++;
    });
    return {iso,income,wages,profit:income-wages,score,box2,box4,shifts, detail};
  };

  const days=Array.from({length:7}).map((_,i)=>makeDayTotal(fmtISO(addDays(parseISO(weekStart),i))));
  const weekIncome=days.reduce((s,d)=>s+d.income,0);
  const weekWages=days.reduce((s,d)=>s+d.wages,0);
  const weekProfit=weekIncome-weekWages;

  const profitColor = (v) => (v>0 ? "#10b981" : v<0 ? "#ef4444" : undefined);

  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={()=>setWeekStart(fmtISO(addDays(parseISO(weekStart),-7)))}><ChevronLeft className="h-4 w-4"/>Prev</Button>
          <Badge style={{background:"#fca11c"}}>Week {weekNumberISO(parseISO(weekStart))}</Badge>
          <Button variant="outline" onClick={()=>setWeekStart(fmtISO(addDays(parseISO(weekStart),7)))}>Next<ChevronRight className="h-4 w-4"/></Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Income €{toMoney(weekIncome)} • Wages €{toMoney(weekWages)} • <span style={{color:profitColor(weekProfit)}}>Profit €{toMoney(weekProfit)}</span>
        </div>
      </div>
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50"><tr>
            <th className="p-3">Date</th>
            <th className="p-3 text-right">Shifts</th>
            <th className="p-3 text-right">Score</th>
            <th className="p-3 text-right">Box2</th>
            <th className="p-3 text-right">Box4</th>
            <th className="p-3 text-right">Wages</th>
            <th className="p-3 text-right">Income</th>
            <th className="p-3 text-right">Profit</th>
            <th className="p-3 text-right">Details</th>
          </tr></thead>
          <tbody>
            {days.map(d=>(
              <React.Fragment key={d.iso}>
                <tr className="border-t">
                  <td className="p-3">{fmtUK(d.iso)}</td>
                  <td className="p-3 text-right">{d.shifts}</td>
                  <td className="p-3 text-right">{d.score}</td>
                  <td className="p-3 text-right">{d.box2}</td>
                  <td className="p-3 text-right">{d.box4}</td>
                  <td className="p-3 text-right">{toMoney(d.wages)}</td>
                  <td className="p-3 text-right">{toMoney(d.income)}</td>
                  <td className="p-3 text-right" style={{color:profitColor(d.profit)}}>{toMoney(d.profit)}</td>
                  <td className="p-3 text-right">
                    <Button variant="outline" size="sm" onClick={()=>setExpanded(e=>({...e, [d.iso]: !e[d.iso]}))}>
                      {expanded[d.iso] ? "Hide" : "View"} <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </td>
                </tr>
                {expanded[d.iso] && d.detail.length>0 && (
                  <tr>
                    <td colSpan={9} className="p-0">
                      <div className="px-3 pb-3">
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="min-w-full text-sm">
                            <thead className="bg-zinc-50"><tr>
                              <th className="p-2 text-left">Recruiter</th>
                              <th className="p-2 text-right">Score</th>
                              <th className="p-2 text-right">Box2</th>
                              <th className="p-2 text-right">Box4</th>
                              <th className="p-2 text-right">Wages</th>
                              <th className="p-2 text-right">Income</th>
                              <th className="p-2 text-right">Profit</th>
                            </tr></thead>
                            <tbody>
                              {d.detail.map((r,i)=>(
                                <tr key={i} className="border-t">
                                  <td className="p-2">{r.name}</td>
                                  <td className="p-2 text-right">{r.score}</td>
                                  <td className="p-2 text-right">{r.box2}</td>
                                  <td className="p-2 text-right">{r.box4}</td>
                                  <td className="p-2 text-right">{toMoney(r.wages)}</td>
                                  <td className="p-2 text-right">{toMoney(r.income)}</td>
                                  <td className="p-2 text-right" style={{color:profitColor(r.profit)}}>{toMoney(r.profit)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
/* ──────────────────────────────────────────────────────────────────────────
  Settings (defaults + finance matrix + backfill + bulk delete history)
────────────────────────────────────────────────────────────────────────── */
const Settings = ({ history, setHistory }) => {
  const [settings, setSettings] = useState(load(K.settings, DEFAULT_SETTINGS));
  const [credOpen, setCredOpen] = useState(false);

  useEffect(() => save(K.settings, settings), [settings]);

  const updateMatrix = (type, disc, box, val) => {
    setSettings((s) => {
      const next = clone(s);
      next.financeMatrix[type][disc][box] = Number(val) || 0;
      return next;
    });
  };

  const backfillRate = () => {
    const rate = settings.defaultHourlyRate || DEFAULT_SETTINGS.defaultHourlyRate;
    setHistory((h) => h.map((row) => ({ ...row, rateEUR: row.rateEUR ?? rate })));
    alert("Backfilled missing hourly rates ✅");
  };

  const bulkDelete = () => {
    setHistory([]);
    alert("All history deleted ❌");
  };

  return (
    <div className="grid gap-6 max-w-4xl">
      <h3 className="text-lg font-semibold">Settings</h3>

      <div className="grid gap-2">
        <Label>Default Hourly Rate (€)</Label>
        <Input
          type="number"
          value={settings.defaultHourlyRate}
          onChange={(e) =>
            setSettings({ ...settings, defaultHourlyRate: Number(e.target.value) })
          }
        />
      </div>

      <div className="grid gap-2">
        <Label>Projects (comma separated)</Label>
        <Input
          value={settings.projects.join(", ")}
          onChange={(e) =>
            setSettings({ ...settings, projects: e.target.value.split(",").map((p) => p.trim()).filter(Boolean) })
          }
        />
      </div>

      <div>
        <h4 className="font-medium mb-2">Finance Matrix</h4>
        {Object.keys(settings.financeMatrix).map((type) => (
          <div key={type} className="border rounded-xl p-3 mb-3">
            <div className="font-semibold mb-2">{type}</div>
            {Object.keys(settings.financeMatrix[type]).map((disc) => (
              <div key={disc} className="mb-2">
                <div className="text-sm text-zinc-600 mb-1">{disc}</div>
                <div className="flex gap-3">
                  <div>
                    <Label>Box2</Label>
                    <Input
                      type="number"
                      value={settings.financeMatrix[type][disc].box2}
                      onChange={(e) =>
                        updateMatrix(type, disc, "box2", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Box4</Label>
                    <Input
                      type="number"
                      value={settings.financeMatrix[type][disc].box4}
                      onChange={(e) =>
                        updateMatrix(type, disc, "box4", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={backfillRate}>
          Backfill Hourly Rate
        </Button>
        <Button
          variant="destructive"
          onClick={() => setCredOpen(true)}
        >
          Bulk Delete History
        </Button>
      </div>

      <CredentialDialog
        open={credOpen}
        label="Confirm bulk delete of history"
        onCancel={() => setCredOpen(false)}
        onSuccess={() => {
          bulkDelete();
          setCredOpen(false);
        }}
      />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  Main App Wrapper
────────────────────────────────────────────────────────────────────────── */
export default function App() {
  // wipe data once if version changed
  useEffect(() => {
    const ver = localStorage.getItem(VERSION_KEY);
    if (ver !== DATA_VERSION) {
      localStorage.clear();
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
    }
  }, []);

  const [authed, setAuthed] = useState(!!localStorage.getItem(AUTH_SESSION_KEY));
  const [tab, setTab] = useState("inflow");
  const [pipeline, setPipeline] = useState(
    load(K.pipeline, { leads: [], interview: [], formation: [] })
  );
  const [recruiters, setRecruiters] = useState(load(K.recruiters, []));
  const [planning, setPlanning] = useState(load(K.planning, {}));
  const [history, setHistory] = useState(load(K.history, []));

  useEffect(() => save(K.pipeline, pipeline), [pipeline]);
  useEffect(() => save(K.recruiters, recruiters), [recruiters]);
  useEffect(() => save(K.planning, planning), [planning]);
  useEffect(() => save(K.history, history), [history]);

  const onLogout = () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    setAuthed(false);
  };
  if (!authed) return <Login onOk={() => setAuthed(true)} />;

  const weekBadge = tab === "planning" ? `Week ${weekNumberISO(startOfWeekMon(new Date()))}` : "";
  const [salaryUnlocked, setSalaryUnlocked] = useState(
    !!localStorage.getItem(SALARY_SESSION_KEY)
  );
  const [financeUnlocked, setFinanceUnlocked] = useState(
    !!localStorage.getItem(FINANCE_SESSION_KEY)
  );

  return (
    <Shell tab={tab} setTab={setTab} onLogout={onLogout} weekBadge={weekBadge}>
      {tab === "inflow" && (
        <Inflow
          pipeline={pipeline}
          setPipeline={setPipeline}
          onHire={(rec) => {
            const newRec = {
              id: crypto.randomUUID(),
              name: titleCase(rec.name),
              phone: rec.phone,
              crewCode: rec.crewCode,
              role: rec.role || "Rookie",
              contract: "",
            };
            setRecruiters((all) => [...all, newRec]);
          }}
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
      {tab === "salary" &&
        (salaryUnlocked ? (
          <Salary recruiters={recruiters} history={history} />
        ) : (
          <Gate
            storageKey={SALARY_SESSION_KEY}
            label="Re-enter credentials for Salary"
            onOk={() => setSalaryUnlocked(true)}
          />
        ))}
      {tab === "finances" &&
        (financeUnlocked ? (
          <Finances history={history} />
        ) : (
          <Gate
            storageKey={FINANCE_SESSION_KEY}
            label="Re-enter credentials for Finances"
            onOk={() => setFinanceUnlocked(true)}
          />
        ))}
      {tab === "settings" && <Settings history={history} setHistory={setHistory} />}
    </Shell>
  );
}
