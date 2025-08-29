// util.js
// Proago CRM — helpers, storage, dates, money, ranks (acronyms), "Hello Fresh", Indeed importer

/* ==============================
   Storage helpers
============================== */
export const K = {
  settings: "proago_settings_v2",
  leads: "proago_leads_v1",
  recruiters: "proago_recruiters_v1",
  planning: "proago_planning_v1",
  history: "proago_history_v1",
};

export const load = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : (fallback ?? null);
  } catch {
    return fallback ?? null;
  }
};

export const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

export const clone = (x) => JSON.parse(JSON.stringify(x));

/* ==============================
   Dates & formatting
============================== */
export const fmtISO = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const da = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

export const fmtUK = (iso) => {
  if (!iso) return "";
  const y = iso.slice(2, 4), m = iso.slice(5, 7), d = iso.slice(8, 10);
  return `${d}/${m}/${y}`;
};

export const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const startOfWeekMon = (date) => {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const weekNumberISO = (date) => {
  const tmp = new Date(date);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  return 1 + Math.round(
    ((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
  );
};

export const monthKey = (iso) => {
  const s = (iso || "").slice(0, 7);
  return /^\d{4}-\d{2}$/.test(s) ? s : "";
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export const monthLabel = (ym) => {
  if (!ym || ym.length < 7) return ym || "";
  const y = ym.slice(0, 4);
  const m = Number(ym.slice(5, 7)) - 1;
  return `${MONTHS[m]} ${y}`;
};

export const toMoney = (n) => Number(n || 0).toFixed(2);

/* ==============================
   Ranks (acronyms + ordering)
============================== */
export const RANK_ACRONYM = {
  "Branch Manager": "BM",
  "Sales Manager": "SM",
  "Team Captain": "TC",
  "Pool Captain": "PC",
  "Promoter": "PR",
  "Rookie": "RK",
};

export const toRankAcr = (role) => {
  if (!role) return "RK";
  const full = String(role).trim();
  if (RANK_ACRONYM[full]) return RANK_ACRONYM[full];
  const U = full.toUpperCase();
  if (["BM","SM","TC","PC","PR","RK"].includes(U)) return U;
  return "RK";
};

const RANK_ORDER = { BM: 6, SM: 5, TC: 4, PC: 3, PR: 2, RK: 1 };
export const rankOrderValue = (role) => RANK_ORDER[toRankAcr(role)] || 0;

/* ==============================
   Settings (Hello Fresh default, conversion, rate bands)
============================== */
export const DEFAULT_SETTINGS = {
  projects: ["Hello Fresh"],
  conversionType: {
    D2D: {
      noDiscount: { box2: 0, box4: 0 },
      discount:   { box2: 0, box4: 0 },
    },
    EVENT: {
      noDiscount: { box2: 0, box4: 0 },
      discount:   { box2: 0, box4: 0 },
    },
  },
  rateBands: [
    { startISO: "2025-01-01", rate: 15 },
  ],
};

export const rateForDate = (settings, dateISO) => {
  const s = settings || DEFAULT_SETTINGS;
  const bands = (s.rateBands || []).slice().sort((a,b)=> (a.startISO<b.startISO?-1:1));
  const d = dateISO ? new Date(dateISO) : new Date();
  let current = bands[0]?.rate ?? 15;
  for (const b of bands) if (new Date(b.startISO) <= d) current = Number(b.rate || 0);
  return current;
};

/* ==============================
   Indeed Import helpers
============================== */
export const coalesce = (...vals) =>
  vals.find((v) => v !== undefined && v !== null && v !== "") ?? "";

export function extractIndeedAppliedAt(raw) {
  const picks = [
    raw?.applicant?.appliedOnMillis,
    raw?.applicant?.createdOnMillis,
    raw?.receivedOnMillis,
    raw?.analytics?.receivedOnMillis,
  ].filter((v) => typeof v === "number" && v > 0);
  return picks.length ? new Date(picks[0]).toISOString() : new Date().toISOString();
}

export function normalizeIndeedLead(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Invalid Indeed JSON");
  const appliedAtISO = extractIndeedAppliedAt(raw);
  const fullName = coalesce(raw?.applicant?.fullName, "");
  const email = coalesce(raw?.applicant?.email, raw?.applicant?.emailAlias, "");
  const phone = coalesce(raw?.applicant?.phoneNumber, "");
  const country = coalesce(raw?.applicant?.location?.country, "");
  const city = coalesce(raw?.applicant?.location?.city, "");
  const jobTitle = coalesce(raw?.job?.jobTitle, "");
  const jobCompany = coalesce(raw?.job?.jobCompany, "");
  const jobLocation = coalesce(raw?.job?.jobLocation, "");
  const jobUrl = coalesce(raw?.job?.jobUrl, "");
  const resumeFileName = coalesce(raw?.applicant?.resume?.file?.fileName, "");
  const qa = Array.isArray(raw?.questionsAndAnswers?.questionsAndAnswers)
    ? raw.questionsAndAnswers.questionsAndAnswers.map((q) => ({
        question: q?.question?.question ?? "",
        answer: q?.answer?.label ?? q?.answer?.value ?? "",
      }))
    : [];
  return {
    id:
      (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: fullName,
    email,
    mobile: phone,
    source: "Indeed",
    appliedAtISO,
    calls: 0,
    location: { country, city },
    jobInfo: { jobTitle, jobCompany, jobLocation, jobUrl },
    resumeFileName,
    qa,
    interviewAtISO: "",
    formationAtISO: "",
    notes: "",
  };
}

export function parseIndeedFiles(fileContentsArray) {
  const results = [];
  const errors = [];
  for (const { name, text } of fileContentsArray) {
    try {
      const raw = JSON.parse(text);
      const lead = normalizeIndeedLead(raw);
      results.push(lead);
    } catch (e) {
      errors.push({ file: name, error: e?.message || String(e) });
    }
  }
  return { results, errors };
}
