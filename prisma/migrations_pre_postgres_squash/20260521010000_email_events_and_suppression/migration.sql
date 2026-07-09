-- One row per SendGrid Event Webhook payload entry. We keep the raw
-- payload alongside the parsed columns so we can forensically rebuild
-- state if the parser ever drops a field.
--
-- recipientId is nullable: events for sub-account SendGrid traffic that
-- didn't originate from a Loomi campaign (e.g. transactional sends a
-- client might be doing through the same key) get logged but not joined.
-- campaignId / accountKey come straight from custom_args we stamp on
-- every send.
CREATE TABLE "EmailEvent" (
  "id"          TEXT PRIMARY KEY,
  "campaignId"  TEXT,
  "recipientId" TEXT,
  "accountKey"  TEXT,
  "eventType"   TEXT      NOT NULL,
  "sgEventId"   TEXT      NOT NULL,
  "sgMessageId" TEXT,
  "email"       TEXT,
  "timestamp"   TIMESTAMP NOT NULL,
  "url"         TEXT,
  "reason"      TEXT,
  "userAgent"   TEXT,
  "ip"          TEXT,
  "raw"         TEXT      NOT NULL,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Idempotency: SendGrid retries deliveries on 5xx, so the same event can
-- arrive multiple times. sg_event_id is opaque + globally unique per
-- event, so the upsert key is just that.
CREATE UNIQUE INDEX "EmailEvent_sgEventId_key" ON "EmailEvent" ("sgEventId");
CREATE INDEX "EmailEvent_campaignId_eventType_idx" ON "EmailEvent" ("campaignId", "eventType");
CREATE INDEX "EmailEvent_recipientId_idx" ON "EmailEvent" ("recipientId");
CREATE INDEX "EmailEvent_accountKey_eventType_idx" ON "EmailEvent" ("accountKey", "eventType");
CREATE INDEX "EmailEvent_sgMessageId_idx" ON "EmailEvent" ("sgMessageId");
CREATE INDEX "EmailEvent_timestamp_idx" ON "EmailEvent" ("timestamp");

-- Cascade recipient deletes into the event log so deleting a campaign
-- doesn't leave orphan rows. Nullable column is fine for SET NULL.
ALTER TABLE "EmailEvent"
  ADD CONSTRAINT "EmailEvent_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "EmailCampaignRecipient" ("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────
-- Persistent suppression list. Once an email lands here for an account,
-- the recipient resolver drops it from future campaign batches. Reason
-- distinguishes the source so a manual unsubscribe can be cleared later
-- while a hard bounce stays sticky.
-- ─────────────────────────────────────────────────────
CREATE TABLE "EmailSuppression" (
  "id"         TEXT PRIMARY KEY,
  "accountKey" TEXT      NOT NULL,
  "email"      TEXT      NOT NULL,
  "reason"     TEXT      NOT NULL, -- bounce | spamreport | unsubscribe | manual
  "source"     TEXT      NOT NULL DEFAULT 'sendgrid', -- sendgrid | manual
  "raw"        TEXT,
  "createdAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Scoped per-account: the same email can be suppressed for one
-- sub-account and still mailable for another (different relationship,
-- different consent). Case-folded comparisons happen in app code.
CREATE UNIQUE INDEX "EmailSuppression_accountKey_email_key"
  ON "EmailSuppression" ("accountKey", "email");
CREATE INDEX "EmailSuppression_email_idx" ON "EmailSuppression" ("email");
