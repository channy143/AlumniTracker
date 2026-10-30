-- Migration: Add Messenger-style specific message replies and reactions to 1-on-1 and group chats
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_preview JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.chat_group_messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.chat_group_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_preview JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_messages_reply_to_id ON public.chat_group_messages(reply_to_id);

-- Allow both sender and receiver to update messages (e.g. reactions and read receipts)
DROP POLICY IF EXISTS "Users can update messages they received (mark read)" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages they are involved in" ON public.messages;
CREATE POLICY "Users can update messages they are involved in"
  ON public.messages FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id = sender_id
      UNION
      SELECT user_id FROM public.profiles WHERE id = receiver_id
    )
  );

