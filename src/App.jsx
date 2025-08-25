import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Upload,
  Download,
  Calendar as CalendarIcon,
  Clock,
  Phone,
  User,
  CheckCircle2,
  ChevronRight,
  Trash2,
  Edit3,
  LogOut,
  KeyRound,
  Shield,
  Settings as SettingsIcon,
  MessageCircle,
  Info,
} from "lucide-react";

/**
 * Proago Recruitment – minimal, stable build
 * - 3 stages (Lead → Interview → Formation) with accumulation
 * - Add lead + inline editor → promote when Result = "Yes"
 * - CSV + Indeed-JSON import (flexible fields)
 * - CSV export
 * - Login gate + Remember me + simple rate limiter (3 tries / 15m)
 * - Settings to store an optional OpenAI API key locally
 * - Lora font for the product title
 */

// ——— Brand ———
const BRAND_COLORS = { primary: "#d9010b", secondary: "#eb2a2a", accent: "#fca11c" };
const ICON_PATH = "/proago-icon.png";

// ——— Auth ———
const AUTH_USER = "Administrator";
const AUTH_PASS = "Sergio R4mos";
const AUTH_PERSIST = "proago_auth_persist_v1"; // "1" saved in localStorage
const AUTH_SESSION = "proago_auth_session_v1"; // "1" saved in sessionStorage
const AUTH_FAILS = "proago_auth_fails_v1";     // {count, until}

// ——— Storage Keys ———
const LS_CANDIDATES = "proago_pipeline_v2";    // array
const LS_SETTINGS   = "proago_settings_v1";     // { openaiKey? }

// ——— Data model ———
const STAGES = { LEAD: "LEAD", INTERVIEW: "INTERVIEW", FORMATION: "FORMATION" };
const nowISO = () => new Date().toISOString();
const uid = () => (Math.random().toString(36).slice(2,10) + Date.now().toString(36)).toUpperCase();

// ——— Helpers ———
const normalize = (s) => (s||"").toString().trim().toLowerCase();
const pickFrom = (obj, keys, fallback="") => {
  for (const k of keys) { if (obj && obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]); }
  return fallback;
};

