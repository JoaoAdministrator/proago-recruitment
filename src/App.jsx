// Proago CRM — App.jsx (v2025-08-26c)
// Build: UX alignment • Salary details • Monthly→Weekly→Daily finances • Discount-split B2/B4 • Rate bands • Projects UI • Security polish
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
const DATA_VERSION = "proago_v7_reset_2025_08_26";
const VERSION_KEY = "proago_data_version";

/* ──────────────────────────────────────────────────────────────────────────
  Auth (persist with localStorage)
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
  recruiters: "proago_recruiters_v6",
  pipeline: "proago_pipeline_v5",
  history: "proago_history_v6_discounts", // bumped for discount split
  planning: "proago_planning_v5",
  settings: "proago_settings_v3_bands_projects", // bumped for bands + projects UI
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
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-1"><Label>Username</Label>
              <Input value={u} onChange={(e)=>setU(e.target.value)} placeholder="Oscar or Joao"/></div>
            <div className="grid gap-1"><Label>Password</Label>
              <Input type="password" value={p} onChange={(e)=>setP(e.target.value)} /></div>
            <Button style={{ background:"#d9010b", color:"white" }} className="mt-1">Login</Button>
            <div className="text-xs text-zinc-500 mt-2">
              Confidential internal tool. Data stays in your browser (localStorage). Export CSV for backups.
            </div>
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
        <Input placeholder="Oscar or Joao" value={u} onChange={(e)=>setU(e.target.value)} className="max-w-xs"/>
        <Input type="password" placeholder="Password" value={p} onChange={(e)=>setP(e.target.value)} className="max-w-xs"/>
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
  Inflow (strict prefixes, Add Lead; no Export; Hire asks crewcode=5 digits; role always Rookie)
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

  const Column=({title,keyName,prev,nextKey,extra})=>(
    <Card className="border-2">
      <CardHeader><CardTitle className="flex justify-between items-center"><span>{title}</span><Badge>{pipeline[keyName].length}</Badge></CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50"><tr>
              <th className="p-3 text-left">Name</th><th className="p-3">Phone</th><th className="p-3">Source</th><th className="p-3 text-right">Actions</th>
            </tr></thead>
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
    <div className="flex justify-between items-center">
      <h3 className="font-semibold">Inflow</h3>
      <div className="flex gap-2">
        <Button onClick={()=>fileRef.current?.click()}><Upload className="h-4 w-4 mr-1"/>Import</Button>
        <input ref={fileRef} type="file" hidden accept="application/json" onChange={(e)=>e.target.files?.[0]&&onImport(e.target.files[0])}/>
        <Button style={{background:"#d9010b",color:"white"}} onClick={()=>setAddOpen(true)}><Plus className="h-4 w-4 mr-1"/>Add Lead</Button>
      </div>
    </div>
    <div className="grid md:grid-cols-3 gap-4">
      <Column title="Leads" keyName="leads" nextKey="interview"/>
      <Column title="Interview" keyName="interview" prev="leads" nextKey="formation"/>
      <Column title="Formation" keyName="formation" prev="interview" extra={(x)=><Button size="sm" onClick={()=>hire(x)}><UserPlus className="h-4 w-4 mr-1"/>Hire</Button>}/>
    </div>
    <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onSave={(lead)=>setPipeline((p)=>({...p,leads:[lead,...p.leads]}))}/>
  </div>);
};
/* ──────────────────────────────────────────────────────────────────────────
  Recruiters (photo add/remove, last5, Box2/Box4% from split model, history editor)
────────────────────────────────────────────────────────────────────────── */
const Recruiters = ({ recruiters, setRecruiters, history, setHistory }) => {
  const [detail, setDetail] = useState(null);
  const [edit, setEdit] = useState(null);

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
  const decorated = recruiters.map(decorate);

  const del=(id)=>{ if(!confirm("Delete recruiter? History will be kept.")) return;
    setRecruiters(recruiters.filter(r=>r.id!==id)); };

  const updateHistField=(recId,dateISO,_rowKey,key,raw)=>{
    setHistory((h)=> upsertHistory(h,{ recruiterId:recId, dateISO, _rowKey,
      [key]:
        (["score","box2_noDisc","box2_disc","box4_noDisc","box4_disc","hours","commissionMult"].includes(key)
          ? (raw===""?undefined:Number(raw)) : raw)
    }));
  };

  const onPickPhoto = (rec) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const fr = new FileReader();
      fr.onload = () => {
        setRecruiters(all => all.map(r => r.id===rec.id ? ({...r, photoUrl: fr.result}) : r));
      };
      fr.readAsDataURL(file);
    };
    input.click();
  };
  const removePhoto = (rec) => setRecruiters(all => all.map(r => r.id===rec.id ? ({...r, photoUrl: undefined}) : r));

  return (<div className="grid gap-4">
    <div className="overflow-x-auto border rounded-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-50">
          <tr>
            <th className="p-3">Name</th><th className="p-3">Crewcode</th><th className="p-3">Role</th>
            <th className="p-3">Last 5</th><th className="p-3 text-right">Average</th>
            <th className="p-3 text-right">Box2</th><th className="p-3 text-right">Box4</th>
            <th className="p-3">Phone</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {decorated.map((r)=>(
            <tr key={r.id} className="border-t">
              <td className="p-3 font-medium">
                <button className="underline" onClick={()=>setDetail(r)}>{r.name}</button>
              </td>
              <td className="p-3">{r.crewCode}</td>
              <td className="p-3">{r.role}</td>
              <td className="p-3">{r._last5.length? r._last5.join("–"):"—"}</td>
              <td className="p-3 text-right" style={{color:avgColor(r._avg)}}>{r._avg.toFixed(2)}</td>
              <td className="p-3 text-right" style={{color:box2Color(r._b2)}}>{r._b2.toFixed(1)}%</td>
              <td className="p-3 text-right" style={{color:box4Color(r._b4)}}>{r._b4.toFixed(1)}%</td>
              <td className="p-3">{r.phone}</td>
              <td className="p-3 flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={()=>setEdit(r)}><Edit3 className="h-4 w-4"/>Edit</Button>
                <Button size="sm" variant="destructive" onClick={()=>del(r.id)}><Trash2 className="h-4 w-4"/></Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* History & profile modal (bigger) */}
    <Dialog open={!!detail} onOpenChange={()=>setDetail(null)}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {detail?.photoUrl ? <img src={detail.photoUrl} alt="" className="h-8 w-8 rounded-full"/> : <div className="h-8 w-8 rounded-full bg-zinc-200 grid place-items-center"><ImageIcon className="h-4 w-4"/></div>}
            {detail?.name} — {detail?.crewCode}
          </DialogTitle>
          <DialogDescription>All-time shifts (edit anything; location read-only here)</DialogDescription>
        </DialogHeader>

        {/* photo controls */}
        <div className="flex items-center gap-2 mb-2">
          <Button size="sm" variant="outline" onClick={()=>onPickPhoto(detail)}><ImageIcon className="h-4 w-4 mr-1"/>Add/Change Photo</Button>
          {detail?.photoUrl && <Button size="sm" variant="destructive" onClick={()=>removePhoto(detail)}>Remove Photo</Button>}
        </div>

        <div className="max-h-[65vh] overflow-auto border rounded-lg">
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
                .filter(h=>h.recruiterId===detail?.id)
                .sort((a,b)=>a.dateISO<b.dateISO?1:-1)
                .map((h,i)=>(
                <tr key={`${h.dateISO}_${h._rowKey||0}_${i}`} className="border-t">
                  <td className="p-2">{fmtUK(h.dateISO)}</td>
                  <td className="p-2">
                    <select defaultValue={h.roleAtShift||detail?.role||"Rookie"} className="h-9 border rounded-md px-2" onChange={(e)=>updateHistField(detail.id,h.dateISO,h._rowKey,"roleAtShift",e.target.value)}>
                      {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <Input value={h.location||""} readOnly title="Edit location via Planning" />
                  </td>
                  <td className="p-2 text-right"><Input defaultValue={h.hours??""} inputMode="numeric" onBlur={(e)=>updateHistField(detail.id,h.dateISO,h._rowKey,"hours",e.target.value)}/></td>
                  <td className="p-2 text-right"><Input defaultValue={h.commissionMult??""} inputMode="decimal" onBlur={(e)=>updateHistField(detail.id,h.dateISO,h._rowKey,"commissionMult",e.target.value)}/></td>
                  <td className="p-2 text-right"><Input defaultValue={h.score??""} inputMode="numeric" onBlur={(e)=>updateHistField(detail.id,h.dateISO,h._rowKey,"score",e.target.value)}/></td>
                  <td className="p-2 text-right"><Input defaultValue={h.box2_noDisc??(h.box2??"")} inputMode="numeric" onBlur={(e)=>updateHistField(detail.id,h.dateISO,h._rowKey,"box2_noDisc",e.target.value)}/></td>
                  <td className="p-2 text-right"><Input defaultValue={h.box2_disc??""} inputMode="numeric" onBlur={(e)=>updateHistField(detail.id,h.dateISO,h._rowKey,"box2_disc",e.target.value)}/></td>
                  <td className="p-2 text-right"><Input defaultValue={h.box4_noDisc??(h.box4??"")} inputMode="numeric" onBlur={(e)=>updateHistField(detail.id,h.dateISO,h._rowKey,"box4_noDisc",e.target.value)}/></td>
                  <td className="p-2 text-right"><Input defaultValue={h.box4_disc??""} inputMode="numeric" onBlur={(e)=>updateHistField(detail.id,h.dateISO,h._rowKey,"box4_disc",e.target.value)}/></td>
                  <td className="p-2 text-right">
                    <Button variant="destructive" size="sm" onClick={()=>requestDeleteHistory(detail.id, h.dateISO, h._rowKey)} title="Delete this history row">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setEdit(null)}>Cancel</Button>
          <Button style={{background:"#d9010b",color:"white"}} onClick={()=>{
            // re-validate phone on save
            const norm = formatPhoneByCountry(edit.phone||"");
            if(!norm.ok) { alert("Phone must start with +352, +33, +32 or +49."); return; }
            setRecruiters(all=>all.map(r=>r.id===edit.id?{...edit, name:titleCase(edit.name), phone:norm.display}:r));
            setEdit(null);
          }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>);
};
/* ──────────────────────────────────────────────────────────────────────────
  Planning — Teams + Zones, split discounts, cleaner modal, colored preview
  - Day data shape: { teams:[ { name, project, shiftType, zones:[string], rows:[{recruiterId, zone, hours, commissionMult, score, box2_noDisc, box2_disc, box4_noDisc, box4_disc}]} ] }
  - Preview: "Mon 25/08/25" header (date next to day), score always shown & colored, project shown without label.
  - Edit Day: "Add Team" (can delete team), inside each team manage Zones list, per-row Zone selector.
────────────────────────────────────────────────────────────────────────── */
const ensureWeek = (state, weekISO) => {
  const safe = state && typeof state === "object" ? state : {};
  const base = safe[weekISO] && typeof safe[weekISO] === "object" ? safe[weekISO] : { days: {} };
  if (!base.days || typeof base.days !== "object") base.days = {};

  for (let i = 0; i < 7; i++) {
    const dateISO = fmtISO(addDays(parseISO(weekISO), i));
    if (!base.days[dateISO]) {
      base.days[dateISO] = { teams: [] };
    } else {
      const day = base.days[dateISO];
      // migrate legacy zones -> teams
      if (day && Array.isArray(day.zones)) {
        const teams = (day.zones || []).map((z) => ({
          name: z?.name || "Luxembourg, Gare",
          project: z?.project || "HF",
          shiftType: z?.shiftType || "D2D",
          zones: [z?.name || "Luxembourg, Gare"],
          rows: (z?.rows || []).map((row, idx) => ({
            _rowKey: idx,
            recruiterId: row?.recruiterId || "",
            zone: z?.name || "",
            hours: row?.hours,
            commissionMult: row?.commissionMult,
            score: row?.score,
            box2_noDisc: row?.box2_noDisc ?? row?.box2 ?? undefined,
            box2_disc: row?.box2_disc ?? undefined,
            box4_noDisc: row?.box4_noDisc ?? row?.box4 ?? undefined,
            box4_disc: row?.box4_disc ?? undefined,
          })),
        }));
        base.days[dateISO] = { teams };
      } else if (!Array.isArray(day?.teams)) {
        base.days[dateISO] = { teams: [] };
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
    const day = days[iso] && typeof days[iso] === "object" ? days[iso] : { teams: [] };
    // normalize team defaults
    day.teams = (day.teams || []).map(t => ({ project: "HF", shiftType: "D2D", zones: ["Luxembourg, Gare"], rows: [], ...t }));
    return day;
  };

  const rById = (id) => recruiters.find((r) => r.id === id);
  const multipliers = [
    { label: "100%", val: 1.0 }, { label: "125%", val: 1.25 },
    { label: "150%", val: 1.5 }, { label: "200%", val: 2.0 },
  ];
  const shiftTypes = [{ label: "Door-to-Door", val: "D2D" }, { label: "Events", val: "EVENT" }];

  // Edit Day modal state
  const [editDateISO, setEditDateISO] = useState(null);
  const [draftDay, setDraftDay] = useState(null); // { teams:[{name, project, shiftType, zones:[...], rows:[...]}] }

  const openEditDay = (dateISO) => {
    const d = clone(getDay(dateISO));
    if (!d.teams || !d.teams.length) {
      d.teams = [{ name: "Luxembourg, Gare", project: "HF", shiftType: "D2D", zones: ["Luxembourg, Gare"], rows: [] }];
    }
    // ensure row keys
    d.teams.forEach(team => {
      team.rows = (team.rows || []).map((row, idx) => ({ _rowKey: row?._rowKey ?? idx, ...row }));
      team.zones = (team.zones && team.zones.length) ? team.zones : ["Luxembourg, Gare"];
    });
    setEditDateISO(dateISO);
    setDraftDay(d);
  };
  const closeEditDay = () => { setEditDateISO(null); setDraftDay(null); };

  // Team mutations
  const addTeam = () =>
    setDraftDay(d => ({ ...d, teams: [...(d?.teams || []), { name: "Luxembourg, Gare", project: "HF", shiftType: "D2D", zones: ["Luxembourg, Gare"], rows: [] }] }));
  const delTeam = (ti) =>
    setDraftDay(d => ({ ...d, teams: (d?.teams || []).filter((_, i) => i !== ti) }));
  const setTeamField = (ti, patch) =>
    setDraftDay(d => { const teams = clone(d.teams || []); teams[ti] = { ...teams[ti], ...patch }; return { ...d, teams }; });

  // Zones list inside a team
  const addZoneToTeam = (ti) =>
    setDraftDay(d => { const teams = clone(d.teams || []); (teams[ti].zones ||= []).push(`Zone ${teams[ti].zones.length + 1}`); return { ...d, teams }; });
  const delZoneFromTeam = (ti, zi) =>
    setDraftDay(d => {
      const teams = clone(d.teams || []);
      const removed = (teams[ti].zones || [])[zi];
      teams[ti].zones = (teams[ti].zones || []).filter((_, i) => i !== zi);
      // any rows pointing to removed zone -> blank
      teams[ti].rows = (teams[ti].rows || []).map(r => (r.zone === removed ? { ...r, zone: "" } : r));
      return { ...d, teams };
    });

  // Row mutations
  const addRow = (ti) =>
    setDraftDay(d => {
      const teams = clone(d.teams || []);
      const nextKey = (teams[ti].rows?.length || 0);
      (teams[ti].rows ||= []).push({
        _rowKey: nextKey,
        recruiterId: "",
        zone: teams[ti].zones?.[0] || "",
        hours: undefined,
        commissionMult: undefined,
        score: undefined,
        box2_noDisc: undefined,
        box2_disc: undefined,
        box4_noDisc: undefined,
        box4_disc: undefined,
      });
      return { ...d, teams };
    });
  const delRow = (ti, ri) =>
    setDraftDay(d => { const teams = clone(d.teams || []); teams[ti].rows = (teams[ti].rows || []).filter((_, i) => i !== ri); return { ...d, teams }; });
  const setRow = (ti, ri, patch) =>
    setDraftDay(d => { const teams = clone(d.teams || []); teams[ti].rows[ri] = { ...teams[ti].rows[ri], ...patch }; return { ...d, teams }; });

  // Save day → planning + history upserts
  const saveDay = () => {
    if (!draftDay) return;
    const dateISO = editDateISO;

    // Validate discount-split vs score
    for (const team of draftDay.teams || []) {
      for (const row of team.rows || []) {
        const sc = Number(row.score || 0);
        const b2n = Number(row.box2_noDisc || 0);
        const b2d = Number(row.box2_disc || 0);
        const b4n = Number(row.box4_noDisc || 0);
        const b4d = Number(row.box4_disc || 0);
        const sum = b2n + b2d + b4n + b4d;
        if (sum > sc) {
          alert("Box2/Box4 totals (no-disc + disc) cannot exceed Score.");
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
            // split fields
            box2_noDisc: row.box2_noDisc === "" ? undefined : (row.box2_noDisc != null ? Number(row.box2_noDisc) : undefined),
            box2_disc:   row.box2_disc   === "" ? undefined : (row.box2_disc   != null ? Number(row.box2_disc)   : undefined),
            box4_noDisc: row.box4_noDisc === "" ? undefined : (row.box4_noDisc != null ? Number(row.box4_noDisc) : undefined),
            box4_disc:   row.box4_disc   === "" ? undefined : (row.box4_disc   != null ? Number(row.box4_disc)   : undefined),
            project: team.project || "HF",
            shiftType: team.shiftType || "D2D",
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

  // Day card preview
  const DayCard = ({ i }) => {
    const dISO = fmtISO(addDays(parseISO(weekStart), i));
    const day = getDay(dISO);
    return (
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}{" "}
              <span className="text-sm text-zinc-500">{fmtUK(dISO)}</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0">
          {day.teams && day.teams.length > 0 ? (
            day.teams.map((t, ti) => (
              <div key={ti} className="border rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{t.name || "—"} <span className="text-xs text-zinc-600">• {t.project || "HF"}</span></div>
                </div>
                {(t.rows || []).length > 0 ? (
                  <ul className="text-sm space-y-1 mt-1">
                    {t.rows.map((row, ri) => {
                      const rec = rById(row.recruiterId);
                      // Prefer draft row score, else existing history
                      const histRow = history.find(h => h.recruiterId===row.recruiterId && h.dateISO===dISO && (h._rowKey||0)===(row._rowKey||ri));
                      const sc = row.score ?? histRow?.score;
                      return (
                        <li key={ri} className="flex items-center justify-between">
                          <span>{rec?.name || "Recruiter"} {row.zone ? <span className="text-xs text-zinc-500">({row.zone})</span> : null}</span>
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

      {/* Edit Day modal (bigger/cleaner) */}
      <Dialog open={!!editDateISO} onOpenChange={(open) => { if (!open) closeEditDay(); }}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>Edit Day — {fmtUK(editDateISO || "")}</DialogTitle>
            <DialogDescription>Manage Teams and Zones. Values are saved per shift and mirrored across tabs.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            {(draftDay?.teams || []).map((t, ti) => (
              <div key={ti} className="border rounded-xl p-3">
                {/* Team header */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div className="grid gap-1">
                    <Label>Team</Label>
                    <Input className="h-9" value={t.name} onChange={(e) => setTeamField(ti, { name: e.target.value })} placeholder="Luxembourg, Gare" />
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
                        <Input className="h-8 w-40" value={z} onChange={(e)=>{
                          const val = e.target.value;
                          setDraftDay(d=>{
                            const teams = clone(d.teams||[]);
                            teams[ti].zones[zi] = val;
                            // update any row that referenced old name? (skip rename propagation for simplicity)
                            return {...d, teams};
                          });
                        }}/>
                        <Button variant="ghost" size="sm" onClick={()=>delZoneFromTeam(ti, zi)}><X className="h-4 w-4"/></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={()=>addZoneToTeam(ti)}><Plus className="h-4 w-4 mr-1"/> Add Zone</Button>
                  </div>
                </div>

                {/* Rows table */}
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
                            <Input className="w-20 h-9 text-right" inputMode="numeric" value={row.hours ?? ""} onChange={(e) => setRow(ti, ri, { hours: e.target.value })} placeholder="6/7/8" />
                          </td>
                          <td className="p-2 text-right">
                            <select className="h-9 border rounded-md px-2" value={row.commissionMult ?? ""} onChange={(e) => setRow(ti, ri, { commissionMult: e.target.value ? Number(e.target.value) : "" })}>
                              <option value="">—</option>
                              {multipliers.map((m) => (<option key={m.val} value={m.val}>{m.label}</option>))}
                            </select>
                          </td>
                          <td className="p-2 text-right"><Input className="w-20 h-9 text-right" inputMode="numeric" value={row.score ?? ""} onChange={(e) => setRow(ti, ri, { score: e.target.value })} /></td>
                          <td className="p-2 text-right"><Input className="w-20 h-9 text-right" inputMode="numeric" value={row.box2_noDisc ?? ""} onChange={(e) => setRow(ti, ri, { box2_noDisc: e.target.value })} /></td>
                          <td className="p-2 text-right"><Input className="w-20 h-9 text-right" inputMode="numeric" value={row.box2_disc ?? ""} onChange={(e) => setRow(ti, ri, { box2_disc: e.target.value })} /></td>
                          <td className="p-2 text-right"><Input className="w-20 h-9 text-right" inputMode="numeric" value={row.box4_noDisc ?? ""} onChange={(e) => setRow(ti, ri, { box4_noDisc: e.target.value })} /></td>
                          <td className="p-2 text-right"><Input className="w-20 h-9 text-right" inputMode="numeric" value={row.box4_disc ?? ""} onChange={(e) => setRow(ti, ri, { box4_disc: e.target.value })} /></td>
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
  Salary — month nav, hours & wages (rate bands) + Bonus
  With per-recruiter dropdown breakdown of shifts & commissions
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
      // Hours & wages per row using rate bands
      const hourRows = hRows.map(row => {
        const hrs = (row.hours != null ? Number(row.hours) : roleHoursDefault(row.roleAtShift||r.role||"Rookie"));
        const rate = rateForDate(settings, row.dateISO);
        const wages = hrs * rate;
        return { ...row, hrs, rate, wages };
      });
      const hours = hourRows.reduce((s,rr)=>s+rr.hrs,0);
      const wages = hourRows.reduce((s,rr)=>s+rr.wages,0);

      // Bonus from commission month
      const cRowsRaw = history.filter(x => x.recruiterId===r.id && inMonth(x.dateISO, commMonth));
      const cRows = cRowsRaw.map(row => {
        const b2 = (Number(row.box2_noDisc)||0)+(Number(row.box2_disc)||0);
        const base = rookieCommission(b2);
        const mult = row.commissionMult ?? roleMultiplierDefault(row.roleAtShift||r.role||"Rookie");
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
                          {/* Hours/Wages breakdown */}
                          <div className="border rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-zinc-50 font-medium">Hours & Wages — {monthLabel(workMonth)}</div>
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
                          {/* Bonus breakdown */}
                          <div className="border rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-zinc-50 font-medium">Bonus — {monthLabel(commMonth)}</div>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead className="bg-zinc-50"><tr>
                                  <th className="p-2 text-left">Date</th>
                                  <th className="p-2 text-right">Box2</th>
                                  <th className="p-2 text-right">Base</th>
                                  <th className="p-2 text-right">Mult</th>
                                  <th className="p-2 text-right">Bonus</th>
                                </tr></thead>
                                <tbody>
                                  {cRows.map((rr,i)=>(
                                    <tr key={i} className="border-t">
                                      <td className="p-2">{fmtUK(rr.dateISO)}</td>
                                      <td className="p-2 text-right">{rr.b2}</td>
                                      <td className="p-2 text-right">{toMoney(rr.base)}</td>
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
  Finances — Monthly → Weekly → Daily → Shift details
  Columns order: Shifts | Score | Box2 | Box4 | Wages | Income | Profit
  Profit green if >0, red if <0. Uses discount-split and Conversion Type.
────────────────────────────────────────────────────────────────────────── */

const Finances = ({ history }) => {
  const [month, setMonth] = useState(currentMonthKey());
  const [openWeek, setOpenWeek] = useState({}); // weekStartISO => bool
  const [openDay, setOpenDay] = useState({});   // dateISO => bool

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
  const calcWages = (row) => {
    const hrs = row.hours ?? roleHoursDefault(row.roleAtShift||"Rookie");
    const rate = rateForDate(settings, row.dateISO);
    return hrs*rate;
  };

  // Group rows for the selected month by week (Mon-start), then by day
  const monthRows = history.filter(h => inMonth(h.dateISO));
  const byWeek = {};
  monthRows.forEach(r=>{
    const wkStart = fmtISO(startOfWeekMon(parseISO(r.dateISO)));
    (byWeek[wkStart] ||= []).push(r);
  });

  const profitColor = (v) => (v>0 ? "#10b981" : v<0 ? "#ef4444" : undefined);

  // helpers to totalize a group
  const summarize = (rows) => {
    let income=0,wages=0,score=0,box2=0,box4=0,shifts=0, detail=[];
    detail = rows.map(r=>{
      const inc = calcIncome(r);
      const wag = calcWages(r);
      const { b2, b4 } = boxTotals(r);
      return {
        ...r,
        score: Number(r.score)||0,
        b2, b4,
        wages: wag,
        income: inc,
        profit: inc-wag,
      };
    });
    detail.forEach(r=>{ income+=r.income; wages+=r.wages; score+=r.score; box2+=r.b2; box4+=r.b4; shifts++; });
    return { income, wages, profit: income-wages, score, box2, box4, shifts, detail };
  };

  // Precompute weeks summary
  const weekKeys = Object.keys(byWeek).sort(); // chronological
  const weeks = weekKeys.map(wk => {
    const rows = byWeek[wk];
    // group by date
    const daysMap = {};
    rows.forEach(r => { (daysMap[r.dateISO] ||= []).push(r); });
    const dayKeys = Object.keys(daysMap).sort();
    const days = dayKeys.map(dISO => ({ iso:dISO, ...summarize(daysMap[dISO]) }));
    const weekSum = summarize(rows);
    return { weekStartISO: wk, days, ...weekSum };
  });

  const monthIncome = weeks.reduce((s,w)=>s+w.income,0);
  const monthWages  = weeks.reduce((s,w)=>s+w.wages,0);
  const monthProfit = monthIncome - monthWages;

  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Button variant="outline" onClick={()=>setMonth(monthShift(month,-1))}><ChevronLeft className="h-4 w-4"/>Prev</Button>
          <Badge style={{background:"#fca11c"}}>{monthLabel(month)}</Badge>
          <Button variant="outline" onClick={()=>setMonth(monthShift(month,1))}>Next<ChevronRight className="h-4 w-4"/></Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Income €{toMoney(monthIncome)} • Wages €{toMoney(monthWages)} • <span style={{color:profitColor(monthProfit)}}>Profit €{toMoney(monthProfit)}</span>
        </div>
      </div>

      {/* Weeks table */}
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50"><tr>
            <th className="p-3">Week</th>
            <th className="p-3 text-right">Shifts</th>
            <th className="p-3 text-right">Score</th>
            <th className="p-3 text-right">Box2</th>
            <th className="p-3 text-right">Box4</th>
            <th className="p-3 text-right">Wages</th>
            <th className="p-3 text-right">Income</th>
            <th className="p-3 text-right">Profit</th>
            <th className="p-3 text-right">Days</th>
          </tr></thead>
          <tbody>
            {weeks.map(w=>(
              <React.Fragment key={w.weekStartISO}>
                <tr className="border-t">
                  <td className="p-3">Week {weekNumberISO(parseISO(w.weekStartISO))}</td>
                  <td className="p-3 text-right">{w.shifts}</td>
                  <td className="p-3 text-right">{w.score}</td>
                  <td className="p-3 text-right">{w.box2}</td>
                  <td className="p-3 text-right">{w.box4}</td>
                  <td className="p-3 text-right">{toMoney(w.wages)}</td>
                  <td className="p-3 text-right">{toMoney(w.income)}</td>
                  <td className="p-3 text-right" style={{color:profitColor(w.profit)}}>{toMoney(w.profit)}</td>
                  <td className="p-3 text-right">
                    <Button variant="outline" size="sm" onClick={()=>setOpenWeek(s=>({...s, [w.weekStartISO]: !s[w.weekStartISO]}))}>
                      {openWeek[w.weekStartISO] ? "Hide" : "View"} <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </td>
                </tr>

                {openWeek[w.weekStartISO] && w.days.length>0 && (
                  <tr>
                    <td colSpan={9} className="p-0">
                      {/* Days table */}
                      <div className="px-3 pb-3">
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="min-w-full text-sm">
                            <thead className="bg-zinc-50"><tr>
                              <th className="p-2">Date</th>
                              <th className="p-2 text-right">Shifts</th>
                              <th className="p-2 text-right">Score</th>
                              <th className="p-2 text-right">Box2</th>
                              <th className="p-2 text-right">Box4</th>
                              <th className="p-2 text-right">Wages</th>
                              <th className="p-2 text-right">Income</th>
                              <th className="p-2 text-right">Profit</th>
                              <th className="p-2 text-right">Shifts</th>
                            </tr></thead>
                            <tbody>
                              {w.days.map(d=>(
                                <React.Fragment key={d.iso}>
                                  <tr className="border-t">
                                    <td className="p-2">{fmtUK(d.iso)}</td>
                                    <td className="p-2 text-right">{d.shifts}</td>
                                    <td className="p-2 text-right">{d.score}</td>
                                    <td className="p-2 text-right">{d.box2}</td>
                                    <td className="p-2 text-right">{d.box4}</td>
                                    <td className="p-2 text-right">{toMoney(d.wages)}</td>
                                    <td className="p-2 text-right">{toMoney(d.income)}</td>
                                    <td className="p-2 text-right" style={{color:profitColor(d.profit)}}>{toMoney(d.profit)}</td>
                                    <td className="p-2 text-right">
                                      <Button variant="outline" size="sm" onClick={()=>setOpenDay(s=>({...s, [d.iso]: !s[d.iso]}))}>
                                        {openDay[d.iso] ? "Hide" : "View"} <ChevronDown className="h-4 w-4 ml-1" />
                                      </Button>
                                    </td>
                                  </tr>
                                  {openDay[d.iso] && d.detail.length>0 && (
                                    <tr>
                                      <td colSpan={9} className="p-0">
                                        {/* Shifts detail */}
                                        <div className="px-2 pb-3">
                                          <div className="overflow-x-auto border rounded-lg">
                                            <table className="min-w-full text-sm">
                                              <thead className="bg-zinc-50"><tr>
                                                <th className="p-2 text-left">Recruiter</th>
                                                <th className="p-2 text-left">Project</th>
                                                <th className="p-2 text-left">Type</th>
                                                <th className="p-2 text-left">Location</th>
                                                <th className="p-2 text-right">Score</th>
                                                <th className="p-2 text-right">B2 No</th>
                                                <th className="p-2 text-right">B2 Disc</th>
                                                <th className="p-2 text-right">B4 No</th>
                                                <th className="p-2 text-right">B4 Disc</th>
                                                <th className="p-2 text-right">Hours</th>
                                                <th className="p-2 text-right">Rate</th>
                                                <th className="p-2 text-right">Wages</th>
                                                <th className="p-2 text-right">Income</th>
                                                <th className="p-2 text-right">Profit</th>
                                              </tr></thead>
                                              <tbody>
                                                {d.detail.map((r,i)=>(
                                                  <tr key={i} className="border-t">
                                                    <td className="p-2">{r.recruiterName || r.recruiterId}</td>
                                                    <td className="p-2">{r.project||"HF"}</td>
                                                    <td className="p-2">{r.shiftType||"D2D"}</td>
                                                    <td className="p-2">{r.location||"—"}</td>
                                                    <td className="p-2 text-right">{r.score}</td>
                                                    <td className="p-2 text-right">{Number(r.box2_noDisc)||0}</td>
                                                    <td className="p-2 text-right">{Number(r.box2_disc)||0}</td>
                                                    <td className="p-2 text-right">{Number(r.box4_noDisc)||0}</td>
                                                    <td className="p-2 text-right">{Number(r.box4_disc)||0}</td>
                                                    <td className="p-2 text-right">{r.hours ?? roleHoursDefault(r.roleAtShift||"Rookie")}</td>
                                                    <td className="p-2 text-right">{toMoney(rateForDate(settings, r.dateISO))}</td>
                                                    <td className="p-2 text-right">{toMoney(calcWages(r))}</td>
                                                    <td className="p-2 text-right">{toMoney(calcIncome(r))}</td>
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
  Settings (projects UI + conversion type + rate bands, gated)
────────────────────────────────────────────────────────────────────────── */
const Settings = ({ history, setHistory }) => {
  const [settings, setSettings] = useState(load(K.settings, DEFAULT_SETTINGS));
  const [credOpen, setCredOpen] = useState(false);
  const [settingsNote] = useState("Confidential internal tool. Data is stored locally in your browser.");

  useEffect(() => save(K.settings, settings), [settings]);

  const updateMatrix = (type, disc, box, val) => {
    setSettings((s) => {
      const next = clone(s);
      next.conversionType[type][disc][box] = Number(val) || 0;
      return next;
    });
  };

  const addProject = () => {
    const p = prompt("New project name:");
    if (!p) return;
    setSettings(s => ({ ...s, projects: Array.from(new Set([...(s.projects||[]), p.trim()])).filter(Boolean) }));
  };
  const removeProject = (p) => setSettings(s => ({ ...s, projects: (s.projects||[]).filter(x => x!==p) }));

  const addRateBand = () => {
    const startISO = prompt("Start date (YYYY-MM-DD):", fmtISO(new Date()));
    const rateStr = prompt("Rate (€ per hour):", "16.00");
    if (!startISO || !/^\d{4}-\d{2}-\d{2}$/.test(startISO)) return alert("Invalid date");
    const rate = Number(rateStr);
    if (!(rate>0)) return alert("Invalid rate");
    setSettings(s=>{
      const bands = [...(s.rateBands||[]), { startISO, rate }].sort((a,b)=> a.startISO<b.startISO?1:-1);
      return { ...s, rateBands: bands };
    });
  };
  const removeRateBand = (idx) => {
    setSettings(s=>{
      const bands = [...(s.rateBands||[])];
      bands.splice(idx,1);
      return { ...s, rateBands: bands };
    });
  };

  return (
    <div className="grid gap-6 max-w-4xl">
      <h3 className="text-lg font-semibold">Settings</h3>
      <div className="text-sm text-zinc-600">{settingsNote}</div>

      {/* Projects */}
      <div className="border rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Projects</h4>
          <Button variant="outline" size="sm" onClick={addProject}><Plus className="h-4 w-4 mr-1"/>Add Project</Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(settings.projects||[]).map((p,i)=>(
            <span key={i} className="inline-flex items-center gap-2 border rounded-full px-3 py-1">
              {p}
              <button onClick={()=>removeProject(p)} className="text-zinc-500 hover:text-zinc-700"><X className="h-4 w-4"/></button>
            </span>
          ))}
          {(!settings.projects || settings.projects.length===0) && <div className="text-sm text-zinc-500">No projects yet.</div>}
        </div>
      </div>

      {/* Conversion Type (matrix) */}
      <div>
        <h4 className="font-medium mb-2">Conversion Type</h4>
        {Object.keys(settings.conversionType).map((type) => (
          <div key={type} className="border rounded-xl p-3 mb-3">
            <div className="font-semibold mb-2">{type}</div>
            {Object.keys(settings.conversionType[type]).map((disc) => (
              <div key={disc} className="mb-2">
                <div className="text-sm text-zinc-600 mb-1">{disc}</div>
                <div className="flex gap-3">
                  <div>
                    <Label>Box2</Label>
                    <Input
                      type="number"
                      value={settings.conversionType[type][disc].box2}
                      onChange={(e) => updateMatrix(type, disc, "box2", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Box4</Label>
                    <Input
                      type="number"
                      value={settings.conversionType[type][disc].box4}
                      onChange={(e) => updateMatrix(type, disc, "box4", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Rate Bands */}
      <div className="border rounded-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Hourly Rate Bands</h4>
          <Button variant="outline" size="sm" onClick={addRateBand}><Plus className="h-4 w-4 mr-1"/>Add Band</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="p-2 text-left">Start Date</th>
                <th className="p-2 text-right">Rate (€)</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(settings.rateBands||[]).sort((a,b)=> a.startISO<b.startISO?1:-1).map((b,idx)=>(
                <tr key={`${b.startISO}_${idx}`} className="border-t">
                  <td className="p-2">{fmtUK(b.startISO)}</td>
                  <td className="p-2 text-right">{toMoney(b.rate)}</td>
                  <td className="p-2 text-right">
                    <Button variant="destructive" size="sm" onClick={()=>removeRateBand(idx)}>Remove</Button>
                  </td>
                </tr>
              ))}
              {(!settings.rateBands || settings.rateBands.length===0) && (
                <tr><td className="p-2 text-zinc-500" colSpan={3}>No bands configured.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-zinc-500 mt-2">
          The applicable rate is chosen by the latest band with a start date ≤ shift date.
        </div>
      </div>

      {/* Danger zone: Bulk history delete (credential gated) */}
      <div className="flex gap-3">
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
          setHistory([]);
          setCredOpen(false);
          alert("All history deleted ❌");
        }}
      />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  Main App Wrapper
  - Scoped reset (only our keys)
  - Migrate old history (box2/box4 -> noDisc)
  - Gates for Salary, Finances, Settings
────────────────────────────────────────────────────────────────────────── */
export default function App() {
  // scoped wipe once if version changed (DO NOT clear whole localStorage)
  useEffect(() => {
    const ver = localStorage.getItem(VERSION_KEY);
    if (ver !== DATA_VERSION) {
      // remove only our keys
      Object.values(K).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(VERSION_KEY, DATA_VERSION);
    }
  }, []);

  const [authed, setAuthed] = useState(!!localStorage.getItem(AUTH_SESSION_KEY));
  const [tab, setTab] = useState("inflow");
  const [pipeline, setPipeline] = useState(load(K.pipeline, { leads: [], interview: [], formation: [] }));
  const [recruiters, setRecruiters] = useState(load(K.recruiters, []));
  const [planning, setPlanning] = useState(load(K.planning, {}));
  const [history, setHistory] = useState(load(K.history, []));

  // Migrate history to discount-split if needed
  useEffect(() => {
    let changed = false;
    const migrated = (history||[]).map((row, idx) => {
      const hasSplit = ["box2_noDisc","box2_disc","box4_noDisc","box4_disc"].some(k => row[k]!=null);
      if (hasSplit) return row;
      if (row.box2 != null || row.box4 != null) {
        changed = true;
        return {
          ...row,
          box2_noDisc: row.box2 ?? 0,
          box2_disc: 0,
          box4_noDisc: row.box4 ?? 0,
          box4_disc: 0,
        };
      }
      return row;
    });
    if (changed) {
      setHistory(migrated);
      save(K.history, migrated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

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

  const [salaryUnlocked, setSalaryUnlocked] = useState(!!localStorage.getItem(SALARY_SESSION_KEY));
  const [financeUnlocked, setFinanceUnlocked] = useState(!!localStorage.getItem(FINANCE_SESSION_KEY));
  const [settingsUnlocked, setSettingsUnlocked] = useState(!!localStorage.getItem(SETTINGS_SESSION_KEY));

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
              role: "Rookie", // always Rookie on hire
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
      {tab === "settings" &&
        (settingsUnlocked ? (
          <Settings history={history} setHistory={setHistory} />
        ) : (
          <Gate
            storageKey={SETTINGS_SESSION_KEY}
            label="Re-enter credentials for Settings"
            onOk={() => setSettingsUnlocked(true)}
          />
        ))}
    </Shell>
  );
}
