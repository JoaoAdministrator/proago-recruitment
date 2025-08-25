
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
 * Proago Recruitment (PWA + Login + Compliance + Assistant)
 * --------------------------------------------------------
 * - Stages: Leads → Interviews → Formation
 * - Features: localStorage persistence, search, CSV export/import, Indeed JSON import
 * - Login gate (single credential): username="Administrator", password="Sergio R4mos"
 * - Security: "Remember me" toggle, rate limiter (3 tries / 15 minutes lockout)
 * - Compliance (EU/Lux): consent banner, privacy & terms modals, data export/delete, retention setting
 * - PWA: manifest + service worker injected at runtime; install on Android/iOS/macOS/Windows
 * - Assistant: in-app chatbot UI that can call OpenAI if you paste an API key in Settings
 * - Brand colors + icon usage
 */

// -------------------- Brand --------------------
const BRAND_COLORS = {
  primary: "#d9010b",
  secondary: "#eb2a2a",
  accent: "#fca11c",
};
const ICON_PATH = "/proago-icon.png"; // Put your icon at public/proago-icon.png when deploying

// -------------------- Auth --------------------
const AUTH_USER = "Administrator";
const AUTH_PASS = "Sergio R4mos"; // per request
const AUTH_KEY_PERSIST = "proago_auth_v1"; // localStorage flag (remember me)
const AUTH_KEY_SESSION = "proago_auth_session_v1"; // sessionStorage flag
const AUTH_FAILS_KEY = "proago_auth_fails_v1"; // {count, until}

// -------------------- Consent/Settings --------------------
const CONSENT_KEY = "proago_consent_v1"; // "accepted" | "dismissed"
const SETTINGS_KEY = "proago_settings_v1"; // { retentionDays, openaiKey? }

// -------------------- Data --------------------
const STAGES = { LEAD: "LEAD", INTERVIEW: "INTERVIEW", FORMATION: "FORMATION" };
const LS_KEY = "proago_recruitment_pipeline_v1";