function useLora() {
  useEffect(() => {
    const id = "lora-font-link";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Lora:wght@400;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);
}

function loadCandidates(){
  try { const raw = localStorage.getItem(LS_CANDIDATES); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveCandidates(arr){ localStorage.setItem(LS_CANDIDATES, JSON.stringify(arr)); }

// ——— CSV helpers ———
function toCSV(rows){
  const headers = ["id","stage","createdAt","firstName","lastName","phone","callsQty","callAttempts","leadResult","interviewDate","interviewTime","interviewResult","formationDate","formationTime","formationResult"];
  const esc = (v)=>{ if(v==null) return ""; const s=String(v); return /[",\n]/.test(s) ? '"'+s.replaceAll('"','""')+'"' : s; };
  const lines = [headers.join(",")];
  for(const r of rows){ lines.push(headers.map(h=>esc(r[h])).join(",")); }
  return lines.join("\n");
}
function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(Boolean);
  if(!lines.length) return {headers:[], rows:[]};
  const split = (line)=>{
    const out=[]; let cur=""; let q=false; for(let i=0;i<line.length;i++){ const ch=line[i];
      if(ch==='"'){ if(q && line[i+1]==='"'){ cur+='"'; i++; } else { q=!q; } }
      else if(ch===',' && !q){ out.push(cur); cur=""; } else { cur+=ch; }
    } out.push(cur); return out;
  };
  const headers = split(lines[0]).map(h=>normalize(h));
  const rows = lines.slice(1).map(l=>split(l));
  return { headers, rows };
}

// ——— UI atoms ———
const Button = ({className="", style, children, ...rest}) => (
  <button {...rest}
    style={{background:BRAND_COLORS.primary, color:"white", border:`1px solid ${BRAND_COLORS.secondary}`, ...style}}
    className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm active:scale-[.99] disabled:opacity-60 ${className}`}
  >{children}</button>
);
const GhostButton = ({className="", style, children, ...rest}) => (
  <button {...rest}
    style={{borderColor:BRAND_COLORS.secondary, ...style}}
    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-slate-700 hover:bg-slate-50 active:scale-[.99] disabled:opacity-50 ${className}`}
  >{children}</button>
);
const Input = (props) => <input {...props} className={`px-3 py-2 rounded-xl border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none bg-white text-slate-800 ${props.className||""}`} />;
const Select = ({className,children,...rest}) => <select {...rest} className={`px-3 py-2 rounded-xl border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none bg-white text-slate-800 ${className||""}`}>{children}</select>;
const Field  = ({label,hint,children}) => (
  <label className="flex flex-col gap-1">
    <span className="text-sm font-medium text-slate-700">{label}</span>
    {children}
    {hint && <span className="text-xs text-slate-500">{hint}</span>}
  </label>
);
const SectionCard = ({title,subtitle,right,children}) => (
  <div className="bg-white/70 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
    {children}
  </div>
);

// ——— Cards ———
function CandidateHeader({ c }){
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><User className="w-5 h-5 text-slate-600"/></div>
      <div>
        <div className="font-medium text-slate-800">{c.firstName} {c.lastName}</div>
        <div className="text-sm text-slate-500">{c.phone || "—"}</div>
      </div>
    </div>
  );
}

function LeadCard({ c, onUpdate, onDelete, onPromote }){
  return (
    <div className="border border-slate-200 rounded-2xl p-3 bg-white/80">
      <CandidateHeader c={c}/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
        <div className="flex items-center gap-2 text-sm text-slate-700"><Phone className="w-4 h-4"/> Calls: <span className="font-medium">{c.callsQty ?? 0}</span></div>
        <div className="flex items-center gap-2 text-sm text-slate-700">Attempts: <span className="font-medium">{c.callAttempts ?? 1}</span></div>
        <div className="flex items-center gap-2 text-sm text-slate-700">Result: <span className="font-medium">{c.leadResult ?? "Pending"}</span></div>
        <div className="text-xs text-slate-500">Created {new Date(c.createdAt).toLocaleString()}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
        <Field label="Calls quantity"><Input type="number" min={0} value={c.callsQty||0} onChange={e=>onUpdate({...c,callsQty:Number(e.target.value)||0})}/></Field>
        <Field label="Call attempts (1/2/3)"><Select value={String(c.callAttempts||1)} onChange={e=>onUpdate({...c,callAttempts:Number(e.target.value)||1})}><option value="1">1</option><option value="2">2</option><option value="3">3</option></Select></Field>
        <Field label="Lead result"><Select value={c.leadResult||"Pending"} onChange={e=>onUpdate({...c,leadResult:e.target.value})}><option>Pending</option><option>Yes</option><option>No</option></Select></Field>
      </div>
      <div className="flex justify-between items-center mt-3">
        <GhostButton onClick={onPromote} disabled={c.leadResult!=="Yes"}><CheckCircle2 className="w-4 h-4"/> Move to Interview</GhostButton>
        <GhostButton onClick={onDelete}><Trash2 className="w-4 h-4"/>Delete</GhostButton>
      </div>
    </div>
  );
}

function InterviewEditor({ c, onUpdate }){
  const [d,setD]=useState({interviewDate:c.interviewDate||"", interviewTime:c.interviewTime||"", interviewResult:c.interviewResult||"Pending"});
  useEffect(()=>setD({interviewDate:c.interviewDate||"", interviewTime:c.interviewTime||"", interviewResult:c.interviewResult||"Pending"}),[c.id]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <Field label="Interview date"><Input type="date" value={d.interviewDate} onChange={e=>setD(s=>({...s,interviewDate:e.target.value}))}/></Field>
      <Field label="Interview time"><Input type="time" value={d.interviewTime} onChange={e=>setD(s=>({...s,interviewTime:e.target.value}))}/></Field>
      <Field label="Result"><Select value={d.interviewResult} onChange={e=>setD(s=>({...s,interviewResult:e.target.value}))}><option>Pending</option><option>Yes</option><option>No</option></Select></Field>
      <div className="md:col-span-3 flex justify-end gap-2">
        <GhostButton onClick={()=>onUpdate({...c,...d})}><Edit3 className="w-4 h-4"/>Save</GhostButton>
        <Button onClick={()=>onUpdate({...c,...d, stage: d.interviewResult === "Yes" ? STAGES.FORMATION : c.stage})}><ChevronRight className="w-4 h-4"/>Move forward if Yes</Button>
      </div>
    </div>
  );
}
function InterviewCard({ c, onUpdate, onDelete }){
  return (
    <div className="border border-slate-200 rounded-2xl p-3 bg-white/80">
      <CandidateHeader c={c}/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
        <div className="flex items-center gap-2 text-sm text-slate-700"><CalendarIcon className="w-4 h-4"/> {c.interviewDate||"—"}</div>
        <div className="flex items-center gap-2 text-sm text-slate-700"><Clock className="w-4 h-4"/> {c.interviewTime||"—"}</div>
        <div className="flex items-center gap-2 text-sm text-slate-700">Result: <span className="font-medium">{c.interviewResult||"Pending"}</span></div>
      </div>
      <div className="mt-3"><InterviewEditor c={c} onUpdate={onUpdate}/></div>
      <div className="flex justify-end mt-2"><GhostButton onClick={onDelete}><Trash2 className="w-4 h-4"/>Delete</GhostButton></div>
    </div>
  );
}

function FormationEditor({ c, onUpdate }){
  const [d,setD]=useState({formationDate:c.formationDate||"", formationTime:c.formationTime||"", formationResult:c.formationResult||"Pending"});
  useEffect(()=>setD({formationDate:c.formationDate||"", formationTime:c.formationTime||"", formationResult:c.formationResult||"Pending"}),[c.id]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <Field label="Formation date"><Input type="date" value={d.formationDate} onChange={e=>setD(s=>({...s,formationDate:e.target.value}))}/></Field>
      <Field label="Formation time"><Input type="time" value={d.formationTime} onChange={e=>setD(s=>({...s,formationTime:e.target.value}))}/></Field>
      <Field label="Result"><Select value={d.formationResult} onChange={e=>setD(s=>({...s,formationResult:e.target.value}))}><option>Pending</option><option>Yes</option><option>No</option></Select></Field>
      <div className="md:col-span-3 flex justify-end gap-2"><GhostButton onClick={()=>onUpdate({...c,...d})}><Edit3 className="w-4 h-4"/>Save</GhostButton></div>
    </div>
  );
}
function FormationCard({ c, onUpdate, onDelete }){
  return (
    <div className="border border-slate-200 rounded-2xl p-3 bg-white/80">
      <CandidateHeader c={c}/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
        <div className="flex items-center gap-2 text-sm text-slate-700"><CalendarIcon className="w-4 h-4"/> {c.formationDate||"—"}</div>
        <div className="flex items-center gap-2 text-sm text-slate-700"><Clock className="w-4 h-4"/> {c.formationTime||"—"}</div>
        <div className="flex items-center gap-2 text-sm text-slate-700">Result: <span className="font-medium">{c.formationResult||"Pending"}</span></div>
      </div>
      <div className="mt-3"><FormationEditor c={c} onUpdate={onUpdate}/></div>
      <div className="flex justify-end mt-2"><GhostButton onClick={onDelete}><Trash2 className="w-4 h-4"/>Delete</GhostButton></div>
    </div>
  );
}

// ——— Importers ———
function importCSVFile(file, setCandidates){
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result||"");
      const {headers, rows} = parseCSV(text);
      const H = headers; // already normalized
      const idx = (keys,row) => { for(let i=0;i<H.length;i++){ if(keys.includes(H[i])) return row[i]; } return ""; };
      const list = rows.map(row => ({
        id: uid(),
        stage: STAGES.LEAD,
        createdAt: nowISO(),
        firstName: idx(["first name","firstname","givenname"],row) || "",
        lastName:  idx(["last name","lastname","surname"],row) || "",
        phone:     idx(["phone","phone number","phonenumber"],row) || "",
        callsQty: Number(idx(["callsqty","calls quantity"],row))||0,
        callAttempts: Number(idx(["callattempts","attempts"],row))||1,
        leadResult: idx(["leadresult","result"],row) || "Pending",
        interviewDate: idx(["interview date"],row) || "",
        interviewTime: idx(["interview time"],row) || "",
        interviewResult: idx(["interview result"],row) || "Pending",
        formationDate: idx(["formation date"],row) || "",
        formationTime: idx(["formation time"],row) || "",
        formationResult: idx(["formation result"],row) || "Pending",
      }));
      // Append, do NOT overwrite (so lists accumulate)
      setCandidates(prev => [...prev, ...list]);
    } catch {
      alert("Failed to import CSV");
    }
  };
  reader.readAsText(file);
}

