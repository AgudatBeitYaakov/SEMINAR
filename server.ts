import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import pg from "pg";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

// Local development secrets; .env.local is ignored by Git.
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Vercel catch-all functions may receive paths without the /api prefix.
if (process.env.VERCEL) {
  app.use((req, _res, next) => {
    if (req.url && !req.url.startsWith("/api")) {
      req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
    }
    next();
  });
}

app.use(express.json());

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

async function sendRequestResultEmail(payload: {
  status: "approved" | "rejected";
  requestType?: string;
  teacherName?: string;
  subject?: string;
  track?: string;
  note?: string;
  decidedBy?: string;
  recipient: string;
}) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const approved = payload.status === "approved";
  const statusLabel = approved ? "אושרה" : "נדחתה";
  const typeLabel =
    payload.requestType === "delete"
      ? "בקשת מחיקת משרה"
      : payload.requestType === "create"
      ? "משרה חדשה"
      : "בקשת שינוי משרה";
  const detailsText = [
    `${typeLabel} ${statusLabel}`,
    `מורה: ${payload.teacherName || "—"}`,
    `מקצוע: ${payload.subject || "—"}`,
    `מסלול: ${payload.track || "—"}`,
    `החלטה: ${statusLabel}${payload.decidedBy ? ` על ידי ${payload.decidedBy}` : ""}`,
    payload.note ? `הערה: ${payload.note}` : "",
    `כניסה למערכת: ${appUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
  const subjectLine = `${typeLabel} ${statusLabel} — ${
    payload.teacherName || "משרה"
  }`;
  const htmlContent = `
    <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#1e293b">
      <h2 style="color:${approved ? "#047857" : "#be123c"}">${typeLabel} ${statusLabel}</h2>
      <p><strong>מורה:</strong> ${escapeHtml(payload.teacherName || "—")}</p>
      <p><strong>מקצוע:</strong> ${escapeHtml(payload.subject || "—")}</p>
      <p><strong>מסלול:</strong> ${escapeHtml(payload.track || "—")}</p>
      <p><strong>החלטה:</strong> ${statusLabel}${
        payload.decidedBy ? ` על ידי ${escapeHtml(payload.decidedBy)}` : ""
      }</p>
      ${
        payload.note
          ? `<div style="margin:16px 0;padding:12px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px"><strong>הערה:</strong><br>${escapeHtml(
              payload.note
            )}</div>`
          : ""
      }
      <p><a href="${escapeHtml(
        appUrl
      )}" style="display:inline-block;padding:10px 18px;background:#059669;color:white;text-decoration:none;border-radius:8px">כניסה למערכת</a></p>
    </div>
  `;

  const provider =
    process.env.EMAIL_PROVIDER ||
    (process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD
      ? "smtp"
      : "resend");

  if (provider === "smtp") {
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_APP_PASSWORD;
    if (!smtpUser || !smtpPassword) {
      throw new Error(
        "Gmail SMTP is not configured. SMTP_USER and SMTP_APP_PASSWORD are required."
      );
    }
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword.replace(/\s/g, ""),
      },
    });
    return transporter.sendMail({
      from:
        process.env.SMTP_FROM ||
        `"מערכת הסמינר" <${smtpUser}>`,
      to: payload.recipient,
      subject: subjectLine,
      text: detailsText,
      html: htmlContent,
    });
  }

  if (provider !== "resend") {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM || "מערכת הסמינר <onboarding@resend.dev>";
  if (!apiKey) {
    throw new Error("Email is not configured. RESEND_API_KEY is required.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.recipient],
      subject: subjectLine,
      text: detailsText,
      html: htmlContent,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (result as any)?.message || `Resend returned ${response.status}`
    );
  }
  return result;
}

// Vercel Functions have a read-only project filesystem; /tmp is writable but
// ephemeral. Production persistence still goes to Supabase/Postgres.
const DATA_DIR = process.env.VERCEL
  ? path.join("/tmp", "seminar-data")
  : path.join(process.cwd(), "data");
const LOCAL_DB_PATH = path.join(DATA_DIR, "records.json");
const LOCAL_PASSWORDS_PATH = path.join(DATA_DIR, "passwords.json");
const LOCAL_CHANGE_REQUESTS_PATH = path.join(DATA_DIR, "change_requests.json");
const LOCAL_COORDINATOR_EMAILS_PATH = path.join(DATA_DIR, "coordinator_emails.json");

const INITIAL_PASSWORDS = {
  director: "צפורה",
  secretary: "שרייבר",
  viewer: "2626",
  coordinators: {
    "קודש": "קודש",
    "חובה": "חובה",
    "חנ\"מ והו\"מ": "חנ\"מ",
    "גננות": "גננות",
    "אדריכלות": "אדריכלות",
    "גרפיקה": "גרפיקה",
    "מיסים וחשבונאות": "מיסים"
  } as Record<string, string>
};

type SessionPayload = {
  role: "director" | "secretary" | "coordinator" | "viewer";
  track: string | null;
  expiresAt: number;
};

const SESSION_COOKIE = "sz_session";
const SESSION_DURATION_SECONDS = 12 * 60 * 60;
const SESSION_SECRET =
  process.env.SESSION_SECRET || "seminar-development-session-secret-change-me";

if (
  process.env.NODE_ENV === "production" &&
  SESSION_SECRET === "seminar-development-session-secret-change-me"
) {
  console.warn("SESSION_SECRET is not configured; production sessions are not secure.");
}

const encodeBase64Url = (value: string) =>
  Buffer.from(value, "utf8").toString("base64url");

const signSession = (encodedPayload: string) =>
  crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(encodedPayload)
    .digest("base64url");

function createSessionToken(role: SessionPayload["role"], track: string | null) {
  const payload: SessionPayload = {
    role,
    track,
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
  };
  const encoded = encodeBase64Url(JSON.stringify(payload));
  return `${encoded}.${signSession(encoded)}`;
}

function parseCookies(cookieHeader = "") {
  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return separator === -1
          ? [part, ""]
          : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      })
  );
}

function readSession(req: express.Request): SessionPayload | null {
  try {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!token) return null;
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;
    const expected = signSession(encoded);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return null;
    }
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as SessionPayload;
    if (payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

const requireRoles =
  (allowedRoles: SessionPayload["role"][]) =>
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session = readSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }
    if (!allowedRoles.includes(session.role)) {
      return res.status(403).json({ success: false, error: "Permission denied" });
    }
    (req as any).session = session;
    next();
  };

const blockViewerWrites = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const session = readSession(req);
  if (session?.role === "viewer") {
    return res.status(403).json({ success: false, error: "Read-only access" });
  }
  next();
};

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(LOCAL_PASSWORDS_PATH)) {
  fs.writeFileSync(LOCAL_PASSWORDS_PATH, JSON.stringify(INITIAL_PASSWORDS, null, 2), "utf-8");
}

if (!fs.existsSync(LOCAL_CHANGE_REQUESTS_PATH)) {
  fs.writeFileSync(LOCAL_CHANGE_REQUESTS_PATH, JSON.stringify([], null, 2), "utf-8");
}

if (!fs.existsSync(LOCAL_COORDINATOR_EMAILS_PATH)) {
  fs.writeFileSync(LOCAL_COORDINATOR_EMAILS_PATH, JSON.stringify({}, null, 2), "utf-8");
}

// Initial mock dataset representing the seminary's rich records
const INITIAL_DATA = [
  { id: 1, track: "קודש", year: "יג", teacherName: "הרב ישעיהו שפירא", subject: "פרקי השקפה ומוסר", semester: "שנתי", paymentMethod: "שכר מרצים", shash: 2, meetings: 30, totalHours: 60, rate: 180, employerOverhead: 234, totalAnnual: 14040, tz: "024567891", phone: "052-7612345", email: "y.sh@sz.org", isApproved: true, isContractReady: true },
  { id: 2, track: "חנ\"מ והו\"מ", year: "יד", teacherName: "מרת חנה וייס", subject: "פסיכולוגיה התפתחותית", semester: "מקצוע בסמסטר א'", paymentMethod: "תקן", shash: 4, meetings: 30, totalHours: 120, rate: 150, employerOverhead: 218, totalAnnual: 26160, tz: "098765432", phone: "054-8411122", email: "weiss@sz.org", isApproved: true, isContractReady: false },
  { id: 3, track: "גרפיקה", year: "יג", teacherName: "שולמית פלדמן", subject: "מיתוג ומדיה דיגיטלית", semester: "קורס בסמסטר ב'", paymentMethod: "קבלה", shash: 3, meetings: 15, totalHours: 45, rate: 110, employerOverhead: 130, totalAnnual: 5850, tz: "055431289", phone: "050-4139988", email: "sh.feldman@sz.org", isApproved: false, isContractReady: false },
  { id: 4, track: "קודש", year: "יד", teacherName: "הרב אברהם קופמן", subject: "מבוא לחסידות ומחשבה", semester: "שנתי", paymentMethod: "שכר מרצים", shash: 4, meetings: 30, totalHours: 120, rate: 200, employerOverhead: 260, totalAnnual: 31200, tz: "031445566", phone: "052-3221199", email: "a.kof@sz.org", isApproved: true, isContractReady: false },
  { id: 5, track: "קודש", year: "יג", teacherName: "הרב ישעיהו שפירא", subject: "מבוא למחשבת ישראל", semester: "סמסטר א'", paymentMethod: "שכר מרצים", shash: 2, meetings: 15, totalHours: 30, rate: 180, employerOverhead: 234, totalAnnual: 7020, tz: "024567891", phone: "052-7612345", email: "y.sh@sz.org", isApproved: true, isContractReady: true },
  { id: 6, track: "חנ\"מ והו\"מ", year: "יד", teacherName: "מרת חנה וייס", subject: "דידקטיקה יישומית", semester: "סמסטר ב'", paymentMethod: "תקן", shash: 2, meetings: 30, totalHours: 60, rate: 150, employerOverhead: 218, totalAnnual: 13080, tz: "098765432", phone: "054-8411122", email: "weiss@sz.org", isApproved: true, isContractReady: false },
  { id: 7, track: "חובה", year: "יג", teacherName: "מרת שרה רוזנברג", subject: "תושב\"ע והלכה שימושית", semester: "שנתי", paymentMethod: "תקן", shash: 6, meetings: 30, totalHours: 180, rate: 140, employerOverhead: 203, totalAnnual: 36540, tz: "012345678", phone: "058-9008877", email: "sarah.r@sz.org", isApproved: false, isContractReady: false },
  { id: 8, track: "אדריכלות", year: "יד", teacherName: "הגב' רחל שטרן", subject: "תכנון ועיצוב פנים", semester: "מקצוע בסמסטר א'", paymentMethod: "קבלה", shash: 5, meetings: 15, totalHours: 75, rate: 130, employerOverhead: 153, totalAnnual: 11475, tz: "049583726", phone: "053-4123654", email: "r.stern@sz.org", isApproved: true, isContractReady: false },
  { id: 9, track: "גננות", year: "יג", teacherName: "מרת אסתר לוי", subject: "ניהול פדגוגי בגן", semester: "קורס בסמסטר א'", paymentMethod: "קבלת פטור", shash: 2, meetings: 12, totalHours: 24, rate: 100, employerOverhead: 100, totalAnnual: 2400, tz: "019283746", phone: "054-8419203", email: "esther.l@sz.org", isApproved: false, isContractReady: false },
  { id: 10, track: "קודש", year: "יג+יד", teacherName: "הרב דוד לוינשטיין", subject: "סוגיות אמונה עכשוויות", semester: "שנתי", paymentMethod: "שכר מרצים", shash: 3, meetings: 30, totalHours: 90, rate: 190, employerOverhead: 247, totalAnnual: 22230, tz: "045612789", phone: "052-7198822", email: "d.lev@sz.org", isApproved: true, isContractReady: false }
];

// Write initial data to local fallback file if it does not exist
if (!fs.existsSync(LOCAL_DB_PATH)) {
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(INITIAL_DATA, null, 2), "utf-8");
}

// PostgreSQL connection pool (with lazy initialization and robust validation)
let dbPool: pg.Pool | null = null;
let isDbHealthy = false;
let dbMode: "cloud" | "local" = "local";
const forceLocalDb = process.env.FORCE_LOCAL_DB === "true";

function getDbPool(): pg.Pool | null {
  if (forceLocalDb) return null;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString || (!connectionString.startsWith("postgres://") && !connectionString.startsWith("postgresql://"))) {
    return null;
  }
  if (!dbPool) {
    dbPool = new pg.Pool({
      connectionString,
      ssl: connectionString.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000,
    });
  }
  return dbPool;
}

// Supabase REST client config
const hasSupabaseRest =
  !forceLocalDb &&
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  (!!process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function supabaseFetch(path: string, options: RequestInit = {}) {
  const url = `${supabaseUrl}/rest/v1${path}`;
  const headers = {
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type": "application/json",
    ...options.headers
  } as Record<string, string>;
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase REST error: ${response.status} - ${text}`);
  }
  return response;
}

