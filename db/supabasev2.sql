-- 用户表
CREATE TABLE "user" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "phone" VARCHAR(20) UNIQUE,
  "avatar_url" VARCHAR(255),
  "language" VARCHAR(10) DEFAULT 'en',
  "theme" VARCHAR(50) CHECK ("theme" IN ('light', 'dark', 'system')) DEFAULT 'system',
  "provider" VARCHAR(50) CHECK ("provider" IN ('local', 'google', 'github')) DEFAULT 'local',
  "provider_id" VARCHAR(255) UNIQUE, -- 绑定 OAuth 的唯一 ID（如 Google/GitHub UID）
  "mfa_secret" VARCHAR(255), -- TOTP 秘钥
  "is_mfa_enabled" BOOLEAN DEFAULT FALSE,
  "notifications_enabled" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "email_verified" BOOLEAN DEFAULT FALSE,
  "verification_token" VARCHAR(255),
  "verification_token_expires" TIMESTAMP,
  "last_seen_at" TIMESTAMP,
  "is_online" BOOLEAN DEFAULT FALSE
);

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
  "star" BOOL DEFAULT FALSE
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
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务表
CREATE TABLE "task" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL CHECK ("status" IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE')) DEFAULT 'TODO',
  "priority" TEXT NOT NULL CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) DEFAULT 'MEDIUM',
  "due_date" TIMESTAMP,
  "section_id" INT REFERENCES "section"("id") ON DELETE CASCADE,
  "assignee_ids" UUID[] DEFAULT '{}',
  "tag_values" JSONB DEFAULT '{}',
  "attachment_ids" INT[] DEFAULT '{}', -- 存储附件ID数组
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 标签表
CREATE TABLE "tag" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL CHECK ("type" IN ('NAME','ASIGNEE', 'DUE-DATE', 'PRIORITY', 'STATUS', 'SINGLE-SELECT', 'MULTI-SELECT', 'DATE', 'PEOPLE', 'TEXT', 'NUMBER', 'FORMULA', 'ID', 'TIME-TRACKING', 'PROJECTS', 'TAGS', 'COMPLETED-ON', 'LAST-MODIFIED-ON', 'CREATED-ON', 'CREATED-BY')),
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
  "type" TEXT NOT NULL CHECK ("type" IN ('LIST', 'OVERVIEW', 'TIMELINE', 'DASHBOARD', 'NOTE', 'GANTT', 'CALENDAR', 'BOARD', 'FILES')),
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
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- 订阅计划表
CREATE TABLE "subscription_plan" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(50) NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('FREE', 'PRO', 'ENTERPRISE')),
  "price" DECIMAL(10, 2) NOT NULL,
  "billing_interval" TEXT NOT NULL CHECK ("billing_interval" IN ('MONTHLY', 'YEARLY')),
  "description" TEXT,
  "features" JSONB NOT NULL, -- 存储计划包含的功能列表
  "max_members" INT NOT NULL, -- 最大团队成员数
  "max_projects" INT NOT NULL, -- 最大项目数
  "storage_limit" BIGINT NOT NULL, -- 存储限制（字节）
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 团队订阅表
CREATE TABLE "team_subscription" (
  "id" SERIAL PRIMARY KEY,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "plan_id" INT NOT NULL REFERENCES "subscription_plan"("id"),
  "status" TEXT NOT NULL CHECK ("status" IN ('ACTIVE', 'CANCELED', 'EXPIRED')),
  "start_date" TIMESTAMP NOT NULL,
  "end_date" TIMESTAMP NOT NULL,
  "cancel_at_period_end" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订阅付款历史表
CREATE TABLE "subscription_payment" (
  "id" SERIAL PRIMARY KEY,
  "team_subscription_id" INT NOT NULL REFERENCES "team_subscription"("id") ON DELETE CASCADE,
  "amount" DECIMAL(10, 2) NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
  "payment_method" TEXT NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('PENDING', 'COMPLETED', 'FAILED')),
  "transaction_id" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  "current_users" INT DEFAULT 0,
  "current_projects" INT DEFAULT 0,
  "current_ai_agents" INT DEFAULT 0,
  "current_automation_flows" INT DEFAULT 0,
  "current_tasks_this_month" INT DEFAULT 0,
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

-- 为订阅相关表创建索引
CREATE INDEX idx_subscription_plan_type ON "subscription_plan"("type");
CREATE INDEX idx_team_subscription_team ON "team_subscription"("team_id");
CREATE INDEX idx_team_subscription_status ON "team_subscription"("status");
CREATE INDEX idx_subscription_payment_subscription ON "subscription_payment"("team_subscription_id");

-- 为邀请表创建索引
CREATE INDEX idx_team_invitation_email ON "user_team_invitation"("user_email");
CREATE INDEX idx_team_invitation_team ON "user_team_invitation"("team_id");
CREATE INDEX idx_team_invitation_status ON "user_team_invitation"("status");

-- 索引
CREATE INDEX idx_user_subscription_user ON "user_subscription_plan"("user_id");
CREATE INDEX idx_user_subscription_status ON "user_subscription_plan"("status");
CREATE INDEX idx_promo_code_code ON "promo_code"("code");
CREATE INDEX idx_promo_code_active ON "promo_code"("is_active");

-- 联系表索引
CREATE INDEX idx_contact_type ON "contact"("type");
CREATE INDEX idx_contact_email ON "contact"("email");
CREATE INDEX idx_contact_status ON "contact"("status");
CREATE INDEX idx_contact_created_at ON "contact"("created_at");