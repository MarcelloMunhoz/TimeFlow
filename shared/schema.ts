import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Companies table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "internal" or "client"
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  website: text("website"),
  contactPerson: text("contact_person"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true), // keeping existing column
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// BI Stages table (top level of hierarchy)
export const biStages = pgTable("bi_stages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#8B5CF6"),
  orderIndex: integer("order_index").notNull(), // Sequential order in BI methodology
  estimatedDurationDays: integer("estimated_duration_days"), // Typical duration for this stage
  isRequired: boolean("is_required").default(true), // Whether this stage is mandatory
  bestPractices: text("best_practices"), // JSON array of best practice tips
  deliverables: text("deliverables"), // JSON array of expected deliverables
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// BI Main Tasks table (middle level of hierarchy)
export const biMainTasks = pgTable("bi_main_tasks", {
  id: serial("id").primaryKey(),
  stageId: integer("stage_id").notNull().references(() => biStages.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(), // Order within the stage
  estimatedHours: integer("estimated_hours"), // Typical hours for this main task
  isRequired: boolean("is_required").default(true),
  prerequisites: text("prerequisites"), // JSON array of prerequisite task IDs
  bestPractices: text("best_practices"), // JSON array of best practice tips
  deliverables: text("deliverables"), // JSON array of expected deliverables
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// BI Subtasks table (bottom level of hierarchy)
export const biSubtasks = pgTable("bi_subtasks", {
  id: serial("id").primaryKey(),
  mainTaskId: integer("main_task_id").notNull().references(() => biMainTasks.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(), // Order within the main task
  estimatedMinutes: integer("estimated_minutes"), // Typical duration in minutes
  isRequired: boolean("is_required").default(true),
  skillLevel: text("skill_level").default("intermediate"), // beginner, intermediate, advanced
  tools: text("tools"), // JSON array of recommended tools/technologies
  bestPractices: text("best_practices"), // JSON array of specific tips
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// Phases table (enhanced with deadline support)
export const phases = pgTable("phases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#8B5CF6"), // hex color for visual organization
  orderIndex: integer("order_index").default(0), // for ordering phases
  estimatedDurationDays: integer("estimated_duration_days"), // default duration estimate
  isActive: boolean("is_active").default(true), // can be disabled
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// Subphases table (hierarchical structure under phases)
export const subphases = pgTable("subphases", {
  id: serial("id").primaryKey(),
  phaseId: integer("phase_id").notNull().references(() => phases.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"), // inherits from parent phase if null
  orderIndex: integer("order_index").default(0), // for ordering within phase
  estimatedDurationDays: integer("estimated_duration_days"), // default duration estimate
  isRequired: boolean("is_required").default(true), // can be optional
  prerequisites: text("prerequisites"), // JSON array of prerequisite subphase IDs
  deliverables: text("deliverables"), // JSON array of expected deliverables
  isActive: boolean("is_active").default(true), // can be disabled
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// Project Roadmap table (tracks project progress through BI stages)
export const projectRoadmap = pgTable("project_roadmap", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  stageId: integer("stage_id").notNull().references(() => biStages.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(), // Order of stages for this project
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed, skipped
  plannedStartDate: text("planned_start_date"), // YYYY-MM-DD format
  plannedEndDate: text("planned_end_date"), // YYYY-MM-DD format
  actualStartDate: text("actual_start_date"), // YYYY-MM-DD format
  actualEndDate: text("actual_end_date"), // YYYY-MM-DD format
  progressPercentage: integer("progress_percentage").default(0),
  blockers: text("blockers"), // JSON array of current blockers/issues
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// Project Tasks table (tracks main tasks within each stage)
export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  roadmapId: integer("roadmap_id").notNull().references(() => projectRoadmap.id, { onDelete: "cascade" }),
  mainTaskId: integer("main_task_id").notNull().references(() => biMainTasks.id, { onDelete: "cascade" }),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed, skipped
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  plannedStartDate: text("planned_start_date"), // YYYY-MM-DD format
  plannedEndDate: text("planned_end_date"), // YYYY-MM-DD format
  actualStartDate: text("actual_start_date"), // YYYY-MM-DD format
  actualEndDate: text("actual_end_date"), // YYYY-MM-DD format
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours").default(0),
  progressPercentage: integer("progress_percentage").default(0),
  qualityScore: integer("quality_score"), // 1-10 quality rating
  reviewStatus: text("review_status").default("pending"), // pending, approved, needs_revision
  deliverables: text("deliverables"), // JSON array of completed deliverables
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// Project Subtasks table (tracks detailed subtasks)
export const projectSubtasks = pgTable("project_subtasks", {
  id: serial("id").primaryKey(),
  projectTaskId: integer("project_task_id").notNull().references(() => projectTasks.id, { onDelete: "cascade" }),
  subtaskId: integer("subtask_id").notNull().references(() => biSubtasks.id, { onDelete: "cascade" }),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed, skipped
  plannedDurationMinutes: integer("planned_duration_minutes"),
  actualDurationMinutes: integer("actual_duration_minutes").default(0),
  completedAt: text("completed_at"), // ISO string when completed
  qualityNotes: text("quality_notes"), // Notes on quality/issues
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// Project phases junction table (enhanced with deadline management)
export const projectPhases = pgTable("project_phases", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  phaseId: integer("phase_id").notNull().references(() => phases.id, { onDelete: "cascade" }),
  startDate: text("start_date"), // YYYY-MM-DD format - when phase should start
  endDate: text("end_date"), // YYYY-MM-DD format - when phase should end
  actualStartDate: text("actual_start_date"), // YYYY-MM-DD format - when phase actually started
  actualEndDate: text("actual_end_date"), // YYYY-MM-DD format - when phase actually ended
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed, on_hold, cancelled
  progressPercentage: integer("progress_percentage").default(0), // 0-100
  notes: text("notes"), // project-specific notes for this phase
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// Project subphases junction table (tracks subphases within project phases)
export const projectSubphases = pgTable("project_subphases", {
  id: serial("id").primaryKey(),
  projectPhaseId: integer("project_phase_id").notNull().references(() => projectPhases.id, { onDelete: "cascade" }),
  subphaseId: integer("subphase_id").notNull().references(() => subphases.id, { onDelete: "cascade" }),
  startDate: text("start_date"), // YYYY-MM-DD format - when subphase should start
  endDate: text("end_date"), // YYYY-MM-DD format - when subphase should end
  actualStartDate: text("actual_start_date"), // YYYY-MM-DD format - when subphase actually started
  actualEndDate: text("actual_end_date"), // YYYY-MM-DD format - when subphase actually ended
  status: text("status").notNull().default("not_started"), // not_started, in_progress, completed, on_hold, cancelled, skipped
  progressPercentage: integer("progress_percentage").default(0), // 0-100
  assignedUserId: integer("assigned_user_id").references(() => users.id), // who is responsible
  priority: text("priority").default("medium"), // low, medium, high, urgent
  estimatedHours: integer("estimated_hours"), // project-specific time estimate
  actualHours: integer("actual_hours").default(0), // time actually spent
  qualityScore: integer("quality_score"), // 1-5 rating of completion quality
  notes: text("notes"), // project-specific notes for this subphase
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// BI Project Templates table
export const biProjectTemplates = pgTable("bi_project_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // "data_warehouse", "reporting", "analytics", "ml", "etl"
  complexity: text("complexity").notNull().default("medium"), // simple, medium, complex
  estimatedDurationWeeks: integer("estimated_duration_weeks"),
  requiredSkills: text("required_skills"), // JSON array of required skills
  recommendedTeamSize: integer("recommended_team_size").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// BI Template Stages junction table (defines which stages are included in each template)
export const biTemplateStages = pgTable("bi_template_stages", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => biProjectTemplates.id, { onDelete: "cascade" }),
  stageId: integer("stage_id").notNull().references(() => biStages.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull(), // Order of stages in this template
  isOptional: boolean("is_optional").default(false), // Whether this stage can be skipped
  customDurationDays: integer("custom_duration_days"), // Override default stage duration
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// Projects table (enhanced for BI)
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  companyId: integer("company_id").references(() => companies.id),
  templateId: integer("template_id").references(() => biProjectTemplates.id), // Link to BI template
  biCategory: text("bi_category"), // "data_warehouse", "reporting", "analytics", "ml", "etl"
  currentStageId: integer("current_stage_id").references(() => biStages.id), // Current stage in roadmap
  status: text("status").notNull().default("active"), // active, completed, on_hold, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  startDate: text("start_date"), // YYYY-MM-DD format
  endDate: text("end_date"), // YYYY-MM-DD format
  actualStartDate: text("actual_start_date"), // When work actually began
  actualEndDate: text("actual_end_date"), // When work actually completed
  color: text("color").default("#3B82F6"), // hex color for visual organization
  estimatedHours: integer("estimated_hours"), // keeping existing column
  actualHours: integer("actual_hours").default(0), // keeping existing column
  progressPercentage: integer("progress_percentage").default(0), // Overall project progress
  riskLevel: text("risk_level").default("low"), // low, medium, high, critical
  stakeholders: text("stakeholders"), // JSON array of stakeholder information
  businessValue: text("business_value"), // Expected business impact/value
  technicalRequirements: text("technical_requirements"), // JSON array of technical specs
  notes: text("notes"),
  isActive: boolean("is_active").default(true), // keeping existing column
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  position: text("position"),
  department: text("department"),
  companyId: integer("company_id").references(() => companies.id),
  type: text("type").notNull(), // "internal" or "external"
  avatar: text("avatar"), // URL to avatar image
  notes: text("notes"),
  isActive: boolean("is_active").default(true), // keeping existing column
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// ===== FOLLOW-UP SYSTEM TABLES =====

// Email Settings table (global SMTP configuration)
export const emailSettings = pgTable("email_settings", {
  id: serial("id").primaryKey(),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").notNull().default(587),
  smtpUser: text("smtp_user").notNull(),
  smtpPassword: text("smtp_password").notNull(), // Should be encrypted in production
  smtpSecure: boolean("smtp_secure").default(false), // TLS/SSL
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name").notNull().default("TimeFlow"),
  isActive: boolean("is_active").default(true),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

// Follow-up Settings table (per company configuration)
export const followUpSettings = pgTable("follow_up_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").default(true),
  emailFrequency: text("email_frequency").notNull().default("weekly"), // weekly, biweekly, monthly
  sendDay: integer("send_day").default(1), // 1=Monday, 2=Tuesday, etc.
  sendTime: text("send_time").default("08:00"), // HH:MM format
  recipientEmails: text("recipient_emails"), // JSON array of email addresses
  customTemplate: text("custom_template"), // Custom email template HTML
  includeBlockedPhases: boolean("include_blocked_phases").default(true),
  includeProgressCharts: boolean("include_progress_charts").default(true),
  includeNextSteps: boolean("include_next_steps").default(true),
  lastSentDate: text("last_sent_date"), // YYYY-MM-DD format
  isActive: boolean("is_active").default(true),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").notNull().default(sql`now()`),
});

// Follow-up Reports table (historical reports)
export const followUpReports = pgTable("follow_up_reports", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  reportDate: text("report_date").notNull(), // YYYY-MM-DD format
  reportPeriodStart: text("report_period_start").notNull(), // YYYY-MM-DD format
  reportPeriodEnd: text("report_period_end").notNull(), // YYYY-MM-DD format
  contentJson: text("content_json").notNull(), // JSON with report data
  htmlContent: text("html_content"), // Generated HTML for email
  totalProjects: integer("total_projects").default(0),
  completedProjects: integer("completed_projects").default(0),
  projectsAtRisk: integer("projects_at_risk").default(0),
  overallProgress: integer("overall_progress").default(0), // 0-100 percentage
  emailSent: boolean("email_sent").default(false),
  sentAt: text("sent_at"), // ISO timestamp when email was sent
  generatedBy: integer("generated_by").references(() => users.id), // User who generated (null for auto)
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// Email Logs table (tracking email delivery)
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => followUpReports.id, { onDelete: "cascade" }),
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, failed, bounced
  errorMessage: text("error_message"), // Error details if failed
  sentAt: text("sent_at"), // ISO timestamp when email was sent
  deliveredAt: text("delivered_at"), // ISO timestamp when email was delivered
  openedAt: text("opened_at"), // ISO timestamp when email was opened (if tracking enabled)
  retryCount: integer("retry_count").default(0),
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// Work schedules table - defines business hours for users
export const workSchedules = pgTable("work_schedules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Standard Business Hours", "Flexible Schedule"
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  isActive: boolean("is_active").default(true),
  createdAt: text("created_at").notNull().default(sql`now()`),
  updatedAt: text("updated_at").default(sql`now()`),
});

// Work schedule rules - defines specific time blocks for each day
export const workScheduleRules = pgTable("work_schedule_rules", {
  id: serial("id").primaryKey(),
  workScheduleId: integer("work_schedule_id").notNull().references(() => workSchedules.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  ruleType: text("rule_type").notNull(), // "work", "break", "lunch", "unavailable"
  isWorkingTime: boolean("is_working_time").default(true), // false for breaks/lunch
  allowOverlap: boolean("allow_overlap").default(false), // true for "encaixe" periods
  description: text("description"), // e.g., "Morning shift", "Lunch break", "After hours"
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(), // YYYY-MM-DD format
  startTime: text("start_time").notNull(), // HH:MM format
  durationMinutes: integer("duration_minutes").notNull(),
  endTime: text("end_time").notNull(), // calculated HH:MM format
  peopleWith: text("people_with"),
  project: text("project"), // legacy field - keeping for backward compatibility
  company: text("company"), // legacy field - keeping for backward compatibility
  projectId: integer("project_id").references(() => projects.id),
  companyId: integer("company_id").references(() => companies.id),
  assignedUserId: integer("assigned_user_id").references(() => users.id),
  phaseId: integer("phase_id").references(() => phases.id), // optional phase assignment
  projectSubphaseId: integer("project_subphase_id").references(() => projectSubphases.id), // link to specific project subphase
  priority: text("priority"), // keeping existing column
  category: text("category"), // keeping existing column
  tags: text("tags"), // keeping existing column
  pomodoroSessions: integer("pomodoro_sessions"), // keeping existing column
  notes: text("notes"), // keeping existing column
  location: text("location"), // keeping existing column
  meetingUrl: text("meeting_url"), // keeping existing column
  slaMinutes: integer("sla_minutes"), // optional SLA in minutes
  status: text("status").notNull().default("scheduled"), // scheduled, completed, delayed, rescheduled
  isPomodoro: boolean("is_pomodoro").default(false),
  completedAt: text("completed_at"), // ISO string when completed
  rescheduleCount: integer("reschedule_count").default(0), // track number of reschedules
  // Timer control fields
  actualTimeMinutes: integer("actual_time_minutes").default(0), // actual time spent in minutes
  timerState: text("timer_state").notNull().default("stopped"), // stopped, running, paused
  timerStartedAt: text("timer_started_at"), // ISO string when timer was started
  timerPausedAt: text("timer_paused_at"), // ISO string when timer was paused
  accumulatedTimeMinutes: integer("accumulated_time_minutes").default(0), // time accumulated before current session
  // Recurring task fields
  isRecurring: boolean("is_recurring").default(false), // indicates if this is a recurring task
  recurrencePattern: text("recurrence_pattern"), // daily, weekly, monthly, yearly
  recurrenceInterval: integer("recurrence_interval").default(1), // every N days/weeks/months
  recurrenceEndDate: text("recurrence_end_date"), // YYYY-MM-DD format - when recurrence stops
  recurrenceEndCount: integer("recurrence_end_count"), // alternative: stop after N occurrences
  parentTaskId: integer("parent_task_id"), // references the original recurring task template
  recurringTaskId: integer("recurring_task_id"), // groups all instances of the same recurring task
  isRecurringTemplate: boolean("is_recurring_template").default(false), // marks the original template
  originalDate: text("original_date"), // original scheduled date before weekend adjustment
  wasRescheduledFromWeekend: boolean("was_rescheduled_from_weekend").default(false), // indicates weekend rescheduling
  // Work schedule compliance fields
  isWithinWorkHours: boolean("is_within_work_hours").default(true), // appointment is within defined work hours
  isOvertime: boolean("is_overtime").default(false), // appointment is marked as overtime/encaixe
  workScheduleViolation: text("work_schedule_violation"), // reason if violating work schedule (e.g., "weekend", "lunch_break", "after_hours")
  allowOverlap: boolean("allow_overlap").default(false), // user explicitly allowed overlap/encaixe
  updatedAt: text("updated_at"), // keeping existing column
  createdAt: text("created_at").notNull().default(sql`now()`),
});

// Company schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const updateCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type UpdateCompany = z.infer<typeof updateCompanySchema>;
export type Company = typeof companies.$inferSelect;

// Project schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const updateProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
export type Project = typeof projects.$inferSelect;

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const updateUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;

// Phase schemas
export const insertPhaseSchema = createInsertSchema(phases).omit({
  id: true,
  createdAt: true,
});

export const updatePhaseSchema = createInsertSchema(phases).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertPhase = z.infer<typeof insertPhaseSchema>;
export type UpdatePhase = z.infer<typeof updatePhaseSchema>;
export type Phase = typeof phases.$inferSelect;

// Project phase schemas
export const insertProjectPhaseSchema = createInsertSchema(projectPhases).omit({
  id: true,
  createdAt: true,
});

export const updateProjectPhaseSchema = createInsertSchema(projectPhases).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertProjectPhase = z.infer<typeof insertProjectPhaseSchema>;
export type UpdateProjectPhase = z.infer<typeof updateProjectPhaseSchema>;
export type ProjectPhase = typeof projectPhases.$inferSelect;

// Subphase schemas
export const insertSubphaseSchema = createInsertSchema(subphases).omit({
  id: true,
  createdAt: true,
});

export const updateSubphaseSchema = createInsertSchema(subphases).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertSubphase = z.infer<typeof insertSubphaseSchema>;
export type UpdateSubphase = z.infer<typeof updateSubphaseSchema>;
export type Subphase = typeof subphases.$inferSelect;

// Project subphase schemas
export const insertProjectSubphaseSchema = createInsertSchema(projectSubphases).omit({
  id: true,
  createdAt: true,
});

export const updateProjectSubphaseSchema = createInsertSchema(projectSubphases).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertProjectSubphase = z.infer<typeof insertProjectSubphaseSchema>;
export type UpdateProjectSubphase = z.infer<typeof updateProjectSubphaseSchema>;
export type ProjectSubphase = typeof projectSubphases.$inferSelect;

// BI Stages schemas
export const insertBiStageSchema = createInsertSchema(biStages).omit({
  id: true,
  createdAt: true,
});

export const updateBiStageSchema = createInsertSchema(biStages).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertBiStage = z.infer<typeof insertBiStageSchema>;
export type UpdateBiStage = z.infer<typeof updateBiStageSchema>;
export type BiStage = typeof biStages.$inferSelect;

// BI Main Tasks schemas
export const insertBiMainTaskSchema = createInsertSchema(biMainTasks).omit({
  id: true,
  createdAt: true,
});

export const updateBiMainTaskSchema = createInsertSchema(biMainTasks).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertBiMainTask = z.infer<typeof insertBiMainTaskSchema>;
export type UpdateBiMainTask = z.infer<typeof updateBiMainTaskSchema>;
export type BiMainTask = typeof biMainTasks.$inferSelect;

// BI Subtasks schemas
export const insertBiSubtaskSchema = createInsertSchema(biSubtasks).omit({
  id: true,
  createdAt: true,
});

export const updateBiSubtaskSchema = createInsertSchema(biSubtasks).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertBiSubtask = z.infer<typeof insertBiSubtaskSchema>;
export type UpdateBiSubtask = z.infer<typeof updateBiSubtaskSchema>;
export type BiSubtask = typeof biSubtasks.$inferSelect;

// BI Project Templates schemas
export const insertBiProjectTemplateSchema = createInsertSchema(biProjectTemplates).omit({
  id: true,
  createdAt: true,
});

export const updateBiProjectTemplateSchema = createInsertSchema(biProjectTemplates).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertBiProjectTemplate = z.infer<typeof insertBiProjectTemplateSchema>;
export type UpdateBiProjectTemplate = z.infer<typeof updateBiProjectTemplateSchema>;
export type BiProjectTemplate = typeof biProjectTemplates.$inferSelect;

// BI Template Stages schemas
export const insertBiTemplateStageSchema = createInsertSchema(biTemplateStages).omit({
  id: true,
  createdAt: true,
});

export const updateBiTemplateStageSchema = createInsertSchema(biTemplateStages).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertBiTemplateStage = z.infer<typeof insertBiTemplateStageSchema>;
export type UpdateBiTemplateStage = z.infer<typeof updateBiTemplateStageSchema>;
export type BiTemplateStage = typeof biTemplateStages.$inferSelect;

// Project Roadmap schemas
export const insertProjectRoadmapSchema = createInsertSchema(projectRoadmap).omit({
  id: true,
  createdAt: true,
});

export const updateProjectRoadmapSchema = createInsertSchema(projectRoadmap).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertProjectRoadmap = z.infer<typeof insertProjectRoadmapSchema>;
export type UpdateProjectRoadmap = z.infer<typeof updateProjectRoadmapSchema>;
export type ProjectRoadmap = typeof projectRoadmap.$inferSelect;

// Project Tasks schemas
export const insertProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
});

export const updateProjectTaskSchema = createInsertSchema(projectTasks).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertProjectTask = z.infer<typeof insertProjectTaskSchema>;
export type UpdateProjectTask = z.infer<typeof updateProjectTaskSchema>;
export type ProjectTask = typeof projectTasks.$inferSelect;

// Project Subtasks schemas
export const insertProjectSubtaskSchema = createInsertSchema(projectSubtasks).omit({
  id: true,
  createdAt: true,
});

export const updateProjectSubtaskSchema = createInsertSchema(projectSubtasks).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertProjectSubtask = z.infer<typeof insertProjectSubtaskSchema>;
export type UpdateProjectSubtask = z.infer<typeof updateProjectSubtaskSchema>;
export type ProjectSubtask = typeof projectSubtasks.$inferSelect;

// Appointment schemas
export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  endTime: true,
  createdAt: true,
  status: true,
  completedAt: true,
  parentTaskId: true, // will be set automatically for recurring instances
  recurringTaskId: true, // will be set automatically for recurring instances
}).extend({
  allowOverlap: z.boolean().optional().default(false), // Allow user to override conflict checking
  allowWeekendOverride: z.boolean().optional().default(false), // Allow user to override weekend blocking
});

export const updateAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
}).partial().extend({
  allowOverlap: z.boolean().optional().default(false), // Allow user to override conflict checking during updates
});

// Schema for creating recurring appointments
export const createRecurringAppointmentSchema = insertAppointmentSchema.extend({
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  recurrenceInterval: z.number().min(1).max(365).optional(),
  recurrenceEndDate: z.string().optional(),
  recurrenceEndCount: z.number().min(1).max(1000).optional(),
  allowOverlap: z.boolean().optional().default(false), // Inherit allowOverlap for recurring appointments
  allowWeekendOverride: z.boolean().optional().default(false), // Inherit allowWeekendOverride for recurring appointments
}).refine((data) => {
  // If recurring, must have pattern and either end date or count
  if (data.isRecurring) {
    return data.recurrencePattern && (data.recurrenceEndDate || data.recurrenceEndCount);
  }
  return true;
}, {
  message: "Recurring tasks must have a pattern and either an end date or occurrence count",
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;
export type CreateRecurringAppointment = z.infer<typeof createRecurringAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// Work Schedule schemas
export const insertWorkScheduleSchema = createInsertSchema(workSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateWorkScheduleSchema = createInsertSchema(workSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertWorkSchedule = z.infer<typeof insertWorkScheduleSchema>;
export type UpdateWorkSchedule = z.infer<typeof updateWorkScheduleSchema>;
export type WorkSchedule = typeof workSchedules.$inferSelect;

// Work Schedule Rules schemas
export const insertWorkScheduleRuleSchema = createInsertSchema(workScheduleRules).omit({
  id: true,
  createdAt: true,
});

export const updateWorkScheduleRuleSchema = createInsertSchema(workScheduleRules).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertWorkScheduleRule = z.infer<typeof insertWorkScheduleRuleSchema>;
export type UpdateWorkScheduleRule = z.infer<typeof updateWorkScheduleRuleSchema>;
export type WorkScheduleRule = typeof workScheduleRules.$inferSelect;

// ===== FOLLOW-UP SYSTEM SCHEMAS =====

// Email Settings schemas
export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateEmailSettingsSchema = createInsertSchema(emailSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;
export type UpdateEmailSettings = z.infer<typeof updateEmailSettingsSchema>;
export type EmailSettings = typeof emailSettings.$inferSelect;

// Follow-up Settings schemas
export const insertFollowUpSettingsSchema = createInsertSchema(followUpSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateFollowUpSettingsSchema = createInsertSchema(followUpSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertFollowUpSettings = z.infer<typeof insertFollowUpSettingsSchema>;
export type UpdateFollowUpSettings = z.infer<typeof updateFollowUpSettingsSchema>;
export type FollowUpSettings = typeof followUpSettings.$inferSelect;

// Follow-up Reports schemas
export const insertFollowUpReportSchema = createInsertSchema(followUpReports).omit({
  id: true,
  createdAt: true,
});

export const updateFollowUpReportSchema = createInsertSchema(followUpReports).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertFollowUpReport = z.infer<typeof insertFollowUpReportSchema>;
export type UpdateFollowUpReport = z.infer<typeof updateFollowUpReportSchema>;
export type FollowUpReport = typeof followUpReports.$inferSelect;

// Email Logs schemas
export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  createdAt: true,
});

export const updateEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type UpdateEmailLog = z.infer<typeof updateEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
