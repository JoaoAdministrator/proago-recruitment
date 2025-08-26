// Proago CRM — App.jsx (v2025-08-27a)
// Build: UX polish • Inflow vertical + email & scheduling • Recruiter Information mega-dialog
//        Planning full-screen editor • DayCard score color + no zone echo • Salary tweaks
// Notes: settings gated; inflow no export; crewcode=5 digits; hires start as Rookie.

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
  Upload, Trash2, ChevronLeft, ChevronRight, UserPlus, Edit3, Plus, X, Lock, ChevronDown, Image as ImageIcon
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
  App data/version (scoped reset only our keys)
────────────────────────────────────────────────────────────────────────── */
const DATA_VERSION = "proago_v7_reset_2025_08_27a";
const VERSION_KEY = "proago_data_version";

/* ──────────────────────────────────────────────────────────────────────────
  Auth (persist with localStorage)  — no gray hints / placeholders
────────────────────────────────────────────────────────────────────────── */
const AUTH_USERS = { Oscar: "Sergio R4mos", Joao: "Rub3n Dias" };
const AUTH_SESSION_KEY = "proago_auth_session";     // global app gate
const SALARY_SESSION_KEY = "proago_salary_gate";    // re-auth for Salary
const FINANCE_SESSION_KEY = "proago_finance_gate";  // re-auth for Finances
const SETTINGS_SESSION_KEY = "proago_settings_gate";// re-auth for Settings

/* ──────────────────────────────────────────────────────────────────────────
  Storage helpers & keys
────────────────────────────────────────────────────────────────────────── */
const load = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const clone = typeof structuredClone === "function"
  ? structuredClone
  : (obj) => JSON.parse(JSON.stringify(obj));

