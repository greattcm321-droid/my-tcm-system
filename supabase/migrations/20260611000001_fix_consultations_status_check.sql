-- Fix: Drop and recreate the status check constraint with correct lowercase values
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_status_check;
ALTER TABLE consultations DROP CONSTRAINT IF EXISTS consultations_check;

ALTER TABLE consultations
  ADD CONSTRAINT consultations_status_check
  CHECK (status IN ('draft', 'completed'));
