// util.js — Shared helpers for Proago CRM (v2025-08-28 sync)

export const BRAND = { primary: "#d9010b", secondary: "#eb2a2a", accent: "#fca11c" };

// ───────────────── Storage ─────────────────
export const load = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
export const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const K = {
  recruiters: "proago_recruiters_v8_rank",
  pipeline:   "proago_pipeline_v7",
  history:    "proago_history_v7_discounts",
  planning:   "proago_planning_v6",
  settings:   "proago_settings_v4_bands_projects",
  auth:       "proago_auth_v1",
};

// ─────────────── Clone ───────────────
export const clone = typeof structuredClone === "function" ? structuredClone : (obj) => JSON.parse(JSON.stringify(obj));

// ─────────────── Dates (UTC) ───────────────
export const fmtISO = (d) => new Date(Date.UTC(
  d.getUTCFullYear?.() ?? d.getFullYear(),
  d.getUTCMonth?.() ?? d.getMonth(),
  d.getUTCDate?.() ?? d.getDate()
)).toISOString().slice(0,10);

export const addDays = (date, n) => { const d = new Date(date); d.setUTCDate(d.getUTCDate() + n); return d; };

export const startOfWeekMon = (date = new Date()) => {
  const d = new Date(Date.UTC(
    date.getUTCFullYear?.() ?? date.getFullYear(),
    date.getUTCMonth?.() ?? date.getMonth(),
    date.getUTCDate?.() ?? date.getDate()
  ));
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day); d.setUTCHours(0,0,0,0); return d;
};

export const weekNumberISO = (date) => {
  const d = new Date(Date.UTC(
    date.getUTCFullYear?.() ?? date.getFullYear(),
    date.getUTCMonth?.() ?? date.getMonth(),
    date.getUTCDate?.() ?? date.getDate()
  ));
  d.setUTCHours(0,0,0,0);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7));
  return 1 + Math.round(((d - firstThursday) / 86400000) / 7);
};

export const fmtUK = (iso) => { if (!iso) return ""; const [y,m,d] = iso.split("-"); return `${d}/${m}/${String(y).slice(2)}`; };
export const monthKey = (iso) => (iso || "").slice(0,7);
export const monthLabelShort = (ym) => {
  const [y,m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m-1, 1)).toLocaleDateString(undefined, { month:"short", year:"numeric", timeZone:"UTC" });
};
export const monthLabelFull = (ym) => {
  const [y,m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m-1, 1)).toLocaleDateString(undefined, { month:"long", year:"numeric", timeZone:"UTC" });
};

// ───────────── Money / visuals ─────────────
export const toMoney = (n) => (Number(n || 0)).toFixed(2);
export const avgColor = (v) => (Number(v) >= 3 ? "#10b981" : Number(v) >= 2 ? "#fbbf24" : "#ef4444");

// ───────────── Names / phones ─────────────
export const titleCase = (s="") => s.trim().toLowerCase().replace(/\s+/g," ").split(" ").map(w => (w? w[0].toUpperCase()+w.slice(1):"")).join(" ");
export const titleCaseFirstOnBlur = (v) => (typeof v==="string" && v ? v.charAt(0).toUpperCase()+v.slice(1) : v);

// onChange passthrough (no formatting while typing)
export const passthrough = (setter) => (eOrVal) => {
  const v = eOrVal?.target ? eOrVal.target.value : eOrVal;
  setter(v);
};
// onBlur format wrapper
export const onBlurFormat = (getter, setter, fmt) => () => setter(fmt(getter()));

export const normalizeNumericOnBlur = (value) => {
  if (value == null) return "";
  const cleaned = String(value).replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  return parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("").replace(/\./g,"")}` : cleaned;
};

// Phone prefixes / formatting
export const PHONE_PREFIXES = ["+352","+33","+32","+49"];
const FLAG_BY_CC = { "+352":"🇱🇺", "+33":"🇫🇷", "+32":"🇧🇪", "+49":"🇩🇪" };

export const formatPhoneByCountry = (cc, digits) => {
  const clean = String(digits||"").replace(/[^\d]/g,"");
  let rest = clean;
  if (cc === "+352") rest = rest.replace(/(\d{3})(?=\d)/g,"$1 ").trim();
  else if (cc === "+33" || cc === "+32") rest = rest.replace(/(\d{2})(?=\d)/g,"$1 ").trim();
  else if (cc === "+49") rest = rest.replace(/(\d{3})(?=\d)/g,"$1 ").trim();
  return { display: `${cc} ${rest}`.trim(), ok: !!clean, flag: FLAG_BY_CC[cc] || "" };
};

// ───────────── Settings (conversion matrix + bands) ─────────────
export const DEFAULT_SETTINGS = {
  projects: ["HF"],
  conversionType: {
    D2D: { noDiscount: { box2: 95, box4: 125 }, discount: { box2: 80, box4: 110 } },
    EVENT:{ noDiscount: { box2: 60, box4: 70  }, discount: { box2: 45, box4: 55  } },
  },
  rateBands: [
    { startISO: "1900-01-01", rate: 15.2473 },
    { startISO: "2025-05-01", rate: 15.6265 },
  ],
};

export const rateForDate = (settings, iso) => {
  const bands = [...(settings?.rateBands || [])].sort((a,b)=> a.startISO < b.startISO ? 1 : -1);
  const d = iso || fmtISO(new Date());
  const band = bands.find(b => b.startISO <= d) || bands[bands.length-1] || { rate: DEFAULT_SETTINGS.rateBands[0].rate };
  return band.rate;
};

// ───────────── Performance helpers ─────────────
export const isWithinLastWeeks = (iso, weeks = 8) => {
  const [y,m,d] = iso.split("-").map(Number);
  const row = new Date(Date.UTC(y, m-1, d));
  const today = startOfWeekMon(new Date());
  const diffDays = (today - row) / 86400000;
  return diffDays >= 0 && diffDays <= weeks * 7;
};

export const boxTotals = (row) => {
  const b2 = (Number(row.box2_noDisc)||0) + (Number(row.box2_disc)||0);
  const b4 = (Number(row.box4_noDisc)||0) + (Number(row.box4_disc)||0);
  return { b2, b4 };
};

export const last5ScoresFor = (history, recruiterId) =>
  history.filter(h => h.recruiterId === recruiterId && typeof h.score === "number")
         .sort((a,b)=> (a.dateISO < b.dateISO ? 1 : -1))
         .slice(0,5)
         .map(h => Number(h.score) || 0);

// ───────────── Role/Rank defaults ─────────────
export const roleHoursDefault = (rank) =>
  rank === "Pool Captain" ? 7 : (rank === "Team Captain" || rank === "Sales Manager") ? 8 : 6;

export const roleMultiplierDefault = (rank) =>
  rank === "Pool Captain" ? 1.25 : rank === "Team Captain" ? 1.5 : rank === "Sales Manager" ? 2.0 : 1.0;

// ───────────── Modal sizing (Recruiter Info + Edit Day) ─────────────
export const MODAL_SIZES = {
  workbench: { className: "w-[92vw] max-w-[1200px] h-[82vh]", contentClass: "h-full overflow-auto" },
};

// ───────────── Auth users ─────────────
export const USERS = [
  { u: "Oscar", p: "Sergio R4mos" },
  { u: "Joao",  p: "Ruben Di4s"  },
];
