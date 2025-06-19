-- user table
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
  "github_refresh_token" VARCHAR(2048),
  "stripe_customer_id" VARCHAR(255),
  "default_payment_method_id" VARCHAR(255),
  "auto_renew_enabled" BOOLEAN DEFAULT FALSE
);

-- Create a user_heartbeats table to track user activity
CREATE TABLE IF NOT EXISTS "user_heartbeats" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "last_heartbeat" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- default field table
CREATE TABLE "default" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "qty" INT NOT NULL,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "edited_by" UUID NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- project table
CREATE TABLE "project" (
  "id" SERIAL PRIMARY KEY,
  "project_name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "visibility" VARCHAR(20) NOT NULL,
  "theme_color" VARCHAR(20) DEFAULT 'white',
  "archived" BOOL DEFAULT FALSE,
  "status" TEXT NOT NULL CHECK ("status" IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD')) DEFAULT 'PENDING',
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- team table
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
  "archive" BOOL DEFAULT FALSE,
  "label" JSONB DEFAULT '{"TAGS": [""], "MULTI-SELECT": [""], "SINGLE-SELECT": [""]}'
);

-- user and team relationship table (many-to-many)
CREATE TABLE "user_team" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('CAN_EDIT', 'CAN_CHECK', 'CAN_VIEW', 'OWNER')) DEFAULT 'CAN_VIEW',
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- team invitation table
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

-- project section table
CREATE TABLE "section" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE, 
  "task_ids" INT[] DEFAULT '{}',
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "order_index" INT DEFAULT 0
);

-- Create the notion_page table for storing knowledge base pages
CREATE TABLE IF NOT EXISTS "notion_page" (
  "id" SERIAL PRIMARY KEY,
  "parent_id" INT REFERENCES "notion_page"("id") ON DELETE CASCADE, -- For hierarchical structure
  "icon" VARCHAR(255), -- Emoji or URL for page icon
  "cover_image" VARCHAR(255), -- URL for cover image
  "is_archived" BOOLEAN DEFAULT FALSE,
  "order_index" INT DEFAULT 0, -- For ordering pages in the same level
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "last_edited_by" UUID REFERENCES "user"("id") ON DELETE SET NULL
);

-- Table for page favorites/bookmarks
CREATE TABLE IF NOT EXISTS "notion_page_favorite" (
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "page_id" INT NOT NULL REFERENCES "notion_page"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_id", "page_id")
);

