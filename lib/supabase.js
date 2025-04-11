import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required Supabase environment variables')
}

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key:', supabaseKey)

// retry function
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error text available');
        console.error(`HTTP Error: ${response.status}`, {
          url: url.toString(),
          method: options.method || 'GET',
          errorText
        });
        throw new Error(`HTTP error! status: ${response.status}`, { cause: errorText });
      }
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// create Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  },
  
  global: {
    fetch: async (url, options) => {
     
      if (url.includes('router.huggingface.co/hf-inference/models/Qwen/QwQ-32B')) {
        return fetch(url, options);
      }
      
      try {
        return await fetchWithRetry(url, options);
      } catch (err) {
        console.error('Supabase request error (Retried):', err);
        throw err;
      }
    }
  }
})
