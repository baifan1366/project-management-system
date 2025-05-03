-- Add file_path column to attachment table
ALTER TABLE attachment 
ADD COLUMN IF NOT EXISTS file_path VARCHAR(255) DEFAULT '/';

-- Add file_type column to attachment table
ALTER TABLE attachment 
ADD COLUMN IF NOT EXISTS file_type VARCHAR(100);

-- Add size column to attachment table
ALTER TABLE attachment 
ADD COLUMN IF NOT EXISTS size BIGINT;

-- Create file_folders table for folder structure
CREATE TABLE IF NOT EXISTS "file_folders" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "task_id" INT NOT NULL REFERENCES "task"("id") ON DELETE CASCADE,
  "parent_path" VARCHAR(255) NOT NULL DEFAULT '/',
  "full_path" VARCHAR(255) NOT NULL,
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_folders_task_id ON "file_folders"("task_id");
CREATE INDEX IF NOT EXISTS idx_file_folders_parent_path ON "file_folders"("parent_path");
CREATE INDEX IF NOT EXISTS idx_attachment_file_path ON "attachment"("file_path");

-- Create a function to recursively delete folders
CREATE OR REPLACE FUNCTION delete_folder_cascade()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete all child folders
    DELETE FROM file_folders 
    WHERE parent_path LIKE OLD.full_path || '%';
    
    -- Update attachments to move them to the parent folder
    UPDATE attachment
    SET file_path = OLD.parent_path
    WHERE file_path = OLD.full_path;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to handle folder deletion
CREATE TRIGGER before_delete_folder
BEFORE DELETE ON file_folders
FOR EACH ROW
EXECUTE FUNCTION delete_folder_cascade(); 