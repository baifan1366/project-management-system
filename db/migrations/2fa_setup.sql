-- Add 2FA-related columns to user table if they don't already exist
DO $$ 
BEGIN 
    -- Check if mfa_secret column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user' AND column_name='mfa_secret') THEN
        ALTER TABLE "user" ADD COLUMN "mfa_secret" VARCHAR(255);
    END IF;
    
    -- Check if is_mfa_enabled column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user' AND column_name='is_mfa_enabled') THEN
        ALTER TABLE "user" ADD COLUMN "is_mfa_enabled" BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Check if is_email_2fa_enabled column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='user' AND column_name='is_email_2fa_enabled') THEN
        ALTER TABLE "user" ADD COLUMN "is_email_2fa_enabled" BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create email verification codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS "email_verification_codes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "code" VARCHAR(10) NOT NULL,
  "type" VARCHAR(20) NOT NULL CHECK ("type" IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'TWO_FACTOR')),
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "used" BOOLEAN DEFAULT FALSE
);

-- Create index on user_id for faster lookup
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_user_id ON "email_verification_codes"("user_id");

-- Create index on type for faster lookup
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_type ON "email_verification_codes"("type");

-- Comment on the tables and columns
COMMENT ON TABLE "email_verification_codes" IS 'Table for storing email verification codes, password reset codes, and 2FA codes';
COMMENT ON COLUMN "email_verification_codes"."code" IS 'The verification code sent to the user';
COMMENT ON COLUMN "email_verification_codes"."type" IS 'The type of code (EMAIL_VERIFICATION, PASSWORD_RESET, TWO_FACTOR)';
COMMENT ON COLUMN "email_verification_codes"."expires_at" IS 'When the code expires';
COMMENT ON COLUMN "email_verification_codes"."used" IS 'Whether the code has been used';

-- Comment on user table columns
COMMENT ON COLUMN "user"."mfa_secret" IS 'Secret key for TOTP-based two factor authentication';
COMMENT ON COLUMN "user"."is_mfa_enabled" IS 'Whether TOTP-based 2FA is enabled for the user';
COMMENT ON COLUMN "user"."is_email_2fa_enabled" IS 'Whether email-based 2FA is enabled for the user'; 