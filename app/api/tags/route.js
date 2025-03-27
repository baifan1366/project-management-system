import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const { data, error } = await supabase
        .from('tag')
        .select('*')
        .order('id', { ascending: true })
        
    if (error) {
        console.error(error)
    }
    return NextResponse.json(data)
}