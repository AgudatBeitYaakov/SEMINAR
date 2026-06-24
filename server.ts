import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Path for local storage fallback when no DATABASE_URL is provided
const DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_DB_PATH = path.join(DATA_DIR, "records.json");

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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

function getDbPool(): pg.Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
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

// Automatically create table in Supabase/Postgres if it doesn't exist
async function bootstrapDatabase() {
  const pool = getDbPool();
  if (!pool) return;
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
      isDbHealthy = true;
      console.log("Database table bootstrapped successfully (or already exists).");

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
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Database bootstrapping failed, falling back to local storage:", err);
    isDbHealthy = false;
  }
}

// Bootstrap on startup
bootstrapDatabase();

// API Helper to get all records
async function getRecords() {
  const pool = getDbPool();
  if (pool && isDbHealthy) {
    try {
      const res = await pool.query("SELECT * FROM salary_records ORDER BY id ASC");
      return res.rows.map(row => ({
        id: row.id,
        track: row.track,
        year: row.year,
        teacherName: row.teacher_name,
        subject: row.subject,
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
        isContractReady: row.is_contract_ready
      }));
    } catch (err) {
      console.error("Error fetching from Postgres, loading fallback file:", err);
      isDbHealthy = false;
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
  const pool = getDbPool();
  if (pool && isDbHealthy) {
    try {
      if (item.id && item.id > 0) {
        // Update existing record
        const res = await pool.query(
          `UPDATE salary_records 
           SET track = $1, year = $2, teacher_name = $3, subject = $4, semester = $5, payment_method = $6, 
               shash = $7, meetings = $8, total_hours = $9, rate = $10, employer_overhead = $11, total_annual = $12, 
               tz = $13, phone = $14, email = $15, is_approved = $16, is_contract_ready = $17
           WHERE id = $18
           RETURNING *`,
          [
            item.track, item.year, item.teacherName, item.subject, item.semester, item.paymentMethod,
            item.shash, item.meetings, item.totalHours, item.rate, item.employerOverhead, item.totalAnnual,
            item.tz, item.phone, item.email, item.isApproved, item.isContractReady, item.id
          ]
        );
        if (res.rows.length > 0) {
          return { ...item, id: res.rows[0].id };
        }
      } else {
        // Create new record
        const res = await pool.query(
          `INSERT INTO salary_records 
           (track, year, teacher_name, subject, semester, payment_method, shash, meetings, total_hours, rate, employer_overhead, total_annual, tz, phone, email, is_approved, is_contract_ready)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           RETURNING id`,
          [
            item.track, item.year, item.teacherName, item.subject, item.semester, item.paymentMethod,
            item.shash, item.meetings, item.totalHours, item.rate, item.employerOverhead, item.totalAnnual,
            item.tz, item.phone, item.email, item.isApproved, item.isContractReady
          ]
        );
        return { ...item, id: res.rows[0].id };
      }
    } catch (err) {
      console.error("Error saving to Postgres, falling back to local file:", err);
      isDbHealthy = false;
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
  const pool = getDbPool();
  if (pool && isDbHealthy) {
    try {
      await pool.query("DELETE FROM salary_records WHERE id = $1", [id]);
      return true;
    } catch (err) {
      console.error("Error deleting from Postgres, falling back to local file:", err);
      isDbHealthy = false;
    }
  }

  // Fallback delete to local file
  const localRecords = await getRecords();
  const updated = localRecords.filter((r: any) => r.id !== id);
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(updated, null, 2), "utf-8");
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
    res.json({ success: true, dbMode: isDbHealthy ? "cloud" : "local", records });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/records", async (req, res) => {
  try {
    const saved = await saveRecord(req.body);
    res.json({ success: true, dbMode: isDbHealthy ? "cloud" : "local", record: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/records/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await deleteRecord(id);
    res.json({ success: true, dbMode: isDbHealthy ? "cloud" : "local" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to force reload of DB configuration if user sets/updates DATABASE_URL
app.post("/api/configure-db", async (req, res) => {
  const { databaseUrl } = req.body;
  if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl;
    dbPool = null; // Reset pool
    await bootstrapDatabase();
  }
  res.json({ success: true, dbMode: isDbHealthy ? "cloud" : "local" });
});

// Setup Vite or Serve build static directory
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

startServer();