function importIndeedJSONFile(file, setCandidates){
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result||"{}"));
      const appl = data.applicant || data.candidate || data || {};

      // Flexible name resolution
      let firstName = pickFrom(appl,["first_name","firstname","given_name"],"").trim();
      let lastName  = pickFrom(appl,["last_name","lastname","family_name"],"").trim();
      const full    = pickFrom(appl,["fullName","name"],"").trim();
      if(!firstName && full){
        const parts = full.split(/\s+/);
        firstName = parts.slice(0,-1).join(" ") || parts[0] || "";
        lastName  = parts.slice(-1).join(" ") || "";
      }

      const phone = pickFrom(appl,["phoneNumber","phone","phone_number"],"").trim();
      const createdAtRaw = data.application_date || data.applied_on || data.created_at || data.createdAt || appl.created_at;
      const createdAt = createdAtRaw ? new Date(createdAtRaw).toISOString() : nowISO();

      const lead = { id: uid(), stage: STAGES.LEAD, createdAt, firstName, lastName, phone, callsQty:0, callAttempts:1, leadResult:"Pending" };
      // Append to list, don't replace
      setCandidates(prev => [lead, ...prev]);
    } catch {
      alert("Failed to import Indeed JSON");
    }
  };
  reader.readAsText(file);
}