const K = {
  recruiters: "proago_recruiters_v7_inactive",
  pipeline: "proago_pipeline_v6_schedules",
  history: "proago_history_v6_discounts",
  planning: "proago_planning_v6_teams_zones",
  settings: "proago_settings_v3_bands_projects",
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
const monthLabel = (ym) => { const [y,m]=ym.split("-").map(Number); return new Date(Date.UTC(y,m-1,1)).toLocaleDateString(undefined,{month:"short",year:"numeric",timeZone:"UTC"}); };
const currentMonthKey = () => { const d=new Date(); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`; };
const prevMonthKey = (ym) => { const [Y,M]=ym.split("-").map(Number); const d=new Date(Date.UTC(Y,M-1,1)); d.setUTCMonth(d.getUTCMonth()-1); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`; };

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
const detectCC = (raw="") => { const s = normalizeDigits(raw); const cc = ALLOWED_CCS.find(cc => s.startsWith(cc)); return cc || ""; };

const formatPhoneByCountry = (raw="") => {
  let s = normalizeDigits(raw);
  if(!s.startsWith("+")) return { display:"", flag:"", cc:"", ok:false };
  const cc = detectCC(s);
  if (!cc) return { display:"", flag:"", cc:"", ok:false };
  const flag = FLAG_BY_CC[cc] || "";
  let rest = s.slice(cc.length);
  if (cc === "+352") {
    rest = rest.replace(/^(\d{3})(\d{3})(\d{3})$/,"$1 $2 $3")
               .replace(/^(\d{3})(\d{2})(\d{3})$/,"$1 $2 $3");
  } else if (cc === "+33" || cc === "+32") {
    rest = rest.replace(/(\d{2})(?=\d)/g,"$1 ").trim();
  } else if (cc === "+49") {
    rest = rest.replace(/^(\d{3})(\d{3})(\d{3,})$/,"$1 $2 $3");
  }
  return { display: `${cc} ${rest}`.trim(), flag, cc, ok:true };
};

const toMoney = (n) => (Number(n||0)).toFixed(2);

/* ──────────────────────────────────────────────────────────────────────────
  Settings (defaults + conversion types + rate bands + projects)
────────────────────────────────────────────────────────────────────────── */
const DEFAULT_SETTINGS = {
  projects: ["HF"],
  conversionType: {
    D2D: {
      noDiscount: { box2: 95,  box4: 125 },
      discount:   { box2: 80,  box4: 110 },
    },
    EVENT: {
      noDiscount: { box2: 60,  box4: 70 },
      discount:   { box2: 45,  box4: 55 },
    },
  },
  rateBands: [
    { startISO: "1900-01-01", rate: 15.2473 },
    { startISO: "2025-05-01", rate: 15.6265 },
  ],
};
const rateForDate = (settings, iso) => {
  const bands = [...(settings.rateBands||[])].sort((a,b)=> a.startISO<b.startISO?1:-1);
  const d = iso || fmtISO(new Date());
  const band = bands.find(b => b.startISO <= d) || bands[bands.length-1] || {rate: DEFAULT_SETTINGS.rateBands[0].rate};
  return band.rate;
};

/* ──────────────────────────────────────────────────────────────────────────
  History helpers (upsert; last5; Box2/4% in last 8 weeks)
  Discount split model: box2_noDisc, box2_disc, box4_noDisc, box4_disc
────────────────────────────────────────────────────────────────────────── */
const upsertHistory = (history, entry) => {
  const i = history.findIndex(
    (h) => h.recruiterId === entry.recruiterId && h.dateISO === entry.dateISO && (h._rowKey || 0) === (entry._rowKey || 0)
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
const boxTotals = (row) => {
  const b2 = (Number(row.box2_noDisc)||0)+(Number(row.box2_disc)||0);
  const b4 = (Number(row.box4_noDisc)||0)+(Number(row.box4_disc)||0);
  return { b2, b4 };
};
const boxPercentsLast8w = (history, id) => {
  const rows = history.filter((h)=> h.recruiterId===id && isWithinLastWeeks(h.dateISO,8));
  const totals = rows.reduce((acc,r)=>{ const {b2,b4}=boxTotals(r); acc.sales+=(Number(r.score)||0); acc.b2+=b2; acc.b4+=b4; return acc; }, {sales:0,b2:0,b4:0});
  const pct = (n,d) => d>0 ? (n/d)*100 : 0;
  return { b2: pct(totals.b2,totals.sales), b4: pct(totals.b4,totals.sales) };
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
    if (!norm.ok) throw new Error("Found invalid phone prefix (only +352/+33/+32/+49 allowed).");
    return {
      id: r.id || `lead_${i}_${Date.now()}`,
      name,
      phone: norm.display,
      flag: norm.flag,
      email: r.email || r.applicant?.email || "",
      source: (r.source || "Indeed"),
      interviewISO: r.interviewISO || "",
      interviewTime: r.interviewTime || "",
      formationISO: r.formationISO || "",
      formationTime: r.formationTime || "",
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
  Auth gates (Login + reusable Gate + CredentialDialog) — stripped hints
────────────────────────────────────────────────────────────────────────── */
const Login = ({ onOk }) => {
  const [u,setU]=useState(""), [p,setP]=useState("");
  const submit=(e)=>{ e.preventDefault();
    if (AUTH_USERS[u] && AUTH_USERS[u]===p) { localStorage.setItem(AUTH_SESSION_KEY, btoa(`${u}:${Date.now()}`)); onOk(); }
    else alert("Invalid credentials");
  };
  return (
    <div className="min-h-screen grid place-items-center bg-zinc-50">
      <Card className="w-full max-w-sm shadow-xl text-center">
        <CardHeader>
          <div className="flex items-center justify-center gap-2">
            <img src="/proago-icon.png" alt="Proago" className="h-8 w-8 rounded-full" onError={(e)=> (e.currentTarget.style.display = "none")} />
            <CardTitle style={{ fontFamily: "Lora,serif" }}>Proago CRM</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-1"><Label>Username</Label>
              <Input value={u} onChange={(e)=>setU(e.target.value)}/></div>
            <div className="grid gap-1"><Label>Password</Label>
              <Input type="password" value={p} onChange={(e)=>setP(e.target.value)} /></div>
            <Button style={{ background:"#d9010b", color:"white" }} className="mt-1">Login</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const Gate = ({ storageKey, label, onOk }) => {
  const [u,setU]=useState(""), [p,setP]=useState("");
  const submit=(e)=>{ e.preventDefault();
    if (AUTH_USERS[u] && AUTH_USERS[u]===p) { localStorage.setItem(storageKey, btoa(`${u}:${Date.now()}`)); onOk(); }
    else alert("Invalid credentials");
  };
  return (
    <div className="grid place-items-center p-6 border rounded-xl bg-white">
      <div className="flex items-center gap-2 mb-3"><Lock className="h-4 w-4"/><span className="font-medium">{label}</span></div>
      <form onSubmit={submit} className="flex gap-2 w-full max-w-xl justify-center">
        <Input value={u} onChange={(e)=>setU(e.target.value)} className="max-w-xs"/>
        <Input type="password" value={p} onChange={(e)=>setP(e.target.value)} className="max-w-xs"/>
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
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-2">
          <div className="grid gap-1">
            <Label>Username</Label>
            <Input value={u} onChange={(e) => setU(e.target.value)} />
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
  Shell (centered nav)
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
        <nav className="flex gap-2 justify-center w-full">
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
  Inflow (vertical stack; Email + scheduling fields; no Export; Hire→Rookie)
────────────────────────────────────────────────────────────────────────── */
const AddLeadDialog = ({ open, onOpenChange, onSave }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Indeed");

  const reset = () => { setName(""); setPhone(""); setEmail(""); setSource("Indeed"); };

  const normalized = phone ? formatPhoneByCountry(phone) : {display:"",flag:"",ok:false};
  return (
    <Dialog open={open} onOpenChange={(v)=>{ reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1"><Label>Full name</Label>
            <Input value={name} onChange={(e)=>setName(e.target.value)} /></div>
          <div className="grid gap-1"><Label>Phone</Label>
            <Input value={phone} onChange={(e)=>setPhone(e.target.value)} /></div>
          <div className="grid gap-1"><Label>Email</Label>
            <Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} /></div>
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
        <DialogFooter className="justify-between">
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
              email: (email||"").trim(),
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
  const hire=(item)=>{ let code=prompt("Crewcode (5 digits):"); if(!code) return;
    code = String(code).trim();
    if(!/^\d{5}$/.test(code)) { alert("Crewcode must be exactly 5 digits."); return; }
    onHire({...item, crewCode:code, role:"Rookie"}); // always Rookie
    const next=clone(pipeline); next.formation=next.formation.filter(x=>x.id!==item.id); setPipeline(next);
  };

  const onImport=(file)=>{ const fr=new FileReader(); fr.onload=()=>{ try{
      const data=JSON.parse(fr.result); const normalized=normalizeImportedJson(data);
      setPipeline(normalized); alert("Import done ✅");
    }catch(err){ alert("Import failed: "+(err?.message||"Invalid file")); } }; fr.readAsText(file); };

  // Shared row editor fragments
  const EmailCell = (x, from) => (
    <Input value={x.email||""} onChange={(e)=>setPipeline(p=>{
      const next=clone(p); next[from]=next[from].map(r=>r.id===x.id?{...r,email:e.target.value}:r); return next;
    })}/>
  );
  const DateTime = ({label,isoKey,timeKey,item,from}) => (
    <div className="grid grid-cols-2 gap-2">
      <div><Label>{label} Date</Label>
        <Input type="date" value={item[isoKey]||""} onChange={(e)=>setPipeline(p=>{ const n=clone(p); n[from]=n[from].map(r=>r.id===item.id?{...r,[isoKey]:e.target.value}:r); return n; })}/></div>
      <div><Label>{label} Time</Label>
        <Input type="time" value={item[timeKey]||""} onChange={(e)=>setPipeline(p=>{ const n=clone(p); n[from]=n[from].map(r=>r.id===item.id?{...r,[timeKey]:e.target.value}:r); return n; })}/></div>
    </div>
  );

  const Column=({title,keyName,prev,nextKey,extra, showInterviewFields=false, showFormationFields=false})=>(
    <Card className="border-2">
      <CardHeader><CardTitle className="flex justify-between items-center"><span>{title}</span><Badge>{pipeline[keyName].length}</Badge></CardTitle></CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {pipeline[keyName].map((x)=>(
            <div key={x.id} className="border rounded-xl p-3">
              <div className="grid md:grid-cols-4 gap-3">
                <div><Label>Name</Label><Input value={titleCase(x.name)} onChange={(e)=>setPipeline(p=>{ const n=clone(p); n[keyName]=n[keyName].map(r=>r.id===x.id?{...r,name:e.target.value}:r); return n; })}/></div>
                <div><Label>Phone</Label><Input value={x.phone} onChange={(e)=>setPipeline(p=>{ const n=clone(p); n[keyName]=n[keyName].map(r=>r.id===x.id?{...r,phone:e.target.value}:r); return n; })}/></div>
                <div><Label>Email</Label>{EmailCell(x,keyName)}</div>
                <div><Label>Source</Label>
                  <select className="h-10 w-full border rounded-md px-2" value={x.source} onChange={(e)=>setPipeline(p=>{ const n=clone(p); n[keyName]=n[keyName].map(r=>r.id===x.id?{...r,source:e.target.value}:r); return n; })}>
                    <option>Indeed</option><option>Street</option><option>Referral</option><option>Other</option>
                  </select>
                </div>
              </div>

              {showInterviewFields && <div className="mt-2"><DateTime label="Interview" isoKey="interviewISO" timeKey="interviewTime" item={x} from={keyName}/></div>}
              {showFormationFields && <div className="mt-2"><DateTime label="Formation" isoKey="formationISO" timeKey="formationTime" item={x} from={keyName}/></div>}

              <div className="flex gap-2 justify-end mt-2">
                {prev && <Button size="sm" variant="outline" onClick={()=>move(x,keyName,prev)}>Back</Button>}
                {nextKey && <Button size="sm" style={{background:"#d9010b",color:"white"}} onClick={()=>move(x,keyName,nextKey)}>→</Button>}
                {extra && extra(x)}
                <Button size="sm" variant="destructive" onClick={()=>del(x,keyName)}><Trash2 className="h-4 w-4"/></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (<div className="grid gap-4">
    <div className="flex justify-between items-center">
      <h3 className="font-semibold">Inflow</h3>
      <div className="flex gap-2">
        <Button onClick={()=>fileRef.current?.click()}><Upload className="h-4 w-4 mr-1"/>Import</Button>
        <input ref={fileRef} type="file" hidden accept="application/json" onChange={(e)=>e.target.files?.[0]&&onImport(e.target.files[0])}/>
        <Button style={{background:"#d9010b",color:"white"}} onClick={()=>setAddOpen(true)}><Plus className="h-4 w-4 mr-1"/>Add Lead</Button>
      </div>
    </div>

    {/* Vertical stack: Leads → Interview → Formation */}
    <div className="grid gap-4">
      <Column title="Leads" keyName="leads" nextKey="interview"/>
      <Column title="Interview" keyName="interview" prev="leads" nextKey="formation" showInterviewFields />
      <Column title="Formation" keyName="formation" prev="interview" showFormationFields extra={(x)=><Button size="sm" onClick={()=>hire(x)}><UserPlus className="h-4 w-4 mr-1"/>Hire</Button>}/>
    </div>

    <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onSave={(lead)=>setPipeline((p)=>({...p,leads:[lead,...p.leads]}))}/>
  </div>);
};
/* ──────────────────────────────────────────────────────────────────────────
  Recruiters — list (no phone/crewcode), filters + soft delete; mega “Info” dialog
────────────────────────────────────────────────────────────────────────── */
const Recruiters = ({ recruiters, setRecruiters, history, setHistory }) => {
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);
  const [filter, setFilter] = useState("active"); // active | inactive | all

  // credential-gated per-row delete in history
  const [credOpen, setCredOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null); // { recruiterId, dateISO, _rowKey }
  const requestDeleteHistory = (recruiterId, dateISO, _rowKey) => { setPendingDelete({ recruiterId, dateISO, _rowKey }); setCredOpen(true); };
  const performDeleteHistory = () => {
    const { recruiterId, dateISO, _rowKey } = pendingDelete || {};
    if (!recruiterId || !dateISO) { setCredOpen(false); setPendingDelete(null); return; }
    setHistory((h) => h.filter((row) => !(row.recruiterId === recruiterId && row.dateISO === dateISO && (row._rowKey||0)===(+_rowKey||0))));
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
  const filtered = recruiters.filter(r => filter==="all" ? true : filter==="active" ? !r.isInactive : !!r.isInactive);
  const decorated = filtered.map(decorate);

  const deactivate=(id)=>{ if(!confirm("Deactivate recruiter? History will be kept.")) return;
    setRecruiters(recruiters.map(r=>r.id===id?{...r,isInactive:true}:r)); };
  const reactivate=(id)=>{ setRecruiters(recruiters.map(r=>r.id===id?{...r,isInactive:false}:r)); };

  const updateHistField=(recId,dateISO,_rowKey,key,raw)=>{
    setHistory((h)=> upsertHistory(h,{ recruiterId:recId, dateISO, _rowKey,
      [key]:
        (["score","box2_noDisc","box2_disc","box4_noDisc","box4_disc","hours","commissionMult"].includes(key)
          ? (raw===""?undefined:Number(raw)) : raw)
    }));
  };

  // Recruiter Information — larger photo + live update + totals
  const onPickPhoto = (rec, setLocal) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const fr = new FileReader();
      fr.onload = () => {
        setRecruiters(all => all.map(r => r.id===rec.id ? ({...r, photoUrl: fr.result}) : r));
        // live reflect in modal without closing
        setLocal?.(s => ({...s, photoUrl: fr.result}));
      };
      fr.readAsDataURL(file);
    };
    input.click();
  };
  const removePhoto = (rec, setLocal) => {
    setRecruiters(all => all.map(r => r.id===rec.id ? ({...r, photoUrl: undefined}) : r));
    setLocal?.(s => ({...s, photoUrl: undefined}));
  };

  // quick sums for “this month” income & wages
  const settings = load(K.settings, DEFAULT_SETTINGS);
  const calcIncome = (row) => {
    const type = row.shiftType==="EVENT" ? "EVENT":"D2D";
    const m = (settings.conversionType||DEFAULT_SETTINGS.conversionType)[type];
    const b2n = Number(row.box2_noDisc)||0, b2d = Number(row.box2_disc)||0;
    const b4n = Number(row.box4_noDisc)||0, b4d = Number(row.box4_disc)||0;
    return b2n*(m.noDiscount?.box2||0) + b2d*(m.discount?.box2||0)
         + b4n*(m.noDiscount?.box4||0) + b4d*(m.discount?.box4||0);
  };
  const calcWages = (row) => {
    const hrs = row.hours ?? roleHoursDefault(row.roleAtShift||"Rookie");
    const rate = rateForDate(settings, row.dateISO);
    return hrs*rate;
  };
  const thisMonthKey = currentMonthKey();

  return (<div className="grid gap-4">
    <div className="flex items-center justify-between">
      <h3 className="font-semibold">Recruiters</h3>
      <div className="flex items-center gap-2">
        <Label>Filter</Label>
        <select className="h-10 border rounded-md px-2" value={filter} onChange={(e)=>setFilter(e.target.value)}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </select>
      </div>
    </div>

    <div className="overflow-x-auto border rounded-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50">
          <tr>
            <th className="p-3">Name</th><th className="p-3">Role</th>
            <th className="p-3">Last 5</th><th className="p-3 text-right">Average</th>
            <th className="p-3 text-right">Box2</th><th className="p-3 text-right">Box4</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {decorated.map((r)=>(
            <tr key={r.id} className="border-t">
              <td className="p-3 font-medium">
                <button className="underline" onClick={()=>setDetail(r)}>{r.name}</button>
              </td>
              <td className="p-3">{r.role}</td>
              <td className="p-3">{r._last5.length? r._last5.join("–"):"—"}</td>
              <td className="p-3 text-right" style={{color:avgColor(r._avg)}}>{r._avg.toFixed(2)}</td>
              <td className="p-3 text-right" style={{color:box2Color(r._b2)}}>{r._b2.toFixed(1)}%</td>
              <td className="p-3 text-right" style={{color:box4Color(r._b4)}}>{r._b4.toFixed(1)}%</td>
              <td className="p-3 flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={()=>setEdit(r)}><Edit3 className="h-4 w-4"/>Edit</Button>
                {!r.isInactive
                  ? <Button size="sm" variant="destructive" onClick={()=>deactivate(r.id)}>Deactivate</Button>
                  : <Button size="sm" onClick={()=>reactivate(r.id)}>Reactivate</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Recruiter Information (mega dialog) */}
    <Dialog open={!!detail} onOpenChange={()=>setDetail(null)}>
      <DialogContent className="max-w-7xl"> {/* bigger, tab-like */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {detail?.photoUrl ? <img src={detail.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover"/> : <div className="h-16 w-16 rounded-full bg-zinc-200 grid place-items-center"><ImageIcon className="h-6 w-6"/></div>}
            <span className="text-xl">Recruiter Information — {detail?.name}</span>
          </DialogTitle>
        </DialogHeader>

        {/* photo controls + core info */}
        <RecruiterInfoBody
          recruiter={detail}
          setRecruiters={setRecruiters}
          history={history}
          settings={settings}
          thisMonthKey={thisMonthKey}
          calcIncome={calcIncome}
          calcWages={calcWages}
          requestDeleteHistory={requestDeleteHistory}
          updateHistField={updateHistField}
          onPickPhoto={onPickPhoto}
          removePhoto={removePhoto}
        />

        <DialogFooter><Button onClick={()=>setDetail(null)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <CredentialDialog
      open={credOpen}
      label="Confirm to delete history entry"
      onCancel={() => { setCredOpen(false); setPendingDelete(null); }}
      onSuccess={performDeleteHistory}
    />

    {/* Edit recruiter (no phone/crewcode here; basic rename/role) */}
    <Dialog open={!!edit} onOpenChange={()=>setEdit(null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit recruiter</DialogTitle></DialogHeader>
        <div className="grid gap-2">
          <Label>Name</Label><Input value={edit?.name||""} onChange={(e)=>setEdit({...edit,name:e.target.value})}/>
          <Label>Role</Label>
          <select className="h-10 border rounded-md px-2" value={edit?.role||"Rookie"} onChange={(e)=>setEdit({...edit,role:e.target.value})}>
            {ROLES.map(r=><option key={r}>{r}</option>)}
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

// Split out: big body for Recruiter Information (keeps dialog readable)
const RecruiterInfoBody = ({
  recruiter, setRecruiters, history, settings, thisMonthKey,
  calcIncome, calcWages, requestDeleteHistory, updateHistField, onPickPhoto, removePhoto
}) => {
  const [local, setLocal] = useState(recruiter);

  useEffect(()=>setLocal(recruiter),[recruiter]);

  const monthRows = history.filter(h=>h.recruiterId===recruiter?.id && monthKey(h.dateISO)===thisMonthKey);
  const wages = monthRows.reduce((s,r)=>s+calcWages(r),0);
  const income = monthRows.reduce((s,r)=>s+calcIncome(r),0);

  return (
    <div className="grid gap-4">
      {/* Top: photo + profile fields */}
      <div className="border rounded-xl p-3">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex items-center gap-3">
            {local?.photoUrl ? <img src={local.photoUrl} alt="" className="h-24 w-24 rounded-full object-cover"/> : <div className="h-24 w-24 rounded-full bg-zinc-200 grid place-items-center"><ImageIcon className="h-6 w-6"/></div>}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={()=>onPickPhoto(local,setLocal)}><ImageIcon className="h-4 w-4 mr-1"/>Add/Change Photo</Button>
                {local?.photoUrl && <Button size="sm" variant="destructive" onClick={()=>removePhoto(local,setLocal)}>Remove Photo</Button>}
              </div>
              <div className="text-sm text-zinc-600">This month — Wages €{toMoney(wages)} • Income for Proago €{toMoney(income)}</div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3 flex-1">
            <div><Label>Role</Label>
              <select className="h-10 w-full border rounded-md px-2" value={local?.role||"Rookie"} onChange={(e)=>setRecruiters(all=>all.map(r=>r.id===local.id?{...r,role:e.target.value}:r))}>
                {ROLES.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div><Label>Crewcode</Label>
              <Input value={local?.crewCode||""} onChange={(e)=>setRecruiters(all=>all.map(r=>r.id===local.id?{...r,crewCode:e.target.value}:r))}/>
            </div>
            <div><Label>Status</Label>
              <Input readOnly value={local?.isInactive ? "Inactive" : "Active"} />
            </div>
            <div><Label>Phone</Label>
              <Input value={local?.phone||""} onChange={(e)=>{
                const norm=formatPhoneByCountry(e.target.value);
                if(!norm.ok && e.target.value) return; // accept empty; enforce valid otherwise
                setRecruiters(all=>all.map(r=>r.id===local.id?{...r,phone:norm.display||""}:r));
                setLocal(s=>({...s,phone:norm.display||e.target.value}));
              }}/>
            </div>
            <div><Label>Email</Label>
              <Input value={local?.email||""} onChange={(e)=>{ setRecruiters(all=>all.map(r=>r.id===local.id?{...r,email:e.target.value}:r)); setLocal(s=>({...s,email:e.target.value})); }}/>
            </div>
          </div>
        </div>
      </div>

      {/* History table — wider inputs so numbers are visible */}
      <div className="max-h-[60vh] overflow-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Role</th>
              <th className="p-2 text-left">Location</th>
              <th className="p-2 text-right">Hours</th>
              <th className="p-2 text-right">Mult</th>
              <th className="p-2 text-right">Score</th>
              <th className="p-2 text-right">B2 No</th>
              <th className="p-2 text-right">B2 Disc</th>
              <th className="p-2 text-right">B4 No</th>
              <th className="p-2 text-right">B4 Disc</th>
              <th className="p-2 text-right">Delete</th>
            </tr>
          </thead>
          <tbody>
            {history
              .filter(h=>h.recruiterId===recruiter?.id)
              .sort((a,b)=>a.dateISO<b.dateISO?1:-1)
              .map((h,i)=>(
              <tr key={`${h.dateISO}_${h._rowKey||0}_${i}`} className="border-t">
                <td className="p-2">{fmtUK(h.dateISO)}</td>
                <td className="p-2">
                  <select defaultValue={h.roleAtShift||recruiter?.role||"Rookie"} className="h-9 border rounded-md px-2" onChange={(e)=>updateHistField(recruiter.id,h.dateISO,h._rowKey,"roleAtShift",e.target.value)}>
                    {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <Input value={h.location||""} readOnly title="Edit location via Planning" />
                </td>
                <td className="p-2 text-right"><Input className="w-24" defaultValue={h.hours??""} inputMode="numeric" onBlur={(e)=>updateHistField(recruiter.id,h.dateISO,h._rowKey,"hours",e.target.value)}/></td>
                <td className="p-2 text-right"><Input className="w-24" defaultValue={h.commissionMult??""} inputMode="decimal" onBlur={(e)=>updateHistField(recruiter.id,h.dateISO,h._rowKey,"commissionMult",e.target.value)}/></td>
                <td className="p-2 text-right"><Input className="w-24" defaultValue={h.score??""} inputMode="numeric" onBlur={(e)=>updateHistField(recruiter.id,h.dateISO,h._rowKey,"score",e.target.value)}/></td>
                <td className="p-2 text-right"><Input className="w-24" defaultValue={h.box2_noDisc??(h.box2??"")} inputMode="numeric" onBlur={(e)=>updateHistField(recruiter.id,h.dateISO,h._rowKey,"box2_noDisc",e.target.value)}/></td>
                <td className="p-2 text-right"><Input className="w-24" defaultValue={h.box2_disc??""} inputMode="numeric" onBlur={(e)=>updateHistField(recruiter.id,h.dateISO,h._rowKey,"box2_disc",e.target.value)}/></td>
                <td className="p-2 text-right"><Input className="w-24" defaultValue={h.box4_noDisc??(h.box4??"")} inputMode="numeric" onBlur={(e)=>updateHistField(recruiter.id,h.dateISO,h._rowKey,"box4_noDisc",e.target.value)}/></td>
                <td className="p-2 text-right"><Input className="w-24" defaultValue={h.box4_disc??""} inputMode="numeric" onBlur={(e)=>updateHistField(recruiter.id,h.dateISO,h._rowKey,"box4_disc",e.target.value)}/></td>
                <td className="p-2 text-right">
                  <Button variant="destructive" size="sm" onClick={()=>requestDeleteHistory(recruiter.id, h.dateISO, h._rowKey)} title="Delete this history row">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
/* ──────────────────────────────────────────────────────────────────────────
  Planning — Teams + Zones; starts empty; full-screen editor; clearer DayCard
────────────────────────────────────────────────────────────────────────── */
const ensureWeek = (state, weekISO) => {
  const safe = state && typeof state === "object" ? state : {};
  const base = safe[weekISO] && typeof safe[weekISO] === "object" ? safe[weekISO] : { days: {} };
  if (!base.days || typeof base.days !== "object") base.days = {};

  for (let i = 0; i < 7; i++) {
    const dateISO = fmtISO(addDays(parseISO(weekISO), i));
    if (!base.days[dateISO]) base.days[dateISO] = { teams: [] }; // start with no teams
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
    const day = days[iso] && typeof days[iso] === "object" ? days[iso] : { teams: [] };
    day.teams = (day.teams || []).map(t => ({ project: "HF", shiftType: "D2D", zones: ["Luxembourg, Gare"], rows: [], ...t }));
    return day;
  };

  const rById = (id) => recruiters.find((r) => r.id === id);
  const multipliers = [
    { label: "100%", val: 1.0 }, { label: "125%", val: 1.25 },
    { label: "150%", val: 1.5 }, { label: "200%", val: 2.0 },
  ];
  const shiftTypes = [{ label: "Door-to-Door", val: "D2D" }, { label: "Events", val: "EVENT" }];

  // Edit Day modal state (full width) — no helper sentences
  const [editDateISO, setEditDateISO] = useState(null);
  const [draftDay, setDraftDay] = useState(null);

  const openEditDay = (dateISO) => {
    const d = clone(getDay(dateISO));
    // do NOT auto-create a team here; user will add
    d.teams = Array.isArray(d.teams) ? d.teams.map(team => ({...team, rows:(team.rows||[]).map((row,idx)=>({_rowKey: row?._rowKey ?? idx, ...row}))})) : [];
    setEditDateISO(dateISO);
    setDraftDay(d);
  };
  const closeEditDay = () => { setEditDateISO(null); setDraftDay(null); };

  const addTeam = () =>
    setDraftDay(d => ({ ...d, teams: [...(d?.teams || []), { name: "", project: "HF", shiftType: "D2D", zones: [""], rows: [] }] }));
  const delTeam = (ti) =>
    setDraftDay(d => ({ ...d, teams: (d?.teams || []).filter((_, i) => i !== ti) }));
  const setTeamField = (ti, patch) =>
    setDraftDay(d => { const teams = clone(d.teams || []); teams[ti] = { ...teams[ti], ...patch }; return { ...d, teams }; });

  const addZoneToTeam = (ti) =>
    setDraftDay(d => { const teams = clone(d.teams || []); (teams[ti].zones ||= []).push(`Zone ${teams[ti].zones.length + 1}`); return { ...d, teams }; });
  const delZoneFromTeam = (ti, zi) =>
    setDraftDay(d => {
      const teams = clone(d.teams || []);
      const removed = (teams[ti].zones || [])[zi];
      teams[ti].zones = (teams[ti].zones || []).filter((_, i) => i !== zi);
      teams[ti].rows = (teams[ti].rows || []).map(r => (r.zone === removed ? { ...r, zone: "" } : r));
      return { ...d, teams };
    });

  const addRow = (ti) =>
    setDraftDay(d => {
      const teams = clone(d.teams || []);
      const nextKey = (teams[ti].rows?.length || 0);
      (teams[ti].rows ||= []).push({
        _rowKey: nextKey,
        recruiterId: "",
        zone: teams[ti].zones?.[0] || "",
        hours: "",
        commissionMult: "",
        score: "",
        box2_noDisc: "",
        box2_disc: "",
        box4_noDisc: "",
        box4_disc: "",
      });
      return { ...d, teams };
    });
  const delRow = (ti, ri) =>
    setDraftDay(d => { const teams = clone(d.teams || []); teams[ti].rows = (teams[ti].rows || []).filter((_, i) => i !== ri); return { ...d, teams }; });
  const setRow = (ti, ri, patch) =>
    setDraftDay(d => { const teams = clone(d.teams || []); teams[ti].rows[ri] = { ...teams[ti].rows[ri], ...patch }; return { ...d, teams }; });

  const saveDay = () => {
    if (!draftDay) return;
    const dateISO = editDateISO;

    for (const team of draftDay.teams || []) {
      for (const row of team.rows || []) {
        const sc = Number(row.score || 0);
        const b2n = Number(row.box2_noDisc || 0);
        const b2d = Number(row.box2_disc || 0);
        const b4n = Number(row.box4_noDisc || 0);
        const b4d = Number(row.box4_disc || 0);
        const sum = b2n + b2d + b4n + b4d;
        if (sum > sc) { alert("Box2/Box4 totals (no-disc + disc) cannot exceed Score."); return; }
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
      (draftDay.teams || []).forEach((team) => {
        (team.rows || []).forEach((row, idx) => {
          if (!row.recruiterId) return;
          const rec = rById(row.recruiterId);
          const zoneName = row.zone || team.name || "";
          out = upsertHistory(out, {
            _rowKey: row._rowKey ?? idx,
            dateISO,
            recruiterId: row.recruiterId,
            recruiterName: rec?.name || "",
            crewCode: rec?.crewCode,
            location: zoneName,
            score: row.score === "" ? undefined : Number(row.score || 0),
            box2_noDisc: row.box2_noDisc === "" ? undefined : (row.box2_noDisc != null ? Number(row.box2_noDisc) : undefined),
            box2_disc:   row.box2_disc   === "" ? undefined : (row.box2_disc   != null ? Number(row.box2_disc)   : undefined),
            box4_noDisc: row.box4_noDisc === "" ? undefined : (row.box4_noDisc != null ? Number(row.box4_noDisc) : undefined),
            box4_disc:   row.box4_disc   === "" ? undefined : (row.box4_disc   != null ? Number(row.box4_disc)   : undefined),
            project: team.project || "HF",
            shiftType: team.shiftType || "D2D",
            hours: row.hours === "" ? undefined : (row.hours != null ? Number(row.hours) : undefined),
            commissionMult: row.commissionMult == null || row.commissionMult==="" ? undefined : Number(row.commissionMult),
            roleAtShift: rec?.role || "Rookie",
          });
        });
      });
      return out;
    });

    closeEditDay();
  };

  const scoreColor = (v) => (v >= 3 ? "#10b981" : v >= 2 ? "#fbbf24" : "#ef4444");

  // Day card preview — Full weekday name; date below; score at right; hide zone under recruiter
  const DayCard = ({ i }) => {
    const dISO = fmtISO(addDays(parseISO(weekStart), i));
    const day = getDay(dISO);
    const weekday = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][i];

    return (
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-col">
            <span>{weekday}</span>
            <span className="text-sm text-zinc-500">{fmtUK(dISO)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0">
          {day.teams && day.teams.length > 0 ? (
            day.teams.map((t, ti) => (
              <div key={ti} className="border rounded-lg p-2">
                <div className="font-medium">{t.name || "—"} <span className="text-xs text-zinc-600">• {t.project || "HF"}</span></div>
                {(t.rows || []).length > 0 ? (
                  <ul className="text-sm space-y-1 mt-1">
                    {t.rows.map((row, ri) => {
                      const rec = rById(row.recruiterId);
                      const histRow = history.find(h => h.recruiterId===row.recruiterId && h.dateISO===dISO && (h._rowKey||0)===(row._rowKey||ri));
                      const sc = row.score ?? histRow?.score;
                      const showScore = typeof sc === "number" ? Number(sc) : undefined;
                      return (
                        <li key={ri} className="flex items-center justify-between">
                          <span>{rec?.name || "Recruiter"}</span>
                          <span className="text-base" style={{color: showScore!=null ? scoreColor(showScore) : "#ef4444"}}>
                            {showScore!=null ? showScore : "—"}
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
          <div className="flex justify-center pt-1">
            <Button variant="outline" size="sm" onClick={() => openEditDay(dISO)}>
              Edit Day
            </Button>
          </div>
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

      {/* Edit Day modal — full width, no helper sentences, widened inputs */}
      <Dialog open={!!editDateISO} onOpenChange={(open) => { if (!open) closeEditDay(); }}>
        <DialogContent className="max-w-7xl">
          <DialogHeader>
            <DialogTitle>Edit Day — {fmtUK(editDateISO || "")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            {(draftDay?.teams || []).map((t, ti) => (
              <div key={ti} className="border rounded-xl p-3">
                {/* Team header */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div className="grid gap-1">
                    <Label>Team</Label>
                    <Input className="h-9" value={t.name} onChange={(e) => setTeamField(ti, { name: e.target.value })} />
                  </div>
                  <div className="grid gap-1">
                    <Label>Project</Label>
                    <select className="h-9 border rounded-md px-2" value={t.project || "HF"} onChange={(e)=>setTeamField(ti,{project:e.target.value})}>
                      {(load(K.settings, DEFAULT_SETTINGS).projects || ["HF"]).map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-1">
                    <Label>Shift Type</Label>
                    <select className="h-9 border rounded-md px-2" value={t.shiftType || "D2D"} onChange={(e)=>setTeamField(ti,{shiftType:e.target.value})}>
                      {shiftTypes.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button variant="destructive" size="sm" onClick={()=>delTeam(ti)}><X className="h-4 w-4 mr-1"/> Remove Team</Button>
                  </div>
                </div>

                {/* Zones manager */}
                <div className="border rounded-lg p-2 mb-3">
                  <div className="text-xs uppercase text-zinc-500 mb-1">Zones</div>
                  <div className="flex flex-wrap gap-2 items-center">
                    {(t.zones || []).map((z, zi) => (
                      <div key={zi} className="flex items-center gap-2 border rounded-full px-3 py-1">
                        <Input className="h-8 w-44" value={z} onChange={(e)=>{
                          const val = e.target.value;
                          setDraftDay(d=>{
                            const teams = clone(d.teams||[]);
                            teams[ti].zones[zi] = val;
                            return {...d, teams};
                          });
                        }}/>
                        <Button variant="ghost" size="sm" onClick={()=>delZoneFromTeam(ti, zi)}><X className="h-4 w-4"/></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={()=>addZoneToTeam(ti)}><Plus className="h-4 w-4 mr-1"/> Add Zone</Button>
                  </div>
                </div>

                {/* Rows table — widened inputs so numbers are visible */}
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="p-2 text-left">Recruiter</th>
                        <th className="p-2 text-left">Zone</th>
                        <th className="p-2 text-right">Hours</th>
                        <th className="p-2 text-right">Mult</th>
                        <th className="p-2 text-right">Score</th>
                        <th className="p-2 text-right">B2 No</th>
                        <th className="p-2 text-right">B2 Disc</th>
                        <th className="p-2 text-right">B4 No</th>
                        <th className="p-2 text-right">B4 Disc</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(t.rows || []).map((row, ri) => (
                        <tr key={ri} className="border-t">
                          <td className="p-2">
                            <select className="h-9 border rounded-md px-2 min-w-48" value={row.recruiterId} onChange={(e) => setRow(ti, ri, { recruiterId: e.target.value })}>
                              <option value="">Select…</option>
                              {recruiters.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                            </select>
                          </td>
                          <td className="p-2">
                            <select className="h-9 border rounded-md px-2 min-w-36" value={row.zone || ""} onChange={(e)=>setRow(ti,ri,{zone:e.target.value})}>
                              <option value="">—</option>
                              {(t.zones||[]).map((z,i2)=>(<option key={i2} value={z}>{z}</option>))}
                            </select>
                          </td>
                          <td className="p-2 text-right">
                            <Input className="w-24 h-9 text-right" inputMode="numeric" value={row.hours ?? ""} onChange={(e) => setRow(ti, ri, { hours: e.target.value })} />
                          </td>
                          <td className="p-2 text-right">
                            <select className="h-9 border rounded-md px-2" value={row.commissionMult ?? ""} onChange={(e) => setRow(ti, ri, { commissionMult: e.target.value ? Number(e.target.value) : "" })}>
                              <option value="">—</option>
                              {multipliers.map((m) => (<option key={m.val} value={m.val}>{m.label}</option>))}
                            </select>
                          </td>
                          <td className="p-2 text-right"><Input className="w-24 h-9 text-right" inputMode="numeric" value={row.score ?? ""} onChange={(e) => setRow(ti, ri, { score: e.target.value })} /></td>
                          <td className="p-2 text-right"><Input className="w-24 h-9 text-right" inputMode="numeric" value={row.box2_noDisc ?? ""} onChange={(e) => setRow(ti, ri, { box2_noDisc: e.target.value })} /></td>
                          <td className="p-2 text-right"><Input className="w-24 h-9 text-right" inputMode="numeric" value={row.box2_disc ?? ""} onChange={(e) => setRow(ti, ri, { box2_disc: e.target.value })} /></td>
                          <td className="p-2 text-right"><Input className="w-24 h-9 text-right" inputMode="numeric" value={row.box4_noDisc ?? ""} onChange={(e) => setRow(ti, ri, { box4_noDisc: e.target.value })} /></td>
                          <td className="p-2 text-right"><Input className="w-24 h-9 text-right" inputMode="numeric" value={row.box4_disc ?? ""} onChange={(e) => setRow(ti, ri, { box4_disc: e.target.value })} /></td>
                          <td className="p-2 text-right">
                            <Button variant="outline" size="sm" onClick={() => delRow(ti, ri)}><X className="h-4 w-4" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={() => addRow(ti)}><Plus className="h-4 w-4 mr-1" /> Add Recruiter</Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3">
            <Button variant="outline" size="sm" onClick={addTeam}><Plus className="h-4 w-4 mr-1" /> Add Team</Button>
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
  Salary — “Wages” naming; dropdown shows Location (no Base)
────────────────────────────────────────────────────────────────────────── */

const rookieCommission = (box2) => {
  const t = {0:0,1:0,2:25,3:40,4:70,5:85,6:120,7:135,8:175,9:190,10:235};
  if (box2 <= 10) return t[box2] ?? 0;
  return 235 + (box2 - 10) * 15;
};

const Salary = ({ recruiters, history }) => {
  const [payMonth, setPayMonth] = useState(currentMonthKey());
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState({}); // recruiterId => bool

  const monthShift = (ym, delta) => {
    const [y,m] = ym.split("-").map(Number);
    const d = new Date(Date.UTC(y,m-1,1));
    d.setUTCMonth(d.getUTCMonth()+delta);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
  };

  const workMonth = prevMonthKey(payMonth);
  const commMonth = prevMonthKey(workMonth);
  const inMonth = (iso, ym) => monthKey(iso) === ym;

  const settings = load(K.settings, DEFAULT_SETTINGS);

  const rows = recruiters
    .filter(r => status==="all" ? true : status==="active" ? !r.isInactive : !!r.isInactive)
    .map(r => {
      const hRows = history.filter(x => x.recruiterId===r.id && inMonth(x.dateISO, workMonth));
      const rolesWorked = Array.from(new Set(hRows.map(x => x.roleAtShift || r.role || "Rookie")));
      const hourRows = hRows.map(row => {
        const hrs = (row.hours != null ? Number(row.hours) : roleHoursDefault(row.roleAtShift||r.role||"Rookie"));
        const rate = rateForDate(settings, row.dateISO);
        const wages = hrs * rate;
        return { ...row, hrs, rate, wages };
      });
      const hours = hourRows.reduce((s,rr)=>s+rr.hrs,0);
      const wages = hourRows.reduce((s,rr)=>s+rr.wages,0);

      const cRowsRaw = history.filter(x => x.recruiterId===r.id && inMonth(x.dateISO, commMonth));
      const cRows = cRowsRaw.map(row => {
        const b2 = (Number(row.box2_noDisc)||0)+(Number(row.box2_disc)||0);
        const mult = row.commissionMult ?? roleMultiplierDefault(row.roleAtShift||r.role||"Rookie");
        const base = rookieCommission(b2);
        const bonus = base*mult;
        return { ...row, b2, base, mult, bonus };
      });
      const bonus = cRows.reduce((s,rr)=>s+rr.bonus,0);

      return { recruiter:r, rolesWorked, hourRows, cRows, hours, wages, bonus };
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
          <Button onClick={exportCSV}>Export CSV</Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Wages from <strong>{monthLabel(workMonth)}</strong> • Bonus from <strong>{monthLabel(commMonth)}</strong>
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
            <th className="p-3 text-right">Details</th>
          </tr></thead>
          <tbody>
            {rows.map(({recruiter:r,hours,wages,bonus,rolesWorked,hourRows,cRows})=>(
              <React.Fragment key={r.id}>
                <tr className="border-t">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">{r.crewCode}</td>
                  <td className="p-3">{rolesWorked.join("/") || r.role || "Rookie"}</td>
                  <td className="p-3 text-right">{hours}</td>
                  <td className="p-3 text-right">{toMoney(wages)}</td>
                  <td className="p-3 text-right">{toMoney(bonus)}</td>
                  <td className="p-3 text-right">
                    <Button variant="outline" size="sm" onClick={()=>setOpen(o=>({...o, [r.id]: !o[r.id]}))}>
                      {open[r.id] ? "Hide" : "View"} <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </td>
                </tr>
                {open[r.id] && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <div className="px-3 pb-3">
                        <div className="grid md:grid-cols-2 gap-3">
                          {/* Wages breakdown */}
                          <div className="border rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-zinc-50 font-medium">Wages — {monthLabel(workMonth)}</div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="bg-zinc-50"><tr>
                                  <th className="p-2 text-left">Date</th>
                                  <th className="p-2 text-left">Location</th>
                                  <th className="p-2 text-right">Hours</th>
                                  <th className="p-2 text-right">Rate</th>
                                  <th className="p-2 text-right">Wages</th>
                                </tr></thead>
                                <tbody>
                                  {hourRows.map((rr,i)=>(
                                    <tr key={i} className="border-t">
                                      <td className="p-2">{fmtUK(rr.dateISO)}</td>
                                      <td className="p-2">{rr.location||"—"}</td>
                                      <td className="p-2 text-right">{rr.hrs}</td>
                                      <td className="p-2 text-right">{toMoney(rr.rate)}</td>
                                      <td className="p-2 text-right">{toMoney(rr.wages)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          {/* Bonus breakdown — shows Location, no Base */}
                          <div className="border rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-zinc-50 font-medium">Bonus — {monthLabel(commMonth)}</div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="bg-zinc-50"><tr>
                                  <th className="p-2 text-left">Date</th>
                                  <th className="p-2 text-left">Location</th>
                                  <th className="p-2 text-right">Box2</th>
                                  <th className="p-2 text-right">Mult</th>
                                  <th className="p-2 text-right">Bonus</th>
                                </tr></thead>
                                <tbody>
                                  {cRows.map((rr,i)=>(
                                    <tr key={i} className="border-t">
                                      <td className="p-2">{fmtUK(rr.dateISO)}</td>
                                      <td className="p-2">{rr.location||"—"}</td>
                                      <td className="p-2 text-right">{rr.b2}</td>
                                      <td className="p-2 text-right">{(rr.mult||1).toFixed(2)}×</td>
                                      <td className="p-2 text-right">{toMoney(rr.bonus)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
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
  Finances — totals by day/week; history persists regardless of recruiter status
────────────────────────────────────────────────────────────────────────── */
const Finances = ({ history }) => {
  const [month, setMonth] = useState(currentMonthKey());
  const [openWeek, setOpenWeek] = useState({});
  const [openDay, setOpenDay] = useState({});

  const settings = load(K.settings, DEFAULT_SETTINGS);
  const matrix = settings.conversionType || DEFAULT_SETTINGS.conversionType;

  const monthShift = (ym, delta) => {
    const [y,m] = ym.split("-").map(Number);
    const d = new Date(Date.UTC(y,m-1,1));
    d.setUTCMonth(d.getUTCMonth()+delta);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
  };
  const inMonth = (iso) => monthKey(iso) === month;

  const calcIncome = (row) => {
    const type = row.shiftType==="EVENT" ? "EVENT":"D2D";
    const m = matrix[type] || matrix.D2D;
    const b2n = Number(row.box2_noDisc)||0, b2d = Number(row.box2_disc)||0;
    const b4n = Number(row.box4_noDisc)||0, b4d = Number(row.box4_disc)||0;
    return b2n*(m.noDiscount?.box2||0) + b2d*(m.discount?.box2||0)
         + b4n*(m.noDiscount?.box4||0) + b4d*(m.discount?.box4||0);
  };

  // group by week -> day
  const rows = history.filter(h => inMonth(h.dateISO));
  const byWeek = {};
  rows.forEach(r => {
    const d = parseISO(r.dateISO);
    const wkStart = fmtISO(startOfWeekMon(d));
    const dayKey = r.dateISO;
    byWeek[wkStart] ||= {};
    byWeek[wkStart][dayKey] ||= [];
    byWeek[wkStart][dayKey].push(r);
  });

  const weekKeys = Object.keys(byWeek).sort();

  const weekTotal = (wk) => {
    const days = byWeek[wk] || {};
    return Object.keys(days).reduce((s,dk)=> s + days[dk].reduce((x,r)=>x + calcIncome(r),0), 0);
  };
  const dayTotal = (wk, dk) => (byWeek[wk][dk]||[]).reduce((s,r)=>s+calcIncome(r),0);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={()=>setMonth(monthShift(month,-1))}><ChevronLeft className="h-4 w-4"/>Prev</Button>
          <Badge style={{background:"#fca11c"}}>{monthLabel(month)}</Badge>
          <Button variant="outline" onClick={()=>setMonth(monthShift(month,1))}>Next<ChevronRight className="h-4 w-4"/></Button>
        </div>
      </div>

      {weekKeys.length===0 ? (
        <div className="text-sm text-muted-foreground">No data this month</div>
      ) : (
        weekKeys.map(wk => (
          <div key={wk} className="border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-50">
              <div className="font-medium">Week of {fmtUK(wk)}</div>
              <div className="flex items-center gap-3">
                <div className="text-sm">Total €{toMoney(weekTotal(wk))}</div>
                <Button size="sm" variant="outline" onClick={()=>setOpenWeek(s=>({...s,[wk]:!s[wk]}))}>
                  {openWeek[wk] ? "Hide" : "Expand"}
                </Button>
              </div>
            </div>
            {openWeek[wk] && (
              <div className="p-3">
                {Object.keys(byWeek[wk]).sort().map(dk => (
                  <div key={dk} className="border rounded-lg mb-3">
                    <div className="flex items-center justify-between px-3 py-2">
                      <div className="font-medium">{fmtUK(dk)}</div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm">€{toMoney(dayTotal(wk,dk))}</div>
                        <Button size="sm" variant="outline" onClick={()=>setOpenDay(s=>({...s,[dk]:!s[dk]}))}>
                          {openDay[dk] ? "Hide" : "Details"}
                        </Button>
                      </div>
                    </div>
                    {openDay[dk] && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-zinc-50">
                            <tr>
                              <th className="p-2 text-left">Recruiter</th>
                              <th className="p-2 text-left">Location</th>
                              <th className="p-2 text-left">Type</th>
                              <th className="p-2 text-right">Score</th>
                              <th className="p-2 text-right">Box2 No</th>
                              <th className="p-2 text-right">Box2 Disc</th>
                              <th className="p-2 text-right">Box4 No</th>
                              <th className="p-2 text-right">Box4 Disc</th>
                              <th className="p-2 text-right">Income €</th>
                            </tr>
                          </thead>
                          <tbody>
                            {byWeek[wk][dk].map((r,i)=>(
                              <tr key={i} className="border-t">
                                <td className="p-2">{r.recruiterName || r.recruiterId}</td>
                                <td className="p-2">{r.location || "—"}</td>
                                <td className="p-2">{r.shiftType || "D2D"}</td>
                                <td className="p-2 text-right">{r.score ?? "—"}</td>
                                <td className="p-2 text-right">{r.box2_noDisc ?? "—"}</td>
                                <td className="p-2 text-right">{r.box2_disc ?? "—"}</td>
                                <td className="p-2 text-right">{r.box4_noDisc ?? "—"}</td>
                                <td className="p-2 text-right">{r.box4_disc ?? "—"}</td>
                                <td className="p-2 text-right">{toMoney(calcIncome(r))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  Settings — projects, conversion matrix, rate bands (gated)
────────────────────────────────────────────────────────────────────────── */
const Settings = ({ settings, setSettings }) => {
  const [unlocked, setUnlocked] = useState(!!localStorage.getItem(SETTINGS_SESSION_KEY));
  const [local, setLocal] = useState(settings);

  useEffect(()=>setLocal(settings),[settings]);

  const matrix = local.conversionType;

  const addProject = () => setLocal(s => ({...s, projects:[...s.projects, `Project ${s.projects.length+1}`]}));
  const delProject = (i) => setLocal(s => ({...s, projects:s.projects.filter((_,idx)=>idx!==i)}));

  const setMatrix = (type, tier, field, val) =>
    setLocal(s => ({...s, conversionType: {...s.conversionType, [type]: {...s.conversionType[type], [tier]: {...s.conversionType[type][tier], [field]: Number(val)||0 }}}}));

  const addBand = () => setLocal(s => ({...s, rateBands:[...s.rateBands, {startISO: fmtISO(new Date()), rate: 15}]}));
  const setBand = (i, patch) => setLocal(s => {
    const bands = [...s.rateBands]; bands[i] = {...bands[i], ...patch}; return {...s, rateBands: bands};
  });
  const delBand = (i) => setLocal(s => ({...s, rateBands: s.rateBands.filter((_,idx)=>idx!==i)}));

  if (!unlocked) {
    return <Gate storageKey={SETTINGS_SESSION_KEY} label="Unlock Settings" onOk={()=>setUnlocked(true)} />;
  }

  return (
    <div className="grid gap-4">
      <h3 className="font-semibold">Settings</h3>

      {/* Projects */}
      <Card>
        <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {local.projects.map((p,i)=>(
              <div key={i} className="flex items-center gap-2 border rounded-full px-3 py-1">
                <Input className="h-8" value={p} onChange={(e)=>setLocal(s=>{ const pr=[...s.projects]; pr[i]=e.target.value; return {...s, projects:pr}; })}/>
                <Button variant="ghost" size="sm" onClick={()=>delProject(i)}><X className="h-4 w-4"/></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addProject}><Plus className="h-4 w-4 mr-1"/>Add Project</Button>
          </div>
        </CardContent>
      </Card>

      {/* Conversion matrix */}
      <Card>
        <CardHeader><CardTitle>Conversion Matrix</CardTitle></CardHeader>
        <CardContent>
          {["D2D","EVENT"].map(type=>(
            <div key={type} className="mb-4">
              <div className="font-medium mb-2">{type==="D2D"?"Door-to-Door":"Events"}</div>
              <div className="grid md:grid-cols-2 gap-3">
                {["noDiscount","discount"].map(tier=>(
                  <div key={tier} className="border rounded-lg p-3">
                    <div className="text-sm text-zinc-600 mb-2">{tier==="noDiscount"?"No Discount":"Discount"}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Box2 €</Label>
                        <Input inputMode="decimal" value={matrix[type][tier].box2}
                          onChange={(e)=>setMatrix(type,tier,"box2",e.target.value)}/>
                      </div>
                      <div>
                        <Label>Box4 €</Label>
                        <Input inputMode="decimal" value={matrix[type][tier].box4}
                          onChange={(e)=>setMatrix(type,tier,"box4",e.target.value)}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rate bands */}
      <Card>
        <CardHeader><CardTitle>Hourly Rate Bands</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {local.rateBands.map((b,i)=>(
              <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                <div><Label>Start Date</Label><Input type="date" value={b.startISO} onChange={(e)=>setBand(i,{startISO:e.target.value})}/></div>
                <div><Label>Rate €</Label><Input inputMode="decimal" value={b.rate} onChange={(e)=>setBand(i,{rate:Number(e.target.value)||0})}/></div>
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={()=>delBand(i)}>Remove</Button>
                </div>
              </div>
            ))}
            <div><Button variant="outline" onClick={addBand}><Plus className="h-4 w-4 mr-1"/>Add Band</Button></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={()=>setLocal(settings)}>Reset</Button>
        <Button style={{background:"#d9010b",color:"white"}} onClick={()=>{ setSettings(local); save(K.settings, local); alert("Settings saved"); }}>Save Settings</Button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  App — root
────────────────────────────────────────────────────────────────────────── */
export default function App(){
  const [tab,setTab]=useState("planning");

  // versioning
  useEffect(()=>{
    const v = localStorage.getItem(VERSION_KEY);
    if (v!==DATA_VERSION){
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
      // no destructive reset; we keep data
    }
  },[]);

  const [settings, setSettings] = useState(load(K.settings, DEFAULT_SETTINGS));
  useEffect(()=>save(K.settings, settings),[settings]);

  const [recruiters, setRecruiters] = useState(load(K.recruiters, []));
  useEffect(()=>save(K.recruiters, recruiters),[recruiters]);

  const [pipeline, setPipeline] = useState(load(K.pipeline, {leads:[],interview:[],formation:[]}));
  useEffect(()=>save(K.pipeline, pipeline),[pipeline]);

  const [history, setHistory] = useState(load(K.history, []));
  useEffect(()=>save(K.history, history),[history]);

  const [planning, setPlanning] = useState(load(K.planning, {}));
  useEffect(()=>save(K.planning, planning),[planning]);

  const [authed, setAuthed] = useState(!!localStorage.getItem(AUTH_SESSION_KEY));
  if (!authed) return <Login onOk={()=>setAuthed(true)} />;

  const onLogout = () => { localStorage.removeItem(AUTH_SESSION_KEY); setAuthed(false); };

  const onHire = (lead) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `r_${Date.now()}`;
    const rec = {
      id,
      name: titleCase(lead.name||""),
      role: "Rookie",
      crewCode: lead.crewCode || "",
      phone: lead.phone || "",
      email: lead.email || "",
      isInactive: false,
    };
    setRecruiters(r=>[...r, rec]);
  };

  const weekStart = fmtISO(startOfWeekMon(new Date()));
  const badge = `Week ${weekNumberISO(parseISO(weekStart))}`;

  return (
    <Shell tab={tab} setTab={setTab} onLogout={onLogout} weekBadge={badge}>
      {tab==="inflow" && <Inflow pipeline={pipeline} setPipeline={setPipeline} onHire={onHire} />}
      {tab==="recruiters" && <Recruiters recruiters={recruiters} setRecruiters={setRecruiters} history={history} setHistory={setHistory} />}
      {tab==="planning" && <Planning recruiters={recruiters} planning={planning} setPlanning={setPlanning} history={history} setHistory={setHistory} />}
      {tab==="salary" && (
        localStorage.getItem(SALARY_SESSION_KEY)
          ? <Salary recruiters={recruiters} history={history} />
          : <Gate storageKey={SALARY_SESSION_KEY} label="Unlock Salary" onOk={()=>setTab("salary")} />
      )}
      {tab==="finances" && (
        localStorage.getItem(FINANCE_SESSION_KEY)
          ? <Finances history={history} />
          : <Gate storageKey={FINANCE_SESSION_KEY} label="Unlock Finances" onOk={()=>setTab("finances")} />
      )}
      {tab==="settings" && <Settings settings={settings} setSettings={setSettings} />}
    </Shell>
  );
}
