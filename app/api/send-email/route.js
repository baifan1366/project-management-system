import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const body = await request.json();
    const { to, subject, text, html, orderDetails, supportDetails, templateType, templateData } = body;
    
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
    
    // 如果没有提供 HTML，但提供了templateType，则根据模板类型创建HTML
    let emailHtml = html;
    
    // Add template selection logic
    if (!emailHtml && templateType) {
      switch(templateType) {
        case 'refund_approved':
          emailHtml = generateRefundApprovedTemplate(templateData);
          break;
        case 'refund_rejected':
          emailHtml = generateRefundRejectedTemplate(templateData);
          break;
        case 'support_response':
          emailHtml = generateSupportResponseTemplate(templateData || supportDetails);
          break;
        case 'order_confirmation':
          emailHtml = generateOrderConfirmationTemplate(templateData || orderDetails);
          break;
        default:
          // Fall back to existing templates
          if (supportDetails) {
            emailHtml = generateSupportResponseTemplate(supportDetails);
          } else if (orderDetails) {
            emailHtml = generateOrderConfirmationTemplate(orderDetails);
          }
      }
    }
    // 如果没有提供 HTML，但提供了订单详情或支持详情，则创建默认模板
    else if (!emailHtml && supportDetails) {
      emailHtml = generateSupportResponseTemplate(supportDetails);
    }
    else if (!emailHtml && orderDetails) {
      emailHtml = generateOrderConfirmationTemplate(orderDetails);
    }
    
    // 发送邮件
    console.log('Sending email to:', to);
    const info = await transporter.sendMail({
      from: `"Team Sync" <${process.env.NEXT_PUBLIC_SMTP_FROM || process.env.NEXT_PUBLIC_SMTP_USERNAME}>`,
      to: to,
      subject: subject,
      text: text,
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

const LOGO_URL = "https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/public/public-resources/email/logo.png";
const HIGH_FIVE_URL = "https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/public/public-resources/email/blackhighFive_noBG.png";
const LOCK_URL = "https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/public/public-resources/email/blackLock_noBG.png";

// Template for refund approved emails
function generateRefundApprovedTemplate(data) {
  if (!data) return '';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Refund Request Approved</title>
      </head>
      <body>
        <div style="background-color: #f5f5f5; padding: 40px 0; font-family: Arial, sans-serif;">
          <div style="max-width: 480px; margin: 0 auto">
            <!-- Logo and Brand Name -->
            <div style="display: flex; align-items: center; margin-bottom: 16px">
              <img
                src="${LOGO_URL}"
                alt="Team Sync"
                style="height: 30px; width: 30px; margin-right: 8px"
              />
              <span style="color: #111827; font-size: 16px; font-weight: 600">Team Sync</span>
            </div>
    
            <!-- White Card -->
            <div style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 32px;">
              <!-- Title -->
              <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin: 0 0 16px 0; text-align: left; letter-spacing: -0.02em;">
                Refund Request Approved
              </h1>
    
              <!-- Divider -->
              <hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 16px 0;" />
    
              <!-- Message -->
              <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                Dear ${data.customerName || 'Customer'},
              </p>
              
              <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                We're pleased to inform you that your refund request has been approved. A refund of $${(data.refundAmount || 0).toFixed(2)} has been processed back to your original payment method.
              </p>
    
              <!-- Refund Details -->
              <div style="background-color: #f9f9f9; padding: 16px; border-radius: 5px; margin-bottom: 20px;">
                <h2 style="font-size: 18px; margin-top: 0; margin-bottom: 12px; color: #111827;">Refund Details</h2>
                <div style="margin-bottom: 8px;">
                  <strong>Refund Amount:</strong> $${(data.refundAmount || 0).toFixed(2)}
                </div>
                <div style="margin-bottom: 8px;">
                  <strong>Refund Date:</strong> ${data.refundDate || new Date().toLocaleDateString()}
                </div>
                <div style="margin-bottom: 8px;">
                  <strong>Refund ID:</strong> ${data.refundId || 'N/A'}
                </div>
                <div>
                  <strong>Original Reason:</strong> ${data.reason || 'Refund request'}
                </div>
              </div>
    
              <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                Please note that it may take 5-10 business days for the refund to appear in your account, depending on your payment provider.
              </p>
    
              <!-- Footer -->
              <div style="margin-top: 32px; color: #6b7280; font-size: 14px; line-height: 20px;">
                <p>If you have any questions about your refund, please contact our support team.</p>
                <p style="margin-top: 16px;">Thank you for your understanding.</p>
                <p>Best regards,<br />Team Sync Support Team</p>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template for refund rejected emails
function generateRefundRejectedTemplate(data) {
  if (!data) return '';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Refund Request Rejected</title>
      </head>
      <body>
        <div style="background-color: #f5f5f5; padding: 40px 0; font-family: Arial, sans-serif;">
          <div style="max-width: 480px; margin: 0 auto">
            <!-- Logo and Brand Name -->
            <div style="display: flex; align-items: center; margin-bottom: 16px">
              <img
                src="${LOGO_URL}"
                alt="Team Sync"
                style="height: 30px; width: 30px; margin-right: 8px"
              />
              <span style="color: #111827; font-size: 16px; font-weight: 600">Team Sync</span>
            </div>
    
            <!-- White Card -->
            <div style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 32px;">
              <!-- Title -->
              <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin: 0 0 16px 0; text-align: left; letter-spacing: -0.02em;">
                Refund Request Update
              </h1>
    
              <!-- Divider -->
              <hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 16px 0;" />
    
              <!-- Message -->
              <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                Dear ${data.customerName || 'Customer'},
              </p>
              
              <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                We've reviewed your refund request and unfortunately, we're unable to approve it at this time.
              </p>
    
              <!-- Rejection Reason -->
              <div style="background-color: #f9f9f9; padding: 16px; border-radius: 5px; margin-bottom: 20px;">
                <h2 style="font-size: 18px; margin-top: 0; margin-bottom: 12px; color: #111827;">Reason</h2>
                <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0;">
                  ${data.rejectionReason || 'Your refund request does not meet our eligibility criteria.'}
                </p>
              </div>
    
              <!-- Footer -->
              <div style="margin-top: 32px; color: #6b7280; font-size: 14px; line-height: 20px;">
                <p>If you have any questions or would like to discuss this further, please reply to this email or contact our support team.</p>
                <p style="margin-top: 16px;">Thank you for your understanding.</p>
                <p>Best regards,<br />Team Sync Support Team</p>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template for support response emails
function generateSupportResponseTemplate(data) {
  if (!data) return '';
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Support Response</title>
      </head>
      <body>
        <div style="background-color: #f5f5f5; padding: 40px 0; font-family: Arial, sans-serif;">
          <div style="max-width: 480px; margin: 0 auto">
            <!-- Logo and Brand Name -->
            <div style="display: flex; align-items: center; margin-bottom: 16px">
              <img
                src="${LOGO_URL}"
                alt="Team Sync"
                style="height: 30px; width: 30px; margin-right: 8px"
              />
              <span style="color: #111827; font-size: 16px; font-weight: 600">Team Sync</span>
            </div>
    
            <!-- White Card -->
            <div style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 32px;">
              <!-- Title -->
              <h1 style="color: #111827; font-size: 24px; font-weight: 800; margin: 0 0 16px 0; text-align: left; letter-spacing: -0.02em;">
                Support Response
              </h1>
    
            <!-- Divider -->
            <hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 16px 0;" />
    
            <!-- Message -->
            <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
              Thank you for contacting Team Sync support. Here is our response to your inquiry:
            </p>
    
            <!-- Response -->
            <div style="background-color: #f9f9f9; padding: 16px; border-radius: 5px; margin-bottom: 20px; white-space: pre-line;">
              ${data.responseText}
            </div>
    
            <!-- Original Message Reference -->
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 8px;">Your original message:</p>
              <div style="color: #6b7280; font-size: 14px; line-height: 20px; padding-left: 12px; border-left: 3px solid #e5e7eb;">
                ${data.originalMessage || 'No message provided.'}
              </div>
            </div>
    
            <!-- Footer -->
            <div style="margin-top: 32px; color: #6b7280; font-size: 14px; line-height: 20px;">
              <p>If you have any further questions, please reply to this email or contact our support team.</p>
              <p style="margin-top: 16px;">Thank you,<br />Team Sync Support</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Template for order confirmation emails
function generateOrderConfirmationTemplate(data) {
  if (!data) return '';
  
  return `
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
                src="${LOGO_URL}"
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
                src="${HIGH_FIVE_URL}"
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
                  Order ID: ${data.orderId || 'N/A'}
                </div>
                <div style="margin-bottom: 10px">
                  Plan: ${data.planName || 'Subscription Plan'}
                </div>
                <div style="margin-bottom: 10px">
                  Quantity: ${data.quantity || '1'}
                </div>
                <div style="margin-bottom: 10px">
                  Amount: $${((data.amount || 0) / 100).toFixed(2)}
                  ${data.currency || 'USD'}
                </div>
                <div style="margin-bottom: 0">
                  Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric',
                  month: 'long', day: 'numeric' })}
                </div>
              </div>

              ${data.redemptionCodes ? `
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
                ${data.redemptionCodes.map(code => `
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