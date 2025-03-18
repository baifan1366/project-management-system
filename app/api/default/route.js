import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// read
export async function GET(request) {
    try {
        const {searchParams} = new URL(request.url)
        const table = searchParams.get('table')

        let data, error

        if (table) {
            ({ data, error } = await supabase
                .from('default')
                .select('*')
                .eq('name', table))
        } else {
            ({ data, error } = await supabase
                .from('default')
                .select('*')
                .order('id', { ascending: true }))
        }

        if (error) {
            console.error('Database error:', error)
            throw error
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error fetching default data:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch default data' },
            { status: 500 }
        )
    }
}

//update
export async function PUT(request) {
    try {
        const body = await request.json()
        const {searchParams} = new URL(request.url)
        const table = searchParams.get('table')
        let data, error
        if(table){
            ({ data, error } = await supabase
                .from('default')
                .update(body)
                .eq('name', table)
                .select('*')
        )}else{
            ({ data, error } = await supabase
                .from('default')
                .update(body)
                .select('*')
        )}
        if (error) {
            console.error('Database error:', error)
            throw error
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Error updating default data:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to update default data' },
            { status: 500 }
        )
    }
}