import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Get user basic information by ID or username
 * @param {Object} request - Request object
 * @param {Object} params - Route parameters containing userId
 * @returns {Promise<NextResponse>} Response containing user data
 */
export async function GET(request, { params }) {
  try {
    // 确保params已经解析完成
    const resolvedParams = await Promise.resolve(params);
    const { userId } = resolvedParams;
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID cannot be empty' 
      }, { status: 400 });
    }

    // 检查是否有多个ID (使用逗号分隔)
    if (userId.includes(',')) {
      const userIds = userId.split(',');
      let results = [];
      
      for (const id of userIds) {
        if (!id.trim()) continue; // 跳过空ID
        
        try {
          // 为每个ID单独调用查询
          const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
          
          let query = supabase
            .from('user')
            .select('id, name, avatar_url, email');
          
          if (isValidUUID) {
            query = query.eq('id', id.trim());
          } else {
            query = query.ilike('name', id.trim());
          }
          
          const { data, error } = await query.single();
          
          if (!error && data) {
            results.push(data);
          }
        } catch (error) {
          console.error(`Error fetching user with ID ${id}:`, error);
          // 继续处理其他ID，不中断流程
        }
      }
      
      // 如果没有找到任何用户，返回404
      if (results.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'No users found' 
        }, { status: 404 });
      }
      
      // 返回找到的所有用户
      return NextResponse.json({ 
        success: true, 
        data: results 
      });
    }

    // 单个ID的处理逻辑保持不变
    // Check if userId is a valid UUID
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    
    let query = supabase
      .from('user')
      .select('id, name, avatar_url, email');
    
    // Apply appropriate filter based on whether userId is numeric or a username
    if (isValidUUID) {
      query = query.eq('id', userId);
    } else {
      // If not numeric, treat as username
      query = query.ilike('name', userId);
    }
    
    const { data, error } = await query.single();

    if (error) {
      console.error('Failed to get user data:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to get user data' 
      }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
