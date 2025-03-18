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

-- 通知索引
CREATE INDEX idx_notification_user_id ON "notification"("user_id");
CREATE INDEX idx_notification_read ON "notification"("is_read");
CREATE INDEX idx_notification_created_at ON "notification"("created_at"); 