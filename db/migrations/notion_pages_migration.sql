-- Create the notion_page table for storing knowledge base pages
CREATE TABLE IF NOT EXISTS "notion_page" (
  "id" SERIAL PRIMARY KEY,
  "title" VARCHAR(255) NOT NULL,
  "content" JSONB DEFAULT '{}', -- Store rich text content as JSON
  "team_id" INT NOT NULL REFERENCES "team"("id") ON DELETE CASCADE,
  "parent_id" INT REFERENCES "notion_page"("id") ON DELETE CASCADE, -- For hierarchical structure
  "icon" VARCHAR(255), -- Emoji or URL for page icon
  "cover_image" VARCHAR(255), -- URL for cover image
  "is_archived" BOOLEAN DEFAULT FALSE,
  "order_index" INT DEFAULT 0, -- For ordering pages in the same level
  "created_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "last_edited_by" UUID REFERENCES "user"("id") ON DELETE SET NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notion_page_team ON "notion_page"("team_id");
CREATE INDEX IF NOT EXISTS idx_notion_page_parent ON "notion_page"("parent_id");
CREATE INDEX IF NOT EXISTS idx_notion_page_created_by ON "notion_page"("created_by");

-- Table for page collaborators (for access control at page level if needed)
CREATE TABLE IF NOT EXISTS "notion_page_collaborator" (
  "page_id" INT NOT NULL REFERENCES "notion_page"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "permission" TEXT NOT NULL CHECK ("permission" IN ('CAN_EDIT', 'CAN_COMMENT', 'CAN_VIEW')),
  "added_by" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "added_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("page_id", "user_id")
);

-- Table for page comments
CREATE TABLE IF NOT EXISTS "notion_page_comment" (
  "id" SERIAL PRIMARY KEY,
  "page_id" INT NOT NULL REFERENCES "notion_page"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "resolved" BOOLEAN DEFAULT FALSE
);

-- Index for faster comment lookups
CREATE INDEX IF NOT EXISTS idx_notion_page_comment_page ON "notion_page_comment"("page_id");

-- Table for page favorites/bookmarks
CREATE TABLE IF NOT EXISTS "notion_page_favorite" (
  "user_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "page_id" INT NOT NULL REFERENCES "notion_page"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_id", "page_id")
);

-- Add RLS policies for security
ALTER TABLE "notion_page" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notion_page_collaborator" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notion_page_comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notion_page_favorite" ENABLE ROW LEVEL SECURITY;

-- Policy for notion_page access: users can see pages if they are members of the team
CREATE POLICY "Team members can view notion pages" ON "notion_page"
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_team
    WHERE user_team.team_id = notion_page.team_id
    AND user_team.user_id = auth.uid()
  ));

-- Policy for notion_page creation: users can create pages if they are members of the team with edit rights
CREATE POLICY "Team members with edit rights can create notion pages" ON "notion_page"
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_team
    WHERE user_team.team_id = notion_page.team_id
    AND user_team.user_id = auth.uid()
    AND user_team.role IN ('CAN_EDIT', 'OWNER')
  ));

-- Policy for notion_page updates: users can update pages if they created them or have edit rights
CREATE POLICY "Owners and editors can update notion pages" ON "notion_page"
  FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_team
      WHERE user_team.team_id = notion_page.team_id
      AND user_team.user_id = auth.uid()
      AND user_team.role IN ('CAN_EDIT', 'OWNER')
    )
  );

-- Policy for notion_page deletion: only owners can delete pages
CREATE POLICY "Only owners can delete notion pages" ON "notion_page"
  FOR DELETE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_team
      WHERE user_team.team_id = notion_page.team_id
      AND user_team.user_id = auth.uid()
      AND user_team.role = 'OWNER'
    )
  ); 