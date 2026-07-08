DROP TABLE IF EXISTS change_requests CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS salary_records CASCADE;

CREATE TABLE salary_records (
    id                 SERIAL PRIMARY KEY,
    track              TEXT NOT NULL,
    year               TEXT NOT NULL,
    teacher_name       TEXT NOT NULL,
    subject            TEXT NOT NULL,
    semester           TEXT NOT NULL,
    payment_method     TEXT NOT NULL,
    shash              DECIMAL(10,2) NOT NULL DEFAULT 0,
    meetings           INTEGER NOT NULL DEFAULT 0,
    total_hours        INTEGER NOT NULL DEFAULT 0,
    rate               DECIMAL(10,2) NOT NULL DEFAULT 0,
    employer_overhead  DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_annual       DECIMAL(10,2) NOT NULL DEFAULT 0,
    tz                 TEXT,
    phone              TEXT NOT NULL,
    email              TEXT NOT NULL,
    is_approved        BOOLEAN NOT NULL DEFAULT FALSE,
    is_contract_ready  BOOLEAN NOT NULL DEFAULT FALSE,
    travel             TEXT,
    grade_timing       TEXT,
    monthly_hours      TEXT,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_salary_records_track   ON salary_records(track);
CREATE INDEX idx_salary_records_teacher ON salary_records(teacher_name);

CREATE TABLE system_config (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
);

INSERT INTO system_config (key, value) VALUES (
    'passwords',
    '{"director":"צפורה","secretary":"שרייבר","coordinators":{"קודש":"קודש","חובה":"חובה","חנ\"מ והו\"מ":"חנ\"מ","גננות":"גננות","אדריכלות":"אדריכלות","גרפיקה":"גרפיקה","מיסים וחשבונאות":"מיסים"}}'
);

CREATE TABLE change_requests (
    id          BIGINT PRIMARY KEY,
    row_id      INTEGER NOT NULL,
    track       TEXT NOT NULL,
    payload     TEXT NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_change_requests_track  ON change_requests(track);
CREATE INDEX idx_change_requests_row_id ON change_requests(row_id);

ALTER TABLE salary_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on salary_records"  ON salary_records  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on system_config"   ON system_config   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on change_requests" ON change_requests FOR ALL USING (true) WITH CHECK (true);
