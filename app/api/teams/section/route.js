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
            .single()
            .order('order_index', { ascending: true });
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        return NextResponse.json(section)
    } else {
        const { data: sections, error } = await supabase
            .from('section')
            .select('*')
            .eq('team_id', teamId)
            .order('order_index', { ascending: true });
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

//update section name
//update section taskIds
export async function PATCH(request) {
    const body = await request.json();
    console.log('接收到的请求体:', body);
    
    if(body.sectionData) {
        const { sectionId, sectionData, teamId } = body;
        console.log('更新分区名称:', { sectionId, teamId, sectionData });
        
        // 确保 ID 是数字
        const numericSectionId = Number(sectionId);
        const numericTeamId = Number(teamId);
        
        if (isNaN(numericSectionId) || isNaN(numericTeamId)) {
            return NextResponse.json({ error: '无效的ID参数' }, { status: 400 });
        }
        
        const { data: section, error } = await supabase
            .from('section')
            .update({
                name: sectionData,
                updated_at: new Date().toISOString()
            })
            .eq('id', numericSectionId)
            .eq('team_id', numericTeamId)
            .select()
            .single()
            
        if (error) {
            console.error('更新分区错误:', error);
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        
        console.log('更新分区成功:', section);
        return NextResponse.json(section)
    }
    if(body.newTaskIds) {
        const { sectionId, newTaskIds, teamId } = body;
        if (!sectionId || !teamId || !Array.isArray(newTaskIds)) {
            return NextResponse.json({ 
                error: 'Invalid parameters. Required: sectionId, teamId, and newTaskIds array' 
            }, { status: 400 })
        }
        
        const { data: section, error: taskIdsError } = await supabase
            .from('section')
            .update({
                task_ids: newTaskIds,
                updated_at: new Date().toISOString()
            })
            .eq('team_id', teamId)
            .eq('id', sectionId)
            .select()
            .single();
        
        if (taskIdsError) {
            console.error('Error updating task IDs:', taskIdsError);
            return NextResponse.json({ error: taskIdsError.message }, { status: 500 })
        }
        
        if (!section) {
            return NextResponse.json({ 
                error: 'Section not found or update failed' 
            }, { status: 404 })
        }
        
        return NextResponse.json(section)
    }
    if(body.sectionIds) {
        const { teamId, sectionIds } = body;
        
        if (!teamId || !Array.isArray(sectionIds) || sectionIds.length === 0) {
            return NextResponse.json({ 
                error: '无效的参数。需要：teamId 和 sectionIds 数组' 
            }, { status: 400 })
        }
        
        console.log('更新分区顺序:', { teamId, sectionIds });
        
        // 开始事务以确保所有更新原子性执行
        const updatePromises = sectionIds.map((sectionId, index) => {
            return supabase
                .from('section')
                .update({
                    order_index: index,
                    updated_at: new Date().toISOString()
                })
                .eq('id', sectionId)
                .eq('team_id', teamId);
        });
        
        try {
            // 执行所有更新
            await Promise.all(updatePromises);
            
            // 获取更新后的分区列表
            const { data: updatedSections, error: fetchError } = await supabase
                .from('section')
                .select('*')
                .eq('team_id', teamId)
                .order('order_index', { ascending: true });
            
            if (fetchError) {
                console.error('获取更新后的分区列表错误:', fetchError);
                return NextResponse.json({ error: fetchError.message }, { status: 500 })
            }
            
            console.log('分区顺序更新成功!');
            return NextResponse.json(updatedSections)
        } catch (error) {
            console.error('更新分区顺序错误:', error);
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
    }
    
    // 如果没有匹配的条件，返回错误
    return NextResponse.json({ message: 'No valid operation found' }, { status: 400 })
}

export async function DELETE(request) {
    const body = await request.json();
    const { teamId, sectionId } = body;
    const { data: section, error } = await supabase
        .from('section')
        .delete()
        .eq('id', sectionId)
        .eq('team_id', teamId)
        .select()
        .single();
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(section)
}