function uid() {
  return (Math.random().toString(36).slice(2, 10) + Date.now().toString(36)).toUpperCase();
}
function loadCandidates() {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveCandidates(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

// CSV helpers
function toCSV(rows) {
  const headers = ["id","stage","createdAt","firstName","lastName","phone","callsQty","callAttempts","leadResult","interviewDate","interviewTime","interviewResult","formationDate","formationTime","formationResult"];
  const esc = (v)=>{ if(v==null) return ""; const s=String(v); return (s.includes('"')||s.includes(',')||s.includes('\n'))?'"'+s.replaceAll('"','""')+'"':s; };
  return [headers.join(",")].concat(rows.map(r=>headers.map(h=>esc(r[h])).join(","))).join("\n");
}
function download(filename, text, type="text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
}

// CSV parser
function parseCSV(text){
  const lines=text.split(/\r?\n/).filter(Boolean); if(!lines.length) return {headers:[],rows:[]};
  const re=/((?<!\\)\"(?:[^\"]|\\\")*\"|[^,])+/g; const hdr=(lines[0].match(re)||[]).map(h=>h.replace(/^\"|\"$/g,'').replace(/\"\"/g,'"'));
  const rows=lines.slice(1).map(l=>(l.match(re)||[]).map(c=>c.replace(/^\"|\"$/g,'').replace(/\"\"/g,'"'))); return {headers:hdr,rows};
}
const normalize=(s)=> (s||"").trim().toLowerCase();
const pick=(headers,row,vars)=>{ const i=headers.findIndex(h=>vars.includes(normalize(h))); return i>=0?row[i]:""; };

// -------------------- UI atoms --------------------
const Button=({className="",style,children,...rest})=> (
  <button {...rest} style={{background:BRAND_COLORS.primary,color:"white",border:`1px solid ${BRAND_COLORS.secondary}`,...style}}
    className={"inline-flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm active:scale-[.99] disabled:opacity-60 "+className}>{children}</button>
);
const GhostButton=({className="",style,children,...rest})=> (
  <button {...rest} style={{borderColor:BRAND_COLORS.secondary,...style}}
    className={"inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-slate-700 hover:bg-slate-50 active:scale-[.99] disabled:opacity-50 "+className}>{children}</button>
);
const Input=(props)=> <input {...props} className={"px-3 py-2 rounded-xl border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none text-slate-800 bg-white "+(props.className||"")} />;
const Select=({className,children,...rest})=> <select {...rest} className={"px-3 py-2 rounded-xl border border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 outline-none text-slate-800 bg-white "+(className||"")}>{children}</select>;
const Field=({label,hint,children})=> (<label className="flex flex-col gap-1"><span className="text-sm font-medium text-slate-700">{label}</span>{children}{hint&&<span className="text-xs text-slate-500">{hint}</span>}</label>);
const SectionCard=({title,subtitle,right,children})=> (
  <div className="bg-white/70 backdrop-blur border border-slate-200 rounded-2xl p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3 mb-3">
      <div><h2 className="text-xl font-semibold text-slate-800">{title}</h2>{subtitle&&<p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}</div>
      <div className="flex items-center gap-2">{right}</div>
    </div>{children}
  </div>
);

// -------------------- Cards & Editors --------------------
function CandidateHeader({ c }){
  return (<div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center"><User className="w-5 h-5 text-slate-600"/></div><div><div className="font-medium text-slate-800">{c.firstName} {c.lastName}</div><div className="text-sm text-slate-500">{c.phone||"—"}</div></div></div></div>);
}
function InterviewEditor({ c, onUpdate }){
  const [d,setD]=useState({interviewDate:c.interviewDate||"",interviewTime:c.interviewTime||"",interviewResult:c.interviewResult||"Pending"});
  useEffect(()=>setD({interviewDate:c.interviewDate||"",interviewTime:c.interviewTime||"",interviewResult:c.interviewResult||"Pending"}),[c.id]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <Field label="Interview date"><Input type="date" value={d.interviewDate} onChange={e=>setD(s=>({...s,interviewDate:e.target.value}))}/></Field>
      <Field label="Interview time"><Input type="time" value={d.interviewTime} onChange={e=>setD(s=>({...s,interviewTime:e.target.value}))}/></Field>
      <Field label="Result"><Select value={d.interviewResult} onChange={e=>setD(s=>({...s,interviewResult:e.target.value}))}><option>Pending</option><option>Yes</option><option>No</option></Select></Field>
      <div className="md:col-span-3 flex justify-end gap-2"><GhostButton onClick={()=>onUpdate({...c,...d})}><Edit3 className="w-4 h-4"/>Save</GhostButton><Button onClick={()=>onUpdate({...c,...d,stage:d.interviewResult==="Yes"?STAGES.FORMATION:c.stage})}><ChevronRight className="w-4 h-4"/>Move forward if Yes</Button></div>
    </div>
  );
}
function FormationEditor({ c, onUpdate }){
  const [d,setD]=useState({formationDate:c.formationDate||"",formationTime:c.formationTime||"",formationResult:c.formationResult||"Pending"});
  useEffect(()=>setD({formationDate:c.formationDate||"",formationTime:c.formationTime||"",formationResult:c.formationResult||"Pending"}),[c.id]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <Field label="Formation date"><Input type="date" value={d.formationDate} onChange={e=>setD(s=>({...s,formationDate:e.target.value}))}/></Field>
      <Field label="Formation time"><Input type="time" value={d.formationTime} onChange={e=>setD(s=>({...s,formationTime:e.target.value}))}/></Field>
      <Field label="Result"><Select value={d.formationResult} onChange={e=>setD(s=>({...s,formationResult:e.target.value}))}><option>Pending</option><option>Yes</option><option>No</option></Select></Field>
      <div className="md:col-span-3 flex justify-end gap-2"><GhostButton onClick={()=>onUpdate({...c,...d})}><Edit3 className="w-4 h-4"/>Save</GhostButton></div>
    </div>
  );
}
function LeadCard({ c, onUpdate, onDelete, onPromote }){
  return (
    <div className="border border-slate-200 rounded-2xl p-3 bg-white/80">
      <CandidateHeader c={c}/>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
        <div className="flex items-center gap-2 text-sm text-slate-700"><Phone className="w-4 h-4"/> Calls: <span className="font-medium">{c.callsQty??0}</span></div>
        <div className="flex items-center gap-2 text-sm text-slate-700">Attempts: <span className="font-medium">{c.callAttempts??1}</span></div>
        <div className="flex items-center gap-2 text-sm text-slate-700">Result: <span className="font-medium">{c.leadResult??"Pending"}</span></div>
        <div className="text-xs text-slate-500">Created {new Date(c.createdAt).toLocaleString()}</div>
      </div>
      <div className="flex justify-between items-center mt-3"><GhostButton onClick={onPromote} disabled={c.leadResult!=="Yes"}><CheckCircle2 className="w-4 h-4"/> Move to Interview</GhostButton><GhostButton onClick={onDelete}><Trash2 className="w-4 h-4"/>Delete</GhostButton></div>
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
        <div className="flex items-center gap-2 text-sm text-slate-700">Result: <span className="font-medium">{c.interviewResult??"Pending"}</span></div>
      </div>
      <div className="mt-3"><InterviewEditor c={c} onUpdate={onUpdate}/></div>
      <div className="flex justify-end mt-2"><GhostButton onClick={onDelete}><Trash2 className="w-4 h-4"/>Delete</GhostButton></div>
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
        <div className="flex items-center gap-2 text-sm text-slate-700">Result: <span className="font-medium">{c.formationResult??"Pending"}</span></div>
      </div>
      <div className="mt-3"><FormationEditor c={c} onUpdate={onUpdate}/></div>
      <div className="flex justify-end mt-2"><GhostButton onClick={onDelete}><Trash2 className="w-4 h-4"/>Delete</GhostButton></div>
    </div>
  );
}

// -------------------- Importers --------------------
function importCSVFile(file,setCandidates){
  const reader=new FileReader(); reader.onload=()=>{ try{ const text=String(reader.result||""); const {headers,rows}=parseCSV(text); const H=headers.map(h=>normalize(h));
    const list=rows.map(row=>({ id:uid(), stage:STAGES.LEAD, createdAt:new Date().toISOString(), firstName: pick(H,row,["first name","firstname","givenname"])||"", lastName: pick(H,row,["last name","lastname","surname"])||"", phone: pick(H,row,["phone","phone number","phonenumber"])||"", callsQty:Number(pick(H,row,["callsqty","calls quantity"]))||0, callAttempts:Number(pick(H,row,["callattempts","attempts"]))||1, leadResult: pick(H,row,["result","leadresult"])||"Pending", interviewDate: pick(H,row,["interview date"])||"", interviewTime: pick(H,row,["interview time"])||"", interviewResult: pick(H,row,["interview result"])||"Pending", formationDate: pick(H,row,["formation date"])||"", formationTime: pick(H,row,["formation time"])||"", formationResult: pick(H,row,["formation result"])||"Pending" })); setCandidates(list);
  }catch{ alert("Failed to import CSV"); } }; reader.readAsText(file);
}
function importIndeedJSONFile(file,setCandidates){
  const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(String(reader.result||"{}")); const cand=data.candidate||data.applicant||data||{};
    let firstName=(cand.first_name||cand.firstname||cand.given_name||"").toString().trim(); let lastName=(cand.last_name||cand.lastname||cand.family_name||"").toString().trim();
    const phone=(cand.phone||cand.phone_number||(Array.isArray(cand.phones)?cand.phones[0]:"")||"").toString().trim();
    if(!firstName && data.name){ const parts=String(data.name).split(/\\s+/); firstName=parts.slice(0,-1).join(" ")||parts[0]||""; lastName=parts.slice(-1).join(" ")||""; }
    const createdAtRaw=(data.application_date||data.applied_on||data.created_at||data.createdAt); const createdAt=createdAtRaw?new Date(createdAtRaw).toISOString():new Date().toISOString();
    const lead={ id:data.application_id||data.id||uid(), stage:STAGES.LEAD, createdAt, firstName, lastName, phone, callsQty:0, callAttempts:1, leadResult:"Pending" };
    setCandidates(prev=>[lead,...prev]); }catch{ alert("Failed to import Indeed JSON"); } }; reader.readAsText(file);
}

// -------------------- Assistant (optional OpenAI) --------------------
function AssistantPanel({ open, onClose, settings }){
  const [q,setQ]=useState(""); const [msgs,setMsgs]=useState([]); const key=settings.openaiKey||"";
  async function ask(){
    if(!q.trim()) return; const userMsg={role:"user",content:q}; setMsgs(m=>[...m,userMsg]); setQ("");
    try{
      if(!key){ setMsgs(m=>[...m,{role:"assistant",content:"Add your OpenAI API key in Settings to enable the assistant."}]); return; }
      const resp = await fetch("https://api.openai.com/v1/chat/completions",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
        body: JSON.stringify({ model: "gpt-4o-mini", messages: [{role:"system",content:"You are a helpful developer assistant for the Proago Recruitment app. Provide code snippets and plain instructions."},...msgs,userMsg] })
      });
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || "(no response)";
      setMsgs(m=>[...m,{role:"assistant",content:text}]);
    }catch(e){ setMsgs(m=>[...m,{role:"assistant",content:"Request failed. Check your connection and API key."}]); }
  }
  if(!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-lg" onClick={e=>e.stopPropagation()}>
        <div className="p-3 border-b flex items-center gap-2"><MessageCircle className="w-5 h-5"/><b>Proago Assistant</b><span className="text-xs text-slate-500">(optional)</span></div>
        <div className="p-3 max-h-[60vh] overflow-auto space-y-2 text-sm">
          {msgs.length===0 && <div className="text-slate-500">Ask for changes or help (e.g., “add a new column to leads”).</div>}
          {msgs.map((m,i)=>(<div key={i} className={m.role==="user"?"text-right":"text-left"}><div className={"inline-block px-3 py-2 rounded-xl "+(m.role==="user"?"bg-slate-900 text-white":"bg-slate-100")}>{m.content}</div></div>))}
        </div>
        <div className="p-3 border-t flex items-center gap-2">
          <Input placeholder="Type a request…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter'){ ask(); } }} />
          <Button onClick={ask}>Send</Button>
          <GhostButton onClick={onClose}>Close</GhostButton>
        </div>
      </div>
    </div>
  );
}

// -------------------- Settings & Legal --------------------
function useSettings(){
  const [settings,setSettings]=useState(()=>{ try{ return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}') }catch{ return {} } });
  useEffect(()=>{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); },[settings]);
  return [settings,setSettings];
}
function SettingsModal({ open, onClose, settings, setSettings, onExportCSV, onExportJSON, onErase }){
  const [retention,setRetention]=useState(settings.retentionDays||180);
  const [key,setKey]=useState(settings.openaiKey||"");
  useEffect(()=>{ if(open){ setRetention(settings.retentionDays||180); setKey(settings.openaiKey||""); } },[open]);
  if(!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 z-50 p-4 flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-lg" onClick={e=>e.stopPropagation()}>
        <div className="p-4 border-b flex items-center gap-2"><SettingsIcon className="w-5 h-5"/><b>Settings</b></div>
        <div className="p-4 grid gap-4 text-sm">
          <div>
            <div className="font-medium">Data retention</div>
            <div className="text-slate-600">Auto-delete candidates older than this many days (GDPR minimization).</div>
            <Input type="number" min={1} value={retention} onChange={e=>setRetention(Number(e.target.value)||180)} />
          </div>
          <div>
            <div className="font-medium">Assistant (OpenAI)</div>
            <div className="text-slate-600">Paste an API key to enable the in-app assistant. Key is stored locally on your device only.</div>
            <Input value={key} onChange={e=>setKey(e.target.value)} placeholder="sk-..." />
          </div>
          <div className="flex flex-wrap gap-2">
            <GhostButton onClick={onExportCSV}><Download className="w-4 h-4"/> Export CSV</GhostButton>
            <GhostButton onClick={onExportJSON}><Download className="w-4 h-4"/> Export JSON</GhostButton>
            <GhostButton onClick={()=>{ if(confirm('Erase ALL locally stored data? This cannot be undone.')) onErase(); }}><Trash2 className="w-4 h-4"/> Erase all data</GhostButton>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <GhostButton onClick={onClose}>Close</GhostButton>
          <Button onClick={()=>{ setSettings(s=>({...s, retentionDays:retention, openaiKey:key })); onClose(); }}>Save</Button>
        </div>
      </div>
    </div>
  );
}
function ConsentBanner(){
  const [state,setState]=useState(()=>localStorage.getItem(CONSENT_KEY)||"");
  if(state) return null;
  return (
    <div className="fixed bottom-2 left-2 right-2 md:left-4 md:right-4 bg-white border border-slate-200 rounded-2xl p-3 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3 z-40">
      <div className="flex items-start gap-2 text-sm text-slate-700"><Shield className="w-4 h-4"/><div>We store data <b>only on this device</b> (localStorage/PWA cache). By continuing you consent to local storage in line with <b>EU/Lux</b> rules. Manage in <b>Settings</b>.</div></div>
      <div className="flex gap-2"><GhostButton onClick={()=>{localStorage.setItem(CONSENT_KEY,'dismissed'); setState('dismissed');}}>Dismiss</GhostButton><Button onClick={()=>{localStorage.setItem(CONSENT_KEY,'accepted'); setState('accepted');}}>Accept</Button></div>
    </div>
  );
}
function LegalModals({ showPrivacy, setShowPrivacy, showTerms, setShowTerms }){
  return (<>
    {showPrivacy && (
      <div className="fixed inset-0 bg-black/30 z-50 p-4" onClick={()=>setShowPrivacy(false)}>
        <div className="bg-white max-w-2xl mx-auto rounded-2xl border border-slate-200 shadow-lg p-4" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-2"><Shield className="w-5 h-5"/><b>Privacy & Data Protection (GDPR/Lux)</b></div>
          <div className="text-sm text-slate-700 space-y-2">
            <p><b>What we store:</b> candidate first/last name, phone, and stage fields entered here. We intentionally ignore extra fields (e.g., email) from imports.</p>
            <p><b>Where:</b> on your device only (localStorage + PWA cache). No cloud/server by default.</p>
            <p><b>Why:</b> to operate the recruitment pipeline (lawful basis: legitimate interest / contract steps).</p>
            <p><b>Retention:</b> configurable in Settings. Use Export/Erase to exercise data rights (access/erasure/portability).</p>
            <p><b>Cookies:</b> none beyond PWA caching/consent storage. No third-party analytics.</p>
            <p><b>International transfer:</b> none (local only). If you enable the Assistant and add an API key, your prompts go to OpenAI under their terms.</p>
          </div>
          <div className="mt-3 text-right"><GhostButton onClick={()=>setShowPrivacy(false)}>Close</GhostButton></div>
        </div>
      </div>
    )}
    {showTerms && (
      <div className="fixed inset-0 bg-black/30 z-50 p-4" onClick={()=>setShowTerms(false)}>
        <div className="bg-white max-w-2xl mx-auto rounded-2xl border border-slate-200 shadow-lg p-4" onClick={e=>e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-2"><Info className="w-5 h-5"/><b>Terms of Use</b></div>
          <div className="text-sm text-slate-700 space-y-2">
            <p>This tool is provided for internal recruitment workflows. You must meet applicable laws of Luxembourg & the EU (GDPR), and platform rules (Apple/Microsoft) when installing as a PWA.</p>
            <p>You are responsible for obtaining any candidate consents required. For production, add a server + DPA as needed.</p>
          </div>
          <div className="mt-3 text-right"><GhostButton onClick={()=>setShowTerms(false)}>Close</GhostButton></div>
        </div>
      </div>
    )}
  </>);
}

// -------------------- App --------------------
export default function App(){
  const [candidates,setCandidates]=useState(()=>loadCandidates());
  const [q,setQ]=useState("");
  const [authed,setAuthed]=useState(()=> localStorage.getItem(AUTH_KEY_PERSIST)==="1" || sessionStorage.getItem(AUTH_KEY_SESSION)==="1");
  const [remember,setRemember]=useState(true);
  const [installEvent,setInstallEvent]=useState(null);
  const [settings,setSettings]=useSettings();
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [showPrivacy,setShowPrivacy]=useState(false); const [showTerms,setShowTerms]=useState(false);

  // Branding + PWA
  useEffect(()=>{
    document.title = "Proago Recruitment";
    const root=document.documentElement.style; root.setProperty("--brand-primary",BRAND_COLORS.primary); root.setProperty("--brand-secondary",BRAND_COLORS.secondary); root.setProperty("--brand-accent",BRAND_COLORS.accent);
    // Icons
    const linkIcon=document.createElement("link"); linkIcon.rel="icon"; linkIcon.href=ICON_PATH; document.head.appendChild(linkIcon);
    const linkApple=document.createElement("link"); linkApple.rel="apple-touch-icon"; linkApple.href=ICON_PATH; document.head.appendChild(linkApple);
    // Platform meta
    const metaTheme=document.createElement("meta"); metaTheme.name="theme-color"; metaTheme.content=BRAND_COLORS.primary; document.head.appendChild(metaTheme);
    const metaApple=document.createElement("meta"); metaApple.name="apple-mobile-web-app-capable"; metaApple.content="yes"; document.head.appendChild(metaApple);
    const metaMS=document.createElement("meta"); metaMS.name="msapplication-TileColor"; metaMS.content=BRAND_COLORS.primary; document.head.appendChild(metaMS);
    // Manifest
    const manifest={ name:"Proago Recruitment", short_name:"Proago", start_url:".", display:"standalone", background_color:"#ffffff", theme_color:BRAND_COLORS.primary, icons:[ {src:ICON_PATH,sizes:"192x192",type:"image/png"},{src:ICON_PATH,sizes:"512x512",type:"image/png"} ]};
    const blob=new Blob([JSON.stringify(manifest)],{type:"application/json"}); const href=URL.createObjectURL(blob); const link=document.createElement("link"); link.rel="manifest"; link.href=href; document.head.appendChild(link);
    // SW (network-first for HTML)
    if("serviceWorker" in navigator){ const swCode=`const C='proago-v1';self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./'])));self.skipWaiting();});self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim());});self.addEventListener('fetch',e=>{const r=e.request;const h=r.headers.get('accept')||'';if(h.includes('text/html')){e.respondWith(fetch(r).catch(()=>caches.open(C).then(c=>c.match('./'))));}else{e.respondWith(caches.open(C).then(async c=>{const m=await c.match(r);if(m) return m; const resp=await fetch(r); c.put(r,resp.clone()); return resp;}));}});`;
      const swBlob=new Blob([swCode],{type:"text/javascript"}); const swUrl=URL.createObjectURL(swBlob); navigator.serviceWorker.register(swUrl).catch(()=>{}); }
    const handler=(e)=>{ e.preventDefault(); setInstallEvent(e); }; window.addEventListener('beforeinstallprompt',handler); return ()=>window.removeEventListener('beforeinstallprompt',handler);
  },[]);

  // Retention pruning
  useEffect(()=>{
    const days=settings.retentionDays||180; const cutoff=Date.now()-days*86400000;
    const pruned=candidates.filter(c=> new Date(c.createdAt).getTime()>=cutoff );
    if(pruned.length!==candidates.length) setCandidates(pruned);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>{ saveCandidates(candidates); },[candidates]);

  const leads=useMemo(()=>candidates.filter(c=>c.stage===STAGES.LEAD),[candidates]);
  const interviews=useMemo(()=>candidates.filter(c=>c.stage===STAGES.INTERVIEW),[candidates]);
  const formations=useMemo(()=>candidates.filter(c=>c.stage===STAGES.FORMATION),[candidates]);
  const filterQ=(list)=> list.filter(c=>`${c.firstName} ${c.lastName} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));

  // Mutations
  const addLead=(c)=> setCandidates(prev=>[c,...prev]);
  const updateCandidate=(u)=> setCandidates(prev=>prev.map(c=>c.id===u.id?u:c));
  const deleteCandidate=(id)=> setCandidates(prev=>prev.filter(c=>c.id!==id));
  const promoteToInterview=(c)=> { if(c.leadResult!=="Yes") return; updateCandidate({...c,stage:STAGES.INTERVIEW}); };

  // Export/Import
  const exportCSV=()=> download(`pipeline-${new Date().toISOString().slice(0,10)}.csv`, toCSV(candidates), "text/csv;charset=utf-8");
  const exportJSON=()=> download(`pipeline-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(candidates,null,2), "application/json");
  const eraseAll=()=> { localStorage.removeItem(LS_KEY); setCandidates([]); };

  // Auth helpers
  function checkLock(){
    try{ const lock=JSON.parse(localStorage.getItem(AUTH_FAILS_KEY)||"null"); if(lock && lock.until && Date.now()<lock.until) return lock; }catch{}; return null; }
  function recordFail(){
    const lock=checkLock(); if(lock){ localStorage.setItem(AUTH_FAILS_KEY, JSON.stringify({count:lock.count+1, until:lock.until})); return; }
    const prev=JSON.parse(localStorage.getItem(AUTH_FAILS_KEY)||"null");
    const count=(prev?.count||0)+1; if(count>=3){ const until=Date.now()+15*60*1000; localStorage.setItem(AUTH_FAILS_KEY, JSON.stringify({count,until})); }
    else { localStorage.setItem(AUTH_FAILS_KEY, JSON.stringify({count, until: 0})); }
  }
  function clearFails(){ localStorage.removeItem(AUTH_FAILS_KEY); }

  function handleLogin(username,password,rememberMe){
    const lock=checkLock(); if(lock){ const mins=Math.ceil((lock.until-Date.now())/60000); alert(`Too many attempts. Try again in ${mins} min.`); return; }
    if(username===AUTH_USER && password===AUTH_PASS){
      if(rememberMe){ localStorage.setItem(AUTH_KEY_PERSIST,"1"); } else { sessionStorage.setItem(AUTH_KEY_SESSION,"1"); }
      setAuthed(true); clearFails();
    } else { recordFail(); alert("Incorrect username or password."); }
  }
  function handleLogout(){ localStorage.removeItem(AUTH_KEY_PERSIST); sessionStorage.removeItem(AUTH_KEY_SESSION); setAuthed(false); }

  if(!authed){ return <LoginScreen onLogin={handleLogin} remember={remember} setRemember={setRemember}/>; }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-white via-white to-slate-100 text-slate-800">
      <ConsentBanner/>
      <LegalModals showPrivacy={showPrivacy} setShowPrivacy={setShowPrivacy} showTerms={showTerms} setShowTerms={setShowTerms}/>
      <AssistantPanel open={assistantOpen} onClose={()=>setAssistantOpen(false)} settings={settings}/>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={ICON_PATH} alt="Proago" className="w-9 h-9 rounded-full"/>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{color:BRAND_COLORS.primary}}>Proago Recruitment</h1>
              <p className="text-slate-600">Track leads → interviews → formation in one place.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {installEvent && <GhostButton onClick={()=>installEvent.prompt()}>Install app</GhostButton>}
            <GhostButton onClick={()=>setAssistantOpen(true)} title="Assistant"><MessageCircle className="w-4 h-4"/> Assistant</GhostButton>
            <GhostButton onClick={()=>setShowPrivacy(true)} title="Privacy"><Shield className="w-4 h-4"/> Privacy</GhostButton>
            <GhostButton onClick={()=>setShowTerms(true)} title="Terms"><Info className="w-4 h-4"/> Terms</GhostButton>
            {/* Settings button will be rendered by the wrapper below */}
            <Input placeholder="Search name or phone…" value={q} onChange={e=>setQ(e.target.value)} className="pr-24"/>
            <GhostButton onClick={exportCSV}><Download className="w-4 h-4"/> Export CSV</GhostButton>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Upload className="w-4 h-4"/> Import CSV
              <input type="file" accept=".csv" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) importCSVFile(f,setCandidates);}}/>
            </label>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Upload className="w-4 h-4"/> Import Indeed JSON
              <input type="file" accept=".json" className="hidden" onChange={e=>{const f=e.target.files?.[0]; if(f) importIndeedJSONFile(f,setCandidates);}}/>
            </label>
            <GhostButton onClick={handleLogout} title="Log out"><LogOut className="w-4 h-4"/> Logout</GhostButton>
          </div>
        </header>

        <SettingsModalWrapper settings={settings} setSettings={setSettings} onExportCSV={exportCSV} onExportJSON={exportJSON} onErase={eraseAll}/>

        <SectionCard title="Add new lead" subtitle="Fill core info. Result = Yes enables moving forward."><LeadForm onAdd={addLead}/></SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <SectionCard title="Leads" subtitle={`${filterQ(leads).length} record(s)`}>
            <div className="grid grid-cols-1 gap-3">
              {filterQ(leads).map(c=> (
                <motion.div key={c.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
                  <LeadCard c={c} onUpdate={updateCandidate} onDelete={()=>deleteCandidate(c.id)} onPromote={()=>promoteToInterview(c)}/>
                </motion.div>
              ))}
              {filterQ(leads).length===0 && <div className="text-sm text-slate-500">No leads yet.</div>}
            </div>
          </SectionCard>

          <SectionCard title="Interviews" subtitle={`${filterQ(interviews).length} record(s)`}>
            <div className="grid grid-cols-1 gap-3">
              {filterQ(interviews).map(c=> (
                <motion.div key={c.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
                  <InterviewCard c={c} onUpdate={(u)=>{updateCandidate(u); if(u.interviewResult==="Yes"){ updateCandidate({...u,stage:STAGES.FORMATION}); }}} onDelete={()=>deleteCandidate(c.id)}/>
                </motion.div>
              ))}
              {filterQ(interviews).length===0 && <div className="text-sm text-slate-500">No interviews yet.</div>}
            </div>
          </SectionCard>

          <SectionCard title="Formation" subtitle={`${filterQ(formations).length} record(s)`}>
            <div className="grid grid-cols-1 gap-3">
              {filterQ(formations).map(c=> (
                <motion.div key={c.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
                  <FormationCard c={c} onUpdate={updateCandidate} onDelete={()=>deleteCandidate(c.id)}/>
                </motion.div>
              ))}
              {filterQ(formations).length===0 && <div className="text-sm text-slate-500">No formation records yet.</div>}
            </div>
          </SectionCard>
        </div>

        <details className="mt-8 text-sm text-slate-600">
          <summary className="cursor-pointer select-none font-medium">Compliance & setup notes</summary>
          <div className="mt-3 space-y-2">
            <p>EU/Lux compliance helpers included: consent banner, local-only storage, retention setting, privacy & terms modals, export/erase.</p>
            <p>Install the app via the Install button or your browser menu (Add to Home Screen). Requires HTTPS for PWA features.</p>
          </div>
        </details>
      </div>
    </div>
  );
}

function SettingsButton({ onOpen }){
  return <GhostButton onClick={onOpen} title="Settings"><SettingsIcon className="w-4 h-4"/> Settings</GhostButton>;
}
function SettingsModalWrapper({ settings, setSettings, onExportCSV, onExportJSON, onErase }){
  const [open,setOpen]=useState(false);
  return (<>
    <div className="mb-3"><SettingsButton onOpen={()=>setOpen(true)}/></div>
    <SettingsModal open={open} onClose={()=>setOpen(false)} settings={settings} setSettings={setSettings} onExportCSV={onExportCSV} onExportJSON={onExportJSON} onErase={onErase}/>
  </>);
}

// -------------------- Forms --------------------
function LeadForm({ onAdd }){
  const [f,setF]=useState({ firstName:"", lastName:"", phone:"", callsQty:"", callAttempts:"1", leadResult:"Pending" });
  function submit(e){ e.preventDefault(); if(!f.firstName.trim()||!f.lastName.trim()) return; const c={ id:uid(), stage:STAGES.LEAD, createdAt:new Date().toISOString(), firstName:f.firstName.trim(), lastName:f.lastName.trim(), phone:f.phone.trim(), callsQty:f.callsQty?Number(f.callsQty):0, callAttempts:Number(f.callAttempts)||1, leadResult:f.leadResult }; onAdd(c); setF({ firstName:"", lastName:"", phone:"", callsQty:"", callAttempts:"1", leadResult:"Pending" }); }
  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <Field label="First name"><Input value={f.firstName} onChange={e=>setF(s=>({...s,firstName:e.target.value}))} placeholder="Jane"/></Field>
      <Field label="Last name"><Input value={f.lastName} onChange={e=>setF(s=>({...s,lastName:e.target.value}))} placeholder="Doe"/></Field>
      <Field label="Phone"><Input value={f.phone} inputMode="tel" onChange={e=>setF(s=>({...s,phone:e.target.value}))} placeholder="+352 …"/></Field>
      <Field label="Calls quantity"><Input type="number" min={0} value={f.callsQty} onChange={e=>setF(s=>({...s,callsQty:e.target.value}))} placeholder="0"/></Field>
      <Field label="Call attempts (1/2/3)"><Select value={f.callAttempts} onChange={e=>setF(s=>({...s,callAttempts:e.target.value}))}><option value="1">1</option><option value="2">2</option><option value="3">3</option></Select></Field>
      <Field label="Result"><Select value={f.leadResult} onChange={e=>setF(s=>({...s,leadResult:e.target.value}))}><option>Pending</option><option>Yes</option><option>No</option></Select></Field>
      <div className="md:col-span-2 lg:col-span-3 flex justify-end"><Button type="submit"><Plus className="w-4 h-4"/> Add lead</Button></div>
    </form>
  );
}

// -------------------- Login Screen --------------------
function LoginScreen({ onLogin, remember, setRemember }){
  const [u,setU]=useState(""); const [p,setP]=useState(""); const [show,setShow]=useState(false);
  const lock=(()=>{ try{ return JSON.parse(localStorage.getItem(AUTH_FAILS_KEY)||"null"); }catch{ return null } })();
  const locked = lock && lock.until && Date.now()<lock.until;
  const minsLeft = locked ? Math.ceil((lock.until-Date.now())/60000) : 0;
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-white via-slate-50 to-white p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <img src={ICON_PATH} alt="Proago" className="w-10 h-10 rounded-full"/>
          <div><h1 className="text-xl font-bold" style={{color:BRAND_COLORS.primary}}>Proago Recruitment</h1><p className="text-slate-600 text-sm">Sign in to continue</p></div>
        </div>
        <div className="grid gap-3">
          <Field label="Username"><Input value={u} onChange={e=>setU(e.target.value)} placeholder="Administrator"/></Field>
          <Field label="Password"><div className="relative"><Input type={show?"text":"password"} value={p} onChange={e=>setP(e.target.value)} placeholder="••••••" className="pr-10"/><button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"><KeyRound className="w-4 h-4"/></button></div></Field>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Remember me</label>
          <Button disabled={locked} onClick={()=>onLogin(u,p,remember)}>{locked?`Locked (${minsLeft}m)`:"Sign in"}</Button>
          <p className="text-xs text-slate-500">3 failed attempts lock login for 15 minutes.</p>
          <div className="text-xs text-slate-500">By signing in you accept the <button className="underline" onClick={()=>{ alert('Open Terms in deployed app header.'); }}>Terms</button> and acknowledge the Privacy notice.</div>
        </div>
      </div>
    </div>
  );
}