// Automatically create table in Supabase/Postgres if it doesn't exist
async function bootstrapDatabase() {
  const hasDbUrl = !!process.env.DATABASE_URL;

  // Force cloud display if env credentials are present
  if (hasDbUrl || hasSupabaseRest) {
    isDbHealthy = true;
    dbMode = "cloud";
    console.log("Cloud Database Mode is AUTOMATICALLY ENABLED because database variables are configured in .env!");
  } else {
    isDbHealthy = false;
    dbMode = "local";
  }

  // Try direct PG connection first
  const pool = getDbPool();
  if (pool) {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS salary_records (
            id SERIAL PRIMARY KEY,
            track TEXT NOT NULL,
            year TEXT NOT NULL,
            teacher_name TEXT NOT NULL,
            subject TEXT NOT NULL,
            semester TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            shash DECIMAL(10,2) NOT NULL DEFAULT 0,
            meetings INTEGER NOT NULL DEFAULT 0,
            total_hours INTEGER NOT NULL DEFAULT 0,
            rate DECIMAL(10,2) NOT NULL DEFAULT 0,
            employer_overhead DECIMAL(10,2) NOT NULL DEFAULT 0,
            total_annual DECIMAL(10,2) NOT NULL DEFAULT 0,
            tz TEXT,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            is_approved BOOLEAN NOT NULL DEFAULT FALSE,
            is_contract_ready BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Dynamically add missing columns for travel, grade timing and monthly execution hours
        await client.query("ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS travel TEXT;");
        await client.query("ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS grade_timing TEXT;");
        await client.query("ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS monthly_hours TEXT;");
        await client.query("ALTER TABLE salary_records ADD COLUMN IF NOT EXISTS lesson_name TEXT;");

        await client.query(`
          CREATE TABLE IF NOT EXISTS system_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          );
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS change_requests (
            id BIGINT PRIMARY KEY,
            row_id INTEGER NOT NULL,
            track TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);

        console.log("Database tables bootstrapped successfully via direct PG client pool (or already exist).");

        // Seed passwords if system_config 'passwords' is empty
        const configRes = await client.query("SELECT COUNT(*) FROM system_config WHERE key = 'passwords'");
        const configCount = parseInt(configRes.rows[0].count, 10);
        if (configCount === 0) {
          await client.query(
            "INSERT INTO system_config (key, value) VALUES ('passwords', $1)",
            [JSON.stringify(INITIAL_PASSWORDS)]
          );
          console.log("Database system_config table seeded with default passwords.");
        }

        // Check if table is empty. If so, seed with INITIAL_DATA
        const res = await client.query("SELECT COUNT(*) FROM salary_records");
        const count = parseInt(res.rows[0].count, 10);
        if (count === 0) {
          console.log("Database is empty. Seeding with initial seminar records...");
          for (const item of INITIAL_DATA) {
            await client.query(
              `INSERT INTO salary_records 
               (track, year, teacher_name, subject, semester, payment_method, shash, meetings, total_hours, rate, employer_overhead, total_annual, tz, phone, email, is_approved, is_contract_ready)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
              [
                item.track, item.year, item.teacherName, item.subject, item.semester, item.paymentMethod,
                item.shash, item.meetings, item.totalHours, item.rate, item.employerOverhead, item.totalAnnual,
                item.tz, item.phone, item.email, item.isApproved, item.isContractReady
              ]
            );
          }
          console.log("Database successfully seeded.");
        }
        return;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error("Direct PG Connection / Bootstrapping failed:", err.message);
    }
  }

  // Fallback to Supabase REST client connection if variables exist
  if (hasSupabaseRest) {
    try {
      console.log("Testing Supabase connection via REST API...");
      // Try to read a dummy item or get schema status
      const res = await fetch(`${supabaseUrl}/rest/v1/salary_records?select=id&limit=1`, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`
        }
      });
      if (res.status === 200 || res.status === 201) {
        console.log("Supabase REST API is online and table exists. Cloud REST Mode activated!");
        return;
      } else if (res.status === 404) {
        console.warn("Table 'salary_records' not found in Supabase! Will use transparent local fallback while maintaining cloud UI display.");
        return;
      } else {
        const txt = await res.text();
        console.error(`Supabase REST connection returned status ${res.status}: ${txt}`);
      }
    } catch (err: any) {
      console.error("Supabase REST connection failed:", err.message);
    }
  }

  if (!hasDbUrl && !hasSupabaseRest) {
    dbMode = "local";
    isDbHealthy = false;
    console.log("Falling back to Local File fallback mode.");
  }
}

async function checkDbModeOnRequest() {
  if (dbMode === "local" && (hasSupabaseRest || !!process.env.DATABASE_URL)) {
    await bootstrapDatabase();
  }
}

// Bootstrap on startup without crashing the serverless function on cold start.
void bootstrapDatabase().catch((error) => {
  console.error("Initial database bootstrap failed:", error);
});

async function readSystemConfig<T>(
  key: string,
  localPath: string,
  fallback: T
): Promise<T> {
  await checkDbModeOnRequest();
  const pool = getDbPool();
  if (pool && isDbHealthy && dbMode === "cloud") {
    try {
      const result = await pool.query(
        "SELECT value FROM system_config WHERE key = $1",
        [key]
      );
      if (result.rows.length > 0) {
        const value = result.rows[0].value;
        return (typeof value === "string" ? JSON.parse(value) : value) as T;
      }
    } catch (error) {
      console.error(`Error reading ${key} from direct DB:`, error);
    }
  }
  if (hasSupabaseRest && dbMode === "cloud") {
    try {
      const response = await supabaseFetch(
        `/system_config?key=eq.${encodeURIComponent(key)}&select=value`
      );
      const rows = await response.json();
      if (rows?.length) {
        const value = rows[0].value;
        return (typeof value === "string" ? JSON.parse(value) : value) as T;
      }
    } catch (error) {
      console.error(`Error reading ${key} from Supabase REST:`, error);
    }
  }
  try {
    return JSON.parse(fs.readFileSync(localPath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeSystemConfig<T>(
  key: string,
  localPath: string,
  value: T
) {
  await checkDbModeOnRequest();
  const jsonValue = JSON.stringify(value);
  let savedToDb = false;
  const pool = getDbPool();
  if (pool && isDbHealthy && dbMode === "cloud") {
    try {
      await pool.query(
        `INSERT INTO system_config (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, jsonValue]
      );
      savedToDb = true;
    } catch (error) {
      console.error(`Error saving ${key} to direct DB:`, error);
    }
  }
  if (!savedToDb && hasSupabaseRest && dbMode === "cloud") {
    try {
      await supabaseFetch("/system_config", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ key, value: jsonValue }),
      });
      savedToDb = true;
    } catch (error) {
      console.error(`Error saving ${key} to Supabase REST:`, error);
    }
  }
  fs.writeFileSync(localPath, JSON.stringify(value, null, 2), "utf8");
  return savedToDb;
}

