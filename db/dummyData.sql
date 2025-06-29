-- Insert user data
INSERT INTO "user" (
  id, 
  name, 
  email, 
  phone,
  avatar_url, 
  language, 
  theme,
  timezone,
  hour_format,
  google_provider_id,
  github_provider_id,
  connected_providers,
  last_login_provider,
  mfa_secret,
  is_mfa_enabled,
  notifications_enabled,
  notifications_settings,
  email_verified,
  verification_token,
  verification_token_expires,
  last_seen_at,
  is_online,
  created_at, 
  updated_at,
  password_hash
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
    'UTC+8',
    '24h',
    NULL,
    NULL,
    '[]',
    'local',
    NULL,
    FALSE,
    TRUE,
    '{"notifications_enabled": true, "pushNotifications": true, "weeklyDigest": true, "addedChatNotifications": true, "mentionNotifications": true, "inviteMeetingNotifications": true, "taskAssignments": true, "teamAnnouncements": true, "taskComments": true, "dueDates": true, "teamInvitations": true}',
    TRUE,
    NULL,
    NULL,
    '2023-01-10T08:30:00Z',
    FALSE,
    '2023-01-10T08:30:00Z',
    '2023-01-10T08:30:00Z',
    'bcrypt_hash_placeholder'
  ),
  (
    'a54364ef-1bd5-49a0-8787-7baaf4524a9c',
    'simpo',
    'baifan1366@gmail.com',
    '+8613800138001',
    'https://randomuser.me/api/portraits/women/2.jpg',
    'en',
    'system',
    'UTC+0',
    '12h',
    'google_123456',
    NULL,
    '["google"]',
    'google',
    'MFASECRET123456',
    TRUE,
    TRUE,
    '{"notifications_enabled": true, "pushNotifications": true, "weeklyDigest": false, "addedChatNotifications": true, "mentionNotifications": true, "inviteMeetingNotifications": true, "taskAssignments": true, "teamAnnouncements": true, "taskComments": true, "dueDates": true, "teamInvitations": true}',
    TRUE,
    NULL,
    NULL,
    '2023-01-15T10:30:00Z',
    TRUE,
    '2023-01-15T09:45:00Z',
    '2023-01-15T09:45:00Z',
    NULL
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

-- Insert subscription plan data
INSERT INTO "subscription_plan" (
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

INSERT INTO "admin_user" (id, username, email, password_hash, full_name, avatar_url, is_active, last_login, created_at, updated_at) VALUES
('3', 'admin', 'admin@example.com', 'password', 'Admin User', 'https://example.com/avatar.jpg', TRUE, '2024-01-01 00:00:00', '2024-01-01 00:00:00', '2024-01-01 00:00:00');

-- 插入基本权限数据
INSERT INTO "admin_permission" ("id", "name", "description", "category") VALUES
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
('25', 'view_user_subscriptions', 'View User Subscriptions', 'subscriptionManagement'), 
('26', 'add_sub_plans', 'Add Subscription Plans', 'subscriptionManagement'), 
('27', 'delete_sub_plans', 'Delete Subscription Plans', 'subscriptionManagement');

INSERT INTO "admin_role_permission" ("id", "admin_id", "permission_id", "is_active") 
VALUES 
('24', '3', '6', 'true'), 
('25', '3', '7', 'true'), 
('26', '3', '9', 'true'), 
('27', '3', '22', 'true'), 
('28', '3', '24', 'true'), 
('29', '3', '23', 'true'), 
('30', '3', '1', 'true'), 
('31', '3', '2', 'true'), 
('32', '3', '3', 'true'), 
('33', '3', '4', 'true'), 
('34', '3', '10', 'true'), 
('35', '3', '21', 'true'), 
('36', '3', '25', 'true'), 
('37', '3', '11', 'true'), 
('38', '3', '12', 'true'), 
('39', '3', '13', 'true'), 
('40', '3', '14', 'true'), 
('41', '3', '16', 'true'), 
('42', '3', '18', 'true'), 
('43', '3', '19', 'true'), 
('44', '3', '20', 'true'), 
('45', '3', '17', 'true'), 
('46', '3', '5', 'true');