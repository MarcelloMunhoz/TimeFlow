import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: text("date").notNull(), // YYYY-MM-DD format
  startTime: text("start_time").notNull(), // HH:MM format
  durationMinutes: integer("duration_minutes").notNull(),
  endTime: text("end_time").notNull(), // calculated HH:MM format
  peopleWith: text("people_with"),
  project: text("project"),
  company: text("company"),
  slaMinutes: integer("sla_minutes"), // optional SLA in minutes
  status: text("status").notNull().default("scheduled"), // scheduled, completed, delayed, rescheduled
  isPomodoro: boolean("is_pomodoro").default(false),
  completedAt: text("completed_at"), // ISO string when completed
  rescheduleCount: integer("reschedule_count").default(0), // track number of reschedules
  createdAt: text("created_at").notNull().default(sql`now()`),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  endTime: true,
  createdAt: true,
  status: true,
  completedAt: true,
});

export const updateAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
}).partial();

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
