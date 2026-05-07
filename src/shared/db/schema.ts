import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "demo"]);
export const userPlanEnum = pgEnum("user_plan", ["free", "pro", "premium"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "paused",
]);
export const paymentMethodTypeEnum = pgEnum("payment_method_type", ["card"]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "done",
  "canceled",
  "failed",
  "partial_canceled",
]);

export const partners = pgTable(
  "partners",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    domain: varchar("domain", { length: 100 }).notNull().unique(),
    labelKo: varchar("label_ko", { length: 200 }).notNull(),
    labelEn: varchar("label_en", { length: 200 }).notNull(),
    plan: userPlanEnum("plan").notNull().default("pro"),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("partners_active_idx").on(t.active)],
);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  role: userRoleEnum("role").notNull().default("user"),
  plan: userPlanEnum("plan").notNull().default("free"),
  grantedPlan: userPlanEnum("granted_plan"),
  partnerId: text("partner_id").references(() => partners.id, {
    onDelete: "set null",
  }),
  locale: varchar("locale", { length: 2 }).notNull().default("ko"),
  preferredAvatarId: varchar("preferred_avatar_id", { length: 32 }),
  agreedToTermsAt: timestamp("agreed_to_terms_at", { mode: "date" }),
  allowDataForTraining: boolean("allow_data_for_training")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
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
  },
  (t) => [index("accounts_user_id_idx").on(t.userId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobTitle: varchar("job_title", { length: 200 }).notNull(),
    interviewType: varchar("interview_type", { length: 50 }).notNull(),
    language: varchar("language", { length: 4 }).notNull().default("ko"),
    status: varchar("status", { length: 20 }).notNull().default("in_progress"),
    durationSec: integer("duration_sec"),
    deliveryScore: integer("delivery_score"),
    contentScore: integer("content_score"),
    resumeFileId: text("resume_file_id"),
    companyName: varchar("company_name", { length: 255 }),
    avatarId: varchar("avatar_id", { length: 32 }),
    jobResearchJson: jsonb("job_research_json"),
    progressSnapshotJson: jsonb("progress_snapshot_json"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_created_at_idx").on(t.userId, t.createdAt)],
);

export const questions = pgTable(
  "questions",
  {
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
  },
  (t) => [index("questions_session_id_idx").on(t.sessionId)],
);

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

export const metricSnapshots = pgTable(
  "metric_snapshots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    snapshotsJson: jsonb("snapshots_json"),
    eventsJson: jsonb("events_json"),
  },
  (t) => [index("metric_snapshots_session_id_idx").on(t.sessionId)],
);

export const usageCounters = pgTable(
  "usage_counters",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    yearMonth: varchar("year_month", { length: 7 }).notNull(),
    sessionCount: integer("session_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.yearMonth] })],
);

export const events = pgTable(
  "events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id"),
    name: varchar("name", { length: 100 }).notNull(),
    props: jsonb("props"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("events_user_id_created_at_idx").on(t.userId, t.createdAt),
    index("events_name_created_at_idx").on(t.name, t.createdAt),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: userPlanEnum("plan").notNull(),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    amount: integer("amount").notNull(),
    currentPeriodStart: timestamp("current_period_start", {
      mode: "date",
    }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", {
      mode: "date",
    }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { mode: "date" }),
    retryCount: smallint("retry_count").notNull().default(0),
    retryAfter: timestamp("retry_after", { mode: "date" }),
    lastPaymentError: text("last_payment_error"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("subscriptions_user_id_idx").on(t.userId),
    index("subscriptions_period_end_idx").on(t.currentPeriodEnd),
    index("subscriptions_retry_after_idx").on(t.retryAfter),
  ],
);

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: paymentMethodTypeEnum("type").notNull().default("card"),
    tossBillingKey: text("toss_billing_key").notNull(),
    tossCustomerKey: text("toss_customer_key").notNull(),
    cardCompany: text("card_company"),
    cardNumberMasked: text("card_number_masked"),
    isDefault: boolean("is_default").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date" }),
  },
  (t) => [
    index("payment_methods_user_id_idx").on(t.userId),
    uniqueIndex("payment_methods_toss_billing_key_uniq").on(t.tossBillingKey),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    orderId: text("order_id").notNull().unique(),
    tossPaymentKey: text("toss_payment_key").unique(),
    amount: integer("amount").notNull(),
    status: paymentStatusEnum("status").notNull(),
    receiptUrl: text("receipt_url"),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    approvedAt: timestamp("approved_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("payments_user_id_idx").on(t.userId),
    index("payments_subscription_id_idx").on(t.subscriptionId),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    source: varchar("source", { length: 30 }).notNull(),
    transmissionId: text("transmission_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { mode: "date" }),
  },
  (t) => [
    uniqueIndex("webhook_events_source_transmission_uniq").on(
      t.source,
      t.transmissionId,
    ),
  ],
);

export const emailJobs = pgTable(
  "email_jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    template: varchar("template", { length: 50 }).notNull(),
    payload: jsonb("payload").notNull(),
    locale: varchar("locale", { length: 2 }).notNull().default("ko"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    priority: smallint("priority").notNull().default(5),
    attempts: smallint("attempts").notNull().default(0),
    maxAttempts: smallint("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    retryAfter: timestamp("retry_after", { mode: "date" }),
    sentAt: timestamp("sent_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("email_jobs_status_priority_idx").on(t.status, t.priority),
    index("email_jobs_retry_after_idx").on(t.retryAfter),
  ],
);

export const jobRuns = pgTable(
  "job_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobName: varchar("job_name", { length: 100 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(),
    startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { mode: "date" }),
    durationMs: integer("duration_ms"),
    processedCount: integer("processed_count").default(0),
    errorMessage: text("error_message"),
    meta: jsonb("meta"),
  },
  (t) => [index("job_runs_job_name_started_at_idx").on(t.jobName, t.startedAt)],
);

export const errorLogs = pgTable(
  "error_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id"),
    source: varchar("source", { length: 30 }).notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    context: jsonb("context"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("error_logs_created_at_idx").on(t.createdAt)],
);
