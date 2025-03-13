// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { SmtpClient } from 'https://deno.land/x/denomailer@0.12.0/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
  };

  // 添加对 OPTIONS 请求的处理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 获取请求体中的数据
  const { email, teamId, permission } = await req.json();
  
  // 添加数据验证
  if (!email || !teamId || !permission) {
    return new Response(
      JSON.stringify({ error: '缺少必要参数' }), 
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const smtp = new SmtpClient()

  console.log(`Function "send-email-smtp" up and running!`)

  try {
    console.log('正在连接 SMTP 服务器...');
    await smtp.connect({
      hostname: Deno.env.get('NEXT_PUBLIC_SMTP_HOSTNAME') || '',
      port: Number(Deno.env.get('NEXT_PUBLIC_SMTP_PORT')) || 587,
      username: Deno.env.get('NEXT_PUBLIC_SMTP_USERNAME') || '',
      password: Deno.env.get('NEXT_PUBLIC_SMTP_PASSWORD') || '',
      tls: false, // 先尝试不使用 TLS
    })

    const supabase = createClient(
      Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || '',
      Deno.env.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') || ''
    )

    // 获取团队信息
    const { data: team, error: teamError } = await supabase
      .from('team')
      .select('name')
      .eq('id', teamId)
      .single()

    if (teamError) {
      return new Response(
        JSON.stringify({ 
          error: '获取团队信息失败', 
          details: teamError.message 
        }), 
        { 
          status: 500,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    const teamName = team?.name || teamId

    console.log('正在发送邮件...');
    await smtp.send({
      from: Deno.env.get('NEXT_PUBLIC_SMTP_FROM') || Deno.env.get('NEXT_PUBLIC_SMTP_USERNAME') || '',
      to: email,
      subject: `Team Invitation - ${teamName}`,
      html: `
        <p>You are invited to join the ${teamName} team</p>
        <p>Permission: ${permission}</p>
        <p>Please click the following link to join the team:</p>
        <a href="localhost:3000/en/teamInvitation/${teamId}">Join Us</a>
      `,
    })

    console.log('邮件发送成功');
  } catch (error: any) {
    console.error('发送邮件时出错:', error);
    return new Response(
      JSON.stringify({ 
        error: '发送邮件失败', 
        details: error.message 
      }), 
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } finally {
    try {
      await smtp.close()
    } catch (error) {
      console.error('关闭 SMTP 连接时出错:', error);
    }
  }

  return new Response(
    JSON.stringify({
      done: true,
    }),
    {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/teamInvitation' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
