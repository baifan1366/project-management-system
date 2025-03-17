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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5;">Thank You for Your Purchase!</h1>
          </div>
          
          <p>Dear Customer,</p>
          
          <p>Your payment has been successfully processed. Here are your order details:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Order ID:</strong> ${orderDetails.id || 'N/A'}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Amount:</strong> $${((orderDetails.amount || 0) / 100).toFixed(2)}</p>
            <p><strong>Plan:</strong> ${orderDetails.planName || 'N/A'}</p>
          </div>
          
          <p>If you have any questions about your order, please contact our support team.</p>
          
          <p>Best regards,<br>Team Sync</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666; font-size: 12px;">
            <p>© 2023 Team Sync. All rights reserved.</p>
          </div>
        </div>
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