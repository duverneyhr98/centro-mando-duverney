import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://flqvtbqbagaznulalbzk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscXZ0YnFiYWdhem51bGFsYnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODY5NjgsImV4cCI6MjA5Njg2Mjk2OH0.heF94H-0AtDHwnTQOm5otSqRlL1kxxMxjP1MPRhYgRg'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)