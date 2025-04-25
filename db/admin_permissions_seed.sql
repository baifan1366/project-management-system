-- Seed data for admin permissions and role permissions

-- Insert permissions for user management
INSERT INTO "admin_permission" ("name", "description", "resource", "action") VALUES
('view_users', 'View list of all users', 'users', 'read'),
('create_user', 'Create new users', 'users', 'create'),
('edit_user', 'Edit user details', 'users', 'update'),
('delete_user', 'Delete users', 'users', 'delete'),
('manage_users', 'Full access to user management', 'users', 'manage');

-- Insert permissions for subscription management
INSERT INTO "admin_permission" ("name", "description", "resource", "action") VALUES
('view_subscriptions', 'View all subscription records', 'subscriptions', 'read'),
('create_subscription', 'Create subscription plans', 'subscriptions', 'create'),
('edit_subscription', 'Edit subscription plans', 'subscriptions', 'update'),
('delete_subscription', 'Delete subscription plans', 'subscriptions', 'delete'),
('manage_subscriptions', 'Full access to subscription management', 'subscriptions', 'manage');

-- Insert permissions for analytics
INSERT INTO "admin_permission" ("name", "description", "resource", "action") VALUES
('view_analytics', 'Access analytics dashboard', 'analytics', 'read'),
('export_analytics', 'Export analytics data', 'analytics', 'export');

-- Insert permissions for support system
INSERT INTO "admin_permission" ("name", "description", "resource", "action") VALUES
('view_support_tickets', 'View support tickets', 'support', 'read'),
('reply_support_tickets', 'Reply to support tickets', 'support', 'reply'),
('close_support_tickets', 'Close support tickets', 'support', 'close'),
('manage_support', 'Full access to support system', 'support', 'manage');

-- Insert permissions for admin management
INSERT INTO "admin_permission" ("name", "description", "resource", "action") VALUES
('view_admins', 'View list of admin users', 'admins', 'read'),
('create_admin', 'Create new admin users', 'admins', 'create'),
('edit_admin', 'Edit admin user details', 'admins', 'update'),
('delete_admin', 'Delete admin users', 'admins', 'delete'),
('manage_admins', 'Full access to admin management', 'admins', 'manage');

-- Insert permissions for system settings
INSERT INTO "admin_permission" ("name", "description", "resource", "action") VALUES
('view_settings', 'View system settings', 'settings', 'read'),
('edit_settings', 'Edit system settings', 'settings', 'update'),
('manage_settings', 'Full access to system settings', 'settings', 'manage');

-- Assign permissions to SUPER_ADMIN role
-- Super admins have all permissions
INSERT INTO "admin_role_permission" ("role", "permission_id")
SELECT 'SUPER_ADMIN', id FROM "admin_permission";

-- Assign permissions to ADMIN role
-- Admins have most permissions except for managing other admins and system settings
INSERT INTO "admin_role_permission" ("role", "permission_id")
SELECT 'ADMIN', id FROM "admin_permission" 
WHERE "name" NOT IN (
  'create_admin', 'edit_admin', 'delete_admin', 'manage_admins',
  'edit_settings', 'manage_settings'
);

-- Assign permissions to MODERATOR role
-- Moderators have limited permissions - mostly read access and support management
INSERT INTO "admin_role_permission" ("role", "permission_id")
SELECT 'MODERATOR', id FROM "admin_permission" 
WHERE "name" IN (
  'view_users', 'view_subscriptions', 'view_analytics',
  'view_support_tickets', 'reply_support_tickets', 'close_support_tickets',
  'view_settings'
); 