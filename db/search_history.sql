-- 添加搜索历史表
CREATE TABLE IF NOT EXISTS "search_history" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "search_term" TEXT NOT NULL,
  "user_id" UUID REFERENCES "user"("id") ON DELETE SET NULL,
  "count" INTEGER DEFAULT 1,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "last_searched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_search_history_term ON "search_history"("search_term");
CREATE INDEX IF NOT EXISTS idx_search_history_user ON "search_history"("user_id");
CREATE INDEX IF NOT EXISTS idx_search_history_count ON "search_history"("count" DESC);

-- 添加RLS安全策略
ALTER TABLE "search_history" ENABLE ROW LEVEL SECURITY;

-- 允许经过身份验证的用户插入和更新搜索记录
CREATE POLICY "Authenticated users can insert search history"
  ON "search_history" FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own search history"
  ON "search_history" FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- 允许任何人读取搜索历史（用于推荐功能）
CREATE POLICY "Anyone can view search history"
  ON "search_history" FOR SELECT
  TO anon, authenticated
  USING (true);

-- 为消息表添加全文搜索支持
ALTER TABLE IF EXISTS "chat_message" ADD COLUMN IF NOT EXISTS tsv_content TSVECTOR;

-- 创建触发器函数来更新全文搜索向量
CREATE OR REPLACE FUNCTION chat_message_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv_content := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 添加触发器
DROP TRIGGER IF EXISTS chat_message_search_trigger ON "chat_message";
CREATE TRIGGER chat_message_search_trigger
  BEFORE INSERT OR UPDATE ON "chat_message"
  FOR EACH ROW
  EXECUTE FUNCTION chat_message_search_update();

-- 为已存在的消息数据更新全文搜索向量
UPDATE "chat_message" SET tsv_content = to_tsvector('english', COALESCE(content, ''));

-- 创建GIN索引以加速全文搜索
CREATE INDEX IF NOT EXISTS chat_message_tsv_idx ON "chat_message" USING GIN(tsv_content);

-- 为项目表添加全文搜索
ALTER TABLE IF EXISTS "project" ADD COLUMN IF NOT EXISTS tsv_searchable TSVECTOR;

-- 创建触发器函数来更新项目全文搜索向量
CREATE OR REPLACE FUNCTION project_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv_searchable := to_tsvector('english', 
    COALESCE(NEW.project_name, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.status, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 添加项目搜索触发器
DROP TRIGGER IF EXISTS project_search_trigger ON "project";
CREATE TRIGGER project_search_trigger
  BEFORE INSERT OR UPDATE ON "project"
  FOR EACH ROW
  EXECUTE FUNCTION project_search_update();

-- 为已存在的项目数据更新全文搜索向量
UPDATE "project" SET tsv_searchable = to_tsvector('english', 
  COALESCE(project_name, '') || ' ' || 
  COALESCE(description, '') || ' ' ||
  COALESCE(status, '')
);

-- 创建项目搜索索引
CREATE INDEX IF NOT EXISTS project_tsv_idx ON "project" USING GIN(tsv_searchable);

-- 为任务表添加全文搜索
ALTER TABLE IF EXISTS "task" ADD COLUMN IF NOT EXISTS tsv_searchable TSVECTOR;

-- 创建触发器函数来更新任务全文搜索向量
CREATE OR REPLACE FUNCTION task_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv_searchable := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 添加任务搜索触发器
DROP TRIGGER IF EXISTS task_search_trigger ON "task";
CREATE TRIGGER task_search_trigger
  BEFORE INSERT OR UPDATE ON "task"
  FOR EACH ROW
  EXECUTE FUNCTION task_search_update();

-- 为已存在的任务数据更新全文搜索向量
UPDATE "task" SET tsv_searchable = to_tsvector('english', 
  COALESCE(title, '') || ' ' || 
  COALESCE(description, '')
);

-- 创建任务搜索索引
CREATE INDEX IF NOT EXISTS task_tsv_idx ON "task" USING GIN(tsv_searchable);

-- 为团队表添加全文搜索
ALTER TABLE IF EXISTS "team" ADD COLUMN IF NOT EXISTS tsv_searchable TSVECTOR;

-- 创建触发器函数来更新团队全文搜索向量
CREATE OR REPLACE FUNCTION team_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv_searchable := to_tsvector('english', 
    COALESCE(NEW.name, '') || ' ' || 
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.access, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 添加团队搜索触发器
DROP TRIGGER IF EXISTS team_search_trigger ON "team";
CREATE TRIGGER team_search_trigger
  BEFORE INSERT OR UPDATE ON "team"
  FOR EACH ROW
  EXECUTE FUNCTION team_search_update();

-- 为已存在的团队数据更新全文搜索向量
UPDATE "team" SET tsv_searchable = to_tsvector('english', 
  COALESCE(name, '') || ' ' || 
  COALESCE(description, '') || ' ' ||
  COALESCE(access, '')
);

-- 创建团队搜索索引
CREATE INDEX IF NOT EXISTS team_tsv_idx ON "team" USING GIN(tsv_searchable);

-- 为用户表添加全文搜索
ALTER TABLE IF EXISTS "user" ADD COLUMN IF NOT EXISTS tsv_searchable TSVECTOR;

-- 创建触发器函数来更新用户全文搜索向量
CREATE OR REPLACE FUNCTION user_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv_searchable := to_tsvector('english', 
    COALESCE(NEW.name, '') || ' ' || 
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 添加用户搜索触发器
DROP TRIGGER IF EXISTS user_search_trigger ON "user";
CREATE TRIGGER user_search_trigger
  BEFORE INSERT OR UPDATE ON "user"
  FOR EACH ROW
  EXECUTE FUNCTION user_search_update();

-- 为已存在的用户数据更新全文搜索向量
UPDATE "user" SET tsv_searchable = to_tsvector('english', 
  COALESCE(name, '') || ' ' || 
  COALESCE(email, '')
);

-- 创建用户搜索索引
CREATE INDEX IF NOT EXISTS user_tsv_idx ON "user" USING GIN(tsv_searchable); 