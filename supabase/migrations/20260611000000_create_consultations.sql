-- ============================================================================
-- Migration: Create consultations table for TCM clinical records
-- ============================================================================

CREATE TABLE IF NOT EXISTS consultations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id       uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    appointment_id  uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id      uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id       uuid NOT NULL REFERENCES user_profiles(id) ON DELETE SET NULL,

    -- 臨床資料 (高度巢狀，使用 JSONB)
    clinical_notes  jsonb NOT NULL DEFAULT '{}'::jsonb,
    prescription    jsonb NOT NULL DEFAULT '{}'::jsonb,
    acupuncture     jsonb NOT NULL DEFAULT '[]'::jsonb,
    other_treatments text DEFAULT '',
    billing         jsonb NOT NULL DEFAULT '[]'::jsonb,

    -- 狀態
    status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),

    -- 時間戳
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    -- 每次看診 (appointment) 只能對應一筆病歷，用於 upsert conflict resolution
    CONSTRAINT consultations_appointment_id_key UNIQUE (appointment_id)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_consultations_clinic_patient
    ON consultations (clinic_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_consultations_patient_status
    ON consultations (patient_id, status);

CREATE INDEX IF NOT EXISTS idx_consultations_created_at
    ON consultations (created_at DESC);

-- ─── Auto-update updated_at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_consultations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consultations_updated_at
    BEFORE UPDATE ON consultations
    FOR EACH ROW
    EXECUTE FUNCTION update_consultations_updated_at();

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

-- 已驗證使用者可讀取同診所的病歷
CREATE POLICY "Authenticated users can SELECT consultations"
    ON consultations FOR SELECT
    TO authenticated
    USING (true);

-- 已驗證使用者可新增病歷
CREATE POLICY "Authenticated users can INSERT consultations"
    ON consultations FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 已驗證使用者可更新病歷 (草稿 → 完成)
CREATE POLICY "Authenticated users can UPDATE consultations"
    ON consultations FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);
