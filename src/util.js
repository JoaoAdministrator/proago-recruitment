// util.js — Proago CRM (Final Sync Build v2025-08-28b+patch)
//
// • Brand colors
// • LocalStorage helpers (load/save)
// • Global Keys (K)
// • Default Settings (conversion matrix + rate bands)
// • Dates (full month names, UK formatting, ISO week, start Monday, month key)
// • Money helpers
// • Input helpers to prevent the one-letter typing bug
// • Phone prefixes
// • Shared modal/workbench size for large dialogs
// • NEW: avgColor, boxPercentsLast8w, last5ScoresFor  ✅

/* -------------------- Brand -------------------- */
export const BRAND = {
  primary: "#d9010b",
  secondary: "#eb2a2a",
  accent: "#fca11c",
};

/* -------------------- Storage -------------------- */
export const K = {
  auth: "proago.auth",
  leads: "proago.leads",
  recruiters: "proago.recruiters",
  planning: "proago.planning",
  history: "proago.history",
  payouts: "proago.payouts",
  settings: "proago.settings",
};

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/serialization errors
  }
}

/* -------------------- Defaults / Settings -------------------- */
export const DEFAULT_SETTINGS = {
  hourlyRateBands: [
    { effectiveFrom: "2025-01-01", rate: 15 },
  ],
  conversionType: {
    D2D: {
      noDiscount: { box2: 120, box4: 240 },
      discount:   { box2: 90,  box4: 180 },
    },
    EVENT: {
      noDiscount: { box2: 140, box4: 260 },
      discount:   { box2: 100, box4: 200 },
    },
  },
};

// Get hourly rate effective at a given ISO date (YYYY-MM-DD)
export function rateForDate(settings, dateISO) {
  const bands = (settings?.hourlyRateBands || DEFAULT_SETTINGS.hourlyRateBands).slice().sort(
    (a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)
  );
  const d = dateISO || new Date().toISOString().slice(0, 10);
  let picked = bands[0]?.rate ?? 15;
  for (const b of bands) {
    if (d >= b.effectiveFrom) picked = b.rate;
  }
  return Number(picked || 0);
}

/* -------------------- Date Helpers -------------------- */
// UK-style day-first string (26/08/2025)
export function fmtUK(isoOrDate) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : new Date(isoOrDate);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Full month label, e.g., "August 2025"
export function monthFull(isoYearMonth) {
  let y = 0, m = 0;
  if (/^\d{4}-\d{2}$/.test(isoYearMonth)) {
    y = Number(isoYearMonth.slice(0, 4));
    m = Number(isoYearMonth.slice(5, 7));
  } else {
    const d = new Date(isoYearMonth);
    y = d.getUTCFullYear();
    m = d.getUTCMonth() + 1;
  }
  const dt = new Date(Date.UTC(y, m - 1, 1));
  return dt.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
}

// Monday as the first day of the week
export function startOfWeekMon(dateObj) {
  const d = new Date(dateObj);
  const day = (d.getDay() + 6) % 7; // 0 => Monday
  const res = new Date(d);
  res.setDate(d.getDate() - day);
  res.setHours(0, 0, 0, 0);
  return res;
}

// ISO week number (1–53)
export function weekNumberISO(dateObj) {
  const d = new Date(Date.UTC(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo;
}

// Month key "YYYY-MM" from ISO date
export function monthKey(isoDate) {
  if (!isoDate) return "";
  return `${isoDate.slice(0, 7)}`;
}

// ISO string (YYYY-MM-DD) normalized to midnight local
export function fmtISO(dateObj) {
  const d = new Date(dateObj);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/* -------------------- Money -------------------- */
export function toMoney(n) {
  const x = Number(n || 0);
  return x.toFixed(2);
}

/* -------------------- Input Helpers (fix one-letter bug) -------------------- */
// Use these to avoid formatting while typing. Only format/clean onBlur.

export const passthrough = (setter) => (eOrValue) => {
  const v = eOrValue?.target ? eOrValue.target.value : eOrValue;
  setter(v);
};

export const titleCaseFirstOnBlur = (value) => {
  if (typeof value !== "string" || !value) return value ?? "";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const normalizeNumericOnBlur = (value) => {
  if (value == null) return "";
  const s = String(value);
  const cleaned = s.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  return parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("").replace(/\./g, "")}` : cleaned;
};

export const emailOnChange = passthrough;

// Generic onBlur formatter wrapper when using local state getters/setters
export const onBlurFormat = (getter, setter, formatter) => () => {
  setter(formatter(getter()));
};

/* -------------------- Phone Prefixes -------------------- */
export const PHONE_PREFIXES = [
  { label: "+352 (LU)", value: "+352" },
  { label: "+33 (FR)",  value: "+33"  },
  { label: "+32 (BE)",  value: "+32"  },
  { label: "+49 (DE)",  value: "+49"  },
  { label: "+41 (CH)",  value: "+41"  },
];

/* -------------------- Shared Modal Size -------------------- */
export const MODAL_SIZES = {
  workbench: {
    className: "w-[92vw] max-w-[1200px] h-[82vh]",
    contentClass: "h-full overflow-auto",
  },
};

/* -------------------- Recruiter Stats Helpers (NEW) -------------------- */

// Color by average rules you gave:
// ≥ 3.0 => green, ≥ 2.0 => amber, else red
export function avgColor(scores) {
  if (!scores || !scores.length) return "#6b7280"; // gray
  const avg = scores.reduce((a, b) => a + Number(b || 0), 0) / scores.length;
  if (avg >= 3) return "#16a34a"; // green-600
  if (avg >= 2) return "#f59e0b"; // amber-500
  return "#ef4444";               // red-500
}

// Percent split of Box2/Box4 over the last 8 weeks for a recruiter
export function boxPercentsLast8w(history, recId) {
  if (!Array.isArray(history) || !recId) return { b2: 0, b4: 0 };
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - 56); // ~8 weeks

  let b2 = 0, b4 = 0;
  for (const h of history) {
    const d = new Date(h.dateISO || h.date);
    if (h.recruiterId === recId && d >= cutoff) {
      const b2n = Number(h.box2_noDisc) || 0;
      const b2d = Number(h.box2_disc) || 0;
      const b4n = Number(h.box4_noDisc) || 0;
      const b4d = Number(h.box4_disc) || 0;
      b2 += b2n + b2d;
      b4 += b4n + b4d;
    }
  }
  const total = b2 + b4;
  if (total === 0) return { b2: 0, b4: 0 };
  return { b2: (b2 * 100) / total, b4: (b4 * 100) / total };
}

// Last 5 scores for a recruiter (oldest→newest preserved then sliced)
export function last5ScoresFor(history, recId) {
  if (!Array.isArray(history) || !recId) return [];
  const rows = history.filter(h => h.recruiterId === recId);
  // keep chronological order, then take last 5
  const last5 = rows.slice(-5).map(h => Number(h.score) || 0);
  return last5;
}
