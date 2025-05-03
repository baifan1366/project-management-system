-- Add a JSONB column for storing mention data in chat_message table
ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS mentions JSONB;

-- Create an index on the mentions column for better query performance
CREATE INDEX IF NOT EXISTS chat_message_mentions_idx ON chat_message USING GIN (mentions);

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