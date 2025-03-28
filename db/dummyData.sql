-- Insert user data
INSERT INTO "user" (
  id, 
  name, 
  email, 
  phone,
  avatar_url, 
  language, 
  theme, 
  provider,
  provider_id,
  mfa_secret,
  is_mfa_enabled,
  notifications_enabled,
  email_verified,
  verification_token,
  verification_token_expires,
  created_at, 
  updated_at
)
VALUES 
  (
    '75cb09ec-f11e-4b34-a1e5-327e90026b94',
    'weixuan',
    'john.doe@example.com',
    '+8613800138000',
    'https://randomuser.me/api/portraits/men/1.jpg',
    'zh',
    'dark',
    'local',
    NULL,
    NULL,
    FALSE,
    TRUE,
    TRUE,
    NULL,
    NULL,
    '2023-01-10T08:30:00Z',
    '2023-01-10T08:30:00Z'
  ),
  (
    'a9d61763-843c-4c7b-894a-fd8d8a5fc254',
    'simpo',
    'jane.smith@example.com',
    '+8613800138001',
    'https://randomuser.me/api/portraits/women/2.jpg',
    'en',
    'system',
    'google',
    'google_123456',
    'MFASECRET123456',
    TRUE,
    TRUE,
    TRUE,
    NULL,
    NULL,
    '2023-01-15T09:45:00Z',
    '2023-01-15T09:45:00Z'
  );

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

