-- Migration: Chat Groups and Group Messaging for Conversations
CREATE TABLE IF NOT EXISTS chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  avatar_url TEXT NULL,
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, profile_id)
);

CREATE TABLE IF NOT EXISTS chat_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_group_id ON chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_profile_id ON chat_group_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_group_id ON chat_group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_created_at ON chat_group_messages(created_at);

ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_groups' AND policyname = 'allow_authenticated_chat_groups'
  ) THEN
    CREATE POLICY allow_authenticated_chat_groups ON chat_groups FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_group_members' AND policyname = 'allow_authenticated_chat_group_members'
  ) THEN
    CREATE POLICY allow_authenticated_chat_group_members ON chat_group_members FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chat_group_messages' AND policyname = 'allow_authenticated_chat_group_messages'
  ) THEN
    CREATE POLICY allow_authenticated_chat_group_messages ON chat_group_messages FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
