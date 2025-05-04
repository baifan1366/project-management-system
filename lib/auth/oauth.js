import jwt from 'jsonwebtoken';

// 添加fetch超时控制
const fetchWithTimeout = async (url, options, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

// 添加重试功能
const fetchWithRetry = async (url, options, maxRetries = 3, timeout = 30000) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Attempt ${attempt + 1}/${maxRetries} failed:`, error.message);
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Handle Google OAuth authentication
 * @param {string} code - OAuth authorization code
 * @returns {Object} - User data and tokens
 */
export async function handleGoogleOAuth(code) {
  try {
    // Exchange code for token
    const tokenData = await exchangeGoogleCodeForToken(code);
    if (!tokenData || tokenData.error) {
      throw new Error(tokenData?.error?.message || 'Failed to exchange code for token');
    }
    
    // Get user info from Google
    const userInfo = await getGoogleUserInfo(tokenData.access_token);
    if (!userInfo || userInfo.error) {
      throw new Error(userInfo?.error?.message || 'Failed to get user info');
    }
    
    // Prepare user data and tokens
    return {
      userData: {
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        google_provider_id: userInfo.id.toString(),
        email_verified: true,
        avatar_url: userInfo.picture,
      },
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
      }
    };
  } catch (error) {
    console.error('Error in Google OAuth handling:', error);
    throw error;
  }
}

/**
 * Handle GitHub OAuth authentication
 * @param {string} code - OAuth authorization code
 * @returns {Object} - User data and tokens
 */
export async function handleGithubOAuth(code) {
  try {
    // Exchange code for token
    const tokenData = await exchangeGithubCodeForToken(code);
    if (!tokenData || tokenData.error) {
      throw new Error(tokenData?.error?.message || 'Failed to exchange code for token');
    }
    
    // Get user info from GitHub
    const userInfo = await getGithubUserInfo(tokenData.access_token);
    if (!userInfo || userInfo.error) {
      throw new Error(userInfo?.error?.message || 'Failed to get user info');
    }
    
    // Get email from GitHub if not included in user info
    let email = userInfo.email;
    if (!email) {
      const emailData = await getGithubUserEmails(tokenData.access_token);
      if (!emailData || emailData.error || !emailData.length) {
        throw new Error(emailData?.error?.message || 'Failed to get user email');
      }
      
      const primaryEmail = emailData.find(e => e.primary) || emailData[0];
      if (primaryEmail) {
        email = primaryEmail.email;
      }
    }
    
    if (!email) {
      throw new Error('No email found for GitHub user');
    }
    
    // Prepare user data and tokens
    return {
      userData: {
        email: email,
        name: userInfo.name || userInfo.login || email.split('@')[0],
        github_provider_id: userInfo.id.toString(),
        email_verified: true,
        avatar_url: userInfo.avatar_url,
      },
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
      }
    };
  } catch (error) {
    console.error('Error in GitHub OAuth handling:', error);
    throw error;
  }
}

/**
 * Exchange OAuth code for token (Google implementation)
 */
async function exchangeGoogleCodeForToken(code) {
  try {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    
    console.log('Exchanging Google code for token...');
    const response = await fetchWithRetry(
      tokenEndpoint, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
          redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
          grant_type: 'authorization_code',
        }),
      }
    );
    
    const tokenData = await response.json();
    console.log('Successfully exchanged Google code for token');
    return tokenData;
  } catch (error) {
    console.error('Error exchanging Google code for token:', error);
    throw new Error(`Failed to exchange code for token: ${error.message}`);
  }
}

/**
 * Exchange OAuth code for token (GitHub implementation)
 */
async function exchangeGithubCodeForToken(code) {
  try {
    const tokenEndpoint = 'https://github.com/login/oauth/access_token';
    
    console.log('Exchanging GitHub code for token...');
    const response = await fetchWithRetry(
      tokenEndpoint, 
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          code,
          client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
          client_secret: process.env.NEXT_PUBLIC_GITHUB_CLIENT_SECRET,
          redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`,
        }),
      }
    );
    
    const tokenData = await response.json();
    console.log('Successfully exchanged GitHub code for token');
    return tokenData;
  } catch (error) {
    console.error('Error exchanging GitHub code for token:', error);
    throw new Error(`Failed to exchange code for token: ${error.message}`);
  }
}

/**
 * Get user info from Google
 */
async function getGoogleUserInfo(accessToken) {
  try {
    const userInfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';
    console.log('Fetching Google user info...');
    
    const response = await fetchWithRetry(
      userInfoEndpoint, 
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    const userInfo = await response.json();
    console.log('Successfully fetched Google user info');
    return userInfo;
  } catch (error) {
    console.error('Error getting user info from Google:', error);
    throw new Error(`Failed to get user info: ${error.message}`);
  }
}

/**
 * Get user info from GitHub
 */
async function getGithubUserInfo(accessToken) {
  try {
    const userInfoEndpoint = 'https://api.github.com/user';
    console.log('Fetching GitHub user info...');
    
    const response = await fetchWithRetry(
      userInfoEndpoint, 
      {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const userInfo = await response.json();
    console.log('Successfully fetched GitHub user info');
    return userInfo;
  } catch (error) {
    console.error('Error getting user info from GitHub:', error);
    throw new Error(`Failed to get user info: ${error.message}`);
  }
}

/**
 * Get user emails from GitHub
 */
async function getGithubUserEmails(accessToken) {
  try {
    const emailsEndpoint = 'https://api.github.com/user/emails';
    console.log('Fetching GitHub user emails...');
    
    const response = await fetchWithRetry(
      emailsEndpoint, 
      {
        headers: {
          'Authorization': `token ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const emailsData = await response.json();
    console.log('Successfully fetched GitHub user emails');
    return emailsData;
  } catch (error) {
    console.error('Error getting user emails from GitHub:', error);
    throw new Error(`Failed to get user emails: ${error.message}`);
  }
} 