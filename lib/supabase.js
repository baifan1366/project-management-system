import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseKey)

export const supabase = createClient(supabaseUrl, supabaseKey)
