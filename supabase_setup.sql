-- ============================================================================
--  מערכת דיווח ובקרת שכר ותקציב - סמינר שצ'רנסקי בית שמש (תשפ"ז)
--  סקריפט הקמה מלא למסד הנתונים ב-Supabase / PostgreSQL
--
--  אזהרה: הסקריפט מוחק לחלוטין את הטבלאות הקיימות (וכל הנתונים שבהן)
--          ובונה אותן מחדש בצורה נקייה ותקינה.
--  אופן הרצה: Supabase Dashboard -> SQL Editor -> הדבקה -> Run
-- ============================================================================

-- ----------------------------------------------------------------------------
-- שלב 1: מחיקת הטבלאות הישנות (כולל תלויות)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS change_requests CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS salary_records CASCADE;

-- ----------------------------------------------------------------------------
-- שלב 2: טבלת דיווחי שכר ותקציב (הטבלה הראשית)
-- ----------------------------------------------------------------------------
CREATE TABLE salary_records (
    id                 SERIAL PRIMARY KEY,
    track              TEXT NOT NULL,                 -- התמחות / מסלול
    year               TEXT NOT NULL,                 -- שנה (יג, יד, יג+יד)
    teacher_name       TEXT NOT NULL,                 -- שם המורה
    subject            TEXT NOT NULL,                 -- שם המקצוע
    semester           TEXT NOT NULL,                 -- סמסטר / מחזור
    payment_method     TEXT NOT NULL,                 -- צורת תשלום (תקן, שכר מרצים, קבלה, קבלת פטור)
    shash              DECIMAL(10,2) NOT NULL DEFAULT 0,  -- ש"ש (שעות שבועיות)
    meetings           INTEGER NOT NULL DEFAULT 0,        -- חודשים / מפגשים
    total_hours        INTEGER NOT NULL DEFAULT 0,        -- שעות שנתיות לתלמידות (מחושב)
    rate               DECIMAL(10,2) NOT NULL DEFAULT 0,  -- תעריף לשעה
    employer_overhead  DECIMAL(10,2) NOT NULL DEFAULT 0,  -- עלות מעביד לשעה כולל תקורות
    total_annual       DECIMAL(10,2) NOT NULL DEFAULT 0,  -- סה"כ שנתי שכר מורה
    tz                 TEXT,                          -- ת.ז מורה
    phone              TEXT NOT NULL,                 -- טלפון מורה (חובה)
    email              TEXT NOT NULL,                 -- אימייל מורה (חובה)
    is_approved        BOOLEAN NOT NULL DEFAULT FALSE,-- סטטוס אישור שכר ע"י המנהלת
    is_contract_ready  BOOLEAN NOT NULL DEFAULT FALSE,-- סטטוס הכנת חוזה
    travel             TEXT,                          -- נסיעות
    grade_timing       TEXT,                          -- מועד ציון
    monthly_hours      TEXT,                          -- דיווח שעות חודשי (JSON) - למודול המעקב
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_salary_records_track   ON salary_records(track);
CREATE INDEX idx_salary_records_teacher ON salary_records(teacher_name);

-- ----------------------------------------------------------------------------
-- שלב 3: טבלת הגדרות מערכת (סיסמאות תפקידים ורכזות)
-- ----------------------------------------------------------------------------
CREATE TABLE system_config (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
);

-- זריעת סיסמאות ברירת מחדל (זהות ל-INITIAL_PASSWORDS שבשרת ובממשק ה-React)
INSERT INTO system_config (key, value) VALUES (
    'passwords',
    '{
        "director": "צפורה",
        "secretary": "שרייבר",
        "coordinators": {
            "קודש": "קודש",
            "חובה": "חובה",
            "חנ\"מ והו\"מ": "חנ\"מ",
            "גננות": "גננות",
            "אדריכלות": "אדריכלות",
            "גרפיקה": "גרפיקה",
            "מיסים וחשבונאות": "מיסים"
        }
    }'
);

-- ----------------------------------------------------------------------------
-- שלב 4: טבלת בקשות שינוי (מודול הסימולטור של הרכזות ותור האישורים)
-- ----------------------------------------------------------------------------
CREATE TABLE change_requests (
    id          BIGINT PRIMARY KEY,            -- מזהה בקשה (timestamp)
    row_id      INTEGER NOT NULL,              -- מזהה שורת השכר הרלוונטית
    track       TEXT NOT NULL,                 -- מסלול הרכזת ששלחה
    payload     TEXT NOT NULL,                 -- תמונת מצב מלאה של השינוי (JSON)
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_change_requests_track  ON change_requests(track);
CREATE INDEX idx_change_requests_row_id ON change_requests(row_id);

-- ----------------------------------------------------------------------------
-- שלב 5: הרשאות גישה (Row Level Security) - קריאה/כתיבה חופשית לצורך פעולת המערכת
-- ----------------------------------------------------------------------------
ALTER TABLE salary_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on salary_records"  ON salary_records  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on system_config"   ON system_config   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on change_requests" ON change_requests FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
--  סיום. שלוש הטבלאות מוכנות: salary_records, system_config, change_requests
-- ============================================================================