CREATE TABLE "team_agile" (
  "id" SERIAL PRIMARY KEY,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "start_date" TIMESTAMP NOT NULL,
  "duration" INT DEFAULT 2,
  "goal" TEXT,
  "task_ids" JSONB DEFAULT '{}',
  "status" TEXT NOT NULL CHECK ("status" IN ('PLANNING', 'PENDING', 'RETROSPECTIVE')) DEFAULT 'PENDING',
  "whatWentWell" JSONB,
  "toImprove" JSONB,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "agile_role" (
  "id" SERIAL PRIMARY KEY,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "agile_member" (
  "id" SERIAL PRIMARY KEY,
  "agile_id" INT NOT NULL REFERENCES "team_agile"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role_id" INT NOT NULL REFERENCES "agile_role"("id") ON DELETE CASCADE,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- task table
CREATE TABLE "task" (
  "id" SERIAL PRIMARY KEY,
  "tag_values" JSONB DEFAULT '{}',
  "attachment_ids" INT[] DEFAULT '{}', -- 存储附件ID数组
  "likes" UUID[] DEFAULT '{}',
  "page_id" INT NULL REFERENCES "notion_page"("id") ON DELETE CASCADE,
  "agile_id" INT NULL REFERENCES "team_agile"("id") ON DELETE CASCADE,
  "agile_status" TEXT NULL CHECK ("agile_status" IN ('TODO', 'IN_PROGRESS', 'DONE')) DEFAULT 'TODO',
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tag table
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

-- custom field template table
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

-- team and custom field association table (many-to-many)
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

-- task custom field value table
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
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- task comment table
CREATE TABLE "comment" (
  "id" SERIAL PRIMARY KEY,
  "text" TEXT NOT NULL,
  "post_id" INT NOT NULL REFERENCES "team_post"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- task attachment table
CREATE TABLE "attachment" (
  "id" SERIAL PRIMARY KEY,
  "file_url" VARCHAR(255) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "task_id" INT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "uploaded_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "file_path" VARCHAR(255) DEFAULT '/',
  "file_type" VARCHAR(100),
  "size" BIGINT
);

-- Create file_folders table for folder structure
CREATE TABLE IF NOT EXISTS "file_folders" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "parent_path" VARCHAR(255) NOT NULL DEFAULT '/',
  "full_path" VARCHAR(255) NOT NULL,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- personal calendar event table
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

-- notification table
CREATE TABLE "notification" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "type" VARCHAR(50) NOT NULL CHECK ("type" IN ('TASK_ASSIGNED', 'COMMENT_ADDED', 'MENTION', 'DUE_DATE', 'TEAM_INVITATION', 'SYSTEM', 'TEAM_ANNOUNCEMENT')),
  "related_entity_type" VARCHAR(50), -- 例如：'task', 'project', 'team', 'comment'
  "related_entity_id" VARCHAR(255), -- 相关实体的ID
  "data" JSONB,
  "link" VARCHAR(255),
  "is_read" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- chat session table (for managing private and group chat sessions)
CREATE TABLE "chat_session" (
  "id" SERIAL PRIMARY KEY,
  "type" TEXT NOT NULL CHECK ("type" IN ('PRIVATE', 'GROUP', 'AI')),
  "name" VARCHAR(255),
  "team_id" INT REFERENCES "team"("id") ON DELETE CASCADE,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- chat participant table
CREATE TABLE "chat_participant" (
  "session_id" INT NOT NULL REFERENCES "chat_session"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "joined_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "role" TEXT CHECK ("role" IN ('ADMIN', 'MEMBER')) DEFAULT 'MEMBER',
  PRIMARY KEY ("session_id", "user_id")
);

-- chat message table
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

-- chat message read status table
CREATE TABLE "chat_message_read_status" (
  "message_id" INT NOT NULL REFERENCES "chat_message"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "read_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("message_id", "user_id")
);

-- AI chat history table
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


-- chat attachment table
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

-- action log table
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

-- subscription plan table
CREATE TABLE "subscription_plan" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(50) NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('FREE', 'PRO', 'ENTERPRISE')),
  "price" DECIMAL(10, 2) NOT NULL,
  "billing_interval" TEXT CHECK ("billing_interval" IN ('MONTHLY', 'YEARLY') OR "billing_interval" IS NULL),
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

-- user subscription plan table
CREATE TABLE "user_subscription_plan" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "plan_id" INT NOT NULL REFERENCES "subscription_plan"("id"),
  "status" TEXT NULL,
  "start_date" TIMESTAMP NOT NULL,
  "end_date" TIMESTAMP,
  "auto_renew" BOOLEAN DEFAULT FALSE,
  "renewal_reminder_sent" BOOLEAN DEFAULT FALSE,
  "last_renewal_attempt" TIMESTAMP,
  "renewal_failure_count" INT DEFAULT 0,
  "payment_method_id" VARCHAR(255),
  -- 使用统计
  "current_projects" INT DEFAULT 0 NULL,
  "current_teams" INT DEFAULT 0 NULL,
  "current_members" INT DEFAULT 0 NULL,
  "current_ai_chat" INT DEFAULT 0 NULL,
  "current_ai_task" INT DEFAULT 0 NULL,
  "current_ai_workflow" INT DEFAULT 0 NULL,
  "current_storage" INT DEFAULT 0 NULL,
  -- 时间戳
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- promo code table
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

-- contact table (for storing contact form submissions)
CREATE TABLE "contact" (
  "id" SERIAL PRIMARY KEY,
  "type" TEXT NOT NULL CHECK ("type" IN ('GENERAL', 'ENTERPRISE', 'REFUND')), -- Contact form types
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

-- admin table - store system admin information
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

-- Payment table for Stripe integration
CREATE TABLE "payment" (
  "id" SERIAL PRIMARY KEY,
  "order_id" UUID NOT NULL UNIQUE,
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
  "is_processed" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store user payment methods for automatic renewal
CREATE TABLE "payment_methods" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "stripe_payment_method_id" VARCHAR(255) NOT NULL,
  "card_last4" VARCHAR(4),
  "card_brand" VARCHAR(50),
  "card_exp_month" INT,
  "card_exp_year" INT,
  "is_default" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- refund request table
CREATE TABLE "refund_request" (
  "id" SERIAL PRIMARY KEY,
  "contact_id" INT NOT NULL REFERENCES "contact"("id") ON DELETE CASCADE,
  "payment_id" INT NOT NULL REFERENCES "payment"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "current_subscription_id" INT NOT NULL REFERENCES "user_subscription_plan"("id") ON DELETE CASCADE,
  "first_name" VARCHAR(255) NOT NULL,
  "last_name" VARCHAR(255) NOT NULL,
  "reason" VARCHAR(255) NOT NULL,
  "details" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  "processed_by" INT REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "processed_at" TIMESTAMP,
  "refund_amount" DECIMAL(10, 2),
  "notes" TEXT,
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

-- admin permission table - define various permissions in the system
CREATE TABLE "admin_permission" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) UNIQUE NOT NULL,
  "description" TEXT,
  "category" TEXT
);

-- admin role permission association table - associate each admin with permissions
CREATE TABLE "admin_role_permission" (
  "id" SERIAL PRIMARY KEY,
  "admin_id" INT NOT NULL REFERENCES "admin_user"("id") ON DELETE CASCADE,
  "permission_id" INT NOT NULL REFERENCES "admin_permission"("id") ON DELETE CASCADE,
  "is_active" BOOLEAN DEFAULT TRUE,
  UNIQUE ("admin_id", "permission_id")
);

-- admin session table - track admin login sessions
CREATE TABLE "admin_session" (
  "id" SERIAL PRIMARY KEY,
  "admin_id" INT NOT NULL REFERENCES "admin_user"("id") ON DELETE CASCADE,
  "token" VARCHAR(255) UNIQUE NOT NULL,
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- admin activity log table - record all admin operations
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

-- system settings table - store global system configurations
CREATE TABLE "system_settings" (
  "id" SERIAL PRIMARY KEY,
  "key" VARCHAR(255) UNIQUE NOT NULL,
  "value" TEXT,
  "description" TEXT,
  "is_public" BOOLEAN DEFAULT FALSE, -- whether it can be publicly accessed by the frontend
  "updated_by" INT REFERENCES "admin_user"("id") ON DELETE SET NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- admin notification table - store notifications sent to admins
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

-- landing page section table
CREATE TABLE "landing_page_section" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "sort_order" INT NOT NULL DEFAULT 0
);

-- landing page content table
CREATE TABLE "landing_page_content" (
  "id" SERIAL PRIMARY KEY,
  "section_id" INT NOT NULL REFERENCES "landing_page_section"("id") ON DELETE CASCADE,
  "type" VARCHAR(50) NOT NULL CHECK ("type" IN ('h1', 'h2', 'span', 'video', 'image', 'solution_card')),
  "content" TEXT NOT NULL, -- text content or media URL
  "sort_order" INT NOT NULL DEFAULT 0
);

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

-- Create mytasks table for user's personal task tracking
CREATE TABLE "mytasks" (
  "id" SERIAL PRIMARY KEY,
  "task_id" INT REFERENCES "task"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL CHECK ("status" IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE')) DEFAULT 'TODO',
  "priority" TEXT CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) DEFAULT 'MEDIUM',
  "expected_completion_date" TIMESTAMP,
  "expected_start_time" TIMESTAMP,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- create bucket policy to allow public access to media files
-- note: this needs to be manually created in the Supabase Dashboard
-- and configured with the following policy:
/*
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-page-media');
*/

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

-- Create a function to recursively delete folders
CREATE OR REPLACE FUNCTION delete_folder_cascade()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete all child folders
    DELETE FROM file_folders 
    WHERE parent_path LIKE OLD.full_path || '%';
    
    -- Update attachments to move them to the parent folder
    UPDATE attachment
    SET file_path = OLD.parent_path
    WHERE file_path = OLD.full_path;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to handle folder deletion
CREATE TRIGGER before_delete_folder
BEFORE DELETE ON file_folders
FOR EACH ROW
EXECUTE FUNCTION delete_folder_cascade(); 

-- Create a function to update the user's online status
CREATE OR REPLACE FUNCTION update_user_online_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's online status and last_seen_at in the user table
  UPDATE "user"
  SET is_online = TRUE, last_seen_at = NEW.last_heartbeat
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update user status when heartbeat is updated
DROP TRIGGER IF EXISTS update_user_status_on_heartbeat ON "user_heartbeats";
CREATE TRIGGER update_user_status_on_heartbeat
AFTER INSERT OR UPDATE ON "user_heartbeats"
FOR EACH ROW
EXECUTE FUNCTION update_user_online_status();

-- Create a function to check for inactive users and set them offline
CREATE OR REPLACE FUNCTION check_inactive_users()
RETURNS void AS $$
DECLARE
  inactive_threshold INTERVAL := '2 minutes'; -- Configure this based on your needs
BEGIN
  -- Update users to offline if their last heartbeat is older than the threshold
  UPDATE "user" u
  SET is_online = FALSE
  FROM "user_heartbeats" h
  WHERE u.id = h.user_id
    AND u.is_online = TRUE
    AND h.last_heartbeat < (NOW() - inactive_threshold);
END;
$$ LANGUAGE plpgsql; 

-- Add a notification type for mentions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_type 
    WHERE typname = 'notification_type_enum' 
    AND typtype = 'e'
    AND 'MENTION' = ANY(enum_range(NULL::notification_type_enum)::text[])
  ) THEN
    ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'MENTION';
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Type MENTION already exists in notification_type_enum';
END $$;

-- Create a comment on the mentions column to document its structure
COMMENT ON COLUMN chat_message.mentions IS 
'Stores mention data in the format:
[
  {
    "type": "user|project|task",
    "id": "uuid",
    "name": "string",
    "startIndex": integer,
    "endIndex": integer,
    "projectName": "string" (only for tasks)
  }
]'; 

-- Create an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_heartbeats_user_id ON "user_heartbeats" (user_id);

-- add index to improve query performance
CREATE INDEX IF NOT EXISTS idx_user_google_provider_id ON "user" (google_provider_id) WHERE google_provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_github_provider_id ON "user" (github_provider_id) WHERE github_provider_id IS NOT NULL;

-- team custom field value index
CREATE INDEX idx_team_custom_field_value_field ON "team_custom_field_value"("team_custom_field_id");

-- team custom field index
CREATE INDEX idx_team_custom_field_team ON "team_custom_field"("team_id");
CREATE INDEX idx_team_custom_field_field ON "team_custom_field"("custom_field_id");

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notion_page_parent ON "notion_page"("parent_id");
CREATE INDEX IF NOT EXISTS idx_notion_page_created_by ON "notion_page"("created_by");

-- Create indexes for better performance
CREATE INDEX idx_team_post_team_id ON "team_post"("team_id");
CREATE INDEX idx_team_post_attachment_id ON "team_post"("attachment_id");
CREATE INDEX idx_team_post_created_by ON "team_post"("created_by");
CREATE INDEX idx_team_post_created_at ON "team_post"("created_at");
CREATE INDEX idx_team_post_is_pinned ON "team_post"("is_pinned");
CREATE INDEX idx_team_post_reactions ON "team_post" USING GIN("reactions");

CREATE INDEX IF NOT EXISTS chat_message_mentions_idx ON chat_message USING GIN (mentions);

-- create personal calendar event index
CREATE INDEX idx_personal_calendar_event_user ON "personal_calendar_event"("user_id");
CREATE INDEX idx_personal_calendar_event_time ON "personal_calendar_event"("start_time", "end_time");

-- user index
CREATE INDEX idx_user_email ON "user"("email");

-- AI chat history index
CREATE INDEX idx_ai_chat_message_user ON "ai_chat_message"("user_id");
CREATE INDEX idx_ai_chat_message_conversation ON "ai_chat_message"("conversation_id");
CREATE INDEX idx_ai_chat_message_timestamp ON "ai_chat_message"("timestamp");

-- notification index
CREATE INDEX idx_notification_user_id ON "notification"("user_id");
CREATE INDEX idx_notification_read ON "notification"("is_read");
CREATE INDEX idx_notification_created_at ON "notification"("created_at"); 

-- chat index
CREATE INDEX idx_chat_message_session ON "chat_message"("session_id");
CREATE INDEX idx_chat_message_created ON "chat_message"("created_at");
CREATE INDEX idx_chat_participant_user ON "chat_participant"("user_id");
CREATE INDEX idx_chat_session_team ON "chat_session"("team_id");

-- create index for action log table
CREATE INDEX idx_action_log_user ON "action_log"("user_id");
CREATE INDEX idx_action_log_entity ON "action_log"("entity_type", "entity_id");
CREATE INDEX idx_action_log_created ON "action_log"("created_at");

-- create index for team invitation table
CREATE INDEX idx_team_invitation_email ON "user_team_invitation"("user_email");
CREATE INDEX idx_team_invitation_team ON "user_team_invitation"("team_id");
CREATE INDEX idx_team_invitation_status ON "user_team_invitation"("status");

-- create index for user subscription plan table
CREATE INDEX idx_user_subscription_plan_user_id ON "user_subscription_plan"("user_id");
CREATE INDEX idx_user_subscription_plan_plan_id ON "user_subscription_plan"("plan_id");
CREATE INDEX idx_subscription_plan_type ON "subscription_plan"("type");
CREATE INDEX idx_user_subscription_user ON "user_subscription_plan"("user_id");
CREATE INDEX idx_user_subscription_status ON "user_subscription_plan"("status");

CREATE INDEX idx_promo_code_code ON "promo_code"("code");
CREATE INDEX idx_promo_code_active ON "promo_code"("is_active");

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows (created_by);
CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows (type);
CREATE INDEX IF NOT EXISTS idx_workflows_is_public ON workflows (is_public);
CREATE INDEX IF NOT EXISTS idx_workflows_is_deleted ON workflows (is_deleted);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions (workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions (user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions (status);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_folders_task_id ON "file_folders"("task_id");
CREATE INDEX IF NOT EXISTS idx_file_folders_parent_path ON "file_folders"("parent_path");
CREATE INDEX IF NOT EXISTS idx_attachment_file_path ON "attachment"("file_path");

-- Create indexes for refund_request
CREATE INDEX idx_refund_request_user_id ON "refund_request"("user_id");
CREATE INDEX idx_refund_request_contact_id ON "refund_request"("contact_id");
CREATE INDEX idx_refund_request_current_subscription ON "refund_request"("current_subscription_id");
CREATE INDEX idx_refund_request_status ON "refund_request"("status");
CREATE INDEX idx_refund_request_created_at ON "refund_request"("created_at");

-- Create indexes for better performance
CREATE INDEX idx_contact_reply_contact_id ON "contact_reply"("contact_id");
CREATE INDEX idx_contact_reply_admin_id ON "contact_reply"("admin_id");
CREATE INDEX idx_contact_reply_created_at ON "contact_reply"("created_at");

-- create index to improve query performance
CREATE INDEX idx_admin_role_permission_admin_id ON "admin_role_permission"("admin_id");
CREATE INDEX idx_admin_role_permission_permission_id ON "admin_role_permission"("permission_id");

-- Create an index on the mentions column for better query performance
CREATE INDEX IF NOT EXISTS chat_message_mentions_idx ON chat_message USING GIN (mentions);

-- create index for contact table
CREATE INDEX idx_contact_type ON "contact"("type");
CREATE INDEX idx_contact_email ON "contact"("email");
CREATE INDEX idx_contact_status ON "contact"("status");
CREATE INDEX idx_contact_created_at ON "contact"("created_at");

-- create index for admin user table
CREATE INDEX idx_admin_user_email ON "admin_user"("email");

-- create index for admin session table
CREATE INDEX idx_admin_session_admin ON "admin_session"("admin_id");
CREATE INDEX idx_admin_session_expires ON "admin_session"("expires_at");

-- create index for admin activity log table
CREATE INDEX idx_admin_activity_log_admin ON "admin_activity_log"("admin_id");
CREATE INDEX idx_admin_activity_log_action ON "admin_activity_log"("action");
CREATE INDEX idx_admin_activity_log_created ON "admin_activity_log"("created_at");

-- create index for admin notification table
CREATE INDEX idx_admin_notification_admin ON "admin_notification"("admin_id");
CREATE INDEX idx_admin_notification_read ON "admin_notification"("is_read");

-- create index for landing page section table
CREATE INDEX idx_landing_page_section_sort ON "landing_page_section"("sort_order");
CREATE INDEX idx_landing_page_content_section ON "landing_page_content"("section_id");
CREATE INDEX idx_landing_page_content_sort ON "landing_page_content"("sort_order");

-- create index for payment table
CREATE INDEX idx_payment_order_id ON "payment"("order_id");

-- create index for payment table
CREATE INDEX idx_payment_user_id ON "payment"("user_id");

-- create index for mytasks table
CREATE INDEX idx_mytasks_task_id ON "mytasks"("task_id");
CREATE INDEX idx_mytasks_user_id ON "mytasks"("user_id");
CREATE INDEX idx_mytasks_status ON "mytasks"("status");