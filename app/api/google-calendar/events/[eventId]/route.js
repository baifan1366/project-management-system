import { NextResponse } from 'next/server';

// 刷新访问令牌
async function refreshAccessToken(refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to refresh access token:', error);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

// Delete Google Calendar event
export async function DELETE(request, { params }) {
  try {
    const eventId = params.eventId;
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    const requestData = await request.json();
    let { accessToken, refreshToken } = requestData;
    
    if (!accessToken && !refreshToken) {
      return NextResponse.json(
        { error: 'No valid tokens provided' },
        { status: 401 }
      );
    }
    
    // If we only have a refresh token, try to get a new access token
    if (!accessToken && refreshToken) {
      accessToken = await refreshAccessToken(refreshToken);
      if (!accessToken) {
        return NextResponse.json(
          { error: 'Failed to refresh access token' },
          { status: 401 }
        );
      }
    }
    
    // Call Google Calendar API to delete the event
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    // Handle token expiration
    if (response.status === 401 && refreshToken) {
      
      const newAccessToken = await refreshAccessToken(refreshToken);
      
      if (!newAccessToken) {
        return NextResponse.json(
          { error: 'Failed to refresh access token' },
          { status: 401 }
        );
      }
      
      // Retry with new access token
      const retryResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${newAccessToken}`,
          },
        }
      );
      
      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        console.error('Failed to delete event after token refresh:', retryResponse.status, errorText);
        return NextResponse.json(
          { error: 'Failed to delete event after token refresh', details: errorText },
          { status: retryResponse.status }
        );
      }
      
      return NextResponse.json({ success: true });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to delete event:', response.status, errorText);
      return NextResponse.json(
        { error: 'Failed to delete event', details: errorText },
        { status: response.status }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update Google Calendar event
export async function PATCH(request, { params }) {
  try {
    const eventId = params.eventId;
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    const requestData = await request.json();
    let { accessToken, refreshToken, eventData, sendUpdates = 'all' } = requestData;
    
    if (!eventData) {
      return NextResponse.json(
        { error: 'Event data is required' },
        { status: 400 }
      );
    }
    
    if (!accessToken && !refreshToken) {
      return NextResponse.json(
        { error: 'No valid tokens provided' },
        { status: 401 }
      );
    }
    
    // If we only have a refresh token, try to get a new access token
    if (!accessToken && refreshToken) {
      accessToken = await refreshAccessToken(refreshToken);
      if (!accessToken) {
        return NextResponse.json(
          { error: 'Failed to refresh access token' },
          { status: 401 }
        );
      }
    }
    
    // Build API URL with parameters
    let apiUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
    
    // Add parameters
    const urlParams = new URLSearchParams();
    
    // Handle conference data if needed
    if (eventData.conferenceData) {
      urlParams.append('conferenceDataVersion', '1');
    }
    
    // Handle notifications for attendees
    urlParams.append('sendUpdates', sendUpdates); // all, externalOnly, none
    
    // Append parameters to URL if any
    if (urlParams.toString()) {
      apiUrl += `?${urlParams.toString()}`;
    }
    
    // Call Google Calendar API to update the event
    const response = await fetch(apiUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });
    
    // Handle token expiration
    if (response.status === 401 && refreshToken) {
      
      const newAccessToken = await refreshAccessToken(refreshToken);
      
      if (!newAccessToken) {
        return NextResponse.json(
          { error: 'Failed to refresh access token' },
          { status: 401 }
        );
      }
      
      // Retry with new access token
      const retryResponse = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${newAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });
      
      if (!retryResponse.ok) {
        const errorData = await retryResponse.json();
        console.error('Failed to update event after token refresh:', retryResponse.status, errorData);
        return NextResponse.json(
          { error: 'Failed to update event after token refresh', details: errorData },
          { status: retryResponse.status }
        );
      }
      
      const updatedEvent = await retryResponse.json();
      return NextResponse.json({ event: updatedEvent });
    }
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to update event:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to update event', details: errorData },
        { status: response.status }
      );
    }
    
    const updatedEvent = await response.json();
    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 