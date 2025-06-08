import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { to, subject, text, html, invitationDetails } = body;
    
    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      );
    }
    
    // 验证必要的 SMTP 配置
    if (!process.env.NEXT_PUBLIC_SMTP_USERNAME || !process.env.NEXT_PUBLIC_SMTP_PASSWORD) {
      return NextResponse.json(
        { error: 'SMTP configuration is missing' },
        { status: 500 }
      );
    }
    
    // 修改 SMTP 配置，使用正确的环境变量名（去掉 NEXT_PUBLIC_ 前缀）
    const transporter = nodemailer.createTransport({
      host: process.env.NEXT_PUBLIC_SMTP_HOSTNAME,
      port: parseInt(process.env.NEXT_PUBLIC_SMTP_PORT || '587'),
      secure: process.env.NEXT_PUBLIC_SMTP_SECURE === 'true',
      auth: {
        user: process.env.NEXT_PUBLIC_SMTP_USERNAME,
        pass: process.env.NEXT_PUBLIC_SMTP_PASSWORD,
      },
    });
    
    // 测试 SMTP 连接
    try {
      await transporter.verify();
    } catch (error) {
      console.error('SMTP 连接失败:', error);
    }
    
    // 如果没有提供 HTML，但提供了订单详情，则创建默认模板
    let emailHtml = html;
    if (!emailHtml && invitationDetails) {
      emailHtml = `
        <!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Order Confirmation</title>
  </head>
  <body>
    <div
      style="
        background-color: #f5f5f5;
        padding: 40px 0;
        font-family: Arial, sans-serif;
      "
    >
      <div style="max-width: 480px; margin: 0 auto">
        <!-- Logo and Brand Name - At the top left of the white card -->
        <div style="display: flex; align-items: center; margin-bottom: 16px">
          <img
            src="https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/sign/%20public-resources/emails/logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiIgcHVibGljLXJlc291cmNlcy9lbWFpbHMvbG9nby5wbmciLCJpYXQiOjE3NDI1Mjk1ODIsImV4cCI6MTgzNzEzNzU4Mn0.qDeS69M-0yTevXDoiuDc0rO_v_tsvxs0Z59C_snMRsE"
            alt="Team Sync"
            style="height: 30px; width: 30px; margin-right: 8px"
          />
          <span style="color: #111827; font-size: 16px; font-weight: 600"
            >Team Sync</span
          >
        </div>

        <!-- White Card -->
        <div
          style="
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 32px;
          "
        >
          <!-- High Five Icon -->
          <div style="text-align: center; margin: 16px 0">
            <img
              src="https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/sign/%20public-resources/emails/blackhighFive_noBG.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiIgcHVibGljLXJlc291cmNlcy9lbWFpbHMvYmxhY2toaWdoRml2ZV9ub0JHLnBuZyIsImlhdCI6MTc0MjUyOTU1MCwiZXhwIjoxODM3MTM3NTUwfQ.ax1W0LxDSdZm4xYJXo6Xi9EkPmOKD__-8DE9Yk_kVnQ"
              alt="High Five Icon"
              style="height: 150px; width: 150px"
            />
          </div>

          <!-- Title -->
          <h1
            style="
              color: #111827;
              font-size: 28px;
              font-weight: 800;
              margin: 0 0 16px 0;
              text-align: left;
              letter-spacing: -0.02em;
            "
          >
            Team Invitation
          </h1>

          <!-- Divider -->
          <hr
            style="
              border: none;
              height: 1px;
              background-color: #e5e7eb;
              margin: 16px 0;
            "
          />

          <!-- Message -->
          <p
            style="
              color: #6b7280;
              font-size: 16px;
              line-height: 24px;
              margin: 0 0 24px 0;
            "
          >
            Welcome to our team: ${invitationDetails.teamName}
          </p>

          <!-- Invitation Details -->
          <div
            style="
              background-color: #f9f9f9;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            "
          >
            Permission: ${invitationDetails.permission === 'CAN_VIEW' ? 'Viewer' : invitationDetails.permission === 'CAN_EDIT' ? 'Editor' : invitationDetails.permission === 'CAN_CHECK' ? 'Checker' : invitationDetails.permission}
          </div>

          <!-- Button -->
          <a
            href="${process.env.NEXT_PUBLIC_SITE_URL}/en/teamInvitation/${invitationDetails.teamId}"
            style="
              display: block;
              background-color: #000000;
              color: white;
              text-decoration: none;
              text-align: center;
              padding: 12px 24px;
              border-radius: 6px;
              font-weight: 500;
              margin: 32px 0;
              transition: transform 0.2s;
            "
            onmouseover="this.style.transform='scale(1.02)'"
            onmouseout="this.style.transform='scale(1)'"
          >
            Join Us
          </a>

          <!-- Note for non-recognizing users -->
          <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 0 0 8px 0;">
            If you’re not sure why you received this invitation, you can safely ignore this email.
          </p>

          <div style="color: #6b7280; font-size: 14px">
            If you have any questions, please contact our support team.
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
      `;
    }

    const info = await transporter.sendMail({
      from: `"Team Sync" <${process.env.NEXT_PUBLIC_SMTP_FROM || process.env.NEXT_PUBLIC_SMTP_USERNAME}>`,
      to: to,
      subject: subject || 'Team Invitation',
      text: text || 'Welcome to join us.',
      html: emailHtml,
    });
    
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      response: info.response
    });
  } catch (error) {
    console.error('详细错误信息:', {
      message: error.message,
      code: error.code,
      response: error.response,
    });
    return NextResponse.json(
      { error: `发送邮件失败: ${error.message}` },
      { status: 500 }
    );
  }
} 