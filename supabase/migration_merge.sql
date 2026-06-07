-- ============================================================
-- Eventra × EventPulse 数据库合并迁移
-- 在 Eventra 的 Supabase SQL Editor 中执行
-- ============================================================

-- Step 1: 给 events 表增加 EventPulse 专有字段
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS website_url        text,
  ADD COLUMN IF NOT EXISTS focus_area         text,
  ADD COLUMN IF NOT EXISTS target_audience    text,
  ADD COLUMN IF NOT EXISTS discovery_priority text
    CHECK (discovery_priority IN ('High', 'Medium', 'Low')),
  ADD COLUMN IF NOT EXISTS source             text
    NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'ai_discovered')),
  ADD COLUMN IF NOT EXISTS external_id          text UNIQUE,
  ADD COLUMN IF NOT EXISTS expected_attendees   integer;
  -- external_id 用于存储 EventPulse 原始 text ID（如 "CES-2026"）
  -- 方便迁移后追溯来源，也可做去重判断

-- Step 2: 创建 event_comments 表
CREATE TABLE IF NOT EXISTS event_comments (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id     uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_email text        NOT NULL,
  body         text        NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read comments"
  ON event_comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert comments"
  ON event_comments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authors can delete their own comments"
  ON event_comments FOR DELETE
  USING (auth.email() = author_email);

-- Step 3: 创建 event_discovery_queue 表（AI 发现事件的审核队列）
CREATE TABLE IF NOT EXISTS event_discovery_queue (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  type              text        NOT NULL DEFAULT 'NEW'
                                CHECK (type IN ('NEW', 'DUPLICATE', 'UPDATE')),
  status            text        NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  event_data        jsonb       NOT NULL,          -- 发现的原始事件 JSON
  existing_event_id uuid        REFERENCES events(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  reviewed_at       timestamptz,
  reviewed_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE event_discovery_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage queue"
  ON event_discovery_queue FOR ALL
  USING (auth.role() = 'authenticated');

-- Step 3b: Allow nullable dates (AI-discovered events may not have confirmed dates)
ALTER TABLE events ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE events ALTER COLUMN end_date DROP NOT NULL;

-- Step 4: 索引（提升查询性能）
CREATE INDEX IF NOT EXISTS idx_events_source       ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_external_id  ON events(external_id);
CREATE INDEX IF NOT EXISTS idx_comments_event_id   ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_queue_status        ON event_discovery_queue(status);

-- ============================================================
-- 验证：执行后运行以下查询确认结果
-- ============================================================
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'events' ORDER BY ordinal_position;
-- SELECT COUNT(*) FROM event_comments;
-- SELECT COUNT(*) FROM event_discovery_queue;
