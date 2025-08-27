// Proago CRM — App.jsx (v2025-08-27a)
// Build: UI polish • Recruiter Info single photo • Planning full-screen & dedupe recruiters • Finances Yearly • Inflow stacked with email & dates
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
const DATA_VERSION = "proago_v8_reset_2025_08_27";
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
  recruiters: "proago_recruiters_v7",
  pipeline: "proago_pipeline_v6",
  history: "proago_history_v7_discounts", // split model
  planning: "proago_planning_v6",
  settings: "proago_settings_v4_bands_projects",
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
  History helpers
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
  Auth gates (Login + reusable Gate + CredentialDialog) — no grey hints
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
              <Input value={u} onChange={(e)=>setU(e.target.value)} placeholder=""/></div>
            <div className="grid gap-1"><Label>Password</Label>
              <Input type="password" value={p} onChange={(e)=>setP(e.target.value)} placeholder=""/></div>
            <Button style={{ background:"#d9010b", color:"white" }} className="mt-1">Login</Button>
            <div className="text-xs text-zinc-500 mt-2">
              Confidential internal tool. Data stays in your browser (localStorage).
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
        <Input placeholder="" value={u} onChange={(e)=>setU(e.target.value)} className="max-w-xs"/>
        <Input type="password" placeholder="" value={p} onChange={(e)=>setP(e.target.value)} className="max-w-xs"/>
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
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-2">
          <div className="grid gap-1">
            <Label>Username</Label>
            <Input value={u} onChange={(e) => setU(e.target.value)} placeholder="" />
          </div>
          <div className="grid gap-1">
            <Label>Password</Label>
            <Input type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder="" />
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
            ["salary","Wages"],
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
  Inflow (stacked; add email + interview/formation date & time)
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
            <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder=""/></div>
          <div className="grid gap-1"><Label>Phone</Label>
            <Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder=""/></div>
          <div className="grid gap-1"><Label>Email</Label>
            <Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder=""/></div>
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
              email: email.trim(),
              source: source.trim(),
              flag: norm.flag,
              interviewDate: "", interviewTime: "",
              formationDate: "", formationTime: ""
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
      const data=JSON.parse(fr.result);
      // normalizer kept from previous version; email & dates may be absent
      const normalized = (()=>{
        try { return normalizeImportedJson(data); }
        catch { return { leads:[], interview:[], formation:[] }; }
      })();
      setPipeline(normalized); alert("Import done ✅");
    }catch(err){ alert("Import failed: "+(err?.message||"Invalid file")); } }; fr.readAsText(file); };

  // stacked sections (top→mid→bottom)
  const Section = ({title,keyName,prev,nextKey,extra})=>(
    <Card className="border-2">
      <CardHeader><CardTitle className="flex justify-between items-center"><span>{title}</span><Badge>{pipeline[keyName].length}</Badge></CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50"><tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Email</th>
              {keyName!=="leads" && <th className="p-3">Interview</th>}
              {keyName!=="leads" && <th className="p-3">Time</th>}
              {keyName==="formation" && <th className="p-3">Formation</th>}
              {keyName==="formation" && <th className="p-3">Time</th>}
              <th className="p-3">Source</th>
              <th className="p-3 text-right">Actions</th>
            </tr></thead>
            <tbody>
              {pipeline[keyName].map((x)=>(
                <tr key={x.id} className="border-t">
                  <td className="p-3 font-medium">{titleCase(x.name)}</td>
                  <td className="p-3">{x.flag ? <span className="mr-1">{x.flag}</span> : null}{formatPhoneByCountry(x.phone).display}</td>
                  <td className="p-3">
                    <Input value={x.email||""} onChange={(e)=>setPipeline(p=>({...p,[keyName]:p[keyName].map(it=>it.id===x.id?{...it,email:e.target.value}:it)}))}/>
                  </td>
                  {keyName!=="leads" && (
                    <>
                      <td className="p-3"><Input type="date" value={x.interviewDate||""} onChange={(e)=>setPipeline(p=>({...p,[keyName]:p[keyName].map(it=>it.id===x.id?{...it,interviewDate:e.target.value}:it)}))}/></td>
                      <td className="p-3"><Input type="time" value={x.interviewTime||""} onChange={(e)=>setPipeline(p=>({...p,[keyName]:p[keyName].map(it=>it.id===x.id?{...it,interviewTime:e.target.value}:it)}))}/></td>
                    </>
                  )}
                  {keyName==="formation" && (
                    <>
                      <td className="p-3"><Input type="date" value={x.formationDate||""} onChange={(e)=>setPipeline(p=>({...p,[keyName]:p[keyName].map(it=>it.id===x.id?{...it,formationDate:e.target.value}:it)}))}/></td>
                      <td className="p-3"><Input type="time" value={x.formationTime||""} onChange={(e)=>setPipeline(p=>({...p,[keyName]:p[keyName].map(it=>it.id===x.id?{...it,formationTime:e.target.value}:it)}))}/></td>
                    </>
                  )}
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

    {/* stacked sections */}
    <Section title="Leads" keyName="leads" nextKey="interview"/>
    <Section title="Interview" keyName="interview" prev="leads" nextKey="formation"/>
    <Section title="Formation" keyName="formation" prev="interview" extra={(x)=><Button size="sm" onClick={()=>hire(x)}><UserPlus className="h-4 w-4 mr-1"/>Hire</Button>}/>

    <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} onSave={(lead)=>setPipeline((p)=>({...p,leads:[lead,...p.leads]}))}/>
  </div>);
};
/* ──────────────────────────────────────────────────────────────────────────
  Recruiters (list + Recruiter Information full screen)
────────────────────────────────────────────────────────────────────────── */
const Recruiters = ({ recruiters, setRecruiters, history, setHistory }) => {
  const [status, setStatus] = useState("active");
  const [infoId, setInfoId] = useState(null);

  const visible = recruiters.filter(r => {
    if (status==="all") return true;
    if (status==="inactive") return r.isInactive;
    return !r.isInactive;
  });

  const toggleInactive = (r) => {
    setRecruiters(list => list.map(x => x.id===r.id ? {...x, isInactive: !x.isInactive} : x));
  };

  const delRecruiter = (r) => {
    if (!confirm("Type DELETE to confirm permanent removal")) return;
    const code = prompt("Type your secure code to confirm deletion");
    if (code !== "DELETE123") return alert("Wrong code");
    setRecruiters(list => list.filter(x => x.id!==r.id));
    setHistory(list => list.filter(h => h.recruiterId!==r.id));
  };

  const rById = (id) => recruiters.find(r => r.id===id);

  const RecruiterInfo = ({ r }) => {
    if (!r) return null;
    const shifts = history.filter(h => h.recruiterId===r.id);

    const totalBoxes = shifts.reduce((s,h)=>s+(Number(h.box2_noDisc)||0)+(Number(h.box2_disc)||0)+(Number(h.box4_noDisc)||0)+(Number(h.box4_disc)||0),0);
    const totalScore = shifts.reduce((s,h)=>s+(Number(h.score)||0),0);
    const revenue = shifts.reduce((s,h)=>s+(Number(h.income)||0),0);

    return (
      <Dialog open={!!r} onOpenChange={()=>setInfoId(null)}>
        <DialogContent className="max-w-6xl">
          <DialogHeader><DialogTitle>Recruiter Information — {r.name}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="grid gap-3">
              <img src={r.photo || "/avatar.png"} alt="Recruiter" className="h-32 w-32 object-cover rounded-full"/>
              <div><Label>Name</Label><Input value={r.name} onChange={(e)=>setRecruiters(list=>list.map(x=>x.id===r.id?{...x,name:e.target.value}:x))}/></div>
              <div><Label>Phone</Label><Input value={r.phone} onChange={(e)=>setRecruiters(list=>list.map(x=>x.id===r.id?{...x,phone:e.target.value}:x))}/></div>
              <div><Label>Email</Label><Input value={r.email} onChange={(e)=>setRecruiters(list=>list.map(x=>x.id===r.id?{...x,email:e.target.value}:x))}/></div>
              <div><Label>Crewcode</Label><Input value={r.crewCode} onChange={(e)=>setRecruiters(list=>list.map(x=>x.id===r.id?{...x,crewCode:e.target.value}:x))}/></div>
              <div><Label>Role</Label><Input value={r.role} onChange={(e)=>setRecruiters(list=>list.map(x=>x.id===r.id?{...x,role:e.target.value}:x))}/></div>
            </div>

            <div className="grid gap-3">
              <div className="p-3 border rounded-lg">
                <div className="font-medium mb-1">This Month</div>
                <div>Boxes sold: {totalBoxes}</div>
                <div>Total score: {totalScore}</div>
                <div>Revenue generated: €{toMoney(revenue)}</div>
              </div>
              <div className="p-3 border rounded-lg overflow-y-auto max-h-96">
                <div className="font-medium mb-2">All Shifts</div>
                <table className="min-w-full text-sm">
                  <thead><tr>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Location</th>
                    <th className="p-2 text-right">Score</th>
                    <th className="p-2 text-right">Box2</th>
                    <th className="p-2 text-right">Box4</th>
                  </tr></thead>
                  <tbody>
                    {shifts.map((h,i)=>(
                      <tr key={i} className="border-t">
                        <td className="p-2">{fmtUK(h.dateISO)}</td>
                        <td className="p-2">{h.location||"—"}</td>
                        <td className="p-2 text-right">{h.score ?? "—"}</td>
                        <td className="p-2 text-right">
                          {(Number(h.box2_noDisc)||0)+(Number(h.box2_disc)||0)}
                        </td>
                        <td className="p-2 text-right">
                          {(Number(h.box4_noDisc)||0)+(Number(h.box4_disc)||0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="grid gap-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Recruiters</h3>
        <div className="flex gap-2 items-center">
          <Label>Status</Label>
          <select className="h-10 border rounded-md px-2" value={status} onChange={(e)=>setStatus(e.target.value)}>
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
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Role</th>
              <th className="p-3 text-left">Crewcode</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(r=>(
              <tr key={r.id} className="border-t">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">{r.role}</td>
                <td className="p-3">{r.crewCode}</td>
                <td className="p-3 flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={()=>setInfoId(r.id)}>Info</Button>
                  <Button size="sm" variant="outline" onClick={()=>toggleInactive(r)}>
                    {r.isInactive ? "Activate" : "Deactivate"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={()=>delRecruiter(r)}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {infoId && <RecruiterInfo r={rById(infoId)}/>}
    </div>
  );
};
/* ──────────────────────────────────────────────────────────────────────────
  Planning — Teams are Zones; full-screen editor; centered day cards; no dup recruiters/day
────────────────────────────────────────────────────────────────────────── */

const ensureWeek = (state, weekISO) => {
  const safe = state && typeof state === "object" ? state : {};
  const base = safe[weekISO] && typeof safe[weekISO] === "object" ? safe[weekISO] : { days: {} };
  if (!base.days || typeof base.days !== "object") base.days = {};
  for (let i = 0; i < 7; i++) {
    const dateISO = fmtISO(addDays(parseISO(weekISO), i));
    if (!base.days[dateISO]) {
      // start empty; our team object is a zone container: { zone, project, shiftType, rows: [...] }
      base.days[dateISO] = { teams: [] };
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
    // normalize legacy structure to zone-based team
    day.teams = (day.teams || []).map(t => ({
      zone: t.zone ?? (Array.isArray(t.zones) ? (t.zones[0] || "") : (t.name || "")),
      project: t.project || "HF",
      shiftType: t.shiftType || "D2D",
      rows: (t.rows || []).map((row, idx) => ({ _rowKey: row?._rowKey ?? idx, ...row })),
    }));
    return day;
  };

  const rById = (id) => recruiters.find((r) => r.id === id);
  const multipliers = [
    { label: "100%", val: 1.0 }, { label: "125%", val: 1.25 },
    { label: "150%", val: 1.5 }, { label: "200%", val: 2.0 },
  ];
  const shiftTypes = [{ label: "Door-to-Door", val: "D2D" }, { label: "Events", val: "EVENT" }];

  // Edit Day modal (full-screen)
  const [editDateISO, setEditDateISO] = useState(null);
  const [draftDay, setDraftDay] = useState(null);

  const openEditDay = (dateISO) => {
    const d = clone(getDay(dateISO));
    d.teams = Array.isArray(d.teams) ? d.teams.map(team => ({ ...team, rows: (team.rows || []).map((row, idx) => ({ _rowKey: row?._rowKey ?? idx, ...row })) })) : [];
    setEditDateISO(dateISO);
    setDraftDay(d);
  };
  const closeEditDay = () => { setEditDateISO(null); setDraftDay(null); };

  // Helpers: used recruiters (to avoid duplicates within the same day)
  const usedRecruiterIds = (d) => {
    const set = new Set();
    (d?.teams || []).forEach(t => (t.rows || []).forEach(r => r.recruiterId && set.add(r.recruiterId)));
    return set;
  };

  // Team (Zone) mutations
  const addTeam = () =>
    setDraftDay(d => ({ ...d, teams: [...(d?.teams || []), { zone: "", project: "HF", shiftType: "D2D", rows: [] }] }));
  const delTeam = (ti) =>
    setDraftDay(d => ({ ...d, teams: (d?.teams || []).filter((_, i) => i !== ti) }));
  const setTeamField = (ti, patch) =>
    setDraftDay(d => { const teams = clone(d.teams || []); teams[ti] = { ...teams[ti], ...patch }; return { ...d, teams }; });

  // Rows (no zone column; zone is the team’s zone)
  const addRow = (ti) =>
    setDraftDay(d => {
      const teams = clone(d.teams || []);
      const nextKey = (teams[ti].rows?.length || 0);
      (teams[ti].rows ||= []).push({
        _rowKey: nextKey,
        recruiterId: "",
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
    setDraftDay(d => {
      const teams = clone(d.teams || []);
      const next = { ...teams[ti].rows[ri], ...patch };
      // Prevent duplicate recruiter across the entire day
      if (patch.recruiterId) {
        const used = usedRecruiterIds({ teams });
        // allow keeping the same recruiter on this row, but if selecting a new one that's already used, revert
        const alreadyUsed = used.has(patch.recruiterId) && teams[ti].rows[ri].recruiterId !== patch.recruiterId;
        if (alreadyUsed) {
          alert("This recruiter is already assigned today.");
          return { ...d }; // no change
        }
      }
      teams[ti].rows[ri] = next;
      return { ...d, teams };
    });

  // Save Day → planning + history upserts
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
        const zoneName = team.zone || "";
        (team.rows || []).forEach((row, idx) => {
          if (!row.recruiterId) return;
          const rec = rById(row.recruiterId);
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

  // Day card preview — centered weekday & date; show only score number
  const DayCard = ({ i }) => {
    const dISO = fmtISO(addDays(parseISO(weekStart), i));
    const day = getDay(dISO);
    const weekday = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][i];

    return (
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-col items-center text-center">
            <span className="leading-tight">{weekday}</span>
            <span className="text-sm text-zinc-500 leading-tight">{fmtUK(dISO)}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0">
          {(day.teams || []).length > 0 ? (
            day.teams.map((t, ti) => (
              <div key={ti} className="border rounded-lg p-2">
                <div className="font-medium">{t.zone || "—"} <span className="text-xs text-zinc-600">• {t.project || "HF"}</span></div>
                {(t.rows || []).length > 0 ? (
                  <ul className="text-sm space-y-1 mt-1">
                    {t.rows.map((row, ri) => {
                      const rec = rById(row.recruiterId);
                      // Prefer draft row score if we're rendering live; otherwise check history row
                      const histRow = history.find(h => h.recruiterId===row.recruiterId && h.dateISO===dISO && (h._rowKey||0)===(row._rowKey||ri));
                      const sc = (row.score !== "" && row.score != null) ? Number(row.score) : (typeof histRow?.score === "number" ? Number(histRow.score) : undefined);
                      return (
                        <li key={ri} className="flex items-center justify-between">
                          <span>{rec?.name || ""}</span>
                          <span className="text-base font-medium" style={{ color: sc != null ? scoreColor(sc) : undefined }}>
                            {sc != null ? sc : ""}
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

      {/* Full-screen Edit Day with wide inputs and scroll */}
      <Dialog open={!!editDateISO} onOpenChange={(open) => { if (!open) closeEditDay(); }}>
        <DialogContent className="max-w-[92vw] w-[92vw] h-[86vh] p-4">
          <DialogHeader>
            <DialogTitle>Edit Day — {fmtUK(editDateISO || "")}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 h-[calc(86vh-5rem)] overflow-y-auto pr-1">
            {(draftDay?.teams || []).map((t, ti) => {
              const used = usedRecruiterIds(draftDay);
              return (
                <div key={ti} className="border rounded-xl p-3">
                  {/* Team header = Zone + project/type, no team name */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <div className="grid gap-1">
                      <Label>Zone</Label>
                      <Input className="h-9" value={t.zone} onChange={(e) => setTeamField(ti, { zone: e.target.value })} />
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
                      <Button variant="destructive" size="sm" onClick={()=>delTeam(ti)}><X className="h-4 w-4 mr-1"/> Remove</Button>
                    </div>
                  </div>

                  {/* Rows — no zone column; wider inputs */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-zinc-50">
                        <tr>
                          <th className="p-2 text-left">Recruiter</th>
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
                              <select
                                className="h-9 border rounded-md px-2 min-w-52"
                                value={row.recruiterId}
                                onChange={(e) => setRow(ti, ri, { recruiterId: e.target.value })}
                              >
                                <option value="">Select…</option>
                                {recruiters.map((r) => {
                                  const disabled = used.has(r.id) && r.id !== row.recruiterId;
                                  return (
                                    <option key={r.id} value={r.id} disabled={disabled}>
                                      {r.name}{disabled ? " (already assigned)" : ""}
                                    </option>
                                  );
                                })}
                              </select>
                            </td>
                            <td className="p-2 text-right">
                              <Input className="w-28 h-9 text-right" inputMode="numeric"
                                value={row.hours ?? ""} onChange={(e) => setRow(ti, ri, { hours: e.target.value })} />
                            </td>
                            <td className="p-2 text-right">
                              <select className="h-9 border rounded-md px-2"
                                value={row.commissionMult ?? ""}
                                onChange={(e) => setRow(ti, ri, { commissionMult: e.target.value ? Number(e.target.value) : "" })}
                              >
                                <option value="">—</option>
                                {multipliers.map((m) => (<option key={m.val} value={m.val}>{m.label}</option>))}
                              </select>
                            </td>
                            <td className="p-2 text-right">
                              <Input className="w-28 h-9 text-right" inputMode="numeric"
                                value={row.score ?? ""} onChange={(e) => setRow(ti, ri, { score: e.target.value })} />
                            </td>
                            <td className="p-2 text-right">
                              <Input className="w-28 h-9 text-right" inputMode="numeric"
                                value={row.box2_noDisc ?? ""} onChange={(e) => setRow(ti, ri, { box2_noDisc: e.target.value })} />
                            </td>
                            <td className="p-2 text-right">
                              <Input className="w-28 h-9 text-right" inputMode="numeric"
                                value={row.box2_disc ?? ""} onChange={(e) => setRow(ti, ri, { box2_disc: e.target.value })} />
                            </td>
                            <td className="p-2 text-right">
                              <Input className="w-28 h-9 text-right" inputMode="numeric"
                                value={row.box4_noDisc ?? ""} onChange={(e) => setRow(ti, ri, { box4_noDisc: e.target.value })} />
                            </td>
                            <td className="p-2 text-right">
                              <Input className="w-28 h-9 text-right" inputMode="numeric"
                                value={row.box4_disc ?? ""} onChange={(e) => setRow(ti, ri, { box4_disc: e.target.value })} />
                            </td>
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
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3">
            <Button variant="outline" size="sm" onClick={addTeam}><Plus className="h-4 w-4 mr-1" /> Add Zone</Button>
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
  Wages — monthly wages + bonus; details show Location (no Base column)
────────────────────────────────────────────────────────────────────────── */

const rookieCommission = (box2) => {
  const t = {0:0,1:0,2:25,3:40,4:70,5:85,6:120,7:135,8:175,9:190,10:235};
  if (box2 <= 10) return t[box2] ?? 0;
  return 235 + (box2 - 10) * 15;
};

const Wages = ({ recruiters, history }) => {
  const [payMonth, setPayMonth] = useState(currentMonthKey());
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState({}); // recruiterId => bool

  const monthShift = (ym, delta) => {
    const [y,m] = ym.split("-").map(Number);
    const d = new Date(Date.UTC(y,m-1,1)); d.setUTCMonth(d.getUTCMonth()+delta);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
  };

  // Wages are for previous month relative to payday month; Bonus is the month before that
  const workMonth = prevMonthKey(payMonth);
  const commMonth = prevMonthKey(workMonth);
  const inMonth = (iso, ym) => monthKey(iso) === ym;

  const settings = load(K.settings, DEFAULT_SETTINGS);

  const rows = recruiters
    .filter(r => status==="all" ? true : status==="active" ? !r.isInactive : !!r.isInactive)
    .map(r => {
      const hRows = history.filter(x => x.recruiterId===r.id && inMonth(x.dateISO, workMonth));
      const rolesWorked = Array.from(new Set(hRows.map(x => x.roleAtShift || r.role || "Rookie")));
      // hours + wages per row using rate bands (fallback to role default hours)
      const hourRows = hRows.map(row => {
        const hrs = (row.hours != null ? Number(row.hours) : roleHoursDefault(row.roleAtShift||r.role||"Rookie"));
        const rate = rateForDate(settings, row.dateISO);
        const wages = hrs * rate;
        return { ...row, hrs, rate, wages };
      });
      const hours = hourRows.reduce((s,rr)=>s+rr.hrs,0);
      const wages = hourRows.reduce((s,rr)=>s+rr.wages,0);

      // Bonus (commission) comes from month before workMonth
      const cRowsRaw = history.filter(x => x.recruiterId===r.id && inMonth(x.dateISO, commMonth));
      const cRows = cRowsRaw.map(row => {
        const b2 = (Number(row.box2_noDisc)||0)+(Number(row.box2_disc)||0);
        const mult = row.commissionMult ?? roleMultiplierDefault(row.roleAtShift||r.role||"Rookie");
        const bonus = rookieCommission(b2) * mult;
        return { ...row, b2, mult, bonus };
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
    a.href=url; a.download=`wages_${payMonth}.csv`; a.click(); URL.revokeObjectURL(url);
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
                          {/* Bonus breakdown — show Location instead of Base */}
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
  Finances — Yearly drill-down: Year → Month → ISO Week# → Day → Shifts
  Keep columns: Wages (left of Income) and Profit (right of Income)
  De-duplicate rows by (recruiterId,dateISO,_rowKey) to avoid accidental dupes
────────────────────────────────────────────────────────────────────────── */

const Finances = ({ history }) => {
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [openMonth, setOpenMonth] = useState({}); // "YYYY-MM" => bool
  const [openWeek, setOpenWeek] = useState({});   // weekStartISO => bool
  const [openDay, setOpenDay] = useState({});     // dateISO => bool

  const settings = load(K.settings, DEFAULT_SETTINGS);
  const matrix = settings.conversionType || DEFAULT_SETTINGS.conversionType;

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

  // filter to selected year and de-duplicate
  const rowsYear = (() => {
    const start = `${year}-01-01`, end = `${year}-12-31`;
    const rows = history.filter(h => h.dateISO >= start && h.dateISO <= end);
    const map = new Map();
    rows.forEach(r => {
      const key = `${r.recruiterId}|${r.dateISO}|${r._rowKey ?? -1}`;
      if (!map.has(key)) map.set(key, r);
    });
    return Array.from(map.values());
  })();

  // group by month -> week (Mon start) -> day
  const byMonth = {};
  rowsYear.forEach(r=>{
    const ym = monthKey(r.dateISO);
    byMonth[ym] ||= [];
    byMonth[ym].push(r);
  });

  const ymKeys = Object.keys(byMonth).sort(); // chronological

  const summarize = (rows) => {
    let income=0,wages=0,score=0,box2=0,box4=0,shifts=0, detail=[];
    detail = rows.map(r=>{
      const inc = calcIncome(r), wag = calcWages(r);
      const { b2, b4 } = boxTotals(r);
      return { ...r, score:Number(r.score)||0, income:inc, wages:wag, profit:inc-wag, b2, b4 };
    });
    detail.forEach(r=>{ income+=r.income; wages+=r.wages; score+=r.score; box2+=r.b2; box4+=r.b4; shifts++; });
    return { income, wages, profit: income-wages, score, box2, box4, shifts, detail };
  };
  const profitColor = (v) => (v>0 ? "#10b981" : v<0 ? "#ef4444" : undefined);

  const yearTotals = summarize(rowsYear);

  return (
    <div className="grid gap-4">
      {/* Year picker */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label>Year</Label>
          <select className="h-10 border rounded-md px-2" value={year}
            onChange={(e)=>setYear(Number(e.target.value))}>
            {Array.from({length:5}).map((_,i)=>{
              const y = new Date().getUTCFullYear() - 2 + i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
        <div className="text-sm text-muted-foreground">
          Wages €{toMoney(yearTotals.wages)} • Income €{toMoney(yearTotals.income)} • <span style={{color:profitColor(yearTotals.profit)}}>Profit €{toMoney(yearTotals.profit)}</span>
        </div>
      </div>

      {ymKeys.length===0 ? (
        <div className="text-sm text-muted-foreground">No data for {year}</div>
      ) : (
        ymKeys.map(ym => {
          const monthRows = byMonth[ym];
          // group month into weeks
          const byWeek = {};
          monthRows.forEach(r=>{
            const wkStart = fmtISO(startOfWeekMon(parseISO(r.dateISO)));
            (byWeek[wkStart] ||= []).push(r);
          });
          const wkKeys = Object.keys(byWeek).sort();

          const monthSum = summarize(monthRows);
          return (
            <div key={ym} className="border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-50">
                <div className="font-medium">{monthLabel(ym)}</div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">Shifts {monthSum.shifts}</div>
                  <div className="text-sm">Wages €{toMoney(monthSum.wages)}</div>
                  <div className="text-sm">Income €{toMoney(monthSum.income)}</div>
                  <div className="text-sm" style={{color:profitColor(monthSum.profit)}}>Profit €{toMoney(monthSum.profit)}</div>
                  <Button size="sm" variant="outline" onClick={()=>setOpenMonth(s=>({...s,[ym]:!s[ym]}))}>
                    {openMonth[ym] ? "Hide" : "Expand"}
                  </Button>
                </div>
              </div>

              {openMonth[ym] && (
                <div className="p-3">
                  {/* Weeks table */}
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-zinc-50"><tr>
                        <th className="p-2 text-left">Week</th>
                        <th className="p-2 text-right">Shifts</th>
                        <th className="p-2 text-right">Score</th>
                        <th className="p-2 text-right">Box2</th>
                        <th className="p-2 text-right">Box4</th>
                        <th className="p-2 text-right">Wages</th>
                        <th className="p-2 text-right">Income</th>
                        <th className="p-2 text-right">Profit</th>
                        <th className="p-2 text-right">Days</th>
                      </tr></thead>
                      <tbody>
                        {wkKeys.map(wk=>{
                          const wkRows = byWeek[wk];
                          // group into days
                          const byDay = {};
                          wkRows.forEach(r=>{ (byDay[r.dateISO] ||= []).push(r); });
                          const dayKeys = Object.keys(byDay).sort();
                          const wkSum = summarize(wkRows);
                          return (
                            <React.Fragment key={wk}>
                              <tr className="border-t">
                                <td className="p-2">Week {weekNumberISO(parseISO(wk))}</td>
                                <td className="p-2 text-right">{wkSum.shifts}</td>
                                <td className="p-2 text-right">{wkSum.score}</td>
                                <td className="p-2 text-right">{wkSum.box2}</td>
                                <td className="p-2 text-right">{wkSum.box4}</td>
                                <td className="p-2 text-right">{toMoney(wkSum.wages)}</td>
                                <td className="p-2 text-right">{toMoney(wkSum.income)}</td>
                                <td className="p-2 text-right" style={{color:profitColor(wkSum.profit)}}>{toMoney(wkSum.profit)}</td>
                                <td className="p-2 text-right">
                                  <Button size="sm" variant="outline" onClick={()=>setOpenWeek(s=>({...s,[wk]:!s[wk]}))}>
                                    {openWeek[wk] ? "Hide" : "View"}
                                  </Button>
                                </td>
                              </tr>

                              {openWeek[wk] && (
                                <tr>
                                  <td colSpan={9} className="p-0">
                                    <div className="px-3 pb-3">
                                      {/* Days table */}
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
                                            {dayKeys.map(dk=>{
                                              const dSum = summarize(byDay[dk]);
                                              return (
                                                <React.Fragment key={dk}>
                                                  <tr className="border-t">
                                                    <td className="p-2">{fmtUK(dk)}</td>
                                                    <td className="p-2 text-right">{dSum.shifts}</td>
                                                    <td className="p-2 text-right">{dSum.score}</td>
                                                    <td className="p-2 text-right">{dSum.box2}</td>
                                                    <td className="p-2 text-right">{dSum.box4}</td>
                                                    <td className="p-2 text-right">{toMoney(dSum.wages)}</td>
                                                    <td className="p-2 text-right">{toMoney(dSum.income)}</td>
                                                    <td className="p-2 text-right" style={{color:profitColor(dSum.profit)}}>{toMoney(dSum.profit)}</td>
                                                    <td className="p-2 text-right">
                                                      <Button size="sm" variant="outline" onClick={()=>setOpenDay(s=>({...s,[dk]:!s[dk]}))}>
                                                        {openDay[dk] ? "Hide" : "Details"}
                                                      </Button>
                                                    </td>
                                                  </tr>

                                                  {openDay[dk] && (
                                                    <tr>
                                                      <td colSpan={9} className="p-0">
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
                                                                {dSum.detail.map((r,i)=>(
                                                                  <tr key={`${r.recruiterId||i}_${r._rowKey||i}`} className="border-t">
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
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────────────
  Settings (gated) — projects, conversion matrix, hourly rate bands
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

  const addBand = () => setLocal(s => ({...s, rateBands:[...s.rateBands, {startISO: fmtISO(new Date()), rate: 16}]}));
  const setBand = (i, patch) => setLocal(s => { const bands=[...s.rateBands]; bands[i]={...bands[i],...patch}; return {...s, rateBands:bands}; });
  const delBand = (i) => setLocal(s => ({...s, rateBands: s.rateBands.filter((_,idx)=>idx!==i)}));

  if (!unlocked) return <Gate storageKey={SETTINGS_SESSION_KEY} label="Unlock Settings" onOk={()=>setUnlocked(true)} />;

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
            {local.rateBands.sort((a,b)=> a.startISO<b.startISO?1:-1).map((b,i)=>(
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
  App — root hookup
────────────────────────────────────────────────────────────────────────── */

export default function App(){
  // keep existing versioning behavior without wiping user data
  useEffect(()=>{
    const v = localStorage.getItem(VERSION_KEY);
    if (v!==DATA_VERSION) localStorage.setItem(VERSION_KEY, DATA_VERSION);
  },[]);

  const [authed, setAuthed] = useState(!!localStorage.getItem(AUTH_SESSION_KEY));
  const [tab,setTab]=useState("planning");

  const [settings, setSettings]   = useState(load(K.settings, DEFAULT_SETTINGS));
  const [pipeline, setPipeline]   = useState(load(K.pipeline, {leads:[],interview:[],formation:[]}));
  const [recruiters, setRecruiters] = useState(load(K.recruiters, []));
  const [planning, setPlanning]   = useState(load(K.planning, {}));
  const [history, setHistory]     = useState(load(K.history, []));

  useEffect(()=>save(K.settings, settings),[settings]);
  useEffect(()=>save(K.pipeline, pipeline),[pipeline]);
  useEffect(()=>save(K.recruiters, recruiters),[recruiters]);
  useEffect(()=>save(K.planning, planning),[planning]);
  useEffect(()=>save(K.history, history),[history]);

  // Auth gate
  if (!authed) return <Login onOk={()=>setAuthed(true)} />;
  const onLogout = () => { localStorage.removeItem(AUTH_SESSION_KEY); setAuthed(false); };

  // Hire from Formation (always Rookie)
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

  const badge = tab==="planning" ? `Week ${weekNumberISO(startOfWeekMon(new Date()))}` : "";

  return (
    <Shell tab={tab} setTab={setTab} onLogout={onLogout} weekBadge={badge}>
      {tab==="inflow" && <Inflow pipeline={pipeline} setPipeline={setPipeline} onHire={onHire} />}
      {tab==="recruiters" && <Recruiters recruiters={recruiters} setRecruiters={setRecruiters} history={history} setHistory={setHistory} />}
      {tab==="planning" && <Planning recruiters={recruiters} planning={planning} setPlanning={setPlanning} history={history} setHistory={setHistory} />}

      {tab==="salary" && (
        localStorage.getItem(SALARY_SESSION_KEY)
          ? <Wages recruiters={recruiters} history={history} />
          : <Gate storageKey={SALARY_SESSION_KEY} label="Re-enter credentials for Wages" onOk={()=>{}} />
      )}

      {tab==="finances" && (
        localStorage.getItem(FINANCE_SESSION_KEY)
          ? <Finances history={history} />
          : <Gate storageKey={FINANCE_SESSION_KEY} label="Re-enter credentials for Finances" onOk={()=>{}} />
      )}

      {tab==="settings" && (
        localStorage.getItem(SETTINGS_SESSION_KEY)
          ? <Settings settings={settings} setSettings={setSettings} />
          : <Gate storageKey={SETTINGS_SESSION_KEY} label="Re-enter credentials for Settings" onOk={()=>{}} />
      )}
    </Shell>
  );
}
