import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// 获取所有自定义字段
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // 如果提供了ID，则获取特定字段
    if (id) {
      const { data, error } = await supabase
        .from('custom_field')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('获取自定义字段失败:', error);
        return NextResponse.json({ error: '获取自定义字段失败' }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({ error: '未找到自定义字段' }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    // 否则获取所有字段
    const { data, error } = await supabase
      .from('custom_field')
      .select('*')
      .order('id');

    if (error) {
      console.error('获取自定义字段列表失败:', error);
      return NextResponse.json({ error: '获取自定义字段列表失败' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('获取自定义字段时发生错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 创建自定义字段
export async function POST(request) {
  try {
    const data = await request.json();
    const { name, type, description, icon, default_config } = data;

    // 验证必填字段
    if (!name || !type) {
      return NextResponse.json({ error: '名称和类型为必填项' }, { status: 400 });
    }

    // 验证类型是否有效
    const validTypes = ['LIST', 'OVERVIEW', 'TIMELINE', 'DASHBOARD', 'NOTE', 'GANTT', 'CALENDAR', 'BOARD', 'FILES'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: '无效的字段类型' }, { status: 400 });
    }

    // 创建自定义字段
    const { data: newField, error } = await supabase
      .from('custom_field')
      .insert([
        { 
          name, 
          type, 
          description: description || null, 
          icon: icon || null, 
          default_config: default_config || null 
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('创建自定义字段失败:', error);
      return NextResponse.json({ error: '创建自定义字段失败' }, { status: 500 });
    }

    return NextResponse.json(newField);
  } catch (error) {
    console.error('创建自定义字段时发生错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 更新自定义字段
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少字段ID' }, { status: 400 });
    }

    const data = await request.json();
    const { name, type, description, icon, default_config } = data;

    // 构建更新对象
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    
    if (type !== undefined) {
      // 验证类型是否有效
      const validTypes = ['LIST', 'OVERVIEW', 'TIMELINE', 'DASHBOARD', 'NOTE', 'GANTT', 'CALENDAR', 'BOARD', 'FILES'];
      if (!validTypes.includes(type)) {
        return NextResponse.json({ error: '无效的字段类型' }, { status: 400 });
      }
      updateData.type = type;
    }

    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (default_config !== undefined) updateData.default_config = default_config;
    
    // 添加更新时间
    updateData.updated_at = new Date().toISOString();

    // 如果没有要更新的字段，则返回错误
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '没有提供要更新的字段' }, { status: 400 });
    }

    // 执行更新
    const { data: updatedField, error } = await supabase
      .from('custom_field')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('更新自定义字段失败:', error);
      return NextResponse.json({ error: '更新自定义字段失败' }, { status: 500 });
    }

    if (!updatedField) {
      return NextResponse.json({ error: '未找到自定义字段' }, { status: 404 });
    }

    return NextResponse.json(updatedField);
  } catch (error) {
    console.error('更新自定义字段时发生错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 删除自定义字段
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少字段ID' }, { status: 400 });
    }

    // 检查字段是否存在
    const { data: existingField, error: checkError } = await supabase
      .from('custom_field')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingField) {
      return NextResponse.json({ error: '未找到自定义字段' }, { status: 404 });
    }

    // 删除字段
    const { error: deleteError } = await supabase
      .from('custom_field')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('删除自定义字段失败:', deleteError);
      return NextResponse.json({ error: '删除自定义字段失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: '自定义字段已删除' });
  } catch (error) {
    console.error('删除自定义字段时发生错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
