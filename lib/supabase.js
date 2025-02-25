import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables')
}

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseKey)

// 创建 Supabase 客户端实例
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  // 可选：添加全局错误处理
  global: {
    fetch: (...args) => {
      return fetch(...args).catch(err => {
        console.error('Supabase 请求错误:', err)
        throw err
      })
    }
  }
})
