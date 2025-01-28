-- 用户表
CREATE TABLE "user" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) UNIQUE NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "avatar_url" VARCHAR(255),
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 团队表
CREATE TABLE "team" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "created_by" INT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户与团队的关系表（多对多）
CREATE TABLE "user_team" (
  "user_id" INT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('ADMIN', 'MEMBER')) DEFAULT 'MEMBER',
  PRIMARY KEY ("user_id", "team_id")
);

-- 项目表
CREATE TABLE "project" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "created_by" INT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
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
  "assignee_id" INT REFERENCES "user"("id") ON DELETE SET NULL,
  "created_by" INT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 子任务表
CREATE TABLE "subtask" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "status" TEXT NOT NULL CHECK ("status" IN ('TODO', 'IN_PROGRESS', 'DONE')) DEFAULT 'TODO',
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "created_by" INT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务评论表
CREATE TABLE "comment" (
  "id" SERIAL PRIMARY KEY,
  "text" TEXT NOT NULL,
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "user_id" INT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 任务附件表
CREATE TABLE "attachment" (
  "id" SERIAL PRIMARY KEY,
  "file_url" VARCHAR(255) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "uploaded_by" INT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
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
  "user_id" INT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
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
  "created_by" INT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引优化
CREATE INDEX idx_user_email ON "user"("email");
CREATE INDEX idx_task_project_id ON "task"("project_id");
CREATE INDEX idx_task_assignee_id ON "task"("assignee_id");
CREATE INDEX idx_time_entry_task_id ON "time_entry"("task_id");
CREATE INDEX idx_time_entry_user_id ON "time_entry"("user_id");