-- Migration to add missing columns to the appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'initial';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'internal';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_name text NOT NULL DEFAULT '';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS date_str text NOT NULL DEFAULT '';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration integer NOT NULL DEFAULT 30;
