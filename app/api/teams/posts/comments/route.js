// CREATE TABLE "comment" (
//     "id" SERIAL PRIMARY KEY,
//     "text" TEXT NOT NULL,
//     "post_id" INT NOT NULL REFERENCES "team_post"("id") ON DELETE CASCADE,
//     "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
//     "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//   );

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET comments by post ID
export async function GET(request) {
  try {
    // Extract teamId from the URL query params
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const postId = searchParams.get('postId');
    const commentId = searchParams.get('commentId');

    if (postId) {
      const { data, error } = await supabase
        .from('comment')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return NextResponse.json(data);
    } 
    if(commentId) {
        const { data, error } = await supabase
        .from('comment')
        .select('*')
        .eq('id', commentId)
        .single();

        if (error) throw error;
        return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Missing teamId or postId parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
    try {
        // 修复：解析请求体
        const body = await request.json();
        
        // 验证必要字段
        if (!body.post_id || !body.text) {
            return NextResponse.json({ 
                error: '缺少必要字段：post_id 和 text 为必填项' 
            }, { status: 400 });
        }
        
        const { data, error } = await supabase
        .from('comment')
        .insert(body)
        .select()
        .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating comment:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}