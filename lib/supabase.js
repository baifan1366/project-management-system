import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables')
}

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseKey)

// 重试函数
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      lastError = error;
      if (i < maxRetries - 1) {
        // 递增延迟重试：1秒，2秒，4秒...
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// 创建 Supabase 客户端实例
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  // 添加全局错误处理和重试机制
  global: {
    fetch: async (url, options) => {
      // 对Hugging Face API不使用重试机制
      if (url.includes('router.huggingface.co/hf-inference/models/Qwen/QwQ-32B')) {
        return fetch(url, options);
      }
      
      try {
        return await fetchWithRetry(url, options);
      } catch (err) {
        console.error('Supabase 请求错误 (已重试):', err);
        throw err;
      }
    }
  }
})
