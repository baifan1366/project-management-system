import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');
    const sectionId = searchParams.get('sectionId');
    if (!teamId) {
        return NextResponse.json({ error: '缺少团队ID参数' }, { status: 400 })
    }
    if (sectionId) {
        const { data: section, error } = await supabase
            .from('section')
            .select('*')
            .eq('team_id', teamId)
            .eq('id', sectionId)
            .single();
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(section)
    } else {
        const { data: sections, error } = await supabase
            .from('section')
            .select('*')
            .eq('team_id', teamId)
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(sections)
    }
}

export async function POST(request) {
    const body = await request.json();
    const { teamId, sectionName, createdBy } = body;
    const { data: section, error } = await supabase
        .from('section')
        .insert({
            team_id: teamId,
            name: sectionName,
            created_by: createdBy
        })
        .select()
        .single();
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(section)
}

export async function PATCH(request) {
    const body = await request.json();
    const { sectionId, sectionName, updatedBy } = body;
    const { data: section, error } = await supabase
        .from('section')
        .update({
            name: sectionName,
            updated_by: updatedBy
        })
        .eq('id', sectionId)
        .select()
        .single();
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(section)
}

export async function DELETE(request) {
    const body = await request.json();
    const { sectionId } = body;
    const { data: section, error } = await supabase
        .from('section')
        .delete()
        .eq('id', sectionId)
        .select()
        .single();
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(section)
}