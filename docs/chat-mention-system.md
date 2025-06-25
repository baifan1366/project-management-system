# Chat Mention System

## Overview

The mention system allows users to reference users, projects, and tasks directly in chat messages. When a user types "@" followed by text, a search interface displays matching users, projects, and tasks. When selected, these mentions are displayed as interactive elements in the message that show detailed information on hover.

## Using Mentions

1. **Typing Mentions**: In any chat message, type `@` followed by the name or part of the name you want to mention
   - The mention selector will automatically appear
   - You can filter by users, projects, or tasks using the tabs at the top
   - As you type, search results will be filtered in real-time

2. **Types of Mentions**:
   - **Users**: Appear as blue tags with the format `@username`
   - **Projects**: Appear as orange tags with the format `#project-name`
   - **Tasks**: Appear as green tags with the format `task-title (project-name)`

3. **Selecting Mentions**: Click on any suggestion to insert it into your message
   - The mention will be added at the cursor position
   - A space will be automatically added after the mention

4. **Viewing Details**: Hover over any mention in a message to see detailed information
   - Users: Profile picture, name, email, and other contact information
   - Projects: Name, description, status, creation date
   - Tasks: Title, description, status, project, assignee

## Implementation Details

The mention system consists of three main components:

1. **MentionSelector**: Appears when typing @ and handles selecting mentions
2. **MentionItem**: Renders mentions in messages with hover functionality  
3. **Search API**: Backend service that provides mention suggestions

The system provides a consistent interface for mentioning different entity types while showing relevant context for each type.

## Appearance

Mentions are displayed as colorful tags in messages:

- Users: Blue background
- Projects: Orange background
- Tasks: Green background

Each mention includes an appropriate icon to visually distinguish the type of entity.

## Benefits

- **Quick Reference**: Easily reference users, projects, or tasks
- **Rich Context**: Hover tooltips provide detailed information without leaving the conversation
- **Improved Navigation**: Click on mentions to navigate to the referenced entity
- **Visual Clarity**: Distinctive styling makes mentions stand out in conversations

## Technical Notes

Mentions are stored as part of the message metadata in the database, which includes:
- Type (user/project/task)
- ID
- Display name
- Start/end position in the message text

This allows for proper rendering even when the message is loaded later or by other users. 