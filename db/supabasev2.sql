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
  "verification_token_expires" TIMESTAMP
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
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- 任务表
CREATE TABLE "task" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL CHECK ("status" IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE')) DEFAULT 'TODO',
  "priority" TEXT NOT NULL CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) DEFAULT 'MEDIUM',
  "due_date" TIMESTAMP,
  "section_id" INT REFERENCES "section"("id") ON DELETE CASCADE,
  "project_id" INT NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "assignee_id" INT REFERENCES "task_assignee"("id") ON DELETE SET NULL,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务指派表
CREATE TABLE "task_assignee" (
  "id" SERIAL PRIMARY KEY,
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE "section" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "project_id" INT NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE, 
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

-- 标签表
CREATE TABLE "tag" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "color" VARCHAR(50),
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务与标签的关系表（多对多）
CREATE TABLE "task_tag" (
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "tag_id" INT NOT NULL REFERENCES "tag"("id") ON DELETE CASCADE,
  PRIMARY KEY ("task_id", "tag_id")
);

-- 自定义字段模板表
CREATE TABLE "custom_field" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('LIST', 'OVERVIEW', 'TIMELINE', 'DASHBOARD', 'NOTE', 'GANTT', 'CALENDAR', 'BOARD', 'FILES')),
  "description" TEXT,
  "icon" VARCHAR(255),
  "default_config" JSONB, -- 存储字段的默认配置
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 团队与自定义字段的关联表（多对多）
CREATE TABLE "team_custom_field" (
  "id" SERIAL PRIMARY KEY,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "custom_field_id" INT NOT NULL REFERENCES "custom_field"("id") ON DELETE CASCADE,
  "config" JSONB, -- 存储团队特定的字段配置
  "order_index" INT DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_team_custom_field_team ON "team_custom_field"("team_id");
CREATE INDEX idx_team_custom_field_field ON "team_custom_field"("custom_field_id");

-- 任务自定义字段值表
CREATE TABLE "team_custom_field_value" (
  "id" SERIAL PRIMARY KEY,
  "team_custom_field_id" INT NOT NULL REFERENCES "team_custom_field"("id") ON DELETE CASCADE,
  "name" VARCHAR(255), -- 团队自定义的字段名称
  "description" TEXT,  -- 团队自定义的描述
  "icon" VARCHAR(255), -- 团队自定义的图标
  "value" JSONB,      -- 存储其他自定义配置
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_team_custom_field_value_field ON "team_custom_field_value"("team_custom_field_id");

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

-- 任务依赖关系表（用于任务之间的依赖）
CREATE TABLE "task_dependency" (
  "id" SERIAL PRIMARY KEY,
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "depends_on_task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务模板表（用于创建任务模板）
CREATE TABLE "task_template" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL CHECK ("status" IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE')) DEFAULT 'TODO',
  "priority" TEXT NOT NULL CHECK ("priority" IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')) DEFAULT 'MEDIUM',
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX idx_user_email ON "user"("email");
CREATE INDEX idx_task_project_id ON "task"("project_id");
CREATE INDEX idx_task_assignee_id ON "task"("assignee_id");
CREATE INDEX idx_time_entry_task_id ON "time_entry"("task_id");
CREATE INDEX idx_time_entry_user_id ON "time_entry"("user_id");

-- 聊天会话表（用于管理私聊和群聊会话）
CREATE TABLE "chat_session" (
  "id" SERIAL PRIMARY KEY,
  "type" TEXT NOT NULL CHECK ("type" IN ('PRIVATE', 'GROUP')),
  "name" VARCHAR(255),
  "team_id" INT REFERENCES "team"("id") ON DELETE CASCADE,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chk_session_team" CHECK (
    ("type" = 'GROUP' AND "team_id" IS NOT NULL) OR
    ("type" = 'PRIVATE' AND "team_id" IS NULL)
  )
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

-- 聊天附件表
CREATE TABLE "chat_attachment" (
  "id" SERIAL PRIMARY KEY,
  "message_id" INT NOT NULL REFERENCES "chat_message"("id") ON DELETE CASCADE,
  "file_url" VARCHAR(255) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "uploaded_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX idx_chat_message_session ON "chat_message"("session_id");
CREATE INDEX idx_chat_message_created ON "chat_message"("created_at");
CREATE INDEX idx_chat_participant_user ON "chat_participant"("user_id");
CREATE INDEX idx_chat_session_team ON "chat_session"("team_id");

-- 操作日志表
CREATE TABLE "action_log" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID REFERENCES "user"("id") ON DELETE SET NULL,
  "action_type" VARCHAR(50) NOT NULL, -- 例如：'CREATE', 'UPDATE', 'DELETE'
  "entity_type" VARCHAR(50) NOT NULL, -- 例如：'task', 'project', 'team'
  "entity_id" INT NOT NULL,           -- 被操作实体的ID
  "old_values" JSONB,                 -- 修改前的值
  "new_values" JSONB,                 -- 修改后的值
  "ip_address" VARCHAR(45),           -- 支持 IPv6
  "user_agent" TEXT,                  -- 用户浏览器信息
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 为操作日志表创建索引
CREATE INDEX idx_action_log_user ON "action_log"("user_id");
CREATE INDEX idx_action_log_entity ON "action_log"("entity_type", "entity_id");
CREATE INDEX idx_action_log_created ON "action_log"("created_at");

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

-- 为订阅相关表创建索引
CREATE INDEX idx_subscription_plan_type ON "subscription_plan"("type");
CREATE INDEX idx_team_subscription_team ON "team_subscription"("team_id");
CREATE INDEX idx_team_subscription_status ON "team_subscription"("status");
CREATE INDEX idx_subscription_payment_subscription ON "subscription_payment"("team_subscription_id");

-- 插入默认订阅计划数据
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

-- 团队邀请表
CREATE TABLE "user_team_invitation" (
  "id" SERIAL PRIMARY KEY,
  "user_email" VARCHAR(255) NOT NULL,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('CAN_EDIT', 'CAN_CHECK', 'CAN_VIEW')) DEFAULT 'CAN_VIEW',
  "status" TEXT NOT NULL CHECK ("status" IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')) DEFAULT 'PENDING',
  "expires_at" TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 为邀请表创建索引
CREATE INDEX idx_team_invitation_email ON "user_team_invitation"("user_email");
CREATE INDEX idx_team_invitation_team ON "user_team_invitation"("team_id");
CREATE INDEX idx_team_invitation_status ON "user_team_invitation"("status");
