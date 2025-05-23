-- 用户表
CREATE TABLE "user" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "phone" VARCHAR(20) UNIQUE,
  "avatar_url" VARCHAR(255),
  "language" VARCHAR(10) DEFAULT 'en',
  "theme" VARCHAR(50) CHECK ("theme" IN ('light', 'dark', 'system')) DEFAULT 'system',
  "timezone" VARCHAR(50) DEFAULT 'UTC+0', -- User's timezone setting
  "hour_format" VARCHAR(10) CHECK ("hour_format" IN ('12h', '24h')) DEFAULT '24h', -- User's hour format preference
  "google_provider_id" VARCHAR(255),
  "github_provider_id" VARCHAR(255),
  "connected_providers" TEXT DEFAULT '[]',
  "last_login_provider" VARCHAR(50),
  "mfa_secret" VARCHAR(255), -- TOTP 秘钥
  "is_mfa_enabled" BOOLEAN DEFAULT FALSE,
  "notifications_enabled" BOOLEAN DEFAULT TRUE,
  "notifications_settings" JSONB DEFAULT '{"emailNotifications": true, "pushNotifications": true, "weeklyDigest": true, "mentionNotifications": true, "taskAssignments": true, "taskComments": true, "dueDates": true, "teamInvitations": true}',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "email_verified" BOOLEAN DEFAULT FALSE,
  "verification_token" VARCHAR(255),
  "verification_token_expires" TIMESTAMP,
  "last_seen_at" TIMESTAMP,
  "is_online" BOOLEAN DEFAULT FALSE,
  "reset_password_token" VARCHAR(255),
  "reset_password_expires" TIMESTAMP,
  "password_hash" VARCHAR(255),
  "google_access_token" VARCHAR(2048),
  "google_refresh_token" VARCHAR(2048),
  "google_token_expires_at" BIGINT,
  "github_access_token" VARCHAR(2048),
  "github_refresh_token" VARCHAR(2048)
);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_google_provider_id ON "user" (google_provider_id) WHERE google_provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_github_provider_id ON "user" (github_provider_id) WHERE github_provider_id IS NOT NULL;

