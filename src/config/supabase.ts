import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://acpjdpxagindbmfpxedg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjcGpkcHhhZ2luZGJtZnB4ZWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMjA3MTgsImV4cCI6MjA5NDU5NjcxOH0.P9Vbo895N_UfjGUSuglkdim9AIlULciTlxB7u27eyxA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
});