import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

// 初始化OpenAI客户端，但配置为OpenRouter API
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.NEXT_PUBLIC_OPEN_ROUTER_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    "X-Title": "Team Sync"
  }
});

export async function POST(request) {
  try {
    // 解析请求体
    const body = await request.json();
    const { conversation, sessionId } = body;
    
    if (!conversation) {
      return NextResponse.json(
        { error: '对话内容不能为空' },
        { status: 400 }
      );
    }
    
    // 拼接系统提示和对话内容
    const messages = [
      {
        role: 'system',
        content: "You are an expert in title generation. Based on the given conversation content, generate a short, precise title that summarizes the topic of the conversation. The title should be no more than 15 characters, and do not use quotation marks or other punctuation. Return the title text directly without any other explanation or prefix."
      },
      {
        role: 'user',
        content: `Please generate a brief title for the following conversation:\n\n${conversation}`
      }
    ];
    
    // 调用AI获取标题
    const completion = await openai.chat.completions.create({
      model: "qwen/qwen2.5-vl-32b-instruct:free", // 使用与主应用相同的模型
      messages,
      temperature: 0.3, // 低温度使输出更可控
      max_tokens: 30,   // 标题短，不需要太多token
      stream: false     // 非流式响应
    });
    
    // 提取生成的标题
    const title = completion.choices[0]?.message?.content?.trim();
    
    // 如果成功获取标题，也可以直接在这里更新数据库（可选）
    if (sessionId && title) {
      const { error } = await supabase
        .from('chat_session')
        .update({ name: title })
        .eq('id', sessionId);
        
      if (error) {
        console.error('更新聊天标题失败:', error);
      }
    }
    
    return NextResponse.json({ title });
  } catch (error) {
    console.error('生成标题失败:', error);
    
    return NextResponse.json(
      { 
        error: '生成标题失败',
        message: error.message || '未知错误'
      },
      { status: 500 }
    );
  }
} 