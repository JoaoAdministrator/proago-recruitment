// util.js — Proago CRM shared helpers (v2025-08-29)
// Updates:
// • monthLabel full names
// • role acronyms mapping + order
// • labels standardized: "Box 2", "Box 2*", "Box 4", "Box 4*"
// • project display: Hello Fresh
export const load = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
export const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export const K = {
  recruiters: "proago_recruiters_v7",
  pipeline:   "proago_pipeline_v6",
  history:    "proago_history_v7_discounts",
  planning:   "proago_planning_v6",
  settings:   "proago_settings_v4_bands_projects",
};

export const clone = typeof structuredClone === "function"
  ? structuredClone
  : (obj) => JSON.parse(JSON.stringify(obj));

// Dates
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
  const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day); d.setUTCHours(0,0,0,0); return d;
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
export const monthKey = (iso) => (iso || "").slice(0, 7);
export const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
};

// Money
export const toMoney = (n) => (Number(n || 0)).toFixed(2);

// Names & phone formatting (no flags)
export const titleCase = (s = "") =>
  s.trim().toLowerCase().replace(/\s+/g, " ").split(" ").map(w => (w ? w[0].toUpperCase() + w.slice(1) : "")).join(" ");

const normalizeDigits = (raw="") => raw.replace(/[()\-\.\s]/g,"").replace(/^00/,"+");
const ALLOWED_CCS = ["+352","+33","+32","+49"];
const detectCC = (raw="") => { const s = normalizeDigits(raw); const cc = ALLOWED_CCS.find(cc => s.startsWith(cc)); return cc || ""; };

export const formatPhoneByCountry = (raw = "") => {
  let s = normalizeDigits(raw);
  if (!s.startsWith("+")) return { display: "", cc: "", ok: false };
  const cc = detectCC(s);
  if (!cc) return { display: "", cc, ok: false };
  let rest = s.slice(cc.length);
  if (cc === "+352") {
    rest = rest.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  } else if (cc === "+33" || cc === "+32") {
    rest = rest.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  } else if (cc === "+49") {
    rest = rest.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  }
  return { display: `${cc} ${rest}`.trim(), cc, ok: true };
};

// Rank mapping + order
export const rankAcr = (role) => {
  const map = {
    "Branch Manager": "BM",
    "Sales Manager": "SM",
    "Team Captain": "TC",
    "Pool Captain": "PC",
    "Promoter": "PR",
    "Rookie": "RK",
    // already acronyms pass-through:
    "BM":"BM","SM":"SM","TC":"TC","PC":"PC","PR":"PR","RK":"RK"
  };
  return map[role] || role || "RK";
};
export const rankOrderVal = (acronym) => ({ BM:6, SM:5, TC:4, PC:3, PR:2, RK:1 }[acronym] || 0);

// Settings defaults (Hello Fresh)
export const DEFAULT_SETTINGS = {
  projects: ["Hello Fresh"],
  conversionType: {
    D2D: {
      noDiscount: { box2: 95,  box4: 125 }, // "Box 2", "Box 4"
      discount:   { box2: 80,  box4: 110 }, // "Box 2*", "Box 4*"
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

export const rateForDate = (settings, iso) => {
  const bands = [...(settings?.rateBands || [])].sort((a,b)=> a.startISO < b.startISO ? 1 : -1);
  const d = iso || fmtISO(new Date());
  const band = bands.find(b => b.startISO <= d) || bands[bands.length-1] || { rate: DEFAULT_SETTINGS.rateBands[0].rate };
  return band.rate;
};

// History helpers for recruiters metrics
export const isWithinLastWeeks = (iso, weeks = 8) => {
  const [y,m,d]=iso.split("-").map(Number);
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
  history
    .filter(h => h.recruiterId === recruiterId && typeof h.score === "number")
    .sort((a,b)=> (a.dateISO < b.dateISO ? 1 : -1))
    .slice(0,5)
    .map(h => Number(h.score) || 0);
export const boxPercentsLast8w = (history, recruiterId) => {
  const rows = history.filter(h => h.recruiterId === recruiterId && h.dateISO && isWithinLastWeeks(h.dateISO, 8));
  const totals = rows.reduce((acc, r) => {
    const { b2, b4 } = boxTotals(r);
    acc.sales += (Number(r.score) || 0);
    acc.b2 += b2; acc.b4 += b4;
    return acc;
  }, { sales: 0, b2: 0, b4: 0 });
  const pct = (n, d) => (d > 0 ? (n / d) * 100 : 0);
  return { b2: pct(totals.b2, totals.sales), b4: pct(totals.b4, totals.sales) };
};
