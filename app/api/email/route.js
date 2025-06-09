import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create a reusable transporter object
const createTransporter = async () => {
  // Check if we're using a secure connection
  const secure = process.env.NEXT_PUBLIC_SMTP_SECURE === 'true';
  const port = parseInt(process.env.NEXT_PUBLIC_SMTP_PORT || '587');
  
  return nodemailer.createTransport({
    host: process.env.NEXT_PUBLIC_SMTP_HOSTNAME,
    port: port,
    secure: secure,
    auth: {
      user: process.env.NEXT_PUBLIC_SMTP_USERNAME,
      pass: process.env.NEXT_PUBLIC_SMTP_PASSWORD,
    },
    // Add additional options to handle TLS issues
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false,
    },
  });
};

// Supabase image URLs
const LOGO_URL = "https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/public/public-resources/email/logo.png";
const HIGH_FIVE_URL = "https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/public/public-resources/email/blackhighFive_noBG.png";
const LOCK_URL = "https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/public/public-resources/email/blackLock_noBG.png";

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, to, name, password, locale = 'en' } = body;
    
    const transporter = await createTransporter();
    const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/auth/login`;
    
    let html, text, subject;
    
    if (type === 'account_creation') {
      subject = 'Your Team Sync Account Has Been Created';
      html = `
      <div style="background-color: #f5f5f5; padding: 40px 0; font-family: Arial, sans-serif;">
        <div style="max-width: 480px; margin: 0 auto">
          <!-- Logo and Brand Name -->
          <div style="display: flex; align-items: center; margin-bottom: 16px">
            <img src="${LOGO_URL}" alt="Team Sync" style="height: 30px; width: 30px; margin-right: 8px" />
            <span style="color: #111827; font-size: 16px; font-weight: 600">Team Sync</span>
          </div>

          <!-- White Card -->
          <div style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 32px;">
            <!-- High Five Icon -->
            <div style="text-align: center; margin: 16px 0">
              <img src="${HIGH_FIVE_URL}" alt="High Five Icon" style="height: 150px; width: 150px" />
            </div>

            <!-- Title -->
            <h1 style="color: #111827; font-size: 28px; font-weight: 800; margin: 0 0 16px 0; text-align: left; letter-spacing: -0.02em;">
              Your account has been created
            </h1>

            <!-- Divider -->
            <hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 16px 0;" />

            <!-- Message -->
            <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
              Hello ${name},<br><br>
              Your Team Sync account has been created by an administrator. Here are your login credentials:
            </p>

            <!-- Credentials Box -->
            <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin: 16px 0;">
              <p style="color: #374151; font-size: 14px; line-height: 20px; margin: 0;">
                <strong>Email:</strong> ${to}<br>
                <strong>Password:</strong> ${password}
              </p>
            </div>

            <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 24px 0;">
              Please change your password after your first login for security purposes.
            </p>

            <!-- Button -->
            <a href="${loginUrl}" 
               style="display: block; background-color: #000000; color: white; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 32px 0; transition: transform 0.2s;">
              Login to Your Account
            </a>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0 0;">
              If you have any questions, please contact your administrator.
            </p>
          </div>
        </div>
      </div>
      `;
      
      text = `
        Hello ${name},
        
        Your Team Sync account has been created by an administrator. Here are your login credentials:
        
        Email: ${to}
        Password: ${password}
        
        Please change your password after your first login for security purposes.
        
        You can login at: ${loginUrl}
        
        If you have any questions, please contact your administrator.
        
        Regards,
        Team Sync
      `;
    } else if (type === 'password_update') {
      subject = 'Your Team Sync Password Has Been Updated';
      html = `
      <div style="background-color: #f5f5f5; padding: 40px 0; font-family: Arial, sans-serif;">
        <div style="max-width: 480px; margin: 0 auto">
          <!-- Logo and Brand Name -->
          <div style="display: flex; align-items: center; margin-bottom: 16px">
            <img src="${LOGO_URL}" alt="Team Sync" style="height: 30px; width: 30px; margin-right: 8px" />
            <span style="color: #111827; font-size: 16px; font-weight: 600">Team Sync</span>
          </div>

          <!-- White Card -->
          <div style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); padding: 32px;">
            <!-- Lock Icon -->
            <div style="text-align: center; margin: 10px 0">
              <img src="${LOCK_URL}" alt="Lock Icon" style="height: 125px; width: 200px" />
            </div>

            <!-- Title -->
            <h1 style="color: #111827; font-size: 28px; font-weight: 800; margin: 0 0 16px 0; text-align: left; letter-spacing: -0.02em;">
              Your password has been updated
            </h1>

            <!-- Divider -->
            <hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 16px 0;" />

            <!-- Message -->
            <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
              Hello ${name},<br><br>
              Your Team Sync account password has been updated by an administrator. Here are your new login credentials:
            </p>

            <!-- Credentials Box -->
            <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin: 16px 0;">
              <p style="color: #374151; font-size: 14px; line-height: 20px; margin: 0;">
                <strong>Email:</strong> ${to}<br>
                <strong>New Password:</strong> ${password}
              </p>
            </div>

            <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 24px 0;">
              Please change your password after your next login for security purposes.
            </p>

            <!-- Button -->
            <a href="${loginUrl}" 
               style="display: block; background-color: #000000; color: white; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 32px 0; transition: transform 0.2s;">
              Login to Your Account
            </a>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0 0;">
              If you did not expect this change, please contact your administrator immediately.
            </p>
          </div>
        </div>
      </div>
      `;
      
      text = `
        Hello ${name},
        
        Your Team Sync account password has been updated by an administrator. Here are your new login credentials:
        
        Email: ${to}
        New Password: ${password}
        
        Please change your password after your next login for security purposes.
        
        You can login at: ${loginUrl}
        
        If you did not expect this change, please contact your administrator immediately.
        
        Regards,
        Team Sync
      `;
    } else {
      return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
    }
    
    const info = await transporter.sendMail({
      from: process.env.NEXT_PUBLIC_EMAIL_FROM || '"Team Sync" <noreply@teamsync.com>',
      to,
      subject,
      html,
      text,
    });
    
    return NextResponse.json({ success: true, messageId: info.messageId });
    
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 