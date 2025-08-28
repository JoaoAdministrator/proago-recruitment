// util.js — shared helpers (v2025-08-28d)

export const BRAND = {
  primary: "#d9010b",
  secondary: "#eb2a2a",
  accent: "#fca11c",
};

// Unified large work surface used by Edit Day & Recruiter Info
export const MODAL_SIZES = {
  workbench: {
    className: "w-[96vw] max-w-[1400px] h-[82vh]", // wider for “2x horizontally”
    contentClass: "h-full overflow-auto",
  },
};

// ---------- Formatting helpers (no formatting while typing; only onBlur) ----------
export const titleCaseFirstOnBlur = (value) => {
  if (typeof value !== "string" || !value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const normalizeNumericOnBlur = (value) => {
  if (value == null) return "";
  const cleaned = String(value).replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  return parts.length > 1
    ? `${parts[0]}.${parts.slice(1).join("").replace(/\./g, "")}`
    : cleaned;
};

export const passthrough = (setter) => (eOrVal) => {
  const v = eOrVal?.target ? eOrVal.target.value : eOrVal;
  setter(v);
};

export const onBlurFormat = (getter, setter, formatter) => () => {
  setter(formatter(getter()));
};

// Email: no transform while typing
export const emailOnChange = passthrough;

// ---------- Dates / months ----------
export const fullMonthName = (monthIndexOrDate, locale = "en-GB") => {
  const d =
    typeof monthIndexOrDate === "number"
      ? new Date(2000, monthIndexOrDate, 1)
      : new Date(monthIndexOrDate);
  try {
    return d.toLocaleString(locale, { month: "long" }); // e.g., “August”
  } catch {
    // fallback
    return [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December",
    ][d.getMonth()];
  }
};

// ---------- Data migrations ----------
/** shallow migrate recruiter objects role->rank */
export const migrateRoleToRank = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  if ("role" in obj && !("rank" in obj)) {
    obj.rank = obj.role;
    delete obj.role;
  }
  return obj;
};
