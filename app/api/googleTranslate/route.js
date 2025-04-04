import { Translate } from '@google-cloud/translate/build/src/v2';
import { NextResponse } from 'next/server';

// 初始化Google Translate API客户端
const translate = new Translate({
  key: process.env.NEXT_PUBLIC_GOOGLE_TRANSLATE_API_KEY,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { text, targetLang } = body;

    if (!text) {
      return NextResponse.json(
        { error: '缺少要翻译的文本' }, 
        { status: 400 }
      );
    }

    // 调用Google Translate API
    const [translation] = await translate.translate(text, targetLang || 'en');

    // 返回翻译结果
    return NextResponse.json({
      translatedText: translation,
      sourceLang: 'auto', // Google API会自动检测源语言
      targetLang: targetLang || 'en'
    });
  } catch (error) {
    console.error('Google翻译API错误:', error);
    return NextResponse.json(
      {
        error: '翻译服务出错',
        details: error.message
      },
      { status: 500 }
    );
  }
} 