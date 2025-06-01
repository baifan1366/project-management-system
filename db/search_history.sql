-- add search history table
CREATE TABLE IF NOT EXISTS "search_history" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "search_term" TEXT NOT NULL,
  "user_id" UUID REFERENCES "user"("id") ON DELETE SET NULL,
  "count" INTEGER DEFAULT 1,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "last_searched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- create index to accelerate query
CREATE INDEX IF NOT EXISTS idx_search_history_term ON "search_history"("search_term");
CREATE INDEX IF NOT EXISTS idx_search_history_user ON "search_history"("user_id");
CREATE INDEX IF NOT EXISTS idx_search_history_count ON "search_history"("count" DESC);

-- add full text search support to chat message table
ALTER TABLE IF EXISTS "chat_message" ADD COLUMN IF NOT EXISTS tsv_content TSVECTOR;

-- create trigger function to update full text search vector
CREATE OR REPLACE FUNCTION chat_message_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv_content := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- add trigger
DROP TRIGGER IF EXISTS chat_message_search_trigger ON "chat_message";
CREATE TRIGGER chat_message_search_trigger
  BEFORE INSERT OR UPDATE ON "chat_message"
  FOR EACH ROW
  EXECUTE FUNCTION chat_message_search_update();

-- update full text search vector for existing message data
UPDATE "chat_message" SET tsv_content = to_tsvector('english', COALESCE(content, ''));

-- create GIN index to accelerate full text search
CREATE INDEX IF NOT EXISTS chat_message_tsv_idx ON "chat_message" USING GIN(tsv_content);

-- add full text search support to project table
ALTER TABLE IF EXISTS "project" ADD COLUMN IF NOT EXISTS tsv_searchable TSVECTOR;

-- create trigger function to update project full text search vector
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

-- add project search trigger
DROP TRIGGER IF EXISTS project_search_trigger ON "project";
CREATE TRIGGER project_search_trigger
  BEFORE INSERT OR UPDATE ON "project"
  FOR EACH ROW
  EXECUTE FUNCTION project_search_update();

-- update full text search vector for existing project data
UPDATE "project" SET tsv_searchable = to_tsvector('english', 
  COALESCE(project_name, '') || ' ' || 
  COALESCE(description, '') || ' ' ||
  COALESCE(status, '')
);

-- create project search index
CREATE INDEX IF NOT EXISTS project_tsv_idx ON "project" USING GIN(tsv_searchable);

-- add full text search support to task table
ALTER TABLE IF EXISTS "task" ADD COLUMN IF NOT EXISTS tsv_searchable TSVECTOR;

-- create trigger function to update task full text search vector
CREATE OR REPLACE FUNCTION task_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv_searchable := to_tsvector('english', 
    COALESCE(NEW.tag_values->>'name', '') || ' ' || 
    COALESCE(NEW.tag_values->>'description', '') || ' ' ||
    COALESCE(NEW.tag_values::text, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- add task search trigger
DROP TRIGGER IF EXISTS task_search_trigger ON "task";
CREATE TRIGGER task_search_trigger
  BEFORE INSERT OR UPDATE ON "task"
  FOR EACH ROW
  EXECUTE FUNCTION task_search_update();

-- update full text search vector for existing task data
UPDATE "task" SET tsv_searchable = to_tsvector('english', 
  COALESCE(tag_values->>'name', '') || ' ' || 
  COALESCE(tag_values->>'description', '') || ' ' ||
  COALESCE(tag_values::text, '')
);

-- create task search index
CREATE INDEX IF NOT EXISTS task_tsv_idx ON "task" USING GIN(tsv_searchable);

-- add full text search support to team table
ALTER TABLE IF EXISTS "team" ADD COLUMN IF NOT EXISTS tsv_searchable TSVECTOR;

-- create trigger function to update team full text search vector
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

-- add team search trigger
DROP TRIGGER IF EXISTS team_search_trigger ON "team";
CREATE TRIGGER team_search_trigger
  BEFORE INSERT OR UPDATE ON "team"
  FOR EACH ROW
  EXECUTE FUNCTION team_search_update();

-- update full text search vector for existing team data
UPDATE "team" SET tsv_searchable = to_tsvector('english', 
  COALESCE(name, '') || ' ' || 
  COALESCE(description, '') || ' ' ||
  COALESCE(access, '')
);

-- create team search index
CREATE INDEX IF NOT EXISTS team_tsv_idx ON "team" USING GIN(tsv_searchable);

-- add full text search support to user table
ALTER TABLE IF EXISTS "user" ADD COLUMN IF NOT EXISTS tsv_searchable TSVECTOR;

-- create trigger function to update user full text search vector
CREATE OR REPLACE FUNCTION user_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv_searchable := to_tsvector('english', 
    COALESCE(NEW.name, '') || ' ' || 
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- add user search trigger
DROP TRIGGER IF EXISTS user_search_trigger ON "user";
CREATE TRIGGER user_search_trigger
  BEFORE INSERT OR UPDATE ON "user"
  FOR EACH ROW
  EXECUTE FUNCTION user_search_update();

-- update full text search vector for existing user data
UPDATE "user" SET tsv_searchable = to_tsvector('english', 
  COALESCE(name, '') || ' ' || 
  COALESCE(email, '')
);

-- create user search index
CREATE INDEX IF NOT EXISTS user_tsv_idx ON "user" USING GIN(tsv_searchable); 