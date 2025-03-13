-- Insert user data
INSERT INTO "user" (id, name, email, avatar_url, language, theme, provider, email_verified, created_at, updated_at)
VALUES 
  ('75cb09ec-f11e-4b34-a1e5-327e90026b94', 'John Smith', 'john.smith@example.com', 'https://randomuser.me/api/portraits/men/1.jpg', 'en', 'dark', 'local', TRUE, '2023-01-10T08:30:00Z', '2023-01-10T08:30:00Z'),
  ('a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'Emma Johnson', 'emma.johnson@example.com', 'https://randomuser.me/api/portraits/women/2.jpg', 'en', 'light', 'local', TRUE, '2023-01-15T09:45:00Z', '2023-01-15T09:45:00Z');

-- Insert project data
INSERT INTO "project" (id, project_name, description, visibility, theme_color, status, created_by, created_at, updated_at)
VALUES 
  (1, 'Website Redesign', 'Complete overhaul of company website to improve user experience and performance', 'public', 'blue', 'IN_PROGRESS', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-01T10:00:00Z', '2023-02-01T10:00:00Z'),
  (2, 'Mobile App Development', 'Create cross-platform mobile application for Android and iOS', 'private', 'green', 'PENDING', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-05T14:30:00Z', '2023-02-05T14:30:00Z');

-- Insert team data
INSERT INTO "team" (id, name, description, access, created_by, project_id, order_index, created_at, updated_at, star)
VALUES 
  (1, 'Frontend Team', 'Responsible for UI/UX development', 'invite_only', '75cb09ec-f11e-4b34-a1e5-327e90026b94', 1, 1, '2023-02-02T09:15:00Z', '2023-02-02T09:15:00Z', TRUE),
  (2, 'Backend Team', 'Responsible for API and database development', 'can_edit', '75cb09ec-f11e-4b34-a1e5-327e90026b94', 1, 2, '2023-02-02T09:30:00Z', '2023-02-02T09:30:00Z', FALSE),
  (3, 'Mobile Team', 'Responsible for mobile app development and testing', 'invite_only', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 2, 1, '2023-02-06T10:00:00Z', '2023-02-06T10:00:00Z', TRUE);

-- Insert user-team relationships
INSERT INTO "user_team" (user_id, team_id, role, created_at, updated_at)
VALUES 
  ('75cb09ec-f11e-4b34-a1e5-327e90026b94', 1, 'OWNER', '2023-02-02T09:15:00Z', '2023-02-02T09:15:00Z'),
  ('75cb09ec-f11e-4b34-a1e5-327e90026b94', 2, 'OWNER', '2023-02-02T09:30:00Z', '2023-02-02T09:30:00Z'),
  ('a9d61763-843c-4c7b-894a-fd8d8a5fc254', 1, 'CAN_EDIT', '2023-02-03T11:00:00Z', '2023-02-03T11:00:00Z'),
  ('a9d61763-843c-4c7b-894a-fd8d8a5fc254', 2, 'CAN_VIEW', '2023-02-03T11:15:00Z', '2023-02-03T11:15:00Z'),
  ('a9d61763-843c-4c7b-894a-fd8d8a5fc254', 3, 'OWNER', '2023-02-06T10:00:00Z', '2023-02-06T10:00:00Z'),
  ('75cb09ec-f11e-4b34-a1e5-327e90026b94', 3, 'CAN_EDIT', '2023-02-07T09:00:00Z', '2023-02-07T09:00:00Z');

-- Insert section data
INSERT INTO "section" (id, name, project_id, team_id, created_by, created_at, updated_at)
VALUES 
  (1, 'Design', 1, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T10:00:00Z', '2023-02-03T10:00:00Z'),
  (2, 'Development', 1, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T10:15:00Z', '2023-02-03T10:15:00Z'),
  (3, 'Testing', 1, 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T11:00:00Z', '2023-02-04T11:00:00Z'),
  (4, 'API Development', 1, 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T14:00:00Z', '2023-02-03T14:00:00Z'),
  (5, 'UI Design', 2, 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T09:30:00Z', '2023-02-07T09:30:00Z'),
  (6, 'Mobile Development', 2, 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T09:45:00Z', '2023-02-07T09:45:00Z');

-- Insert task data
INSERT INTO "task" (id, title, description, status, priority, due_date, section_id, project_id, team_id, assignee_id, created_by, created_at, updated_at)
VALUES 
  -- Website Redesign Project - Frontend Team
  (1, 'Create wireframes', 'Design initial wireframes for homepage and key pages', 'IN_PROGRESS', 'HIGH', '2023-02-15T17:00:00Z', 1, 1, 1, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:00:00Z', '2023-02-03T11:00:00Z'),
  (2, 'Implement responsive design', 'Ensure website works on all devices', 'TODO', 'MEDIUM', '2023-02-20T17:00:00Z', 2, 1, 1, 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:30:00Z', '2023-02-03T11:30:00Z'),
  (3, 'Cross-browser testing', 'Test functionality across major browsers', 'TODO', 'MEDIUM', '2023-02-25T17:00:00Z', 3, 1, 1, 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T13:00:00Z', '2023-02-04T13:00:00Z'),
  
  -- Website Redesign Project - Backend Team
  (4, 'Design REST API', 'Plan and document API endpoints', 'IN_PROGRESS', 'HIGH', '2023-02-18T17:00:00Z', 4, 1, 2, 4, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T15:00:00Z', '2023-02-03T15:00:00Z'),
  (5, 'Implement authentication', 'Create secure authentication system', 'TODO', 'HIGH', '2023-02-22T17:00:00Z', 4, 1, 2, 5, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T15:30:00Z', '2023-02-03T15:30:00Z'),
  
  -- Mobile App Project
  (6, 'Design app mockups', 'Create visual mockups for mobile app', 'IN_PROGRESS', 'HIGH', '2023-02-15T17:00:00Z', 5, 2, 3, 6, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T10:30:00Z', '2023-02-07T10:30:00Z'),
  (7, 'Setup React Native project', 'Initialize and configure React Native', 'TODO', 'MEDIUM', '2023-02-12T17:00:00Z', 6, 2, 3, 7, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T11:00:00Z', '2023-02-07T11:00:00Z'),
  (8, 'Implement login screen', 'Create user login interface', 'TODO', 'MEDIUM', '2023-02-20T17:00:00Z', 6, 2, 3, 8, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T11:30:00Z', '2023-02-07T11:30:00Z');

-- Insert task assignee data (first, to reference in task table)
INSERT INTO "task_assignee" (id, task_id, user_id)
VALUES 
  (1, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (2, 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254'),
  (3, 3, '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (4, 4, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254'),
  (5, 5, '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (6, 6, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254'),
  (7, 7, '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (8, 8, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254');

-- Insert tag data
INSERT INTO "tag" (id, name, color, team_id, created_at, updated_at)
VALUES 
  (1, 'Bug', 'red', 1, '2023-02-02T10:00:00Z', '2023-02-02T10:00:00Z'),
  (2, 'Feature', 'blue', 1, '2023-02-02T10:05:00Z', '2023-02-02T10:05:00Z'),
  (3, 'Enhancement', 'green', 1, '2023-02-02T10:10:00Z', '2023-02-02T10:10:00Z'),
  (4, 'Documentation', 'purple', 2, '2023-02-02T10:20:00Z', '2023-02-02T10:20:00Z'),
  (5, 'UI', 'pink', 3, '2023-02-06T11:00:00Z', '2023-02-06T11:00:00Z'),
  (6, 'Backend', 'orange', 3, '2023-02-06T11:05:00Z', '2023-02-06T11:05:00Z');

-- Insert task-tag relationships
INSERT INTO "task_tag" (task_id, tag_id)
VALUES 
  (1, 2), -- Create wireframes - Feature
  (1, 5), -- Create wireframes - UI
  (2, 3), -- Implement responsive design - Enhancement
  (3, 1), -- Cross-browser testing - Bug
  (4, 4), -- Design REST API - Documentation
  (4, 6), -- Design REST API - Backend
  (5, 6), -- Implement authentication - Backend
  (6, 5), -- Design app mockups - UI
  (7, 2), -- Setup React Native project - Feature
  (8, 2), -- Implement login screen - Feature
  (8, 5); -- Implement login screen - UI

-- Insert comment data
INSERT INTO "comment" (id, text, task_id, user_id, created_at, updated_at)
VALUES 
  (1, 'I''ve started working on the homepage wireframe, should have it ready by tomorrow.', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-04T09:00:00Z', '2023-02-04T09:00:00Z'),
  (2, 'Looking good so far! Consider adding a hero section at the top.', 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T10:30:00Z', '2023-02-04T10:30:00Z'),
  (3, 'I''ll work on making sure we have tablet and mobile designs for all pages.', 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T11:15:00Z', '2023-02-04T11:15:00Z'),
  (4, 'I''ve documented all the API endpoints in the shared drive.', 4, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T14:00:00Z', '2023-02-04T14:00:00Z'),
  (5, 'We need to decide on the authentication method. JWT or session-based?', 5, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-05T09:00:00Z', '2023-02-05T09:00:00Z'),
  (6, 'I think JWT would be better for this project.', 5, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-05T09:30:00Z', '2023-02-05T09:30:00Z');

-- Insert attachment data
INSERT INTO "attachment" (id, file_url, file_name, task_id, uploaded_by, created_at, updated_at)
VALUES 
  (1, 'https://example.com/files/homepage-wireframe.png', 'homepage-wireframe.png', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-04T10:00:00Z', '2023-02-04T10:00:00Z'),
  (2, 'https://example.com/files/responsive-design-spec.pdf', 'responsive-design-spec.pdf', 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T11:30:00Z', '2023-02-04T11:30:00Z'),
  (3, 'https://example.com/files/api-documentation.pdf', 'api-documentation.pdf', 4, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T14:30:00Z', '2023-02-04T14:30:00Z'),
  (4, 'https://example.com/files/app-mockup-v1.png', 'app-mockup-v1.png', 6, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T13:00:00Z', '2023-02-07T13:00:00Z');

-- Insert custom field data
INSERT INTO "custom_field" (id, name, type, project_id, team_id, created_at, updated_at)
VALUES 
  (1, 'Estimated Hours', 'NUMBER', 1, 1, '2023-02-02T11:00:00Z', '2023-02-02T11:00:00Z'),
  (2, 'Review Date', 'DATE', 1, 1, '2023-02-02T11:10:00Z', '2023-02-02T11:10:00Z'),
  (3, 'Complexity', 'SELECT', 1, 2, '2023-02-02T14:00:00Z', '2023-02-02T14:00:00Z'),
  (4, 'Platform', 'SELECT', 2, 3, '2023-02-06T13:00:00Z', '2023-02-06T13:00:00Z');

-- Insert task custom field values
INSERT INTO "task_custom_field_value" (id, task_id, field_id, value, created_at, updated_at)
VALUES 
  (1, 1, 1, '8', '2023-02-03T11:05:00Z', '2023-02-03T11:05:00Z'),
  (2, 1, 2, '2023-02-10', '2023-02-03T11:05:00Z', '2023-02-03T11:05:00Z'),
  (3, 2, 1, '16', '2023-02-03T11:35:00Z', '2023-02-03T11:35:00Z'),
  (4, 4, 3, 'High', '2023-02-03T15:05:00Z', '2023-02-03T15:05:00Z'),
  (5, 5, 3, 'Medium', '2023-02-03T15:35:00Z', '2023-02-03T15:35:00Z'),
  (6, 6, 4, 'iOS, Android', '2023-02-07T10:35:00Z', '2023-02-07T10:35:00Z');

-- Insert time entry data
INSERT INTO "time_entry" (id, task_id, user_id, start_time, end_time, duration, created_at, updated_at)
VALUES 
  (1, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-04T08:00:00Z', '2023-02-04T10:30:00Z', 9000, '2023-02-04T10:30:00Z', '2023-02-04T10:30:00Z'),
  (2, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-05T09:00:00Z', '2023-02-05T11:00:00Z', 7200, '2023-02-05T11:00:00Z', '2023-02-05T11:00:00Z'),
  (3, 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T13:00:00Z', '2023-02-04T15:30:00Z', 9000, '2023-02-04T15:30:00Z', '2023-02-04T15:30:00Z'),
  (4, 4, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-05T13:00:00Z', '2023-02-05T16:00:00Z', 10800, '2023-02-05T16:00:00Z', '2023-02-05T16:00:00Z'),
  (5, 6, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T14:00:00Z', '2023-02-07T17:30:00Z', 12600, '2023-02-07T17:30:00Z', '2023-02-07T17:30:00Z');

-- Insert task dependency data
INSERT INTO "task_dependency" (id, task_id, depends_on_task_id, created_at, updated_at)
VALUES 
  (1, 2, 1, '2023-02-03T11:30:00Z', '2023-02-03T11:30:00Z'),
  (2, 3, 2, '2023-02-04T13:00:00Z', '2023-02-04T13:00:00Z'),
  (3, 5, 4, '2023-02-03T15:30:00Z', '2023-02-03T15:30:00Z'),
  (4, 8, 7, '2023-02-07T11:30:00Z', '2023-02-07T11:30:00Z');

-- Insert task template data
INSERT INTO "task_template" (id, title, description, status, priority, team_id, created_by, created_at, updated_at)
VALUES 
  (1, 'Bug Fix Template', 'Standard template for bug fixes', 'TODO', 'HIGH', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:00:00Z', '2023-02-03T09:00:00Z'),
  (2, 'Feature Development Template', 'Standard template for new features', 'TODO', 'MEDIUM', 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:15:00Z', '2023-02-03T09:15:00Z'),
  (3, 'Mobile Screen Template', 'Template for implementing mobile app screens', 'TODO', 'MEDIUM', 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T09:00:00Z', '2023-02-07T09:00:00Z');

-- Insert chat session data
INSERT INTO "chat_session" (id, type, name, team_id, created_by, created_at, updated_at)
VALUES 
  (1, 'GROUP', 'Frontend Team Chat', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:00:00Z', '2023-02-02T10:00:00Z'),
  (2, 'GROUP', 'Backend Team Chat', 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:15:00Z', '2023-02-02T10:15:00Z'),
  (3, 'GROUP', 'Mobile Team Chat', 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-06T11:30:00Z', '2023-02-06T11:30:00Z'),
  (4, 'PRIVATE', 'John and Emma Private Chat', NULL, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:00:00Z', '2023-02-03T09:00:00Z');

-- Insert chat participant data
INSERT INTO "chat_participant" (session_id, user_id, joined_at, role)
VALUES 
  (1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:00:00Z', 'ADMIN'),
  (1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T11:00:00Z', 'MEMBER'),
  (2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:15:00Z', 'ADMIN'),
  (2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T11:15:00Z', 'MEMBER'),
  (3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-06T11:30:00Z', 'ADMIN'),
  (3, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-07T09:00:00Z', 'MEMBER'),
  (4, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:00:00Z', 'ADMIN'),
  (4, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T09:00:00Z', 'MEMBER');

-- Insert chat message data
INSERT INTO "chat_message" (id, session_id, user_id, content, created_at, updated_at)
VALUES 
  (1, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 'Welcome to the Frontend Team chat!', '2023-02-02T10:05:00Z', '2023-02-02T10:05:00Z'),
  (2, 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'Thanks for adding me to the team!', '2023-02-03T11:05:00Z', '2023-02-03T11:05:00Z'),
  (3, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 'Let''s discuss our approach to the responsive design task.', '2023-02-03T11:10:00Z', '2023-02-03T11:10:00Z'),
  (4, 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 'Welcome to the Backend Team chat!', '2023-02-02T10:20:00Z', '2023-02-02T10:20:00Z'),
  (5, 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'Welcome to the Mobile Team chat!', '2023-02-06T11:35:00Z', '2023-02-06T11:35:00Z'),
  (6, 4, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 'Hey Emma, let''s coordinate on the project handover.', '2023-02-03T09:05:00Z', '2023-02-03T09:05:00Z'),
  (7, 4, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'Sure, I can sync with you tomorrow about it.', '2023-02-03T09:10:00Z', '2023-02-03T09:10:00Z');

-- Insert chat message read status
INSERT INTO "chat_message_read_status" (message_id, user_id, read_at)
VALUES 
  (1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:05:00Z'),
  (1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T11:00:00Z'),
  (2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:07:00Z'),
  (2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T11:05:00Z'),
  (3, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:10:00Z'),
  (3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T11:12:00Z'),
  (4, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:20:00Z'),
  (4, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T11:15:00Z'),
  (5, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-06T11:35:00Z'),
  (5, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-07T09:00:00Z'),
  (6, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:05:00Z'),
  (6, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T09:07:00Z'),
  (7, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:12:00Z'),
  (7, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T09:10:00Z');

-- Insert chat attachment data
INSERT INTO "chat_attachment" (id, message_id, file_url, file_name, uploaded_by, created_at)
VALUES 
  (1, 3, 'https://example.com/files/responsive-design-approach.pdf', 'responsive-design-approach.pdf', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:10:00Z'),
  (2, 6, 'https://example.com/files/project-schedule.xlsx', 'project-schedule.xlsx', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:05:00Z');

-- Insert action log data
INSERT INTO "action_log" (user_id, action_type, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
VALUES 
  ('75cb09ec-f11e-4b34-a1e5-327e90026b94', 'CREATE', 'project', 1, NULL, '{"name":"Website Redesign","description":"Complete overhaul of company website"}', '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-02-01T10:00:00Z'),
  ('75cb09ec-f11e-4b34-a1e5-327e90026b94', 'CREATE', 'team', 1, NULL, '{"name":"Frontend Team","description":"Responsible for UI/UX development"}', '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-02-02T09:15:00Z'),
  ('75cb09ec-f11e-4b34-a1e5-327e90026b94', 'CREATE', 'team', 2, NULL, '{"name":"Backend Team","description":"Responsible for API and database development"}', '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-02-02T09:30:00Z'),
  ('a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'CREATE', 'project', 2, NULL, '{"name":"Mobile App Development","description":"Create cross-platform mobile application"}', '192.168.1.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2023-02-05T14:30:00Z'),
  ('a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'CREATE', 'team', 3, NULL, '{"name":"Mobile Team","description":"Responsible for mobile app development"}', '192.168.1.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2023-02-06T10:00:00Z'),
  ('75cb09ec-f11e-4b34-a1e5-327e90026b94', 'CREATE', 'task', 1, NULL, '{"title":"Create wireframes","status":"TODO"}', '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-02-03T11:00:00Z'),
  ('75cb09ec-f11e-4b34-a1e5-327e90026b94', 'UPDATE', 'task', 1, '{"status":"TODO"}', '{"status":"IN_PROGRESS"}', '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-02-04T08:00:00Z'),
  ('a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'CREATE', 'task', 6, NULL, '{"title":"Design app mockups","status":"TODO"}', '192.168.1.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2023-02-07T10:30:00Z'),
  ('a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'UPDATE', 'task', 6, '{"status":"TODO"}', '{"status":"IN_PROGRESS"}', '192.168.1.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2023-02-07T14:00:00Z');

-- Insert subscription plan data
INSERT INTO "subscription_plan" (id, name, type, price, billing_interval, description, features, max_members, max_projects, storage_limit, is_active, created_at, updated_at)
VALUES 
  (1, 'Free', 'FREE', 0.00, 'MONTHLY', 'Basic plan for individuals and small teams', '{"task_management":true,"file_storage":true,"basic_reporting":true}', 5, 3, 104857600, TRUE, '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  (2, 'Pro Monthly', 'PRO', 9.99, 'MONTHLY', 'Advanced features for growing teams', '{"task_management":true,"file_storage":true,"basic_reporting":true,"advanced_reporting":true,"time_tracking":true,"custom_fields":true}', 25, 15, 5368709120, TRUE, '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  (3, 'Pro Yearly', 'PRO', 99.99, 'YEARLY', 'Advanced features for growing teams, billed yearly', '{"task_management":true,"file_storage":true,"basic_reporting":true,"advanced_reporting":true,"time_tracking":true,"custom_fields":true}', 25, 15, 5368709120, TRUE, '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  (4, 'Enterprise Monthly', 'ENTERPRISE', 29.99, 'MONTHLY', 'Complete solution for large organizations', '{"task_management":true,"file_storage":true,"basic_reporting":true,"advanced_reporting":true,"time_tracking":true,"custom_fields":true,"priority_support":true,"sso":true,"audit_logs":true}', 100, 50, 10737418240, TRUE, '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z'),
  (5, 'Enterprise Yearly', 'ENTERPRISE', 299.99, 'YEARLY', 'Complete solution for large organizations, billed yearly', '{"task_management":true,"file_storage":true,"basic_reporting":true,"advanced_reporting":true,"time_tracking":true,"custom_fields":true,"priority_support":true,"sso":true,"audit_logs":true}', 100, 50, 10737418240, TRUE, '2023-01-01T00:00:00Z', '2023-01-01T00:00:00Z')


INSERT INTO "public"."custom_field" ("id", "name", "type", "description", "icon", "default_config", "created_at", "updated_at", "created_by") VALUES ('1', 'Board', 'BOARD', 'Display tasks in kanban board format', 'LayoutDashboard', '{"colors":["#E5E5E5","#FFD700","#90EE90"],"columns":["To Do","In Progress","Done"]}', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', null), ('2', 'Timeline', 'TIMELINE', 'Display tasks in timeline format', 'GanttChart', '{"timeScale":"week","showProgress":true}', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', null), ('3', 'File', 'FILES', 'Manage task-related files', 'Files', '{"maxSize":10485760,"allowedTypes":["image/*","application/pdf"]}', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', null), ('4', 'Gantt', 'GANTT', 'Project progress in Gantt chart', 'GanttChart', '{"dayHours":8,"workDays":[1,2,3,4,5]}', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', null), ('5', 'List', 'LIST', 'a', 'List', null, '2025-03-11 08:33:44.576972', '2025-03-11 08:33:44.576972', null), ('6', 'Calendar', 'CALENDAR', 'a', 'Calendar', null, '2025-03-11 10:24:37.186868', '2025-03-11 10:24:37.186868', null), ('7', 'Note', 'NOTE', 'j', 'Text', null, '2025-03-11 10:25:37.878485', '2025-03-11 10:25:37.878485', null), ('8', 'Dashboard', 'DASHBOARD', 'j', 'BarChart3', null, '2025-03-11 10:25:56.715019', '2025-03-11 10:25:56.715019', null), ('9', 'Overview', 'OVERVIEW', 'h', 'LayoutGrid', null, '2025-03-11 10:26:13.055402', '2025-03-11 10:26:13.055402', null);