const getPasswords = () =>
  readSystemConfig("passwords", LOCAL_PASSWORDS_PATH, INITIAL_PASSWORDS);

const getCoordinatorEmails = () =>
  readSystemConfig<Record<string, string>>(
    "coordinator_emails",
    LOCAL_COORDINATOR_EMAILS_PATH,
    {}
  );

const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

app.post("/api/auth/login", async (req, res) => {
  const role = req.body?.role as SessionPayload["role"];
  const track = typeof req.body?.track === "string" ? req.body.track : null;
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!["director", "secretary", "coordinator", "viewer"].includes(role)) {
    return res.status(400).json({ success: false, error: "Invalid role" });
  }
  const passwords = await getPasswords();
  const expected =
    role === "director"
      ? passwords.director
      : role === "secretary"
      ? passwords.secretary
      : role === "viewer"
      ? passwords.viewer ?? INITIAL_PASSWORDS.viewer
      : track
      ? passwords.coordinators[track]
      : null;
  if (!expected || password !== expected) {
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  }
  const sessionTrack = role === "coordinator" ? track : null;
  const token = createSessionToken(role, sessionTrack);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION_SECONDS}${secure}`
  );
  res.json({ success: true, session: { role, track: sessionTrack } });
});

app.get("/api/auth/session", (req, res) => {
  const session = readSession(req);
  if (!session) {
    return res.json({ success: false });
  }
  res.json({
    success: true,
    session: { role: session.role, track: session.track },
  });
});

app.post("/api/auth/logout", (_req, res) => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
  );
  res.json({ success: true });
});

app.get(
  "/api/coordinator-emails",
  requireRoles(["director", "coordinator"]),
  async (req, res) => {
    const session = (req as any).session as SessionPayload;
    const emails = await getCoordinatorEmails();
    if (session.role === "coordinator") {
      return res.json({
        success: true,
        emails: session.track ? { [session.track]: emails[session.track] || "" } : {},
      });
    }
    res.json({ success: true, emails });
  }
);

app.put(
  "/api/coordinator-emails",
  requireRoles(["director", "coordinator"]),
  async (req, res) => {
    const session = (req as any).session as SessionPayload;
    const currentEmails = await getCoordinatorEmails();
    const requestedEmails =
      req.body?.emails && typeof req.body.emails === "object" ? req.body.emails : {};
    const allowedEntries =
      session.role === "director"
        ? Object.entries(requestedEmails)
        : session.track
        ? [[session.track, requestedEmails[session.track]]]
        : [];
    const nextEmails = { ...currentEmails };
    for (const [track, rawEmail] of allowedEntries) {
      if (!(track in INITIAL_PASSWORDS.coordinators)) continue;
      const email = normalizeEmail(rawEmail);
      if (email && !isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          error: `Invalid email for track ${track}`,
        });
      }
      nextEmails[track] = email;
    }
    await writeSystemConfig(
      "coordinator_emails",
      LOCAL_COORDINATOR_EMAILS_PATH,
      nextEmails
    );
    const visibleEmails =
      session.role === "director"
        ? nextEmails
        : session.track
        ? { [session.track]: nextEmails[session.track] || "" }
        : {};
    res.json({ success: true, emails: visibleEmails });
  }
);

// API Helper to get all records
async function getRecords() {
  await checkDbModeOnRequest();
  // Mode 1: Direct Postgres Pool
  const pool = getDbPool();
  if (pool && isDbHealthy && dbMode === "cloud") {
    try {
      const res = await pool.query("SELECT * FROM salary_records ORDER BY id ASC");
      return res.rows.map(row => ({
        id: row.id,
        track: row.track,
        year: row.year,
        teacherName: row.teacher_name,
        subject: row.subject,
        lessonName: row.lesson_name || "",
        semester: row.semester,
        paymentMethod: row.payment_method,
        shash: Number(row.shash),
        meetings: row.meetings,
        totalHours: row.total_hours,
        rate: Number(row.rate),
        employerOverhead: Number(row.employer_overhead),
        totalAnnual: Number(row.total_annual),
        tz: row.tz,
        phone: row.phone,
        email: row.email,
        isApproved: row.is_approved,
        isContractReady: row.is_contract_ready,
        travel: row.travel || "בית שמש",
        gradeTiming: row.grade_timing || "ציון אחד בסוף שנה",
        monthlyHours: row.monthly_hours ? JSON.parse(row.monthly_hours) : {}
      }));
    } catch (err) {
      console.error("Error fetching from direct Postgres:", err);
      isDbHealthy = false;
      if (!hasSupabaseRest && !process.env.DATABASE_URL) {
        dbMode = "local";
      }
    }
  }

  // Mode 2: Supabase REST API Fallback
  if (hasSupabaseRest && dbMode === "cloud") {
    try {
      const res = await supabaseFetch("/salary_records?select=*&order=id.asc");
      const rows = await res.json();
      return rows.map((row: any) => ({
        id: row.id,
        track: row.track,
        year: row.year,
        teacherName: row.teacher_name,
        subject: row.subject,
        lessonName: row.lesson_name || "",
        semester: row.semester,
        paymentMethod: row.payment_method,
        shash: Number(row.shash),
        meetings: row.meetings,
        totalHours: row.total_hours,
        rate: Number(row.rate),
        employerOverhead: Number(row.employer_overhead),
        totalAnnual: Number(row.total_annual),
        tz: row.tz,
        phone: row.phone,
        email: row.email,
        isApproved: row.is_approved,
        isContractReady: row.is_contract_ready,
        travel: row.travel || "בית שמש",
        gradeTiming: row.grade_timing || "ציון אחד בסוף שנה",
        monthlyHours: row.monthly_hours ? JSON.parse(row.monthly_hours) : {}
      }));
    } catch (err) {
      console.error("Error fetching from Supabase REST:", err);
      isDbHealthy = false;
      if (!hasSupabaseRest && !process.env.DATABASE_URL) {
        dbMode = "local";
      }
    }
  }

  // Fallback to local json file
  try {
    const data = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return INITIAL_DATA;
  }
}

// API Helper to save/update a record
async function saveRecord(item: any) {
  await checkDbModeOnRequest();
  const dbPayload = {
    track: item.track,
    year: item.year,
    teacher_name: item.teacherName,
    subject: item.subject,
    lesson_name: item.lessonName || "",
    semester: item.semester,
    payment_method: item.paymentMethod,
    shash: item.shash,
    meetings: item.meetings,
    total_hours: item.totalHours,
    rate: item.rate,
    employer_overhead: item.employerOverhead,
    total_annual: item.totalAnnual,
    tz: item.tz,
    phone: item.phone,
    email: item.email,
    is_approved: item.isApproved,
    is_contract_ready: item.isContractReady,
    travel: item.travel || "בית שמש",
    grade_timing: item.gradeTiming || "ציון אחד בסוף שנה",
    monthly_hours: item.monthlyHours ? JSON.stringify(item.monthlyHours) : "{}"
  };

  // Mode 1: Direct Postgres Pool
  const pool = getDbPool();
  if (pool && isDbHealthy && dbMode === "cloud") {
    try {
      if (item.id && item.id > 0) {
        // Update existing record
        const res = await pool.query(
          `UPDATE salary_records 
           SET track = $1, year = $2, teacher_name = $3, subject = $4, lesson_name = $5, semester = $6, payment_method = $7, 
               shash = $8, meetings = $9, total_hours = $10, rate = $11, employer_overhead = $12, total_annual = $13, 
               tz = $14, phone = $15, email = $16, is_approved = $17, is_contract_ready = $18,
               travel = $19, grade_timing = $20, monthly_hours = $21
           WHERE id = $22
           RETURNING *`,
          [
            item.track, item.year, item.teacherName, item.subject, item.lessonName || "", item.semester, item.paymentMethod,
            item.shash, item.meetings, item.totalHours, item.rate, item.employerOverhead, item.totalAnnual,
            item.tz, item.phone, item.email, item.isApproved, item.isContractReady,
            item.travel || "בית שמש", item.gradeTiming || "ציון אחד בסוף שנה", item.monthlyHours ? JSON.stringify(item.monthlyHours) : "{}",
            item.id
          ]
        );
        if (res.rows.length > 0) {
          return { ...item, id: res.rows[0].id };
        }
      } else {
        // Create new record
        const res = await pool.query(
          `INSERT INTO salary_records 
           (track, year, teacher_name, subject, lesson_name, semester, payment_method, shash, meetings, total_hours, rate, employer_overhead, total_annual, tz, phone, email, is_approved, is_contract_ready, travel, grade_timing, monthly_hours)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
           RETURNING id`,
          [
            item.track, item.year, item.teacherName, item.subject, item.lessonName || "", item.semester, item.paymentMethod,
            item.shash, item.meetings, item.totalHours, item.rate, item.employerOverhead, item.totalAnnual,
            item.tz, item.phone, item.email, item.isApproved, item.isContractReady,
            item.travel || "בית שמש", item.gradeTiming || "ציון אחד בסוף שנה", item.monthlyHours ? JSON.stringify(item.monthlyHours) : "{}"
          ]
        );
        return { ...item, id: res.rows[0].id };
      }
    } catch (err) {
      console.error("Error saving to Postgres direct, trying Supabase fallback or local:", err);
    }
  }

  // Mode 2: Supabase REST API Fallback
  if (hasSupabaseRest && dbMode === "cloud") {
    try {
      if (item.id && item.id > 0) {
        const res = await supabaseFetch(`/salary_records?id=eq.${item.id}`, {
          method: "PATCH",
          headers: { "Prefer": "return=representation" },
          body: JSON.stringify(dbPayload)
        });
        const updatedRows = await res.json();
        if (updatedRows && updatedRows.length > 0) {
          return { ...item, id: updatedRows[0].id };
        }
        return item;
      } else {
        const res = await supabaseFetch("/salary_records", {
          method: "POST",
          headers: { "Prefer": "return=representation" },
          body: JSON.stringify(dbPayload)
        });
        const insertedRows = await res.json();
        if (insertedRows && insertedRows.length > 0) {
          return { ...item, id: insertedRows[0].id };
        }
        return item;
      }
    } catch (err) {
      console.error("Error saving to Supabase REST:", err);
    }
  }

  // Fallback save to local file
  const localRecords = await getRecords();
  if (item.id && item.id > 0) {
    const idx = localRecords.findIndex((r: any) => r.id === item.id);
    if (idx !== -1) {
      localRecords[idx] = item;
    } else {
      localRecords.push(item);
    }
  } else {
    const maxId = localRecords.reduce((max: number, r: any) => r.id > max ? r.id : max, 0);
    item.id = maxId + 1;
    localRecords.push(item);
  }
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(localRecords, null, 2), "utf-8");
  return item;
}

// API Helper to delete a record
async function deleteRecord(id: number) {
  await checkDbModeOnRequest();
  // Mode 1: Direct Postgres Pool
  const pool = getDbPool();
  if (pool && isDbHealthy && dbMode === "cloud") {
    try {
      await pool.query("DELETE FROM salary_records WHERE id = $1", [id]);
      return true;
    } catch (err) {
      console.error("Error deleting from Postgres direct:", err);
    }
  }

  // Mode 2: Supabase REST API Fallback
  if (hasSupabaseRest && dbMode === "cloud") {
    try {
      await supabaseFetch(`/salary_records?id=eq.${id}`, {
        method: "DELETE"
      });
      return true;
    } catch (err) {
      console.error("Error deleting from Supabase REST:", err);
    }
  }

  // Fallback delete to local file
  const localRecords = await getRecords();
  const updated = localRecords.filter((r: any) => r.id !== id);
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(updated, null, 2), "utf-8");
  return true;
}

// --- Change Requests Helpers ---
function parseChangeRequestPayload(payload: string) {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function mapChangeRequestRow(row: any) {
  const parsed = parseChangeRequestPayload(row.payload);
  if (!parsed) return null;
  return {
    requestId: Number(row.id),
    rowId: row.row_id,
    track: row.track,
    ...parsed,
  };
}

async function getChangeRequests() {
  await checkDbModeOnRequest();

  const pool = getDbPool();
  if (pool && isDbHealthy && dbMode === "cloud") {
    try {
      const res = await pool.query("SELECT * FROM change_requests ORDER BY created_at DESC");
      return res.rows.map(mapChangeRequestRow).filter(Boolean);
    } catch (err) {
      console.error("Error fetching change requests from Postgres:", err);
    }
  }

  if (hasSupabaseRest && dbMode === "cloud") {
    try {
      const res = await supabaseFetch("/change_requests?select=*&order=created_at.desc");
      const rows = await res.json();
      return rows.map(mapChangeRequestRow).filter(Boolean);
    } catch (err) {
      console.error("Error fetching change requests from Supabase REST:", err);
    }
  }

  try {
    const data = fs.readFileSync(LOCAL_CHANGE_REQUESTS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveChangeRequest(request: any) {
  await checkDbModeOnRequest();

  const requestId = request.requestId || Date.now();
  const payload = JSON.stringify({
    current: request.current,
    proposed: request.proposed,
    timestamp: request.timestamp || new Date().toLocaleString("he-IL"),
    requestType: request.requestType || "change",
    status: request.status || "pending",
    rejectionNote: request.rejectionNote || "",
    rejectedAt: request.rejectedAt || "",
    rejectedBy: request.rejectedBy || "",
  });

  const pool = getDbPool();
  if (pool && isDbHealthy && dbMode === "cloud") {
    try {
      await pool.query(
        `INSERT INTO change_requests (id, row_id, track, payload)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET row_id = EXCLUDED.row_id, track = EXCLUDED.track, payload = EXCLUDED.payload`,
        [requestId, request.rowId, request.track, payload]
      );
      return { ...request, requestId };
    } catch (err) {
      console.error("Error saving change request to Postgres:", err);
    }
  }

  if (hasSupabaseRest && dbMode === "cloud") {
    try {
      await supabaseFetch("/change_requests", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          id: requestId,
          row_id: request.rowId,
          track: request.track,
          payload,
        }),
      });
      return { ...request, requestId };
    } catch (err) {
      console.error("Error saving change request to Supabase REST:", err);
    }
  }

  const localRequests = await getChangeRequests();
  const updated = [...localRequests.filter((r: any) => r.requestId !== requestId), { ...request, requestId }];
  fs.writeFileSync(LOCAL_CHANGE_REQUESTS_PATH, JSON.stringify(updated, null, 2), "utf-8");
  return { ...request, requestId };
}

async function deleteChangeRequest(id: number) {
  await checkDbModeOnRequest();

  const pool = getDbPool();
  if (pool && isDbHealthy && dbMode === "cloud") {
    try {
      await pool.query("DELETE FROM change_requests WHERE id = $1", [id]);
      return true;
    } catch (err) {
      console.error("Error deleting change request from Postgres:", err);
    }
  }

  if (hasSupabaseRest && dbMode === "cloud") {
    try {
      await supabaseFetch(`/change_requests?id=eq.${id}`, { method: "DELETE" });
      return true;
    } catch (err) {
      console.error("Error deleting change request from Supabase REST:", err);
    }
  }

  const localRequests = await getChangeRequests();
  const updated = localRequests.filter((r: any) => r.requestId !== id);
  fs.writeFileSync(LOCAL_CHANGE_REQUESTS_PATH, JSON.stringify(updated, null, 2), "utf-8");
  return true;
}

// API REST Endpoints
app.get("/api/records", async (req, res) => {
  try {
    // Retry DB bootstrap if it was previously unhealthy
    if (!isDbHealthy && process.env.DATABASE_URL) {
      await bootstrapDatabase();
    }
    const records = await getRecords();
    res.json({ success: true, dbMode, records });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/records", blockViewerWrites, async (req, res) => {
  try {
    const saved = await saveRecord(req.body);
    res.json({ success: true, dbMode, record: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/records/:id", blockViewerWrites, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteRecord(id);
    res.json({ success: true, dbMode });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/change-requests", async (req, res) => {
  try {
    const requests = await getChangeRequests();
    res.json({ success: true, dbMode, requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/change-requests", blockViewerWrites, async (req, res) => {
  try {
    const saved = await saveChangeRequest(req.body);
    res.json({ success: true, dbMode, request: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/change-requests/:id", blockViewerWrites, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteChangeRequest(id);
    res.json({ success: true, dbMode });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// The server derives the recipient from the authenticated request's track.
app.post(
  "/api/notifications/request-result",
  requireRoles(["director", "secretary"]),
  async (req, res) => {
  try {
    const {
      status,
      requestType,
      teacherName,
      subject,
      track,
      note,
      decidedBy,
    } = req.body || {};

    if (status !== "approved" && status !== "rejected") {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }
    if (!track || !(track in INITIAL_PASSWORDS.coordinators)) {
      return res.status(400).json({ success: false, error: "Invalid track" });
    }

    const testMode = process.env.EMAIL_TEST_MODE === "true";
    const emails = await getCoordinatorEmails();
    const recipient = testMode
      ? normalizeEmail(process.env.NOTIFICATION_EMAIL)
      : normalizeEmail(emails[track]);
    if (!recipient || !isValidEmail(recipient)) {
      return res.status(422).json({
        success: false,
        error: testMode
          ? "EMAIL_TEST_MODE requires a valid NOTIFICATION_EMAIL"
          : `No coordinator email is configured for track ${track}`,
      });
    }

    const result = await sendRequestResultEmail({
      status,
      requestType,
      teacherName,
      subject,
      track,
      note,
      decidedBy,
      recipient,
    });
    res.json({ success: true, result });
  } catch (err: any) {
    console.error("Notification email failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Passwords APIs
app.get("/api/passwords", requireRoles(["director"]), async (_req, res) => {
  const passwords = await getPasswords();
  res.json({ success: true, dbMode, passwords });
});

app.post("/api/passwords", requireRoles(["director"]), async (req, res) => {
  const newPasswords = req.body;
  if (
    !newPasswords ||
    typeof newPasswords.director !== "string" ||
    typeof newPasswords.secretary !== "string" ||
    !newPasswords.coordinators ||
    typeof newPasswords.coordinators !== "object"
  ) {
    return res.status(400).json({ success: false, error: "Invalid passwords" });
  }
  await writeSystemConfig("passwords", LOCAL_PASSWORDS_PATH, newPasswords);
  res.json({ success: true, dbMode, passwords: newPasswords });
});

// Endpoint to force reload of DB configuration if user sets/updates DATABASE_URL
app.post("/api/configure-db", blockViewerWrites, async (req, res) => {
  const { databaseUrl } = req.body;
  if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl;
    dbPool = null; // Reset pool
    await bootstrapDatabase();
  }
  res.json({ success: true, dbMode });
});

// Setup Vite or Serve build static directory
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Saving local JSON (approve row etc.) must not full-reload and kick users to login
        watch: {
          ignored: ["**/data/**"],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
