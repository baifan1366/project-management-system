import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { to, subject, text, html, orderDetails } = body;
    
    if (!to) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      );
    }
    
    // 使用环境变量中的 SMTP 配置
    console.log('Creating transporter with SMTP config...');
    const transporter = nodemailer.createTransport({
      host: process.env.NEXT_PUBLIC_SMTP_HOSTNAME,
      port: parseInt(process.env.NEXT_PUBLIC_SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.NEXT_PUBLIC_SMTP_USERNAME,
        pass: process.env.NEXT_PUBLIC_SMTP_PASSWORD,
      },
    });
    
    // 打印 SMTP 配置（不包含密码）
    console.log('SMTP Config:', {
      host: process.env.NEXT_PUBLIC_SMTP_HOSTNAME,
      port: process.env.NEXT_PUBLIC_SMTP_PORT,
      user: process.env.NEXT_PUBLIC_SMTP_USERNAME,
      from: process.env.NEXT_PUBLIC_SMTP_FROM || process.env.NEXT_PUBLIC_SMTP_USERNAME,
    });
    
    // 如果没有提供 HTML，但提供了订单详情，则创建默认模板
    let emailHtml = html;
    if (!emailHtml && orderDetails) {
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
            src="https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/sign/%20public-resources/emails/logo.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiIgcHVibGljLXJlc291cmNlcy9lbWFpbHMvbG9nby5wbmciLCJpYXQiOjE3NDE2MDUwMjUsImV4cCI6MTgzNjIxMzAyNX0.IOriHUlZYA8zsub-O1o9a10EowBaZCUHLqs6GfTzOvM"
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
              src="https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/sign/%20public-resources/emails/blackhighFive_noBG.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiIgcHVibGljLXJlc291cmNlcy9lbWFpbHMvYmxhY2toaWdoRml2ZV9ub0JHLnBuZyIsImlhdCI6MTc0MTYwNjQ0MiwiZXhwIjoxODM2MjE0NDQyfQ.dvaDfnnHvlwNRwndmwbzSPm-fZ6GpR5XssbXi5TkcfA"
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
            Order Confirmation
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
            Thank you for your purchase! Here are the details of your order:
          </p>

          <!-- Order Details -->
          <div
            style="
              background-color: #f9f9f9;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            "
          >
            <div style="margin-bottom: 10px">
              Order ID: ${orderDetails.id || 'N/A'}
            </div>
            <div style="margin-bottom: 10px">
              Plan: ${orderDetails.planName || 'Subscription Plan'}
            </div>
            <div style="margin-bottom: 10px">
              Quantity: ${orderDetails.quantity || '1'}
            </div>
            <div style="margin-bottom: 10px">
              Amount: $${((orderDetails.amount || 0) / 100).toFixed(2)}
              ${orderDetails.currency || 'USD'}
            </div>
            <div style="margin-bottom: 0">
              Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric',
              month: 'long', day: 'numeric' })}
            </div>
          </div>

          ${orderDetails.redemptionCodes ? `
          <div style="margin-top: 20px; margin-bottom: 20px">
            <h2
              style="
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 15px;
                color: #000;
              "
            >
              Your Redemption Codes
            </h2>
            <p style="color: #666; margin-bottom: 15px">
              Share these codes with your team members to give them access:
            </p>
            ${orderDetails.redemptionCodes.map(code => `
            <div
              style="
                background-color: #f1f1f1;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 10px;
                font-family: monospace;
              "
            >
              ${code}
            </div>
            `).join('')}
          </div>
          ` : ''}

          <!-- Button -->
          <a
            href="https://teamsync.ai/dashboard"
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
            Go to Dashboard
          </a>

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
    
    // 发送邮件
    console.log('Sending email to:', to);
    const info = await transporter.sendMail({
      from: `"Team Sync" <${process.env.NEXT_PUBLIC_SMTP_FROM || process.env.NEXT_PUBLIC_SMTP_USERNAME}>`,
      to: to,
      subject: subject || 'Thank You for Your Purchase - Team Sync',
      text: text || 'Thank you for your purchase. Your payment has been successfully processed.',
      html: emailHtml,
    });
    
    console.log('Message sent: %s', info.messageId);
    console.log('Response:', info.response);
    
    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      response: info.response
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email: ' + error.message },
      { status: 500 }
    );
  }
} 