-- Add password reset fields to the user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "reset_password_token" VARCHAR(255);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "reset_password_expires" TIMESTAMP;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "password_hash" VARCHAR(255);

-- Add optional password field for custom authentication
COMMENT ON COLUMN "user"."password_hash" IS 'Hashed password for local authentication (when not using Supabase Auth)';
COMMENT ON COLUMN "user"."reset_password_token" IS 'Token for password reset requests';
COMMENT ON COLUMN "user"."reset_password_expires" IS 'Expiration timestamp for password reset tokens';

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_user_reset_token ON "user"("reset_password_token"); 