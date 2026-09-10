-- Enable RLS on appointments table
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop old policy if exists
DROP POLICY IF EXISTS "Enable ALL for authenticated users in the same clinic" ON public.appointments;

-- Create permissive policy scoped to the same clinic
-- Note: auth.uid() returns uuid, but our users.id is text, so we cast
CREATE POLICY "Enable ALL for authenticated users in the same clinic"
ON public.appointments
AS PERMISSIVE
FOR ALL
TO authenticated
USING (clinic_id = (SELECT users.clinic_id FROM public.users WHERE users.id = auth.uid()::text))
WITH CHECK (clinic_id = (SELECT users.clinic_id FROM public.users WHERE users.id = auth.uid()::text));
