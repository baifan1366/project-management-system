-- 添加用于支持多个OAuth提供商绑定的字段
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "google_provider_id" VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "github_provider_id" VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "connected_providers" TEXT DEFAULT '[]';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_login_provider" VARCHAR(50);

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_google_provider_id ON "user" (google_provider_id) WHERE google_provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_github_provider_id ON "user" (github_provider_id) WHERE github_provider_id IS NOT NULL;

-- 为字段添加注释
COMMENT ON COLUMN "user"."google_provider_id" IS 'Google 账户ID，用于绑定登录';
COMMENT ON COLUMN "user"."github_provider_id" IS 'GitHub 账户ID，用于绑定登录';
COMMENT ON COLUMN "user"."connected_providers" IS '已连接的所有提供商列表，JSON格式';
COMMENT ON COLUMN "user"."last_login_provider" IS '最后一次登录使用的提供商'; 