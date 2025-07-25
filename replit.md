# replit.md

## Overview

This is a full-stack scheduling management system built with React/TypeScript frontend and Express.js backend. The application is designed for internal use by administrators to manage appointments with productivity tracking and SLA (Service Level Agreement) monitoring. It features a modern, clean interface using shadcn/ui components and includes automatic Pomodoro break scheduling.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Storage**: DatabaseStorage implementation with persistent PostgreSQL backend
- **API Design**: RESTful APIs with proper error handling

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless provider
- **ORM**: Drizzle with PostgreSQL dialect and serverless connection
- **Schema**: Shared TypeScript schemas between client and server
- **Migrations**: Drizzle Kit for database migrations (`npm run db:push`)
- **Connection**: Neon serverless database with WebSocket support and connection pooling
- **Storage Layer**: DatabaseStorage class implementing persistent data operations

## Key Components

### Database Schema
- **Appointments Table**: Core entity storing all appointment data including title, description, scheduling details, SLA settings, and status tracking
- **Schema Validation**: Zod schemas for runtime validation and type safety
- **Auto-generated Fields**: UUID primary keys, calculated end times, creation timestamps

### Frontend Components
- **Dashboard**: Main interface with calendar and list views
- **AppointmentForm**: Modal form for creating/editing appointments with duration and SLA controls
- **CalendarView**: Monthly calendar with appointment indicators and status colors
- **TaskList**: Daily appointment list with action buttons
- **ProductivitySidebar**: Analytics dashboard with filtering capabilities

### Backend Services
- **Storage Interface**: Abstracted storage layer supporting multiple implementations
- **Memory Storage**: Development storage with full CRUD operations
- **Route Handlers**: RESTful endpoints for appointments and analytics
- **Automatic Pomodoro**: System automatically creates 5-minute break appointments

## Data Flow

1. **Appointment Creation**: Form submission → validation → storage → automatic Pomodoro creation
2. **Status Updates**: User actions → API calls → storage updates → UI refresh
3. **Analytics**: Real-time calculations of productivity metrics and SLA compliance
4. **Calendar Navigation**: Date selection → filtered appointment queries → visual updates

## External Dependencies

### Production Dependencies
- **UI Components**: Extensive Radix UI component library
- **Database**: Neon serverless PostgreSQL
- **Validation**: Zod for schema validation
- **Date Handling**: date-fns for date calculations
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS with class variance authority

### Development Tools
- **Build**: Vite with React plugin
- **TypeScript**: Strict configuration with path mapping
- **Database Tools**: Drizzle Kit for migrations
- **Development**: tsx for TypeScript execution

## Deployment Strategy

### Build Process
1. **Frontend**: Vite builds optimized React application to `dist/public`
2. **Backend**: esbuild bundles TypeScript server to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- **Database URL**: Required environment variable for PostgreSQL connection
- **Development**: Hot reload with Vite dev server and tsx
- **Production**: Optimized builds with external package bundling

### Key Features
- **SLA Monitoring**: Automatic tracking of appointment completion against defined time limits
- **Pomodoro Integration**: Automatic 5-minute break scheduling after each appointment
- **Status Management**: Visual indicators for completed, delayed, and upcoming appointments
- **Productivity Analytics**: Real-time metrics on completion rates and SLA compliance
- **Modern UI**: Clean, responsive design with proper accessibility support