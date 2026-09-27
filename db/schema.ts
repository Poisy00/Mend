import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
};

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    usernameNormalized: text("username_normalized").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role", { enum: ["user", "admin"] })
      .notNull()
      .default("user"),
    status: text("status", { enum: ["active", "disabled"] })
      .notNull()
      .default("active"),
    mustChangePassword: integer("must_change_password", { mode: "boolean" })
      .notNull()
      .default(true),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: text("locked_until"),
    passwordChangedAt: text("password_changed_at"),
    createdByUserId: text("created_by_user_id"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_username_normalized_uq").on(table.usernameNormalized),
    index("users_status_idx").on(table.status),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgentSummary: text("user_agent_summary"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    lastSeenAt: text("last_seen_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    expiresAt: text("expires_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_uq").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
    index("sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const callbacks = sqliteTable(
  "callbacks",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountNumber: text("account_number").notNull(),
    phoneNumber: text("phone_number").notNull(),
    customerName: text("customer_name").notNull().default(""),
    caseNumber: text("case_number").notNull().default(""),
    notes: text("notes").notNull().default(""),
    reasonCode: text("reason_code").notNull(),
    reasonDetails: text("reason_details").notNull().default(""),
    scheduledAtUtc: text("scheduled_at_utc").notNull(),
    sourceTimezone: text("source_timezone").notNull(),
    status: text("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    voicemailRequired: integer("voicemail_required", { mode: "boolean" })
      .notNull()
      .default(false),
    voicemailLeft: integer("voicemail_left", { mode: "boolean" })
      .notNull()
      .default(false),
    priority: text("priority").notNull().default("normal"),
    promise: text("promise").notNull().default(""),
    completionCondition: text("completion_condition").notNull().default(""),
    appointmentStartUtc: text("appointment_start_utc"),
    appointmentEndUtc: text("appointment_end_utc"),
    completedAt: text("completed_at"),
    closureNote: text("closure_note"),
    revision: integer("revision").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    index("callbacks_owner_due_idx").on(
      table.ownerUserId,
      table.scheduledAtUtc,
    ),
    index("callbacks_owner_status_idx").on(table.ownerUserId, table.status),
  ],
);

export const callbackEvents = sqliteTable(
  "callback_events",
  {
    id: text("id").primaryKey(),
    callbackId: text("callback_id")
      .notNull()
      .references(() => callbacks.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    previousValueJson: text("previous_value_json"),
    newValueJson: text("new_value_json"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("callback_events_callback_idx").on(table.callbackId, table.createdAt),
    index("callback_events_owner_idx").on(table.ownerUserId, table.createdAt),
  ],
);

export const weeklySchedules = sqliteTable(
  "weekly_schedules",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStartDate: text("week_start_date").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("weekly_schedules_owner_week_uq").on(
      table.ownerUserId,
      table.weekStartDate,
    ),
  ],
);

export const scheduleBlocks = sqliteTable(
  "schedule_blocks",
  {
    id: text("id").primaryKey(),
    weeklyScheduleId: text("weekly_schedule_id")
      .notNull()
      .references(() => weeklySchedules.id, { onDelete: "cascade" }),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    blockType: text("block_type", {
      enum: ["shift", "break", "lunch", "off"],
    }).notNull(),
    startsAtLocal: text("starts_at_local"),
    endsAtLocal: text("ends_at_local"),
    timezone: text("timezone").notNull().default("Africa/Cairo"),
    status: text("status").notNull().default("active"),
  },
  (table) => [
    index("schedule_blocks_schedule_idx").on(
      table.weeklyScheduleId,
      table.dayOfWeek,
    ),
    index("schedule_blocks_owner_idx").on(table.ownerUserId),
  ],
);

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  primaryTimezone: text("primary_timezone").notNull().default("Africa/Cairo"),
  customerTimezone: text("customer_timezone")
    .notNull()
    .default("America/New_York"),
  timeDisplayPreference: text("time_display_preference")
    .notNull()
    .default("12h"),
  defaultCallbackDuration: integer("default_callback_duration")
    .notNull()
    .default(15),
  theme: text("theme").notNull().default("light"),
  retentionDays: integer("retention_days").notNull().default(180),
  filtersJson: text("filters_json").notNull().default("{}"),
  ...timestamps,
});

export const authAuditLog = sqliteTable(
  "auth_audit_log",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id"),
    targetUserId: text("target_user_id"),
    eventType: text("event_type").notNull(),
    outcome: text("outcome").notNull(),
    originFingerprint: text("origin_fingerprint"),
    metadataJson: text("metadata_json"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("auth_audit_created_idx").on(table.createdAt),
    index("auth_audit_target_idx").on(table.targetUserId, table.createdAt),
  ],
);

export const loginThrottles = sqliteTable("login_throttles", {
  keyHash: text("key_hash").primaryKey(),
  failedCount: integer("failed_count").notNull().default(0),
  windowStartedAt: text("window_started_at").notNull(),
  blockedUntil: text("blocked_until"),
});

export const legacyMigrations = sqliteTable(
  "legacy_migrations",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    migrationVersion: integer("migration_version").notNull(),
    importedCallbackCount: integer("imported_callback_count")
      .notNull()
      .default(0),
    importedScheduleCount: integer("imported_schedule_count")
      .notNull()
      .default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("legacy_migrations_owner_key_uq").on(
      table.ownerUserId,
      table.idempotencyKey,
    ),
  ],
);

export const systemMarkers = sqliteTable("system_markers", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const followUpDrafts = sqliteTable("follow_up_drafts", {
  ownerUserId: text("owner_user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  payloadEncrypted: text("payload_encrypted").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const weeklyPatterns = sqliteTable("weekly_patterns", {
  ownerUserId: text("owner_user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  patternJson: text("pattern_json").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const scheduleExceptions = sqliteTable("schedule_exceptions", {
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  cairoDate: text("cairo_date").notNull(),
  planJson: text("plan_json").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("schedule_exceptions_owner_date_uq").on(table.ownerUserId, table.cairoDate)]);

export const rccDrafts = sqliteTable("rcc_drafts", {
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workflow: text("workflow").notNull(),
  payloadEncrypted: text("payload_encrypted").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("rcc_drafts_owner_workflow_uq").on(table.ownerUserId, table.workflow)]);

export const rccPreferences = sqliteTable("rcc_preferences", {
  ownerUserId: text("owner_user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  settingsEncrypted: text("settings_encrypted").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const rccHandoffs = sqliteTable("rcc_handoffs", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workflow: text("workflow").notNull(),
  snapshotEncrypted: text("snapshot_encrypted").notNull(),
  sourceEncrypted: text("source_encrypted"),
  status: text("status").notNull().default("prepared"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("rcc_handoffs_owner_idx").on(table.ownerUserId, table.createdAt)]);

export const cases = sqliteTable("cases", {
  id: text("id").primaryKey(),
  humanId: text("human_id").notNull().unique(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  customerEncrypted: text("customer_encrypted").notNull(),
  accountEncrypted: text("account_encrypted").notNull(),
  summaryEncrypted: text("summary_encrypted").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull(),
  status: text("status").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  snapshotEncrypted: text("snapshot_encrypted").notNull(),
  revision: integer("revision").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("cases_owner_updated_idx").on(table.ownerUserId, table.updatedAt)]);

export const caseEvents = sqliteTable("case_events", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payloadEncrypted: text("payload_encrypted").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("case_events_owner_case_idx").on(table.ownerUserId, table.caseId, table.createdAt)]);
