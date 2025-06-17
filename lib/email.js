import nodemailer from 'nodemailer';

// Create a reusable transporter object
const createTransporter = async () => {
  return nodemailer.createTransport({
    host: process.env.NEXT_PUBLIC_SMTP_HOSTNAME,
    port: parseInt(process.env.NEXT_PUBLIC_SMTP_PORT || '587'),
    secure: process.env.NEXT_PUBLIC_SMTP_SECURE === 'true',
    auth: {
      user: process.env.NEXT_PUBLIC_SMTP_USERNAME,
      pass: process.env.NEXT_PUBLIC_SMTP_PASSWORD,
    },
    connectionTimeout: 10000, // 10 seconds timeout for connections
    greetingTimeout: 5000,   // 5 seconds timeout for greeting
    socketTimeout: 10000,    // 10 seconds timeout for socket
    // Add additional options to handle TLS issues
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false,
    },
  });
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} options.text - Email text content (fallback)
 * @returns {Promise<Object>} - Nodemailer send result
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const transporter = await createTransporter();
    
    const info = await transporter.sendMail({
      from: process.env.NEXT_PUBLIC_EMAIL_FROM || '"Team Sync" <noreply@teamsync.com>',
      to,
      subject,
      html,
      text,
    });
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error.message);
    console.error('Email error stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// Supabase image URLs
const LOGO_URL = "https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/public/public-resources/email/logo.png";
const HIGH_FIVE_URL = "https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/public/public-resources/email/blackhighFive_noBG.png";
const LOCK_URL = "https://xvvuzblglnbbsrmzgexp.supabase.co/storage/v1/object/public/public-resources/email/blackLock_noBG.png";

/**
 * Send a verification email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.token - Verification token
 * @param {string} options.locale - User locale
 * @returns {Promise<Object>} - Send result
 */
export async function sendVerificationEmail({ to, name, token, locale = 'en' }) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/auth/verify?token=${token}`;
  
  const html = `
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
          Confirm your signup
        </h1>

        <!-- Divider -->
        <hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 16px 0;" />

        <!-- Message -->
        <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
          Hello ${name},<br><br>
          Thank you for signing up! Please click the button below to verify your email address.
          This link will expire in 24 hours.
        </p>

        <!-- Button -->
        <a href="${verificationUrl}" 
           style="display: block; background-color: #000000; color: white; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 32px 0; transition: transform 0.2s;">
          Verify Email
        </a>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0 0;">
          If you did not sign up for an account, please ignore this email.
        </p>
      </div>
    </div>
  </div>
  `;
  
  const text = `
    Hello ${name},
    
    Thank you for signing up! Please click the link below to verify your email address:
    
    ${verificationUrl}
    
    This link will expire in 24 hours.
    
    If you did not sign up for an account, please ignore this email.
    
    Regards,
    Team Sync
  `;
  
  return sendEmail({
    to,
    subject: 'Verify Your Email Address',
    html,
    text,
  });
}

/**
 * Send a password reset email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.token - Reset token
 * @param {string} options.locale - User locale
 * @returns {Promise<Object>} - Send result
 */
export async function sendPasswordResetEmail({ to, name, token, locale = 'en' }) {
  const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/reset-password?token=${token}`;
  
  const html = `
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
          Reset your password
        </h1>

        <!-- Divider -->
        <hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 16px 0;" />

        <!-- Message -->
        <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
          Hello ${name},<br><br>
          Need to reset your password? No worry, we got you! Just click the button below and you'll be on your way.
          This link will expire in 1 hour.
        </p>

        <!-- Button -->
        <a href="${resetUrl}" 
           style="display: block; background-color: #000000; color: white; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 32px 0; transition: transform 0.2s;">
          Reset Password
        </a>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0 0;">
          If you did not request a password reset, please ignore this email or contact support if you have concerns.
        </p>
      </div>
    </div>
  </div>
  `;
  
  const text = `
    Hello ${name},
    
    We received a request to reset your password. Please click the link below to create a new password:
    
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you did not request a password reset, please ignore this email or contact support if you have concerns.
    
    Regards,
    Team Sync
  `;
  
  return sendEmail({
    to,
    subject: 'Reset Your Password',
    html,
    text,
  });
}

/**
 * Send an invitation email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.inviterName - Inviter name
 * @param {string} options.token - Invitation token
 * @param {string} options.locale - User locale
 * @returns {Promise<Object>} - Send result
 */
export async function sendInvitationEmail({ to, name, inviterName, token, locale = 'en' }) {
  const invitationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/auth/invitation?token=${token}`;
  
  const html = `
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
          Join the team
        </h1>

        <!-- Divider -->
        <hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 16px 0;" />

        <!-- Message -->
        <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
          Hello${name ? ' ' + name : ''},<br><br>
          ${inviterName ? inviterName + ' has' : 'You have been'} invited you to join Team Sync. Click the button below to accept the invitation and create your account.
        </p>

        <!-- Button -->
        <a href="${invitationUrl}" 
           style="display: block; background-color: #000000; color: white; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 32px 0; transition: transform 0.2s;">
          Accept invitation
        </a>
      </div>
    </div>
  </div>
  `;
  
  const text = `
    Hello${name ? ' ' + name : ''},
    
    ${inviterName ? inviterName + ' has' : 'You have been'} invited you to join Team Sync. Please click the link below to accept the invitation and create your account:
    
    ${invitationUrl}
    
    Regards,
    Team Sync
  `;
  
  return sendEmail({
    to,
    subject: 'Invitation to Join Team Sync',
    html,
    text,
  });
}

/**
 * Send account creation email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.password - User's password
 * @param {string} options.locale - User locale
 * @returns {Promise<Object>} - Send result
 */
export async function sendAccountCreationEmail({ to, name, password, locale = 'en' }) {
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/auth/login`;
  
  const html = `
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
  
  const text = `
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
  
  return sendEmail({
    to,
    subject: 'Your Team Sync Account Has Been Created',
    html,
    text,
  });
}

