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
    'a54364ef-1bd5-49a0-8787-7baaf4524a9c',
    'simpo',
    'baifan1366@gmail.com',
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
  (1, 'custom_field', 7, '2023-02-01T00:00:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (2, 'tag', 4, '2023-02-01T00:00:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94');
  
-- Insert section data
INSERT INTO "section" (id, name, team_id, created_by, created_at, updated_at, task_ids)
VALUES 
  (1, '设计', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T10:00:00Z', '2023-02-03T10:00:00Z', '{1}'),
  (2, '开发', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T10:15:00Z', '2023-02-03T10:15:00Z', '{2}'),
  (3, '测试', 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T11:00:00Z', '2023-02-04T11:00:00Z', '{3}'),
  (4, 'API开发', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T14:00:00Z', '2023-02-03T14:00:00Z', '{4}');

-- Insert tag data
INSERT INTO "tag" 
("id", "name", "description", "type", "created_by", "created_at", "updated_at") 
VALUES 
('1', 'Name', '用于标记名字', 'TEXT', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('2', 'Asignee', '用于标记负责人', 'PEOPLE', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('3', 'Status', '用于标记状态', 'SINGLE-SELECT', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('4', 'Due Date', '用于标记截至日期', 'DATE', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('5', 'Description', '用于标记描述', 'TEXT', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('6', 'Start Date', '用于标记开始日期', 'DATE', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('7', 'Parent ID', '用于标记父级ID', 'ID', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'),
('8', 'Duration', '用于标记时长', 'NUMBER', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('9', 'Progress', '用于标记进度值', 'NUMBER', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('10', 'Tags', '用于标记标签', 'TAGS', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('11', 'Completed On', '用于标记完成日期', 'DATE', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('12', 'Remarks', '用于标记备注', 'MULTI-SELECT', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00');

-- Insert task data
INSERT INTO "task" (
  id, tag_values, attachment_ids, created_by, created_at, updated_at
) VALUES (
  1,
  '{"name":"Proposal of the project","asignee":"75cb09ec-f11e-4b34-a1e5-327e90026b94","dueDate":"2023-02-15T17:00:00Z"}',
  '{1}',
  '75cb09ec-f11e-4b34-a1e5-327e90026b94',
  '2023-02-03T11:00:00Z',
  '2023-02-03T11:00:00Z'
),
(
  2,
  '{"name":"Research on the project","asignee":"75cb09ec-f11e-4b34-a1e5-327e90026b94","dueDate":"2023-02-15T17:00:00Z"}',
  '{1}',
  '75cb09ec-f11e-4b34-a1e5-327e90026b94',
  '2023-02-03T11:00:00Z',
  '2023-02-03T11:00:00Z'
),
(
  3,
  '{"name":"Create a wireframe","asignee":"75cb09ec-f11e-4b34-a1e5-327e90026b94","dueDate":"2023-02-15T17:00:00Z"}',
  '{1}',
  '75cb09ec-f11e-4b34-a1e5-327e90026b94',
  '2023-02-03T11:00:00Z',
  '2023-02-03T11:00:00Z'
);

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
  ('1', 'Overview', 'OVERVIEW', 'A high-level overview of project progress and key metrics', 'LayoutGrid', '2025-03-11 10:26:13.055402', '2025-03-11 10:26:13.055402', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  ('2', 'List', 'LIST', 'A simple list format for displaying tasks', 'List', '2025-03-11 08:33:44.576972', '2025-03-11 08:33:44.576972', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('3', 'Files', 'FILES', 'Manage task-related files, enabling users to upload and organize documents associated with tasks', 'Files', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('4', 'Timeline', 'TIMELINE', 'Display tasks in timeline format, allowing users to visualize task progress over time', 'SquareChartGantt', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('5', 'Gantt', 'GANTT', 'Project progress in Gantt chart format, providing a visual representation of project timelines and dependencies', 'ChartGantt', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('6', 'Kanban Board', 'KANBAN', 'Display tasks in kanban board format', 'LayoutDashboard', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('7', 'Workflow', 'WORKFLOW', 'Display tasks in workflow format', 'LayoutDashboard', '2025-03-11 10:26:13.055402', '2025-03-11 10:26:13.055402', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  ('8', 'Calendar', 'CALENDAR', 'A calendar view for scheduling and tracking tasks', 'CalendarRange', '2025-03-11 10:24:37.186868', '2025-03-11 10:24:37.186868', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('9', 'Notion', 'NOTE', 'A text field for adding notes related to tasks', 'Text', '2025-03-11 10:25:37.878485', '2025-03-11 10:25:37.878485', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('10', 'Agile', 'AGILE', 'Agile board for managing tasks in an agile workflow', 'Pen', '2025-03-11 10:26:13.055402', '2025-03-11 10:26:13.055402', '75cb09ec-f11e-4b34-a1e5-327e90026b94');

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

-- Insert task template data
INSERT INTO "task_template" (id, title, description, status, priority, team_custom_field_id, tag_values, created_by, created_at, updated_at)
VALUES 
  (1, 'Bug Fix Template', 'Standard template for bug fixes', 'TODO', 'HIGH', 1, '{"1":"Board"}', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:00:00Z', '2023-02-03T09:00:00Z'),
  (2, 'Feature Development Template', 'Standard template for new feature development', 'TODO', 'MEDIUM', 2, '{"2":"Timeline"}', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-03T09:15:00Z', '2023-02-03T09:15:00Z'),
  (3, 'Mobile Screen Template', 'Template for implementing mobile app screens', 'TODO', 'MEDIUM', 3, '{"3":"Files"}', 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-07T09:00:00Z', '2023-02-07T09:00:00Z');

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
INSERT INTO "subscription_plan" ("id", "name", "type", "price", "billing_interval", "description", "features", "max_members", "max_projects", "storage_limit", "is_active", "created_at", "updated_at") 
VALUES 
('1', 'Free', 'FREE', '0.00', 'MONTHLY', 'Basic plan for small teams', '{"features": ["Up to 3 team members", "2 projects", "Basic task management", "1GB storage", "Community support"]}', '3', '2', '1073741824', 'true', '2025-03-26 12:37:28.971897', '2025-03-26 12:37:28.971897'), 
('2', 'Pro', 'PRO', '29.00', 'MONTHLY', 'Perfect for growing teams', '{"features": ["Up to 10 team members", "Unlimited projects", "Advanced task management", "10GB storage", "Priority support", "Custom fields", "Time tracking"]}', '10', '2', '10737418240', 'true', '2025-03-26 12:37:28.971897', '2025-03-26 12:37:28.971897'), 
('3', 'Enterprise', 'ENTERPRISE', '99.00', 'MONTHLY', 'For large organizations', '{"features": ["Unlimited team members", "Unlimited projects", "Enterprise security", "100GB storage", "24/7 dedicated support", "Custom branding", "API access"]}', '-1', '2', '107374182400', 'true', '2025-03-26 12:37:28.971897', '2025-03-26 12:37:28.971897');  

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

INSERT INTO "user_subscription_plan" ("id", "user_id", "plan_id", "status", "start_date", "end_date", "current_users", "current_projects", "current_ai_agents", "current_automation_flows", "current_tasks_this_month", "created_at", "updated_at") 
VALUES 
('1', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2', 'ACTIVE', '2025-03-27 12:33:26.192', '2025-04-27 12:33:26.192', '0', '2', '0', '0', '0', '2025-03-27 12:10:53.237582', '2025-03-27 12:33:26.296'),
('2', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2', 'ACTIVE', '2025-03-27 12:33:26.192', '2025-04-27 12:33:26.192', '0', '2', '0', '0', '0', '2025-03-27 12:10:53.237582', '2025-03-27 12:33:26.296'),
('3', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2', 'ACTIVE', '2025-03-27 12:33:26.192', '2025-04-27 12:33:26.192', '0', '2', '0', '0', '0', '2025-03-27 12:10:53.237582', '2025-03-27 12:33:26.296');

-- 插入基本权限数据
INSERT INTO "admin_permission" ("id", "name", "description", "category") 
VALUES 
('1', 'view_users', 'View users', 'userManagement'), 
('2', 'add_users', 'Add users', 'userManagement'), 
('3', 'edit_users', 'Edit Users', 'userManagement'), 
('4', 'delete_users', 'Delete Users', 'userManagement'), 
('5', 'edit_sub_plans', 'Edit Subscriptions', 'subscriptionManagement'), 
('6', 'toggle_sub_status', 'Toggle Subscription Status', 'subscriptionManagement'), 
('7', 'add_promo_codes', 'Add Promo Codes', 'subscriptionManagement'), 
('9', 'delete_promo_codes', 'Delete Promo Codes', 'subscriptionManagement'), 
('10', 'view_payment_history', 'View Payment History', 'subscriptionManagement'), 
('11', 'view_support_tickets', 'View Support Tickets', 'supportManagement'), 
('12', 'mark_support_tickets', 'Mark Support Tickets', 'supportManagement'), 
('13', 'reply_to_tickets', 'Reply to tickets', 'supportManagement'), 
('14', 'view_analytics', 'View Analytics', 'analytics'), 
('16', 'manage_system_settings', 'Manage Website Settings, Language & Region Settings, Theme & Appearance, Landing Page Media', 'systemSettings'), 
('17', 'view_admins', 'View Admins', 'adminManagement'), 
('18', 'edit_admins', 'Edit Admins', 'adminManagement'), 
('19', 'add_admins', 'Add Admins', 'adminManagement'), 
('20', 'delete_admins', 'Delete Admins', 'adminManagement'), 
('21', 'view_subscription_plans', 'View Subscriptions Plans', 'subscriptionManagement'), 
('22', 'view_promo_codes', 'View Promo Codes', 'subscriptionManagement'), 
('23', 'toggle_code_status', 'Toggle Promo Code Status', 'subscriptionManagement'), 
('24', 'edit_promo_codes', 'Edit Promo Codes', 'subscriptionManagement'), 
('25', 'view_user_subscriptions', 'View User Subscriptions', 'subscriptionManagement');

-- 为所有管理员分配所有权限
INSERT INTO "admin_role_permission" ("admin_id", "permission_id", "is_active")
SELECT 1, id, TRUE FROM "admin_permission";

INSERT INTO "admin_role_permission" ("admin_id", "permission_id", "is_active")
SELECT 3, id, TRUE FROM "admin_permission";