-- Insert default data
INSERT INTO "default" (id, name, qty, updated_at, edited_by)
VALUES
  (1, 'custom_field', 2, '2023-02-01T00:00:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (2, 'tag', 2, '2023-02-01T00:00:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94');
  
-- Insert section data
INSERT INTO "section" (id, name, project_id, team_id, created_by, task_ids, created_at, updated_at)
VALUES 
  (1, '设计', 1, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '{1}', '2023-02-03T10:00:00Z', '2023-02-03T10:00:00Z'),
  (2, '开发', 1, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '{2}', '2023-02-03T10:15:00Z', '2023-02-03T10:15:00Z'),
  (3, '测试', 1, 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '{3}', '2023-02-04T11:00:00Z', '2023-02-04T11:00:00Z'),
  (4, 'API开发', 1, 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '{4,5}', '2023-02-03T14:00:00Z', '2023-02-03T14:00:00Z'),
  (5, 'UI设计', 2, 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '{6}', '2023-02-07T09:30:00Z', '2023-02-07T09:30:00Z'),
  (6, '移动开发', 2, 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '{7,8}', '2023-02-07T09:45:00Z', '2023-02-07T09:45:00Z');

-- Insert tag data
INSERT INTO "tag" (id, name, hide, description, type, created_at, updated_at, created_by)
VALUES 
  (1, 'Name', '用于标记缺陷', 'NAME', '2023-02-02T10:00:00Z', '2023-02-02T10:00:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (2, 'Asignee', '用于标记新功能', 'ASIGNEE', '2023-02-02T10:05:00Z', '2023-02-02T10:05:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (3, 'Due Date', '用于标记增强功能', 'DUE-DATE', '2023-02-02T10:10:00Z', '2023-02-02T10:10:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (4, 'Status', '用于标记文档', 'STATUS', '2023-02-02T10:20:00Z', '2023-02-02T10:20:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (5, 'Projects', '用于标记用户界面', 'PROJECTS', '2023-02-06T11:00:00Z', '2023-02-06T11:00:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94');

-- Insert task data
INSERT INTO "task" (
  id, title, description, status, priority, due_date, 
  section_id, project_id, team_id, 
  assignee_ids, tag_values,
  created_by, created_at, updated_at
)
VALUES 
  -- 网站重设计项目 - 前端团队
  (1, '创建线框图', '设计首页和关键页面的初始线框图', 'IN_PROGRESS', 'HIGH', '2023-02-15T17:00:00Z', 
   1, 1, 1, 
   ARRAY[('75cb09ec-f11e-4b34-a1e5-327e90026b94')::uuid],
   jsonb_build_object('2', 'Feature', '5', 'UI'),
   '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:00:00Z', '2023-02-03T11:00:00Z'),
   
  (2, '实现响应式设计', '确保网站在所有设备上正常工作', 'TODO', 'MEDIUM', '2023-02-20T17:00:00Z',
   2, 1, 1,
   ARRAY[('a9d61763-843c-4c7b-894a-fd8d8a5fc254')::uuid],
   jsonb_build_object('3', 'Enhancement'),
   '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:30:00Z', '2023-02-03T11:30:00Z');

-- Insert comment data
INSERT INTO "comment" (id, text, task_id, user_id, created_at, updated_at)
VALUES 
  (1, 'I have started working on the homepage wireframe, should be done by tomorrow.', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-04T09:00:00Z', '2023-02-04T09:00:00Z'),
  (2, 'Looking good! Consider adding a large banner section at the top.', 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T10:30:00Z', '2023-02-04T10:30:00Z'),
  (3, 'I will ensure all pages have tablet and mobile designs.', 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T11:15:00Z', '2023-02-04T11:15:00Z'),
  (4, 'I have documented all API endpoints in the shared doc.', 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T14:00:00Z', '2023-02-04T14:00:00Z'),
  (5, 'We need to decide on authentication method. JWT or session-based?', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-05T09:00:00Z', '2023-02-05T09:00:00Z'),
  (6, 'I think JWT would be better for this project.', 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-05T09:30:00Z', '2023-02-05T09:30:00Z');

-- Insert attachment data
INSERT INTO "attachment" (id, file_url, file_name, task_id, uploaded_by, created_at, updated_at)
VALUES 
  (1, 'https://example.com/files/homepage-wireframe.png', 'homepage-wireframe.png', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-04T10:00:00Z', '2023-02-04T10:00:00Z'),
  (2, 'https://example.com/files/responsive-design-spec.pdf', 'responsive-design-spec.pdf', 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T11:30:00Z', '2023-02-04T11:30:00Z'),
  (3, 'https://example.com/files/api-documentation.pdf', 'api-documentation.pdf', 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T14:30:00Z', '2023-02-04T14:30:00Z'),
  (4, 'https://example.com/files/app-mockup-v1.png', 'app-mockup-v1.png', 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T13:00:00Z', '2023-02-07T13:00:00Z');

-- Insert custom field data
INSERT INTO "custom_field" (id, name, type, description, icon, created_at, updated_at, created_by)
VALUES 
  ('1', 'Board', 'BOARD', 'Display tasks in kanban board format', 'LayoutDashboard', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('2', 'Timeline', 'TIMELINE', 'Display tasks in timeline format, allowing users to visualize task progress over time', 'GanttChart', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('3', 'File', 'FILES', 'Manage task-related files, enabling users to upload and organize documents associated with tasks', 'Files', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('4', 'Gantt', 'GANTT', 'Project progress in Gantt chart format, providing a visual representation of project timelines and dependencies', 'GanttChart', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('5', 'List', 'LIST', 'A simple list format for displaying tasks', 'List', '2025-03-11 08:33:44.576972', '2025-03-11 08:33:44.576972', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('6', 'Calendar', 'CALENDAR', 'A calendar view for scheduling and tracking tasks', 'Calendar', '2025-03-11 10:24:37.186868', '2025-03-11 10:24:37.186868', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('7', 'Note', 'NOTE', 'A text field for adding notes related to tasks', 'Text', '2025-03-11 10:25:37.878485', '2025-03-11 10:25:37.878485', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('8', 'Dashboard', 'DASHBOARD', 'A visual dashboard for summarizing project metrics and statuses', 'BarChart3', '2025-03-11 10:25:56.715019', '2025-03-11 10:25:56.715019', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('9', 'Overview', 'OVERVIEW', 'A high-level overview of project progress and key metrics', 'LayoutGrid', '2025-03-11 10:26:13.055402', '2025-03-11 10:26:13.055402', '75cb09ec-f11e-4b34-a1e5-327e90026b94');

-- Insert team custom field association data
INSERT INTO "team_custom_field" (id, team_id, custom_field_id, order_index, tag_ids, created_at, updated_at, created_by)
VALUES 
  (1, 1, 1, 1, '{1}', '2023-02-02T12:00:00Z', '2023-02-02T12:00:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (2, 1, 2, 2, '{2}', '2023-02-02T12:10:00Z', '2023-02-02T12:10:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (3, 2, 1, 1, '{1,2}', '2023-02-02T14:10:00Z', '2023-02-02T14:10:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (4, 3, 1, 1, '{1}', '2023-02-06T13:10:00Z', '2023-02-06T13:10:00Z', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254'),
  (5, 3, 4, 2, '{2}', '2023-02-06T13:20:00Z', '2023-02-06T13:20:00Z', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254');

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
  (4, 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-05T13:00:00Z', '2023-02-05T16:00:00Z', 10800, '2023-02-05T16:00:00Z', '2023-02-05T16:00:00Z'),
  (5, 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T14:00:00Z', '2023-02-07T17:30:00Z', 12600, '2023-02-07T17:30:00Z', '2023-02-07T17:30:00Z');

-- Insert task dependency data
UPDATE "task"
SET depends_on_task_ids = CASE
  WHEN id = 2 THEN ARRAY[1]  -- Implement Responsive Design 依赖于 Create Wireframes
  WHEN id = 3 THEN ARRAY[2]  -- Cross-browser Testing 依赖于 Implement Responsive Design
  WHEN id = 5 THEN ARRAY[4]  -- Implement Authentication 依赖于 Design REST API
  WHEN id = 8 THEN ARRAY[7]  -- Implement Login Screen 依赖于 Setup React Native Project
END
WHERE id IN (2,3,5,8);

-- Insert task template data
INSERT INTO "task_template" (id, title, description, status, priority, team_id, created_by, created_at, updated_at)
VALUES 
  (1, 'Bug Fix Template', 'Standard template for bug fixes', 'TODO', 'HIGH', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:00:00Z', '2023-02-03T09:00:00Z'),
  (2, 'Feature Development Template', 'Standard template for new feature development', 'TODO', 'MEDIUM', 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:15:00Z', '2023-02-03T09:15:00Z'),
  (3, 'Mobile Screen Template', 'Template for implementing mobile app screens', 'TODO', 'MEDIUM', 3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T09:00:00Z', '2023-02-07T09:00:00Z');

-- Insert chat session data
INSERT INTO "chat_session" (id, type, name, team_id, created_by, created_at, updated_at)
VALUES 
  (1, 'GROUP', '前端团队讨论', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:00:00Z', '2023-02-02T10:00:00Z'),
  (2, 'GROUP', '后端团队讨论', 2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:15:00Z', '2023-02-02T10:15:00Z'),
  (3, 'PRIVATE', 'weixuan和simpo的对话', NULL, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:00:00Z', '2023-02-03T09:00:00Z');

-- Insert chat participant data
INSERT INTO "chat_participant" (session_id, user_id, joined_at, role)
VALUES 
  (1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:00:00Z', 'ADMIN'),
  (1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T11:00:00Z', 'MEMBER'),
  (2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:15:00Z', 'ADMIN'),
  (2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T11:15:00Z', 'MEMBER'),
  (3, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:00:00Z', 'ADMIN'),
  (3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T09:00:00Z', 'MEMBER');

-- Insert chat message data
INSERT INTO "chat_message" (id, session_id, user_id, content, created_at, updated_at)
VALUES 
  (1, 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '欢迎来到前端团队讨论群！', '2023-02-02T10:05:00Z', '2023-02-02T10:05:00Z'),
  (2, 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '谢谢邀请！', '2023-02-03T11:05:00Z', '2023-02-03T11:05:00Z'),
  (3, 3, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '关于响应式设计的实现，我们需要讨论一下', '2023-02-03T09:05:00Z', '2023-02-03T09:05:00Z');

-- Insert chat message read status
INSERT INTO "chat_message_read_status" (message_id, user_id, read_at)
VALUES 
  (1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02T10:05:00Z'),
  (1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T11:00:00Z'),
  (2, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:07:00Z'),
  (2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T11:05:00Z'),
  (3, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:10:00Z'),
  (3, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-03T11:12:00Z');

-- Insert chat attachment data
INSERT INTO "chat_attachment" (id, message_id, file_url, file_name, uploaded_by, created_at)
VALUES 
  (1, 3, 'https://example.com/files/responsive-design-approach.pdf', '响应式设计方法.pdf', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T11:10:00Z');

-- Insert subscription plan data
INSERT INTO "subscription_plan" (
  name, type, price, billing_interval, description, 
  features, max_members, max_projects, storage_limit, is_active
)
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

-- Insert promo code data
INSERT INTO "promo_code" (code, description, discount_type, discount_value, max_uses, start_date, end_date) VALUES
  ('NEWYEAR2024', '新年促销', 'PERCENTAGE', 20.00, 100, '2024-01-01 00:00:00', '2024-01-31 23:59:59'),
  ('WELCOME50', '新用户优惠', 'FIXED_AMOUNT', 50.00, 200, '2024-01-01 00:00:00', '2024-12-31 23:59:59');

-- Insert notification data
INSERT INTO "notification" (
  id, user_id, title, content, type, 
  related_entity_type, related_entity_id, 
  is_read, created_at, updated_at
)
VALUES 
  (1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', 
   '任务已分配', '你被分配到了任务"创建线框图"', 
   'TASK_ASSIGNED', 'task', '1', 
   FALSE, '2023-02-03T11:00:00Z', '2023-02-03T11:00:00Z');