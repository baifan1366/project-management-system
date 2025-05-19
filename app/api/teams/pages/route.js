import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

/**
 * 获取团队所有页面
 * 流程：
 * 1. 获取Name和Content标签ID
 * 2. 获取团队所有部分(section)
 * 3. 从部分中获取所有任务ID
 * 4. 获取所有任务，包括其tag_values数据和page_id
 * 5. 从task.tag_values中提取标题和内容
 * 6. 获取页面基本信息并组合完整数据
 */
export async function GET(request) {
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId');
    
    if (!teamId) {
        return NextResponse.json({ error: '缺少团队ID参数' }, { status: 400 })
    }
    
    try {
        // 步骤1: 获取Name和Content标签的ID
        const { data: nameTagData, error: nameTagError } = await supabase
            .from('tag')
            .select('id')
            .eq('name', 'Name')
            .single();
            
        if (nameTagError) {
            console.error('获取Name标签ID失败:', nameTagError);
            return NextResponse.json({ error: '获取Name标签ID失败' }, { status: 500 })
        }
        
        const { data: contentTagData, error: contentTagError } = await supabase
            .from('tag')
            .select('id')
            .eq('name', 'Content')
            .single();
            
        if (contentTagError) {
            console.error('获取Content标签ID失败:', contentTagError);
            // Content标签可能不存在，但我们仍然可以继续
        }
        
        const nameTagId = nameTagData?.id;
        const contentTagId = contentTagData?.id;
        
        if (!nameTagId) {
            return NextResponse.json({ error: '未找到Name标签' }, { status: 500 })
        }
        
        // 步骤2: 获取团队所有部分(section)
        const { data: sections, error: sectionsError } = await supabase
            .from('section')
            .select('*')
            .eq('team_id', teamId)
            .order('id', { ascending: true });
            
        if (sectionsError) {
            return NextResponse.json({ error: sectionsError.message }, { status: 500 })
        }
        
        if (!sections || sections.length === 0) {
            return NextResponse.json([])
        }
        
        // 步骤3: 收集所有部分的任务ID
        let allTaskIds = [];
        sections.forEach(section => {
            if (section.task_ids && Array.isArray(section.task_ids)) {
                allTaskIds = [...allTaskIds, ...section.task_ids];
            }
        });
        
        if (allTaskIds.length === 0) {
            return NextResponse.json([])
        }
        
        // 步骤4: 获取所有任务的详细信息，包括tag_values
        const { data: tasks, error: tasksError } = await supabase
            .from('task')
            .select('id, page_id, tag_values, created_by, created_at, updated_at')
            .in('id', allTaskIds)
            .not('page_id', 'is', null);
            
        if (tasksError) {
            return NextResponse.json({ error: tasksError.message }, { status: 500 })
        }
        
        if (!tasks || tasks.length === 0) {
            return NextResponse.json([])
        }
        
        // 步骤5: 收集所有页面ID并从task.tag_values中提取标题和内容
        const pageIds = tasks.map(task => task.page_id).filter(id => id != null);
        
        if (pageIds.length === 0) {
            return NextResponse.json([])
        }
        
        // 步骤6: 获取所有页面的基本信息
        const { data: pages, error: pagesError } = await supabase
            .from('notion_page')
            .select(`
                id, 
                icon, 
                cover_image, 
                parent_id, 
                created_by, 
                created_at,
                updated_at,
                last_edited_by
            `)
            .in('id', pageIds)
            .eq('is_archived', false)
            .order('updated_at', { ascending: false });
            
        if (pagesError) {
            return NextResponse.json({ error: pagesError.message }, { status: 500 })
        }
        
        // 步骤7: 将页面信息与从任务中提取的标题和内容合并
        const enrichedPages = pages.map(page => {
            const relatedTask = tasks.find(task => task.page_id === page.id);
            
            let title = "无标题";
            let content = null;
            
            if (relatedTask && relatedTask.tag_values) {
                // 从task.tag_values中提取标题
                if (relatedTask.tag_values[nameTagId]) {
                    title = relatedTask.tag_values[nameTagId];
                }
                
                // 从task.tag_values中提取内容（如果有Content标签）
                if (contentTagId && relatedTask.tag_values[contentTagId]) {
                    content = { text: relatedTask.tag_values[contentTagId] };
                }
            }
            
            return {
                ...page,
                title: title,
                content: content,
                task_id: relatedTask?.id,  // 添加关联的任务ID
                team_id: teamId  // 添加团队ID以便前端使用
            };
        });
        
        return NextResponse.json(enrichedPages || []);
    } catch (error) {
        console.error('获取团队页面失败:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 