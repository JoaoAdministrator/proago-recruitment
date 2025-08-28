// util.js — Chat 9 baseline + EXACT requested helpers
// • Full month names available via monthFull()
// • Safe input helpers (fix one-letter typing issue)
// • Phone prefixes for Mobile field
// • Recruiter helpers used by Recruiters (last5ScoresFor, boxPercentsLast8w, avgColor)

export const K = {
  auth: "proago.auth",
  leads: "proago.leads",
  recruiters: "proago.recruiters",
  planning: "proago.planning",
  history: "proago.history",
  payouts: "proago.payouts",
  settings: "proago.settings",
};

export function load(key, fallback){ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch{ return fallback; } }
export function save(key, value){ try{ localStorage.setItem(key, JSON.stringify(value)); }catch{} }

// Dates
export function fmtUK(isoOrDate){
  const d=typeof isoOrDate==="string"?new Date(isoOrDate):new Date(isoOrDate);
  const dd=String(d.getDate()).padStart(2,"0");
  const mm=String(d.getMonth()+1).padStart(2,"0");
  const yyyy=d.getFullYear(); return `${dd}/${mm}/${yyyy}`;
}
export function monthFull(isoYearMonth){
  let y=0,m=0;
  if (/^\d{4}-\d{2}$/.test(isoYearMonth)){ y=+isoYearMonth.slice(0,4); m=+isoYearMonth.slice(5,7); }
  else { const d=new Date(isoYearMonth); y=d.getUTCFullYear(); m=d.getUTCMonth()+1; }
  const dt=new Date(Date.UTC(y,m-1,1));
  return dt.toLocaleDateString(undefined,{ month:"long", year:"numeric", timeZone:"UTC" });
}
export function startOfWeekMon(dateObj){
  const d=new Date(dateObj); const day=(d.getDay()+6)%7;
  const res=new Date(d); res.setDate(d.getDate()-day); res.setHours(0,0,0,0); return res;
}
export function weekNumberISO(dateObj){
  const d=new Date(Date.UTC(dateObj.getFullYear(),dateObj.getMonth(),dateObj.getDate()));
  d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil(((d-yearStart)/86400000+1)/7);
}
export function monthKey(isoDate){ return isoDate ? isoDate.slice(0,7) : ""; }
export function fmtISO(dateObj){ const d=new Date(dateObj); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }

// Money
export function toMoney(n){ return Number(n||0).toFixed(2); }

// Input helpers (stop formatting while typing)
export const passthrough = (setter)=>(eOrValue)=>{ const v=eOrValue?.target?eOrValue.target.value:eOrValue; setter(v); };
export const titleCaseFirstOnBlur=(v)=>{ if(typeof v!=="string"||!v) return v??""; return v.charAt(0).toUpperCase()+v.slice(1); };
export const normalizeNumericOnBlur=(v)=>{ if(v==null) return ""; const s=String(v).replace(/[^\d.]/g,""); const parts=s.split("."); return parts.length>1?`${parts[0]}.${parts.slice(1).join("").replace(/\./g,"")}`:s; };

// Phone prefixes
export const PHONE_PREFIXES = [
  { label: "+352 (LU)", value: "+352" },
  { label: "+33 (FR)",  value: "+33"  },
  { label: "+32 (BE)",  value: "+32"  },
  { label: "+49 (DE)",  value: "+49"  },
  { label: "+41 (CH)",  value: "+41"  },
];

// Recruiter stats used in Recruiters.jsx
export function last5ScoresFor(history, recId){
  if (!Array.isArray(history) || !recId) return [];
  return history.filter(h=>h.recruiterId===recId).slice(-5).map(h=>Number(h.score)||0);
}
export function boxPercentsLast8w(history, recId){
  if (!Array.isArray(history) || !recId) return { b2:0, b4:0 };
  const now=new Date(); const cutoff=new Date(now); cutoff.setDate(now.getDate()-56);
  let b2=0,b4=0;
  for (const h of history){
    const d=new Date(h.dateISO||h.date);
    if (h.recruiterId===recId && d>=cutoff){
      b2 += (Number(h.box2_noDisc)||0)+(Number(h.box2_disc)||0);
      b4 += (Number(h.box4_noDisc)||0)+(Number(h.box4_disc)||0);
    }
  }
  const total=b2+b4; if(!total) return { b2:0, b4:0 };
  return { b2:(b2*100)/total, b4:(b4*100)/total };
}
export function avgColor(scores){
  if (!scores || !scores.length) return "#6b7280";
  const avg = scores.reduce((a,b)=>a+Number(b||0),0)/scores.length;
  if (avg>=3) return "#16a34a"; if (avg>=2) return "#f59e0b"; return "#ef4444";
}