// ——— Settings ———
function useSettings(){
  const [settings,setSettings] = useState(()=>{ try{ return JSON.parse(localStorage.getItem(LS_SETTINGS)||"{}"); } catch { return {}; } });
  useEffect(()=>{ localStorage.setItem(LS_SETTINGS, JSON.stringify(settings)); }, [settings]);
  return [settings,setSettings];
}

function SettingsModal({ open, onClose, settings, setSettings, onExportCSV }){
  const [key,setKey] = useState(settings.openaiKey||"");
  useEffect(()=>{ if(open){ setKey(settings.openaiKey||""); } },[open]);
  if(!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 z-50 p-4 flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-lg" onClick={e=>e.stopPropagation()}>
        <div className="p-4 border-b flex items-center gap-2"><SettingsIcon className="w-5 h-5"/><b>Settings</b></div>
        <div className="p-4 grid gap-4 text-sm">
          <div>
            <div className="font-medium">Assistant (OpenAI)</div>
            <div className="text-slate-600">Paste your API key. It is stored only on your device (localStorage) and used by the optional in-app assistant.</div>
            <Input placeholder="sk-..." value={key} onChange={e=>setKey(e.target.value)} />
            <div className="mt-2 flex gap-2">
              <GhostButton onClick={()=>setSettings({...settings, openaiKey:key})}><KeyRound className="w-4 h-4"/>Save key</GhostButton>
              <GhostButton onClick={()=>{setKey(""); setSettings(s=>({...s, openaiKey: ""}));}}>Remove</GhostButton>
            </div>
          </div>
          <div>
            <div className="font-medium">Data export</div>
            <GhostButton onClick={onExportCSV}><Download className="w-4 h-4"/>Export CSV</GhostButton>
          </div>
        </div>
        <div className="p-3 border-t text-right"><GhostButton onClick={onClose}>Close</GhostButton></div>
      </div>
    </div>
  );
}

// ——— Login ———
function checkLock(){
  try { const lock = JSON.parse(localStorage.getItem(AUTH_FAILS)||"null"); if (lock && lock.until && Date.now() < lock.until) return lock; } catch {}
  return null;
}
function recordFail(){
  const lock = checkLock(); if(lock){ localStorage.setItem(AUTH_FAILS, JSON.stringify({count:lock.count+1, until:lock.until})); return; }
  const prev = JSON.parse(localStorage.getItem(AUTH_FAILS)||"null");
  if(prev && prev.count>=2){ // 3rd fail triggers 15m lock
    const until = Date.now() + 15*60*1000;
    localStorage.setItem(AUTH_FAILS, JSON.stringify({count:prev.count+1, until}));
  } else {
    localStorage.setItem(AUTH_FAILS, JSON.stringify({count:(prev?.count||0)+1}));
  }
}
function handleLogin(username,password,remember){
  const lock = checkLock(); if(lock){ const mins=Math.ceil((lock.until-Date.now())/60000); alert(`Too many attempts. Try again in ${mins} min.`); return false; }
  if(username===AUTH_USER && password===AUTH_PASS){
    if(remember){ localStorage.setItem(AUTH_PERSIST,"1"); } else { sessionStorage.setItem(AUTH_SESSION,"1"); }
    localStorage.removeItem(AUTH_FAILS);
    return true;
  }
  recordFail(); alert("Invalid credentials"); return false;
}
function isAuthed(){ return localStorage.getItem(AUTH_PERSIST)==="1" || sessionStorage.getItem(AUTH_SESSION)==="1"; }
function logout(){ localStorage.removeItem(AUTH_PERSIST); sessionStorage.removeItem(AUTH_SESSION); }

