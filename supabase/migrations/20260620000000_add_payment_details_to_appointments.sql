-- ============================================================================
-- Migration: Add payment_details JSONB to appointments table
-- ============================================================================

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_details jsonb DEFAULT '{}'::jsonb;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
