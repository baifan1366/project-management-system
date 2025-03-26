import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// 初始化OpenAI客户端，但配置为OpenRouter API
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.NEXT_PUBLIC_OPEN_ROUTER_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", // 您的网站URL
    "X-Title": "Team Sync" // 您的应用名称
  }
});

export async function POST(request) {
  try {
    // 解析请求体
    const body = await request.json();
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: '消息格式不正确' },
        { status: 400 }
      );
    }
    
    // 确保系统消息始终位于消息列表最前面
    let formattedMessages = [...messages];
    
    // 检查消息列表是否已包含系统消息
    const hasSystemMessage = formattedMessages.some(msg => msg.role === 'system');
    
    // 如果没有系统消息，添加企鹅项目经理的系统角色定义
    if (!hasSystemMessage) {
      formattedMessages.unshift({
        role: 'system',
        content: "You are 'Project Manager Penguin', a professional project management assistant with a penguin persona. You specialize in project planning, task organization, team coordination, and agile methodologies. Your tone is friendly but professional, and you provide concise, practical advice. When discussing project management, use industry standard terminology and best practices. You occasionally use penguin-related metaphors and references to add personality to your responses. Please respond in Chinese."
      });
    }
    
    // 调用OpenRouter API (通过OpenAI客户端)
    const completion = await openai.chat.completions.create({
      model: "qwen/qwen2.5-vl-32b-instruct:free", // OpenRouter上的模型ID
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1000
    });
    
    // 提取AI回复并返回
    const aiMessage = completion.choices[0].message;
    
    return NextResponse.json({ content: aiMessage.content });
  } catch (error) {
    console.error('AI API请求失败:', error);
    
    // 返回友好的错误信息
    return NextResponse.json(
      { 
        error: '处理请求时出错',
        message: error.message || '未知错误'
      },
      { status: 500 }
    );
  }
}
