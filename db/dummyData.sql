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

-- Insert default data
INSERT INTO "default" (id, name, qty, updated_at, edited_by)
VALUES
  (1, 'custom_field', 2, '2023-02-01T00:00:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  (2, 'tag', 4, '2023-02-01T00:00:00Z', '75cb09ec-f11e-4b34-a1e5-327e90026b94');
  
-- Insert tag data
INSERT INTO "tag" 
("id", "name", "description", "default", "type", "created_by", "created_at", "updated_at") 
VALUES 
('1', 'Name', 'Used to label the name.', 'TRUE', 'TEXT', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('2', 'Assignee', 'Used to label the person responsible.', 'TRUE', 'PEOPLE', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('3', 'Status', 'Used to label the status.', 'TRUE', 'SINGLE-SELECT', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('4', 'Due Date', 'Used to label the due date.', 'TRUE', 'DATE', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('5', 'Description', 'Used to label the description.', 'TRUE', 'TEXT', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('6', 'Start Date', 'Used to label the start date.', 'TRUE', 'DATE', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('7', 'Parent ID', 'Used to label the parent ID.', 'TRUE', 'ID', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'),
('8', 'Duration', 'Used to label the duration.', 'TRUE', 'NUMBER', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('9', 'Progress', 'Used to label the progress value.', 'TRUE', 'NUMBER', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('10', 'Tags', 'Used to label the tags.', 'TRUE', 'TAGS', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('11', 'Completed On', 'Used to label the completion date.', 'TRUE', 'DATE', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'), 
('12', 'Remarks', 'Used to label the remarks.', 'TRUE', 'MULTI-SELECT', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'),
('13', 'File', 'Used to label the file.', 'TRUE', 'FILE', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00'),
('14', 'Content', 'Used to label the content.', 'TRUE', 'TEXT', '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-02 10:00:00', '2023-02-02 10:00:00');

-- Insert comment data
INSERT INTO "comment" (id, text, task_id, user_id, created_at, updated_at)
VALUES 
  (1, 'I have started working on the homepage wireframe, should be done by tomorrow.', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-04T09:00:00Z', '2023-02-04T09:00:00Z'),
  (2, 'Looking good! Consider adding a large banner section at the top.', 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T10:30:00Z', '2023-02-04T10:30:00Z'),
  (3, 'I will ensure all pages have tablet and mobile designs.', 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T11:15:00Z', '2023-02-04T11:15:00Z'),
  (4, 'I have documented all API endpoints in the shared doc.', 2, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-04T14:00:00Z', '2023-02-04T14:00:00Z'),
  (5, 'We need to decide on authentication method. JWT or session-based?', 1, '75cb09ec-f11e-4b34-a1e5-327e90026b94', '2023-02-05T09:00:00Z', '2023-02-05T09:00:00Z'),
  (6, 'I think JWT would be better for this project.', 1, 'a9d61763-843c-4c7b-894a-fd8d8a5fc254', '2023-02-05T09:30:00Z', '2023-02-05T09:30:00Z');

-- Insert custom field data
INSERT INTO "custom_field" (id, name, type, description, icon, created_at, updated_at, created_by)
VALUES 
  ('1', 'Overview', 'OVERVIEW', 'Provides a high-level summary of overall project progress and key metrics.', 'LayoutGrid', '2025-03-11 10:26:13.055402', '2025-03-11 10:26:13.055402', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  ('2', 'List', 'LIST', 'Presents tasks in a straightforward, linear list for easy tracking.', 'List', '2025-03-11 08:33:44.576972', '2025-03-11 08:33:44.576972', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('3', 'Timeline', 'TIMELINE', 'A simplified version of gantt that visualizes tasks along a timeline.', 'CalendarClock', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('4', 'Kanban', 'KANBAN', 'Visualizes tasks in a kanban board layout for status-based task tracking.', 'SquareKanban', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('5', 'Calendar', 'CALENDAR', 'Uses a calendar view to plan, schedule, and track tasks by date.', 'CalendarRange', '2025-03-11 10:24:37.186868', '2025-03-11 10:24:37.186868', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('6', 'Posts', 'POSTS', 'Used for publishing and managing project-related posts and announcements.', 'Pen', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('7', 'Files', 'FILES', 'Allows users to upload, manage, and organize task-related documents.', 'Files', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('8', 'Gantt', 'GANTT', 'Displays tasks in a gantt chart with timelines and dependencies for project planning.', 'ChartGantt', '2025-03-11 06:51:17.627043', '2025-03-11 06:51:17.627043', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('9', 'Workflow', 'WORKFLOW', 'Outlines tasks in a structured workflow format, showing task progression.', 'Workflow', '2025-03-11 10:26:13.055402', '2025-03-11 10:26:13.055402', '75cb09ec-f11e-4b34-a1e5-327e90026b94'),
  ('10', 'Note', 'NOTE', 'Functions as a knowledge base for capturing and organizing notes, documentation, or ideas.', 'NotebookText', '2025-03-11 10:25:37.878485', '2025-03-11 10:25:37.878485', '75cb09ec-f11e-4b34-a1e5-327e90026b94'), 
  ('11', 'Agile', 'AGILE', 'Supports agile methodologies by managing tasks in an iterative board format.', 'BookText', '2025-03-11 10:26:13.055402', '2025-03-11 10:26:13.055402', '75cb09ec-f11e-4b34-a1e5-327e90026b94');

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
INSERT INTO "public"."subscription_plan" (
  "id", "name", "type", "price", "billing_interval", "description", 
  "features", "max_projects", "max_teams", "max_members", 
  "max_ai_chat", "max_ai_task", "max_ai_workflow", 
  "is_active", "created_at", "updated_at"
) VALUES 
('1', 'Free', 'FREE', '0.00', 'MONTHLY', 'Basic plan for small teams', 
 '{"features": ["Basic task management", "1GB storage", "Community support", "4 projects"]}', 
 '2', '1', '3', '50', '20', '5', 
 'true', '2025-03-26 12:37:28.971897', '2025-04-19 04:49:22.663'),
('2', 'Pro', 'PRO', '29.00', 'MONTHLY', 'Perfect for growing teams', 
 '{"features": ["Up to 10 team members", "Advanced task management", "10GB storage", "Priority support", "Custom fields"]}', 
 '5', '3', '10', '500', '100', '20', 
 'true', '2025-03-26 12:37:28.971897', '2025-04-12 10:33:10.017'),
('3', 'Enterprise', 'ENTERPRISE', '99.00', 'MONTHLY', 'For large organizations', 
 '{"features": ["Unlimited team members", "Unlimited projects", "Enterprise security", "100GB storage", "24/7 dedicated support", "Custom branding"]}', 
 '-1', '-1', '-1', '-1', '-1', '-1', 
 'true', '2025-03-26 12:37:28.971897', '2025-04-12 10:30:03.438'),
('4', 'Free', 'FREE', '0.00', 'YEARLY', 'Basic plan for small teams', 
 '{"features": ["Up to 3 team members", "2 projects", "Basic task management", "1GB storage"]}', 
 '2', '1', '3', '50', '20', '5', 
 'true', '2025-03-26 12:37:28.971897', '2025-04-12 10:30:38.355'),
('5', 'Pro', 'PRO', '290.00', 'YEARLY', 'Perfect for growing teams with yearly discount', 
 '{"features": ["Up to 10 team members", "Unlimited projects", "Advanced task management", "15GB storage", "Priority support", "Custom fields", "Time tracking"]}', 
 '-1', '5', '10', '1000', '200', '50', 
 'true', '2025-03-26 12:37:28.971897', '2025-04-12 10:29:45.189'),
('6', 'Enterprise', 'ENTERPRISE', '990.00', 'YEARLY', 'For large organizations with yearly discount', 
 '{"features": ["Unlimited team members", "Unlimited projects", "Enterprise security", "150GB storage", "24/7 dedicated support", "Custom branding", "API access", "SSO integration", "Audit logs"]}', 
 '-1', '-1', '-1', '-1', '-1', '-1', 
 'true', '2025-03-26 12:37:28.971897', '2025-03-26 12:37:28.971897');

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
INSERT INTO "admin_permission" ("name", "description", "resource", "action") VALUES
('manage_users', '管理所有用户账户', 'users', 'manage'),
('view_users', '查看用户列表', 'users', 'read'),
('create_users', '创建新用户', 'users', 'create'),
('update_users', '更新用户信息', 'users', 'update'),
('delete_users', '删除用户账户', 'users', 'delete'),

('manage_teams', '管理所有团队', 'teams', 'manage'),
('view_teams', '查看团队列表', 'teams', 'read'),
('create_teams', '创建新团队', 'teams', 'create'),
('update_teams', '更新团队信息', 'teams', 'update'),
('delete_teams', '删除团队', 'teams', 'delete'),

('manage_projects', '管理所有项目', 'projects', 'manage'),
('view_projects', '查看项目列表', 'projects', 'read'),
('create_projects', '创建新项目', 'projects', 'create'),
('update_projects', '更新项目信息', 'projects', 'update'),
('delete_projects', '删除项目', 'projects', 'delete'),

('manage_subscriptions', '管理所有订阅', 'subscriptions', 'manage'),
('view_subscriptions', '查看订阅列表', 'subscriptions', 'read'),
('create_subscriptions', '创建新订阅', 'subscriptions', 'create'),
('update_subscriptions', '更新订阅信息', 'subscriptions', 'update'),
('delete_subscriptions', '删除订阅', 'subscriptions', 'delete'),

('manage_system', '管理系统设置', 'system', 'manage'),
('view_logs', '查看系统日志', 'logs', 'read'),
('manage_admins', '管理管理员账户', 'admins', 'manage');

-- 为超级管理员角色分配所有权限
INSERT INTO "admin_role_permission" ("role", "permission_id")
SELECT 'SUPER_ADMIN', id FROM "admin_permission";

-- 为普通管理员分配部分权限
INSERT INTO "admin_role_permission" ("role", "permission_id")
SELECT 'ADMIN', id FROM "admin_permission" 
WHERE "name" IN (
  'view_users', 'update_users',
  'view_teams', 'update_teams',
  'view_projects', 'update_projects',
  'view_subscriptions', 'update_subscriptions',
  'view_logs'
);

-- 为审核员分配有限权限
INSERT INTO "admin_role_permission" ("role", "permission_id")
SELECT 'MODERATOR', id FROM "admin_permission" 
WHERE "name" IN (
  'view_users',
  'view_teams',
  'view_projects',
  'view_subscriptions',
  'view_logs'
);
