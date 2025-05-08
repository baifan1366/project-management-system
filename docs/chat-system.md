# Chat System Documentation

## Overview

The chat system provides real-time messaging functionality across the application, supporting both user-to-user/group conversations and AI-assisted chat. The implementation leverages Supabase's real-time capabilities for instant message delivery and updates.

## Architecture

The chat system follows a context-based architecture with React hooks for state management and real-time updates:

- **ChatContext**: Core context managing chat sessions, messages, and operations
- **ChatDialogContext**: Manages popup chat windows outside the main chat page
- **Components**: Reusable UI components for message display, input, and actions

## Database Schema

The chat system relies on these primary tables:

- `chat_session`: Stores chat sessions/conversations
- `chat_participant`: Links users to chat sessions with roles
- `chat_message`: Contains individual message content
- `chat_message_read_status`: Tracks message read status per user
- `chat_attachment`: Stores file attachments for messages
- `ai_chat_message`: Stores AI assistant conversation messages

## Key Features

### Real-time Messaging

Messages are delivered instantly using Supabase's real-time subscriptions:

```javascript
const channel = supabase
  .channel(`chat_${sessionId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_message',
    filter: `session_id=eq.${sessionId}`
  }, handleNewMessage)
  .subscribe();
```

### Message Read Status

The system tracks which messages have been read by each participant:

1. When messages are sent, read status records are created for all recipients
2. When a user opens a chat session, all messages are marked as read
3. Unread counts are calculated and displayed in the UI

```javascript
const markMessagesAsRead = async (sessionId, userId) => {
  const { data: unreadMessages } = await supabase
    .from('chat_message_read_status')
    .select('message_id, user_id')
    .eq('chat_message.session_id', sessionId)
    .eq('user_id', userId)
    .is('read_at', null);
    
  if (unreadMessages?.length > 0) {
    // Update read status for each message
    await Promise.all(unreadMessages.map(status => 
      supabase
        .from('chat_message_read_status')
        .update({ read_at: new Date().toISOString() })
        .eq('message_id', status.message_id)
        .eq('user_id', status.user_id)
    ));
  }
};
```

### Chat Dialogs

Popup chat windows appear when receiving messages outside the main chat interface:

1. The `ChatDialogProvider` listens for new messages
2. When a message is received and user is not on the chat page, a dialog is opened
3. Dialogs can be minimized, expanded, or closed

### Message Features

Each message supports:

- **Text content**: With optimized text wrapping and display
- **File attachments**: Images display inline, other files as download links
- **Reply threading**: Messages can reference other messages
- **User mentions**: Links to user profiles with notifications
- **Actions**: Reply, translate, and delete options

### AI Chat Integration

The system supports conversations with AI assistants:

1. AI sessions are created with a unique `conversation_id`
2. User and assistant messages are stored in `ai_chat_message` table
3. Automatic session naming based on conversation content
4. Session persistence for continuing conversations

### Optimizations

Several optimizations improve performance:

- **Debounced input**: Prevents excessive rerenders during typing
- **Memoized message components**: Prevents unnecessary rerenders
- **Message virtualization**: For large message lists, only renders visible messages
- **Efficient avatar processing**: Removes tokens from avatar URLs

```javascript
// Debounce function for input handling
const debouncedSetMessage = useCallback(
  debounce((value) => {
    setMessage(value);
  }, 50),
  []
);
```

## Message Flow

1. **Sending a message**:
   - User enters text and/or attaches files
   - Message is inserted into `chat_message` table
   - Read status records created for all participants
   - Optional: Mentions trigger notifications

2. **Receiving a message**:
   - Supabase real-time subscription triggers
   - Full message data is fetched (with user info, attachments)
   - Message is added to local state
   - UI updates immediately
   - If session is open, message marked as read

## Implementation Details

### Managing Multiple Sessions

The context maintains a list of all user's sessions with:
- Basic session info (name, type)
- Participants' details
- Last message preview
- Unread count

Sessions are fetched with a complex Supabase query joining multiple tables:

```javascript
const { data: sessionsData } = await supabase
  .from('chat_participant')
  .select(`
    session_id,
    chat_session (
      id,
      type,
      name,
      participants:chat_participant(
        user:user_id (
          id,
          name,
          avatar_url
        )
      )
    )
  `)
  .eq('user_id', authSession.id);
```

### File Attachments

Files are uploaded via the `FileUploader` component:

1. Files are uploaded to Supabase storage
2. Message is sent with attachment metadata
3. Attachments are stored in `chat_attachment` table linked to the message
4. UI renders different displays based on file type (images vs other files)

### Message Deletion

Messages aren't permanently deleted, but marked as withdrawn:

```javascript
const { error: updateError } = await supabase
  .from('chat_message')
  .update({
    is_deleted: true,
    content: "[Message withdrawn]"
  })
  .eq('id', messageId);
```

## Best Practices

The implementation follows several best practices:

1. **Context separation**: Core chat functionality vs dialog UI management
2. **Optimistic updates**: UI updates immediately before server confirmation
3. **Error handling**: All database operations include error handling
4. **Memoization**: Expensive components are memoized to prevent rerenders
5. **Real-time synchronization**: All users see the same conversation state
6. **Mobile-friendly design**: Layout adapts to different screen sizes

## Security Considerations

1. Message access is restricted to chat participants only
2. Users can only delete their own messages
3. Attachment URLs include security tokens
4. Message history can be cleared locally for privacy 