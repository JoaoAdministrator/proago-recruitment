// util.js — Proago CRM (Final Sync Build v2025-08-28b)
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
// Conversion prices (Income) for D2D/Event and discount/no-discount.
// Adjust freely in Settings page; these are safe fallbacks.
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
  // accepts "YYYY-MM" or any date-like ISO
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
  // Thursday in current week decides the year.
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
  // supports (event) or (value) style
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
// For Mobile prefix dropdowns in Inflow
export const PHONE_PREFIXES = [
  { label: "+352 (LU)", value: "+352" },
  { label: "+33 (FR)",  value: "+33"  },
  { label: "+32 (BE)",  value: "+32"  },
  { label: "+49 (DE)",  value: "+49"  },
  { label: "+41 (CH)",  value: "+41"  },
];

/* -------------------- Shared Modal Size -------------------- */
// Use the same large "workbench" surface for Edit Day & Recruiter Info
export const MODAL_SIZES = {
  workbench: {
    className: "w-[92vw] max-w-[1200px] h-[82vh]",
    contentClass: "h-full overflow-auto",
  },
};
