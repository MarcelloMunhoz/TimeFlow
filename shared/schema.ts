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

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  companyId: integer("company_id").references(() => companies.id),
  status: text("status").notNull().default("active"), // active, completed, on_hold, cancelled
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  startDate: text("start_date"), // YYYY-MM-DD format
  endDate: text("end_date"), // YYYY-MM-DD format
  color: text("color").default("#3B82F6"), // hex color for visual organization
  estimatedHours: integer("estimated_hours"), // keeping existing column
  actualHours: integer("actual_hours").default(0), // keeping existing column
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

// Appointment schemas
export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  endTime: true,
  createdAt: true,
  status: true,
  completedAt: true,
  parentTaskId: true, // will be set automatically for recurring instances
  recurringTaskId: true, // will be set automatically for recurring instances
});

export const updateAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
}).partial();

// Schema for creating recurring appointments
export const createRecurringAppointmentSchema = insertAppointmentSchema.extend({
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
  recurrenceInterval: z.number().min(1).max(365).optional(),
  recurrenceEndDate: z.string().optional(),
  recurrenceEndCount: z.number().min(1).max(1000).optional(),
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
