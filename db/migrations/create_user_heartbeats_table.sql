-- Create a user_heartbeats table to track user activity
CREATE TABLE IF NOT EXISTS "user_heartbeats" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "last_heartbeat" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_heartbeats_user_id ON "user_heartbeats" (user_id);

-- Create a function to update the user's online status
CREATE OR REPLACE FUNCTION update_user_online_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's online status and last_seen_at in the user table
  UPDATE "user"
  SET is_online = TRUE, last_seen_at = NEW.last_heartbeat
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update user status when heartbeat is updated
DROP TRIGGER IF EXISTS update_user_status_on_heartbeat ON "user_heartbeats";
CREATE TRIGGER update_user_status_on_heartbeat
AFTER INSERT OR UPDATE ON "user_heartbeats"
FOR EACH ROW
EXECUTE FUNCTION update_user_online_status();

-- Create a function to check for inactive users and set them offline
CREATE OR REPLACE FUNCTION check_inactive_users()
RETURNS void AS $$
DECLARE
  inactive_threshold INTERVAL := '2 minutes'; -- Configure this based on your needs
BEGIN
  -- Update users to offline if their last heartbeat is older than the threshold
  UPDATE "user" u
  SET is_online = FALSE
  FROM "user_heartbeats" h
  WHERE u.id = h.user_id
    AND u.is_online = TRUE
    AND h.last_heartbeat < (NOW() - inactive_threshold);
END;
$$ LANGUAGE plpgsql; 