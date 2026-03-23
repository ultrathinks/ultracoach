import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable("accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  jobTitle: varchar("job_title", { length: 200 }).notNull(),
  interviewType: varchar("interview_type", { length: 50 }).notNull(),
  mode: varchar("mode", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"),
  durationSec: integer("duration_sec"),
  deliveryScore: integer("delivery_score"),
  contentScore: integer("content_score"),
  resumeFileId: text("resume_file_id"),
  companyName: varchar("company_name", { length: 255 }),
  jobResearchJson: jsonb("job_research_json"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(),
  text: text("text").notNull(),
  answer: text("answer"),
  order: integer("order").notNull(),
});

export const feedback = pgTable("feedback", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id")
    .notNull()
    .unique()
    .references(() => sessions.id, { onDelete: "cascade" }),
  summaryJson: jsonb("summary_json"),
  keyMomentsJson: jsonb("key_moments_json"),
  actionItemsJson: jsonb("action_items_json"),
  questionAnalysesJson: jsonb("question_analyses_json"),
});

export const metricSnapshots = pgTable("metric_snapshots", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  snapshotsJson: jsonb("snapshots_json"),
  eventsJson: jsonb("events_json"),
});
