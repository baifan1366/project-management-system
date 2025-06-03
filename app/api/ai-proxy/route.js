import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Readable } from 'stream';

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
    const { messages, language = 'en' } = body; // 获取用户语言设置，默认为英语
    
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
        content: "You are 'Project Manager Penguin', a professional project management assistant with a penguin persona. You specialize in project planning, task organization, team coordination, and agile methodologies. Your tone is friendly but professional, and you provide concise, practical advice. When discussing project management, use industry standard terminology and best practices. You occasionally use penguin-related metaphors and references to add personality to your responses. Please respond in the user's language: " + language
      });
    }
    
    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 流式调用OpenRouter API
        const completion = await openai.chat.completions.create({
          model: "qwen/qwen2.5-vl-32b-instruct:free", // OpenRouter上的模型ID
          messages: formattedMessages,
          temperature: 0.2, // 降低温度，使输出更可控
          max_tokens: 3000,
          stream: true, // 启用流式输出
        });

        let fullContent = "";
        
        try {
          // 处理流数据
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            
            if (content) {
              // 将内容添加到累积字符串
              fullContent += content;
              
              // 发送数据块
              const data = encoder.encode(`data: ${JSON.stringify({ content })}\n\n`);
              controller.enqueue(data);
            }
          }
          
          // 流结束，发送完整内容
          const finalMessage = encoder.encode(`data: ${JSON.stringify({ 
            content: "[DONE]", 
            fullContent 
          })}\n\n`);
          controller.enqueue(finalMessage);
          controller.close();
        } catch (error) {
          console.error('流处理错误:', error);
          const errorMessage = encoder.encode(`data: ${JSON.stringify({ 
            error: '流处理错误',
            message: error.message
          })}\n\n`);
          controller.enqueue(errorMessage);
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
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
