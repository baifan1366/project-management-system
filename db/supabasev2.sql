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
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户与团队的关系表（多对多）
CREATE TABLE "user_team" (
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('ADMIN', 'MEMBER')) DEFAULT 'MEMBER',
  PRIMARY KEY ("user_id", "team_id")
);

-- 项目表
CREATE TABLE "project" (
  "id" SERIAL PRIMARY KEY,
  "project_name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "visibility" VARCHAR(20) NOT NULL,
  "theme_color" VARCHAR(20) DEFAULT 'white',
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
  "project_id" INT NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
  "assignee_id" UUID REFERENCES "user"("id") ON DELETE SET NULL,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 子任务表
CREATE TABLE "subtask" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('TODO', 'IN_PROGRESS', 'DONE')) DEFAULT 'TODO',
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
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

-- 自定义字段表
CREATE TABLE "custom_field" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "type" TEXT NOT NULL CHECK ("type" IN ('TEXT', 'NUMBER', 'DATE', 'SELECT')),
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务自定义字段值表
CREATE TABLE "task_custom_field_value" (
  "id" SERIAL PRIMARY KEY,
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "field_id" INT NOT NULL REFERENCES "custom_field"("id") ON DELETE CASCADE,
  "value" TEXT,
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