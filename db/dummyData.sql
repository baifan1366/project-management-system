-- Insert user data
INSERT INTO "user" (id, name, email, avatar_url, language, theme, provider, email_verified, created_at, updated_at)
VALUES 
  ('75cb09ec-f11e-4b34-a1e5-327e90026b94', 'weixuan', 'john.doe@example.com', 'https://randomuser.me/api/portraits/men/1.jpg', 'en', 'dark', 'local', TRUE, '2023-01-10T08:30:00Z', '2023-01-10T08:30:00Z'),
  ('a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'simpo', 'jane.smith@example.com', 'https://randomuser.me/api/portraits/women/2.jpg', 'en', 'light', 'local', TRUE, '2023-01-15T09:45:00Z', '2023-01-15T09:45:00Z');

-- Insert project data
INSERT INTO "project" (id, project_name, description, visibility, theme_color, status, created_by, created_at, updated_at)
VALUES 
  (1, 'Website Redesign', 'Comprehensive improvement of company website for better UX and performance', 'public', 'blue', 'IN_PROGRESS', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-01T10:00:00Z', '2023-02-01T10:00:00Z'),
  (2, 'Mobile App Development', 'Create cross-platform mobile app for Android and iOS', 'private', 'green', 'PENDING', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-05T14:30:00Z', '2023-02-05T14:30:00Z');

-- Insert team data
INSERT INTO "team" (id, name, description, access, created_by, project_id, order_index, created_at, updated_at, star)
VALUES 
  (1, 'Frontend Team', 'Responsible for UI/UX development', 'invite_only', '75cb09ec-f11e-4b34-a1e5-327e90026b94', 1, 1, '2023-02-02T09:15:00Z', '2023-02-02T09:15:00Z', TRUE),
  (2, 'Backend Team', 'Responsible for API and database development', 'can_edit', '75cb09ec-f11e-4b34-a1e5-327e90026b94', 1, 2, '2023-02-02T09:30:00Z', '2023-02-02T09:30:00Z', FALSE),
  (3, 'Mobile Team', 'Responsible for mobile app development and testing', 'invite_only', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 2, 1, '2023-02-06T10:00:00Z', '2023-02-06T10:00:00Z', TRUE);

-- Insert user-team relationships
INSERT INTO "user_team" (id, user_id, team_id, role, created_at, updated_at, created_by)
VALUES 
  (1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 1, 'OWNER', '2023-02-02T09:15:00Z', '2023-02-02T09:15:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 2, 'OWNER', '2023-02-02T09:30:00Z', '2023-02-02T09:30:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 1, 'CAN_EDIT', '2023-02-03T11:00:00Z', '2023-02-03T11:00:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (4, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 2, 'CAN_VIEW', '2023-02-03T11:15:00Z', '2023-02-03T11:15:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (5, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 3, 'OWNER', '2023-02-06T10:00:00Z', '2023-02-06T10:00:00Z', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254'),
  (6, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 3, 'CAN_EDIT', '2023-02-07T09:00:00Z', '2023-02-07T09:00:00Z', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254');

-- Insert team invitation data
INSERT INTO "user_team_invitation" (id, user_email, team_id, role, status, expires_at, created_at, updated_at, created_by)
VALUES 
  (1, 'mike.wilson@example.com', 1, 'CAN_EDIT', 'PENDING', '2023-02-09T09:15:00Z', '2023-02-02T09:15:00Z', '2023-02-02T09:15:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (2, 'sarah.brown@example.com', 3, 'CAN_VIEW', 'ACCEPTED', '2023-02-13T10:00:00Z', '2023-02-06T10:00:00Z', '2023-02-07T11:00:00Z', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254');

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
INSERT INTO "task" (id, title, description, status, priority, due_date, section_id, project_id, team_id, created_by, created_at, updated_at)
VALUES 
  -- Website Redesign Project - Frontend Team
  (1, 'Create Wireframes', 'Design initial wireframes for homepage and key pages', 'IN_PROGRESS', 'HIGH', '2023-02-15T17:00:00Z', 1, 1, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:00:00Z', '2023-02-03T11:00:00Z'),
  (2, 'Implement Responsive Design', 'Ensure website works on all devices', 'TODO', 'MEDIUM', '2023-02-20T17:00:00Z', 2, 1, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:30:00Z', '2023-02-03T11:30:00Z'),
  (3, 'Cross-browser Testing', 'Test functionality across major browsers', 'TODO', 'MEDIUM', '2023-02-25T17:00:00Z', 3, 1, 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T13:00:00Z', '2023-02-04T13:00:00Z'),
  
  -- Website Redesign Project - Backend Team
  (4, 'Design REST API', 'Plan and document API endpoints', 'IN_PROGRESS', 'HIGH', '2023-02-18T17:00:00Z', 4, 1, 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T15:00:00Z', '2023-02-03T15:00:00Z'),
  (5, 'Implement Authentication', 'Create secure authentication system', 'TODO', 'HIGH', '2023-02-22T17:00:00Z', 4, 1, 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T15:30:00Z', '2023-02-03T15:30:00Z'),
  
  -- Mobile App Project
  (6, 'Design App Mockups', 'Create visual mockups for mobile app', 'IN_PROGRESS', 'HIGH', '2023-02-15T17:00:00Z', 5, 2, 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T10:30:00Z', '2023-02-07T10:30:00Z'),
  (7, 'Setup React Native Project', 'Initialize and configure React Native', 'TODO', 'MEDIUM', '2023-02-12T17:00:00Z', 6, 2, 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T11:00:00Z', '2023-02-07T11:00:00Z'),
  (8, 'Implement Login Screen', 'Create user login interface', 'TODO', 'MEDIUM', '2023-02-20T17:00:00Z', 6, 2, 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T11:30:00Z', '2023-02-07T11:30:00Z');

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
  (1, 2), -- Create Wireframes - Feature
  (1, 5), -- Create Wireframes - UI
  (2, 3), -- Implement Responsive Design - Enhancement
  (3, 1), -- Cross-browser Testing - Bug
  (4, 4), -- Design REST API - Documentation
  (4, 6), -- Design REST API - Backend
  (5, 6), -- Implement Authentication - Backend
  (6, 5), -- Design App Mockups - UI
  (7, 2), -- Setup React Native Project - Feature
  (8, 2), -- Implement Login Screen - Feature
  (8, 5); -- Implement Login Screen - UI

-- Insert comment data
INSERT INTO "comment" (id, text, task_id, user_id, created_at, updated_at)
VALUES 
  (1, 'I have started working on the homepage wireframe, should be done by tomorrow.', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-04T09:00:00Z', '2023-02-04T09:00:00Z'),
  (2, 'Looking good! Consider adding a large banner section at the top.', 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T10:30:00Z', '2023-02-04T10:30:00Z'),
  (3, 'I will ensure all pages have tablet and mobile designs.', 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T11:15:00Z', '2023-02-04T11:15:00Z'),
  (4, 'I have documented all API endpoints in the shared doc.', 4, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T14:00:00Z', '2023-02-04T14:00:00Z'),
  (5, 'We need to decide on authentication method. JWT or session-based?', 5, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-05T09:00:00Z', '2023-02-05T09:00:00Z'),
  (6, 'I think JWT would be better for this project.', 5, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-05T09:30:00Z', '2023-02-05T09:30:00Z');

-- Insert attachment data
INSERT INTO "attachment" (id, file_url, file_name, task_id, uploaded_by, created_at, updated_at)
VALUES 
  (1, 'https://example.com/files/homepage-wireframe.png', 'homepage-wireframe.png', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-04T10:00:00Z', '2023-02-04T10:00:00Z'),
  (2, 'https://example.com/files/responsive-design-spec.pdf', 'responsive-design-spec.pdf', 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T11:30:00Z', '2023-02-04T11:30:00Z'),
  (3, 'https://example.com/files/api-documentation.pdf', 'api-documentation.pdf', 4, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T14:30:00Z', '2023-02-04T14:30:00Z'),
  (4, 'https://example.com/files/app-mockup-v1.png', 'app-mockup-v1.png', 6, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T13:00:00Z', '2023-02-07T13:00:00Z');

-- Insert custom field data
INSERT INTO "custom_field" (id, name, type, description, icon, default_config, created_at, updated_at, created_by)
VALUES 
  ('1', 'Board', 'BOARD', 'Display tasks in kanban board format', 'LayoutDashboard', '{"colors":["#E5E5E5","#FFD700","#90EE90"],"columns":["To Do","In Progress","Done"]}', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('2', 'Timeline', 'TIMELINE', 'Display tasks in timeline format', 'GanttChart', '{"timeScale":"week","showProgress":true}', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('3', 'File', 'FILES', 'Manage task-related files', 'Files', '{"maxSize":10485760,"allowedTypes":["image/*","application/pdf"]}', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('4', 'Gantt', 'GANTT', 'Project progress in Gantt chart', 'GanttChart', '{"dayHours":8,"workDays":[1,2,3,4,5]}', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('5', 'List', 'LIST', 'a', 'List', null, '2025-03-11 08:33:44.576972', '2025-03-11 08:33:44.576972', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('6', 'Calendar', 'CALENDAR', 'a', 'Calendar', null, '2025-03-11 10:24:37.186868', '2025-03-11 10:24:37.186868', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('7', 'Note', 'NOTE', 'j', 'Text', null, '2025-03-11 10:25:37.878485', '2025-03-11 10:25:37.878485', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('8', 'Dashboard', 'DASHBOARD', 'j', 'BarChart3', null, '2025-03-11 10:25:56.715019', '2025-03-11 10:25:56.715019', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('9', 'Overview', 'OVERVIEW', 'h', 'LayoutGrid', null, '2025-03-11 10:26:13.055402', '2025-03-11 10:26:13.055402', '75cb09ec-f11e-4b34-a1e5-327e90026b94');

-- Insert team custom field association data
INSERT INTO "team_custom_field" (id, team_id, custom_field_id, config, order_index, created_at, updated_at, created_by)
VALUES 
  (1, 1, 1, '{"columns":["待办","进行中","审核中","已完成"]}', 1, '2023-02-02T12:00:00Z', '2023-02-02T12:00:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (2, 1, 2, '{"timeScale":"day"}', 2, '2023-02-02T12:10:00Z', '2023-02-02T12:10:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (3, 2, 1, '{"columns":["待办","开发中","测试中","已完成"]}', 1, '2023-02-02T14:10:00Z', '2023-02-02T14:10:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (4, 3, 1, '{"columns":["待办","设计中","开发中","测试中","已完成"]}', 1, '2023-02-06T13:10:00Z', '2023-02-06T13:10:00Z', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254'),
  (5, 3, 4, '{"workDays":[1,2,3,4,5,6]}', 2, '2023-02-06T13:20:00Z', '2023-02-06T13:20:00Z', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254');

-- Insert team custom field value data
INSERT INTO "team_custom_field_value" (id, team_custom_field_id, name, description, icon, value, created_at, updated_at, created_by)
VALUES 
  (1, 1, 'Frontend Board', 'Frontend team task board', 'LayoutDashboard', '{"defaultView":"board"}', '2023-02-02T12:30:00Z', '2023-02-02T12:30:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (2, 2, 'Frontend Timeline', 'Frontend team timeline view', 'GanttChart', '{"showMilestones":true}', '2023-02-02T12:40:00Z', '2023-02-02T12:40:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (3, 3, 'Backend Board', 'Backend team task board', 'LayoutDashboard', '{"defaultView":"board"}', '2023-02-02T14:30:00Z', '2023-02-02T14:30:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (4, 4, 'Mobile Board', 'Mobile team task board', 'LayoutDashboard', '{"defaultView":"board"}', '2023-02-06T13:30:00Z', '2023-02-06T13:30:00Z', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254'),
  (5, 5, 'Mobile Gantt', 'Mobile team Gantt chart', 'GanttChart', '{"showCriticalPath":true}', '2023-02-06T13:40:00Z', '2023-02-06T13:40:00Z', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254');

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
  (2, 'Feature Development Template', 'Standard template for new feature development', 'TODO', 'MEDIUM', 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:15:00Z', '2023-02-03T09:15:00Z'),
  (3, 'Mobile Screen Template', 'Template for implementing mobile app screens', 'TODO', 'MEDIUM', 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T09:00:00Z', '2023-02-07T09:00:00Z');

-- Insert chat session data
INSERT INTO "chat_session" (id, type, name, team_id, created_by, created_at, updated_at)
VALUES 
  (1, 'GROUP', 'Frontend Team Chat', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:00:00Z', '2023-02-02T10:00:00Z'),
  (2, 'GROUP', 'Backend Team Chat', 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:15:00Z', '2023-02-02T10:15:00Z'),
  (3, 'GROUP', 'Mobile Team Chat', 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-06T11:30:00Z', '2023-02-06T11:30:00Z'),
  (4, 'PRIVATE', 'John and Jane Chat', NULL, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:00:00Z', '2023-02-03T09:00:00Z');

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
  (2, 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'Thanks for inviting me to the team!', '2023-02-03T11:05:00Z', '2023-02-03T11:05:00Z'),
  (3, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 'Let''s discuss the approach for the responsive design task.', '2023-02-03T11:10:00Z', '2023-02-03T11:10:00Z'),
  (4, 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 'Welcome to the Backend Team chat!', '2023-02-02T10:20:00Z', '2023-02-02T10:20:00Z'),
  (5, 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'Welcome to the Mobile Team chat!', '2023-02-06T11:35:00Z', '2023-02-06T11:35:00Z'),
  (6, 4, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 'Hi Jane, let''s coordinate the project handover.', '2023-02-03T09:05:00Z', '2023-02-03T09:05:00Z'),
  (7, 4, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'Sure, I can sync with you tomorrow.', '2023-02-03T09:10:00Z', '2023-02-03T09:10:00Z');

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
  (1, 3, 'https://example.com/files/responsive-design-approach.pdf', '响应式设计方法.pdf', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:10:00Z'),
  (2, 6, 'https://example.com/files/project-schedule.xlsx', '项目进度表.xlsx', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:05:00Z');

-- Insert action log data
INSERT INTO "action_log" (id, user_id, action_type, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
VALUES 
  (1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 'CREATE', 'project', 1, NULL, '{"name":"Website Redesign","description":"Comprehensive improvement of company website for better UX and performance"}', '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-02-01T10:00:00Z'),
  (2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 'CREATE', 'team', 1, NULL, '{"name":"Frontend Team","description":"Responsible for UI/UX development"}', '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-02-02T09:15:00Z'),
  (3, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 'CREATE', 'team', 2, NULL, '{"name":"Backend Team","description":"Responsible for API and database development"}', '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-02-02T09:30:00Z'),
  (4, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'CREATE', 'project', 2, NULL, '{"name":"Mobile App Development","description":"Create cross-platform mobile app for Android and iOS"}', '192.168.1.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2023-02-05T14:30:00Z'),
  (5, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'CREATE', 'team', 3, NULL, '{"name":"Mobile Team","description":"Responsible for mobile app development and testing"}', '192.168.1.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2023-02-06T10:00:00Z'),
  (6, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 'CREATE', 'task', 1, NULL, '{"title":"Create Wireframes","status":"TODO"}', '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-02-03T11:00:00Z'),
  (7, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 'UPDATE', 'task', 1, '{"status":"TODO"}', '{"status":"IN_PROGRESS"}', '192.168.1.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '2023-02-04T08:00:00Z'),
  (8, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'CREATE', 'task', 6, NULL, '{"title":"Design App Mockups","status":"TODO"}', '192.168.1.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2023-02-07T10:30:00Z'),
  (9, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', 'UPDATE', 'task', 6, '{"status":"TODO"}', '{"status":"IN_PROGRESS"}', '192.168.1.2', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', '2023-02-07T14:00:00Z');

-- Insert subscription plan data
INSERT INTO "subscription_plan" 
  ("name", "type", "price", "billing_interval", "description", "features", "max_members", "max_projects", "storage_limit", "is_active")
VALUES
  -- Free Monthly Plan
  (
    'Free',
    'FREE',
    0,
    'MONTHLY',
    'Basic plan for small teams',
    '{
      "features": [
        "Up to 3 team members",
        "2 projects",
        "Basic task management",
        "1GB storage",
        "Community support"
      ]
    }',
    3,
    2,
    1073741824, -- 1GB in bytes
    TRUE
  ),
  -- Pro Monthly Plan
  (
    'Pro',
    'PRO',
    29,
    'MONTHLY',
    'Perfect for growing teams',
    '{
      "features": [
        "Up to 10 team members",
        "Unlimited projects",
        "Advanced task management",
        "10GB storage",
        "Priority support",
        "Custom fields",
        "Time tracking"
      ]
    }',
    10,
    -1, -- Unlimited
    10737418240, -- 10GB in bytes
    TRUE
  ),
  -- Enterprise Monthly Plan
  (
    'Enterprise',
    'ENTERPRISE',
    99,
    'MONTHLY',
    'For large organizations',
    '{
      "features": [
        "Unlimited team members",
        "Unlimited projects",
        "Enterprise security",
        "100GB storage",
        "24/7 dedicated support",
        "Custom branding",
        "API access"
      ]
    }',
    -1, -- Unlimited
    -1, -- Unlimited
    107374182400, -- 100GB in bytes
    TRUE
  ),
  -- Free Yearly Plan (same as monthly)
  (
    'Free',
    'FREE',
    0,
    'YEARLY',
    'Basic plan for small teams',
    '{
      "features": [
        "Up to 3 team members",
        "2 projects",
        "Basic task management",
        "1GB storage",
        "Community support"
      ]
    }',
    3,
    2,
    1073741824, -- 1GB in bytes
    TRUE
  ),
  -- Pro Yearly Plan
  (
    'Pro',
    'PRO',
    290,
    'YEARLY',
    'Perfect for growing teams with yearly discount',
    '{
      "features": [
        "Up to 10 team members",
        "Unlimited projects",
        "Advanced task management",
        "15GB storage",
        "Priority support",
        "Custom fields",
        "Time tracking",
        "Advanced analytics"
      ]
    }',
    10,
    -1, -- Unlimited
    16106127360, -- 15GB in bytes
    TRUE
  ),
  -- Enterprise Yearly Plan
  (
    'Enterprise',
    'ENTERPRISE',
    990,
    'YEARLY',
    'For large organizations with yearly discount',
    '{
      "features": [
        "Unlimited team members",
        "Unlimited projects",
        "Enterprise security",
        "150GB storage",
        "24/7 dedicated support",
        "Custom branding",
        "API access",
        "SSO integration",
        "Audit logs"
      ]
    }',
    -1, -- Unlimited
    -1, -- Unlimited
    161061273600, -- 150GB in bytes
    TRUE
  );

-- Insert team subscription data
INSERT INTO "team_subscription" (id, team_id, plan_id, status, start_date, end_date, cancel_at_period_end, created_at, updated_at)
VALUES
  (1, 1, 2, 'ACTIVE', '2023-02-01T00:00:00Z', '2023-03-01T00:00:00Z', FALSE, '2023-02-01T00:00:00Z', '2023-02-01T00:00:00Z'),
  (2, 2, 2, 'ACTIVE', '2023-02-01T00:00:00Z', '2023-03-01T00:00:00Z', FALSE, '2023-02-01T00:00:00Z', '2023-02-01T00:00:00Z'),
  (3, 3, 5, 'ACTIVE', '2023-02-06T00:00:00Z', '2024-02-06T00:00:00Z', FALSE, '2023-02-06T00:00:00Z', '2023-02-06T00:00:00Z');

-- Insert subscription payment history data
INSERT INTO "subscription_payment" (id, team_subscription_id, amount, currency, payment_method, status, transaction_id, created_at)
VALUES
  (1, 1, 29.00, 'USD', 'credit_card', 'COMPLETED', 'txn_1234567890', '2023-02-01T00:00:00Z'),
  (2, 2, 29.00, 'USD', 'credit_card', 'COMPLETED', 'txn_1234567891', '2023-02-01T00:00:00Z'),
  (3, 3, 290.00, 'USD', 'credit_card', 'COMPLETED', 'txn_1234567892', '2023-02-06T00:00:00Z');