/**
 * Send password update email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.password - User's new password
 * @param {string} options.locale - User locale
 * @returns {Promise<Object>} - Send result
 */
export async function sendPasswordUpdateEmail({ to, name, password, locale = 'en' }) {
  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/auth/login`;
  
  const html = `
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
  
  const text = `
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
  
  return sendEmail({
    to,
    subject: 'Your Team Sync Password Has Been Updated',
    html,
    text,
  });
}

/**
 * Send subscription renewal success email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.planName - Subscription plan name
 * @param {string} options.amount - Payment amount
 * @param {string} options.newExpiryDate - New expiry date
 * @param {string} options.locale - User locale
 * @returns {Promise<Object>} - Send result
 */
export async function sendSubscriptionRenewalSuccessEmail({ to, name, planName, amount, newExpiryDate, locale = 'en' }) {
  const accountUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/settings/subscription`;
  
  const html = `
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
          Subscription Renewed Successfully
        </h1>

        <!-- Divider -->
        <hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 16px 0;" />

        <!-- Message -->
        <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
          Hello ${name},<br><br>
          Your subscription has been renewed successfully. Thank you for continuing with us!
        </p>

        <!-- Details Box -->
        <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <p style="color: #374151; font-size: 14px; line-height: 20px; margin: 0;">
            <strong>Plan:</strong> ${planName}<br>
            <strong>Amount:</strong> $${amount}<br>
            <strong>Valid until:</strong> ${newExpiryDate}<br>
          </p>
        </div>

        <!-- Button -->
        <a href="${accountUrl}" 
           style="display: block; background-color: #000000; color: white; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 32px 0; transition: transform 0.2s;">
          View Subscription Details
        </a>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 24px 0 0 0;">
          If you have any questions about your subscription, please visit your account settings or contact our support team.
        </p>
      </div>
    </div>
  </div>
  `;
  
  const text = `
    Hello ${name},
    
    Your subscription has been renewed successfully. Thank you for continuing with us!
    
    Plan: ${planName}
    Amount: $${amount}
    Valid until: ${newExpiryDate}
    
    You can view your subscription details at: ${accountUrl}
    
    If you have any questions about your subscription, please visit your account settings or contact our support team.
    
    Regards,
    Team Sync
  `;
  
  return sendEmail({
    to,
    subject: 'Your Subscription Has Been Renewed',
    html,
    text,
  });
}

/**
 * Send subscription renewal failure email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Recipient name
 * @param {string} options.planName - Subscription plan name
 * @param {string} options.errorReason - Reason for failure
 * @param {string} options.expiryDate - Expiry date
 * @param {string} options.locale - User locale
 * @returns {Promise<Object>} - Send result
 */
export async function sendSubscriptionRenewalFailureEmail({ to, name, planName, errorReason, expiryDate, locale = 'en' }) {
  const accountUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/${locale}/settings/subscription`;
  
  const html = `
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
          Subscription Renewal Failed
        </h1>

        <!-- Divider -->
        <hr style="border: none; height: 1px; background-color: #e5e7eb; margin: 16px 0;" />

        <!-- Message -->
        <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
          Hello ${name},<br><br>
          We were unable to renew your subscription automatically. Please update your payment information to continue using our services.
        </p>

        <!-- Details Box -->
        <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <p style="color: #374151; font-size: 14px; line-height: 20px; margin: 0;">
            <strong>Plan:</strong> ${planName}<br>
            <strong>Issue:</strong> ${errorReason}<br>
            <strong>Expiry date:</strong> ${expiryDate}<br>
          </p>
        </div>

        <p style="color: #6b7280; font-size: 16px; line-height: 24px; margin: 24px 0;">
          Your subscription will expire on the date shown above if not renewed. Please update your payment method to ensure uninterrupted service.
        </p>

        <!-- Button -->
        <a href="${accountUrl}" 
           style="display: block; background-color: #000000; color: white; text-decoration: none; text-align: center; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 32px 0; transition: transform 0.2s;">
          Update Payment Method
        </a>
      </div>
    </div>
  </div>
  `;
  
  const text = `
    Hello ${name},
    
    We were unable to renew your subscription automatically. Please update your payment information to continue using our services.
    
    Plan: ${planName}
    Issue: ${errorReason}
    Expiry date: ${expiryDate}
    
    Your subscription will expire on the date shown above if not renewed. Please update your payment method to ensure uninterrupted service.
    
    Update your payment method at: ${accountUrl}
    
    Regards,
    Team Sync
  `;
  
  return sendEmail({
    to,
    subject: 'Action Required: Subscription Renewal Failed',
    html,
    text,
  });
} 