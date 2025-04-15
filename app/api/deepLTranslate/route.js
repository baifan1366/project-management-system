// 使用DeepL API进行翻译的接口
import { NextResponse } from 'next/server';

// 替换为你的DeepL API密钥
const DEEPL_API_KEY = process.env.NEXT_PUBLIC_DEEPL_API_KEY;
const DEEPL_API_URL = 'https://api-free.deepl.com/v2/translate';

export async function POST(request) {
  try {
    const { text, targetLang, sourceLang } = await request.json();

    if (!text || !targetLang) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    if (!DEEPL_API_KEY) {
      return NextResponse.json(
        { error: 'DeepL API key is not configured' },
        { status: 500 }
      );
    }

    const formData = new URLSearchParams();
    formData.append('text', text);
    formData.append('target_lang', targetLang);
    
    if (sourceLang) {
      formData.append('source_lang', sourceLang);
    }

    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('DeepL API error:', errorData);
      return NextResponse.json(
        { error: 'Translation service error', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      translatedText: data.translations[0].text,
      detectedSourceLang: data.translations[0].detected_source_language
    });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 