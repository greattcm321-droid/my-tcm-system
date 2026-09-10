-- ============================================================================
-- Migration: Add dispense_status and payment_status to appointments
-- ============================================================================

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS dispense_status text DEFAULT 'pending';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- Notify PostgREST to reload its schema cache (often required when altering tables)
NOTIFY pgrst, 'reload schema';