-- 默认字段表
CREATE TABLE "default" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "qty" INT NOT NULL,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "edited_by" UUID NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- 项目表
CREATE TABLE "project" (
  "id" SERIAL PRIMARY KEY,
  "project_name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "visibility" VARCHAR(20) NOT NULL,
  "theme_color" VARCHAR(20) DEFAULT 'white',
  "status" TEXT NOT NULL CHECK ("status" IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD')) DEFAULT 'PENDING',
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 团队表
CREATE TABLE "team" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "access" VARCHAR(20) NOT NULL CHECK ("access" IN ('invite_only', 'can_edit', 'can_check', 'can_view')),
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "project_id" INT NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "order_index" INT DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "star" BOOL DEFAULT FALSE,
  "status" TEXT NOT NULL CHECK ("status" IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD')) DEFAULT 'PENDING',
  "archive" BOOL DEFAULT FALSE
);

-- 用户与团队的关系表（多对多）
CREATE TABLE "user_team" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('CAN_EDIT', 'CAN_CHECK', 'CAN_VIEW', 'OWNER')) DEFAULT 'CAN_VIEW',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- 团队邀请表
CREATE TABLE "user_team_invitation" (
  "id" SERIAL PRIMARY KEY,
  "user_email" VARCHAR(255) NOT NULL,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('CAN_EDIT', 'CAN_CHECK', 'CAN_VIEW')) DEFAULT 'CAN_VIEW',
  "status" TEXT NOT NULL CHECK ("status" IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')) DEFAULT 'PENDING',
  "expires_at" TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- 项目章节表
CREATE TABLE "section" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE, 
  "task_ids" INT[] DEFAULT '{}',
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务表
CREATE TABLE "task" (
  "id" SERIAL PRIMARY KEY,
  "tag_values" JSONB DEFAULT '{}',
  "attachment_ids" INT[] DEFAULT '{}', -- 存储附件ID数组
  "like" UUID[] DEFAULT '{}',
  "page_id" INT NULL REFERENCES "notion_page"("id") ON DELETE CASCADE,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 标签表
CREATE TABLE "tag" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "default" BOOLEAN DEFAULT FALSE,
  "type" TEXT NOT NULL CHECK ("type" IN ('SINGLE-SELECT', 'MULTI-SELECT', 'DATE', 'PEOPLE', 'TEXT', 'NUMBER', 'ID', 'TAGS', 'FILE')), 
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务时间记录表（用于时间跟踪）
CREATE TABLE "time_entry" (
  "id" SERIAL PRIMARY KEY,
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "start_time" TIMESTAMP NOT NULL,
  "end_time" TIMESTAMP,
  "duration" INT, -- 以秒为单位
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 自定义字段模板表
CREATE TABLE "custom_field" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('LIST', 'OVERVIEW', 'TIMELINE', 'NOTE', 'GANTT', 'CALENDAR', 'WORKFLOW', 'KANBAN', 'AGILE', 'FILES', 'POSTS')),
  "description" TEXT,
  "icon" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- 团队与自定义字段的关联表（多对多）
CREATE TABLE "team_custom_field" (
  "id" SERIAL PRIMARY KEY,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "custom_field_id" INT NOT NULL REFERENCES "custom_field"("id") ON DELETE CASCADE,
  "order_index" INT DEFAULT 0,    
  "tag_ids" INT[] DEFAULT '{}',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- 任务自定义字段值表
CREATE TABLE "team_custom_field_value" (
  "id" SERIAL PRIMARY KEY,
  "team_custom_field_id" INT NOT NULL REFERENCES "team_custom_field"("id") ON DELETE CASCADE,
  "name" VARCHAR(255), -- 团队自定义的字段名称
  "description" TEXT,  -- 团队自定义的描述
  "icon" VARCHAR(255), -- 团队自定义的图标
  "value" JSONB,      -- 存储其他自定义配置
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- Create team posts table
CREATE TABLE "team_post" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL CHECK ("type" IN ('post', 'announcement')),
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "attachment_id" INT[] DEFAULT '{}', -- Array of attachments associated with the post
  "is_pinned" BOOLEAN DEFAULT FALSE,
  "reactions" JSONB DEFAULT '{}', -- Store reactions as {emoji: [user_ids]} format
  "comment_id" INT[] DEFAULT '{}', -- Array of comments associated with the post
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_team_post_team_id ON "team_post"("team_id");
CREATE INDEX idx_team_post_attachment_id ON "team_post"("attachment_id");
CREATE INDEX idx_team_post_created_by ON "team_post"("created_by");
CREATE INDEX idx_team_post_created_at ON "team_post"("created_at");
CREATE INDEX idx_team_post_is_pinned ON "team_post"("is_pinned");
CREATE INDEX idx_team_post_reactions ON "team_post" USING GIN("reactions");

-- 任务模板表（用于创建任务模板）
CREATE TABLE "task_template" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL CHECK ("status" IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE')) DEFAULT 'TODO',
  "priority" TEXT NOT NULL CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) DEFAULT 'MEDIUM',
  "team_custom_field_id" INT NOT NULL REFERENCES "team_custom_field"("id") ON DELETE CASCADE,
  "tag_values" JSONB DEFAULT '{}', 
  "depends_on_task_ids" INT[] DEFAULT '{}', -- 存储依赖的任务ID数组
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务评论表
CREATE TABLE "comment" (
  "id" SERIAL PRIMARY KEY,
  "text" TEXT NOT NULL,
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务附件表
CREATE TABLE "attachment" (
  "id" SERIAL PRIMARY KEY,
  "file_url" VARCHAR(255) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "uploaded_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 个人日历事件表
CREATE TABLE "personal_calendar_event" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "start_time" TIMESTAMP NOT NULL,
  "end_time" TIMESTAMP NOT NULL,
  "is_all_day" BOOLEAN DEFAULT FALSE,
  "location" VARCHAR(255),
  "color" VARCHAR(20) DEFAULT '#4285F4',
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建个人日历事件索引
CREATE INDEX idx_personal_calendar_event_user ON "personal_calendar_event"("user_id");
CREATE INDEX idx_personal_calendar_event_time ON "personal_calendar_event"("start_time", "end_time");

-- 通知表
CREATE TABLE "notification" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "type" VARCHAR(50) NOT NULL CHECK ("type" IN ('TASK_ASSIGNED', 'COMMENT_ADDED', 'MENTION', 'DUE_DATE', 'TEAM_INVITATION', 'SYSTEM')),
  "related_entity_type" VARCHAR(50), -- 例如：'task', 'project', 'team', 'comment'
  "related_entity_id" VARCHAR(255), -- 相关实体的ID
  "data" JSONB,
  "link" VARCHAR(255),
  "is_read" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 聊天会话表（用于管理私聊和群聊会话）
CREATE TABLE "chat_session" (
  "id" SERIAL PRIMARY KEY,
  "type" TEXT NOT NULL CHECK ("type" IN ('PRIVATE', 'GROUP', 'AI')),
  "name" VARCHAR(255),
  "team_id" INT REFERENCES "team"("id") ON DELETE CASCADE,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 聊天参与者表
CREATE TABLE "chat_participant" (
  "session_id" INT NOT NULL REFERENCES "chat_session"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "joined_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "role" TEXT CHECK ("role" IN ('ADMIN', 'MEMBER')) DEFAULT 'MEMBER',
  PRIMARY KEY ("session_id", "user_id")
);

-- 聊天消息表
CREATE TABLE "chat_message" (
  "id" SERIAL PRIMARY KEY,
  "session_id" INT NOT NULL REFERENCES "chat_session"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "reply_to_message_id" INT REFERENCES "chat_message"("id") ON DELETE SET NULL,
  "mentions" JSONB,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "is_deleted" BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS chat_message_mentions_idx ON chat_message USING GIN (mentions);

-- 聊天消息已读状态表
CREATE TABLE "chat_message_read_status" (
  "message_id" INT NOT NULL REFERENCES "chat_message"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "read_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("message_id", "user_id")
);

-- AI聊天历史表
CREATE TABLE "ai_chat_message" (
  "id" SERIAL PRIMARY KEY,
  "session_id" INT REFERENCES "chat_session"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('user', 'assistant', 'system')),
  "content" TEXT NOT NULL,
  "conversation_id" VARCHAR(255) NOT NULL, -- 用于分组同一次对话的消息
  "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "model" VARCHAR(255) DEFAULT 'Qwen/QwQ-32B', -- 使用的AI模型名称
  "metadata" JSONB -- 存储额外的元数据
);

-- AI聊天历史索引
CREATE INDEX idx_ai_chat_message_user ON "ai_chat_message"("user_id");
CREATE INDEX idx_ai_chat_message_conversation ON "ai_chat_message"("conversation_id");
CREATE INDEX idx_ai_chat_message_timestamp ON "ai_chat_message"("timestamp");

-- 聊天附件表
CREATE TABLE "chat_attachment" (
  "id" SERIAL PRIMARY KEY,
  "message_id" INT NOT NULL REFERENCES "chat_message"("id") ON DELETE CASCADE,
  "file_url" VARCHAR(255) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "file_type" VARCHAR(100), -- 添加文件类型字段
  "is_image" BOOLEAN DEFAULT FALSE, -- 添加是否为图片的标识
  "uploaded_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 操作日志表
CREATE TABLE "action_log" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID REFERENCES "user"("id") ON DELETE SET NULL,
  "action_type" VARCHAR(50) NOT NULL, -- 例如：'CREATE', 'UPDATE', 'DELETE'
  "entity_type" VARCHAR(50) NOT NULL, -- 例如：'task', 'project', 'team'
  "entity_id" TEXT NOT NULL,           -- 被操作实体的ID
  "old_values" JSONB,                 -- 修改前的值
  "new_values" JSONB,                 -- 修改后的值
  "ip_address" VARCHAR(45),           -- 支持 IPv6
  "user_agent" TEXT,                  -- 用户浏览器信息
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    prompt TEXT NOT NULL,
    input_schema JSONB NOT NULL DEFAULT '{}',
    flow_data JSONB,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    icon VARCHAR(10),
    created_by UUID REFERENCES "user"("id") ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows (created_by);
CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows (type);
CREATE INDEX IF NOT EXISTS idx_workflows_is_public ON workflows (is_public);
CREATE INDEX IF NOT EXISTS idx_workflows_is_deleted ON workflows (is_deleted);

-- Create the workflow_executions table to track execution history
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES "user"("id") ON DELETE SET NULL,
    model_id VARCHAR(255),
    inputs JSONB,
    result JSONB,
    status VARCHAR(50) NOT NULL,
    output_formats TEXT[] DEFAULT '{}'::text[],
    document_urls JSONB DEFAULT '{}'::jsonb,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    api_responses JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions (workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions (user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions (status);

-- Function to check if a user can access a workflow
CREATE OR REPLACE FUNCTION can_access_workflow(workflow_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workflows
        WHERE id = workflow_id 
        AND (created_by = user_id OR is_public)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

  -- 订阅计划表
  CREATE TABLE "subscription_plan" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(50) NOT NULL,
    "type" TEXT NOT NULL CHECK ("type" IN ('FREE', 'PRO', 'ENTERPRISE')),
    "price" DECIMAL(10, 2) NOT NULL,
    "billing_interval" TEXT NOT NULL CHECK ("billing_interval" IN ('MONTHLY', 'YEARLY')),
    "description" TEXT,
    "features" JSONB NOT NULL, -- 存储计划包含的功能列表
    "max_projects" INT NOT NULL, -- 最大项目数
    "max_teams" INT NOT NULL, -- 最大团队数
    "max_members" INT NOT NULL, -- 最大团队成员数
    "max_ai_chat" INT NOT NULL, -- 最大AI聊天数
    "max_ai_task" INT NOT NULL, -- 最大AI任务数
    "max_ai_workflow" INT NOT NULL, -- 最大AI工作流数
    "max_storage" INT NOT NULL DEFAULT 0, -- 最大存储空间(GB)
    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- 用户订阅计划表
  CREATE TABLE "user_subscription_plan" (
    "id" SERIAL PRIMARY KEY,
    "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "plan_id" INT NOT NULL REFERENCES "subscription_plan"("id"),
    "status" TEXT CHECK ("status" IN ('ACTIVE', 'CANCELED', 'EXPIRED') OR "status" IS NULL),
    "start_date" TIMESTAMP NOT NULL,
    "end_date" TIMESTAMP NOT NULL,
    -- 使用统计
    "current_projects" INT DEFAULT 0,
    "current_teams" INT DEFAULT 0,
    "current_members" INT DEFAULT 0,
    "current_ai_chat" INT DEFAULT 0,
    "current_ai_task" INT DEFAULT 0,
    "current_ai_workflow" INT DEFAULT 0,
    "current_storage" INT DEFAULT 0,
    -- 时间戳
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

-- 促销码表
CREATE TABLE "promo_code" (
  "id" SERIAL PRIMARY KEY,
  "code" VARCHAR(50) UNIQUE NOT NULL,
  "description" TEXT,
  "discount_type" TEXT NOT NULL CHECK ("discount_type" IN ('PERCENTAGE', 'FIXED_AMOUNT')),
  "discount_value" DECIMAL(10, 2) NOT NULL,
  "max_uses" INT,
  "current_uses" INT DEFAULT 0,
  "start_date" TIMESTAMP NOT NULL,
  "end_date" TIMESTAMP,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 联系表（用于存储联系表单提交）
CREATE TABLE "contact" (
  "id" SERIAL PRIMARY KEY,
  "type" TEXT NOT NULL CHECK ("type" IN ('GENERAL', 'ENTERPRISE')), -- 区分一般查询和企业查询
  "email" VARCHAR(255) NOT NULL,
  "message" TEXT, -- 用于一般查询的消息
  -- 企业查询特有字段
  "first_name" VARCHAR(255),
  "last_name" VARCHAR(255),
  "company_name" VARCHAR(255),
  "role" VARCHAR(255), -- 例如：'Executive', 'Manager', 等
  "purchase_timeline" VARCHAR(255), -- 例如：'immediately', 'Within this month', 等
  "user_quantity" VARCHAR(50), -- 例如：'1-5', '6-10', 等
  "status" TEXT NOT NULL CHECK ("status" IN ('NEW', 'IN_PROGRESS', 'COMPLETED', 'SPAM')) DEFAULT 'NEW',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support Contact Reply Table (integrates with existing contact table)
CREATE TABLE "contact_reply" (
  "id" SERIAL PRIMARY KEY,
  "contact_id" INT NOT NULL REFERENCES "contact"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "attachment_urls" TEXT[] DEFAULT '{}',
  -- Sender can be either admin or the original contact person
  "admin_id" INT REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "is_from_contact" BOOLEAN DEFAULT FALSE, -- TRUE if reply is from original contact person
  "is_internal_note" BOOLEAN DEFAULT FALSE, -- For admin-only notes
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_contact_reply_contact_id ON "contact_reply"("contact_id");
CREATE INDEX idx_contact_reply_admin_id ON "contact_reply"("admin_id");
CREATE INDEX idx_contact_reply_created_at ON "contact_reply"("created_at");

-- 管理员表 - 存储系统管理员信息
CREATE TABLE "admin_user" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(255) UNIQUE NOT NULL,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "full_name" VARCHAR(255),
  "avatar_url" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT TRUE,
  "last_login" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理员权限表 - 定义系统中的各种权限
CREATE TABLE "admin_permission" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) UNIQUE NOT NULL,
  "description" TEXT,
  "category" TEXT
);

-- 管理员角色权限关联表 - 将每个管理员与权限关联
CREATE TABLE "admin_role_permission" (
  "id" SERIAL PRIMARY KEY,
  "admin_id" INT NOT NULL REFERENCES "admin_user"("id") ON DELETE CASCADE,
  "permission_id" INT NOT NULL REFERENCES "admin_permission"("id") ON DELETE CASCADE,
  "is_active" BOOLEAN DEFAULT TRUE,
  UNIQUE ("admin_id", "permission_id")
);


-- 创建索引提升查询性能
CREATE INDEX idx_admin_role_permission_admin_id ON "admin_role_permission"("admin_id");
CREATE INDEX idx_admin_role_permission_permission_id ON "admin_role_permission"("permission_id");


-- 管理员会话表 - 跟踪管理员登录会话
CREATE TABLE "admin_session" (
  "id" SERIAL PRIMARY KEY,
  "admin_id" INT NOT NULL REFERENCES "admin_user"("id") ON DELETE CASCADE,
  "token" VARCHAR(255) UNIQUE NOT NULL,
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理员活动日志表 - 记录管理员的所有操作
CREATE TABLE "admin_activity_log" (
  "id" SERIAL PRIMARY KEY,
  "admin_id" INT NOT NULL REFERENCES "admin_user"("id") ON DELETE CASCADE,
  "action" VARCHAR(255) NOT NULL, -- 例如: 'login', 'logout', 'create_user', 'update_subscription'
  "entity_type" VARCHAR(50), -- 例如: 'user', 'subscription', 'team'
  "entity_id" VARCHAR(255), -- 被操作实体的ID
  "details" JSONB, -- 操作的详细信息
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 系统设置表 - 存储全局系统配置
CREATE TABLE "system_settings" (
  "id" SERIAL PRIMARY KEY,
  "key" VARCHAR(255) UNIQUE NOT NULL,
  "value" TEXT,
  "description" TEXT,
  "is_public" BOOLEAN DEFAULT FALSE, -- 是否可以公开给前端
  "updated_by" INT REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 管理员通知表 - 存储发送给管理员的通知
CREATE TABLE "admin_notification" (
  "id" SERIAL PRIMARY KEY,
  "admin_id" INT NOT NULL REFERENCES "admin_user"("id") ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "type" VARCHAR(50) NOT NULL CHECK ("type" IN ('INFO', 'WARNING', 'ERROR', 'SUCCESS')),
  "is_read" BOOLEAN DEFAULT FALSE,
  "link" VARCHAR(255), -- 可选的通知相关链接
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 团队自定义字段值索引
CREATE INDEX idx_team_custom_field_value_field ON "team_custom_field_value"("team_custom_field_id");

-- 团队自定义字段索引
CREATE INDEX idx_team_custom_field_team ON "team_custom_field"("team_id");
CREATE INDEX idx_team_custom_field_field ON "team_custom_field"("custom_field_id");

-- 用户索引
CREATE INDEX idx_user_email ON "user"("email");

-- 时间记录索引
CREATE INDEX idx_time_entry_task_id ON "time_entry"("task_id");
CREATE INDEX idx_time_entry_user_id ON "time_entry"("user_id");

-- 通知索引
CREATE INDEX idx_notification_user_id ON "notification"("user_id");
CREATE INDEX idx_notification_read ON "notification"("is_read");
CREATE INDEX idx_notification_created_at ON "notification"("created_at"); 

-- 聊天索引
CREATE INDEX idx_chat_message_session ON "chat_message"("session_id");
CREATE INDEX idx_chat_message_created ON "chat_message"("created_at");
CREATE INDEX idx_chat_participant_user ON "chat_participant"("user_id");
CREATE INDEX idx_chat_session_team ON "chat_session"("team_id");

-- 为操作日志表创建索引
CREATE INDEX idx_action_log_user ON "action_log"("user_id");
CREATE INDEX idx_action_log_entity ON "action_log"("entity_type", "entity_id");
CREATE INDEX idx_action_log_created ON "action_log"("created_at");

-- 为邀请表创建索引
CREATE INDEX idx_team_invitation_email ON "user_team_invitation"("user_email");
CREATE INDEX idx_team_invitation_team ON "user_team_invitation"("team_id");
CREATE INDEX idx_team_invitation_status ON "user_team_invitation"("status");

-- 为订阅相关表创建索引
CREATE INDEX idx_user_subscription_plan_user_id ON "user_subscription_plan"("user_id");
CREATE INDEX idx_user_subscription_plan_plan_id ON "user_subscription_plan"("plan_id");
CREATE INDEX idx_subscription_plan_type ON "subscription_plan"("type");
CREATE INDEX idx_user_subscription_user ON "user_subscription_plan"("user_id");
CREATE INDEX idx_user_subscription_status ON "user_subscription_plan"("status");

CREATE INDEX idx_promo_code_code ON "promo_code"("code");
CREATE INDEX idx_promo_code_active ON "promo_code"("is_active");

-- 联系表索引
CREATE INDEX idx_contact_type ON "contact"("type");
CREATE INDEX idx_contact_email ON "contact"("email");
CREATE INDEX idx_contact_status ON "contact"("status");
CREATE INDEX idx_contact_created_at ON "contact"("created_at");

-- 管理员表索引
CREATE INDEX idx_admin_user_email ON "admin_user"("email");

-- 管理员会话表索引
CREATE INDEX idx_admin_session_admin ON "admin_session"("admin_id");
CREATE INDEX idx_admin_session_expires ON "admin_session"("expires_at");

-- 管理员活动日志表索引
CREATE INDEX idx_admin_activity_log_admin ON "admin_activity_log"("admin_id");
CREATE INDEX idx_admin_activity_log_action ON "admin_activity_log"("action");
CREATE INDEX idx_admin_activity_log_created ON "admin_activity_log"("created_at");

-- 管理员通知表索引
CREATE INDEX idx_admin_notification_admin ON "admin_notification"("admin_id");
CREATE INDEX idx_admin_notification_read ON "admin_notification"("is_read");

-- 落地页章节表
CREATE TABLE "landing_page_section" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "sort_order" INT NOT NULL DEFAULT 0
);

-- 落地页内容表
CREATE TABLE "landing_page_content" (
  "id" SERIAL PRIMARY KEY,
  "section_id" INT NOT NULL REFERENCES "landing_page_section"("id") ON DELETE CASCADE,
  "type" VARCHAR(50) NOT NULL CHECK ("type" IN ('h1', 'h2', 'span', 'video', 'image', 'solution_card')),
  "content" TEXT NOT NULL, -- 文本内容或媒体URL
  "sort_order" INT NOT NULL DEFAULT 0
);

-- 创建存储桶策略，允许公开访问媒体文件
-- 注意：这需要在 Supabase Dashboard 中手动创建存储桶 'landing-page-media'
-- 并配置以下策略：
/*
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-page-media');
*/

-- 落地页相关索引
CREATE INDEX idx_landing_page_section_sort ON "landing_page_section"("sort_order");
CREATE INDEX idx_landing_page_content_section ON "landing_page_content"("section_id");
CREATE INDEX idx_landing_page_content_sort ON "landing_page_content"("sort_order");

-- Payment table for Stripe integration
CREATE TABLE "payment" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "amount" DECIMAL(10, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "payment_method" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('PENDING', 'COMPLETED', 'FAILED')),
  "transaction_id" VARCHAR(255),
  "discount_amount" DECIMAL(10, 2) DEFAULT 0,
  "discount_percentage" DECIMAL(5, 2) DEFAULT 0,
  "applied_promo_code" VARCHAR(50),
  "stripe_payment_id" VARCHAR(255),
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- For better performance when querying payment by user
CREATE INDEX idx_payment_user_id ON "payment"("user_id");

CREATE TABLE task_links (
    id SERIAL PRIMARY KEY,  -- 自增主键
    source_task_id INT NOT NULL,
    target_task_id INT NOT NULL,
    link_type INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_task_id) REFERENCES task(id) ON DELETE CASCADE,
    FOREIGN KEY (target_task_id) REFERENCES task(id) ON DELETE CASCADE
);