function LoginScreen({ onSuccess }){
  useLora();
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [remember,setRemember]=useState(true);
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eb2a2a] to-[#fca11c] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <img src={ICON_PATH} alt="Proago" className="w-10 h-10 rounded-full"/>
          <div>
            <h1 className="text-xl font-bold" style={{color:BRAND_COLORS.primary, fontFamily:'Lora, serif'}}>Proago Recruitment</h1>
            <p className="text-xs text-slate-500">Luxembourg • EU‑compliant</p>
          </div>
        </div>
        <div className="grid gap-3">
          <Field label="Username"><Input value={u} onChange={e=>setU(e.target.value)} placeholder="Administrator"/></Field>
          <Field label="Password"><Input type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="Sergio R4mos"/></Field>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Remember me</label>
          <Button onClick={()=>{ if(handleLogin(u,p,remember)) onSuccess(); }} className="justify-center"><LogOut className="w-4 h-4"/> Enter</Button>
        </div>
        <p className="text-xs text-slate-500 mt-4">3 failed attempts lock for 15 minutes.</p>
      </div>
    </div>
  );
}

// ——— Main App ———
export default function App(){
  useLora();
  const [candidates,setCandidates] = useState(loadCandidates());
  const [showSettings,setShowSettings] = useState(false);
  const [settings,setSettings] = useSettings();
  const [authed,setAuthed] = useState(isAuthed());

  useEffect(()=>{ saveCandidates(candidates); },[candidates]);

  // Add Lead form
  const [leadForm,setLeadForm] = useState({ firstName:"", lastName:"", phone:"", callsQty:0, callAttempts:1, leadResult:"Pending" });
  const addLead = () => {
    const f = leadForm; if(!f.firstName && !f.lastName && !f.phone) { alert("Enter at least a name or phone"); return; }
    const newLead = { id:uid(), stage:STAGES.LEAD, createdAt:nowISO(), firstName:f.firstName.trim(), lastName:f.lastName.trim(), phone:f.phone.trim(), callsQty:Number(f.callsQty)||0, callAttempts:Number(f.callAttempts)||1, leadResult:f.leadResult||"Pending" };
    setCandidates(prev => [newLead, ...prev]); // accumulate
    setLeadForm({ firstName:"", lastName:"", phone:"", callsQty:0, callAttempts:1, leadResult:"Pending" });
  };

  // CRUD helpers
  const updateCandidate = (id, patch) => setCandidates(prev => prev.map(x => x.id===id? {...x, ...patch} : x));
  const removeCandidate = (id) => setCandidates(prev => prev.filter(x => x.id!==id));

  const leads = useMemo(()=>candidates.filter(c=>c.stage===STAGES.LEAD),[candidates]);
  const interviews = useMemo(()=>candidates.filter(c=>c.stage===STAGES.INTERVIEW),[candidates]);
  const formations = useMemo(()=>candidates.filter(c=>c.stage===STAGES.FORMATION),[candidates]);

  if(!authed) return <LoginScreen onSuccess={()=>setAuthed(true)}/>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eb2a2a] to-[#fca11c]">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <img src={ICON_PATH} alt="Proago" className="w-10 h-10 rounded-full"/>
            <h1 className="text-2xl md:text-3xl font-bold" style={{color:BRAND_COLORS.primary, fontFamily:'Lora, serif'}}>Proago Recruitment</h1>
          </div>
          <div className="flex items-center gap-2">
            <GhostButton onClick={()=>setShowSettings(true)}><SettingsIcon className="w-4 h-4"/>Settings</GhostButton>
            <GhostButton onClick={()=>{ logout(); setAuthed(false); }}><LogOut className="w-4 h-4"/>Logout</GhostButton>
          </div>
        </div>

        {/* Add Lead + Import/Export */}
        <SectionCard title="Add new lead" subtitle="Enter only what you have; blanks are OK" right={
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 cursor-pointer"><Upload className="w-4 h-4"/><span className="text-sm">Import CSV</span><input type="file" accept=".csv" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) importCSVFile(f,setCandidates); }}/></label>
            <label className="inline-flex items-center gap-2 cursor-pointer"><Upload className="w-4 h-4"/><span className="text-sm">Import Indeed JSON</span><input type="file" accept=".json" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) importIndeedJSONFile(f,setCandidates); }}/></label>
            <GhostButton onClick={()=>{ const csv=toCSV(candidates); const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='proago-export.csv'; a.click(); URL.revokeObjectURL(url); }}><Download className="w-4 h-4"/>Export CSV</GhostButton>
          </div>
        }>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
            <Field label="First name"><Input value={leadForm.firstName} onChange={e=>setLeadForm(s=>({...s,firstName:e.target.value}))}/></Field>
            <Field label="Last name"><Input value={leadForm.lastName} onChange={e=>setLeadForm(s=>({...s,lastName:e.target.value}))}/></Field>
            <Field label="Phone"><Input value={leadForm.phone} onChange={e=>setLeadForm(s=>({...s,phone:e.target.value}))}/></Field>
            <Field label="Calls qty"><Input type="number" min={0} value={leadForm.callsQty} onChange={e=>setLeadForm(s=>({...s,callsQty:Number(e.target.value)||0}))}/></Field>
            <Field label="Attempts (1/2/3)"><Select value={String(leadForm.callAttempts)} onChange={e=>setLeadForm(s=>({...s,callAttempts:Number(e.target.value)||1}))}><option value="1">1</option><option value="2">2</option><option value="3">3</option></Select></Field>
            <Field label="Lead result"><Select value={leadForm.leadResult} onChange={e=>setLeadForm(s=>({...s,leadResult:e.target.value}))}><option>Pending</option><option>Yes</option><option>No</option></Select></Field>
          </div>
          <div className="mt-3 text-right"><Button onClick={addLead}><Plus className="w-4 h-4"/>Add lead</Button></div>
        </SectionCard>

        {/* Pipeline columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <SectionCard title={`Leads (${leads.length})`}>
            <div className="space-y-3">
              {leads.map(c => (
                <LeadCard key={c.id} c={c}
                  onUpdate={(patch)=>updateCandidate(c.id,patch)}
                  onDelete={()=>removeCandidate(c.id)}
                  onPromote={()=>updateCandidate(c.id,{stage:STAGES.INTERVIEW})}
                />
              ))}
              {leads.length===0 && <div className="text-sm text-slate-500">No leads yet.</div>}
            </div>
          </SectionCard>

          <SectionCard title={`Interviews (${interviews.length})`}>
            <div className="space-y-3">
              {interviews.map(c => (
                <InterviewCard key={c.id} c={c}
                  onUpdate={(patch)=>updateCandidate(c.id,patch)}
                  onDelete={()=>removeCandidate(c.id)}
                />
              ))}
              {interviews.length===0 && <div className="text-sm text-slate-500">No interviews yet.</div>}
            </div>
          </SectionCard>

          <SectionCard title={`Formation (${formations.length})`}>
            <div className="space-y-3">
              {formations.map(c => (
                <FormationCard key={c.id} c={c}
                  onUpdate={(patch)=>updateCandidate(c.id,patch)}
                  onDelete={()=>removeCandidate(c.id)}
                />
              ))}
              {formations.length===0 && <div className="text-sm text-slate-500">No formation entries yet.</div>}
            </div>
          </SectionCard>
        </div>
      </div>

      <SettingsModal open={showSettings} onClose={()=>setShowSettings(false)} settings={settings} setSettings={setSettings} onExportCSV={()=>{ const csv=toCSV(candidates); const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='proago-export.csv'; a.click(); URL.revokeObjectURL(url); }} />
    </div>
  );
}
