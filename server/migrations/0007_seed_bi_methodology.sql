-- Seed data for Business Intelligence Methodology
-- This creates a standardized BI development methodology with stages, tasks, and subtasks

-- Insert BI Stages (Standard BI Development Methodology)
INSERT INTO bi_stages (name, description, color, order_index, estimated_duration_days, is_required, best_practices, deliverables) VALUES
  (
    'Business Analysis & Requirements',
    'Understanding business needs, defining requirements, and establishing project scope',
    '#3B82F6',
    1,
    10,
    true,
    '["Conduct stakeholder interviews", "Document current state processes", "Define success metrics", "Validate requirements with business users"]',
    '["Business Requirements Document", "Stakeholder Analysis", "Success Criteria", "Project Charter"]'
  ),
  (
    'Data Discovery & Assessment',
    'Analyzing existing data sources, quality assessment, and data mapping',
    '#10B981',
    2,
    7,
    true,
    '["Profile all data sources", "Document data lineage", "Assess data quality issues", "Identify data gaps"]',
    '["Data Inventory", "Data Quality Report", "Source-to-Target Mapping", "Data Governance Plan"]'
  ),
  (
    'Architecture & Design',
    'Designing the technical architecture, data models, and solution blueprint',
    '#F59E0B',
    3,
    14,
    true,
    '["Follow dimensional modeling principles", "Design for scalability", "Consider security requirements", "Plan for data governance"]',
    '["Technical Architecture Document", "Data Model", "ETL Design", "Security Plan"]'
  ),
  (
    'Development & Implementation',
    'Building ETL processes, data warehouse, and BI solutions',
    '#EF4444',
    4,
    21,
    true,
    '["Use version control", "Implement automated testing", "Follow coding standards", "Document all processes"]',
    '["ETL Processes", "Data Warehouse", "BI Reports/Dashboards", "Technical Documentation"]'
  ),
  (
    'Testing & Quality Assurance',
    'Comprehensive testing of data accuracy, performance, and user acceptance',
    '#8B5CF6',
    5,
    10,
    true,
    '["Test data accuracy end-to-end", "Validate business rules", "Performance testing", "User acceptance testing"]',
    '["Test Plans", "Test Results", "Performance Reports", "UAT Sign-off"]'
  ),
  (
    'Deployment & Go-Live',
    'Production deployment, user training, and go-live activities',
    '#06B6D4',
    6,
    5,
    true,
    '["Plan deployment carefully", "Provide comprehensive training", "Monitor closely post-deployment", "Have rollback plan ready"]',
    '["Deployment Guide", "Training Materials", "Go-Live Checklist", "Support Documentation"]'
  ),
  (
    'Monitoring & Optimization',
    'Post-deployment monitoring, performance optimization, and continuous improvement',
    '#6B7280',
    7,
    30,
    false,
    '["Monitor system performance", "Track usage metrics", "Gather user feedback", "Plan iterative improvements"]',
    '["Monitoring Dashboard", "Performance Reports", "User Feedback Analysis", "Improvement Roadmap"]'
  )
ON CONFLICT DO NOTHING;

-- Insert Main Tasks for Business Analysis & Requirements stage
INSERT INTO bi_main_tasks (stage_id, name, description, order_index, estimated_hours, is_required, prerequisites, best_practices, deliverables) VALUES
  (
    1,
    'Stakeholder Analysis & Interviews',
    'Identify and interview key stakeholders to understand business needs',
    1,
    16,
    true,
    '[]',
    '["Prepare structured interview questions", "Include both business and technical stakeholders", "Document all requirements clearly"]',
    '["Stakeholder Matrix", "Interview Notes", "Initial Requirements List"]'
  ),
  (
    1,
    'Current State Analysis',
    'Analyze existing processes, systems, and reporting capabilities',
    2,
    12,
    true,
    '[1]',
    '["Map current data flows", "Identify pain points", "Document existing reports", "Assess current tools"]',
    '["Current State Documentation", "Process Maps", "Gap Analysis"]'
  ),
  (
    1,
    'Requirements Definition',
    'Define detailed functional and non-functional requirements',
    3,
    20,
    true,
    '[1,2]',
    '["Use clear, measurable language", "Prioritize requirements", "Include data quality requirements", "Define acceptance criteria"]',
    '["Business Requirements Document", "Functional Specifications", "Non-functional Requirements"]'
  ),
  (
    1,
    'Success Metrics & KPIs',
    'Define project success criteria and key performance indicators',
    4,
    8,
    true,
    '[3]',
    '["Make metrics SMART", "Align with business objectives", "Include both technical and business metrics"]',
    '["Success Criteria Document", "KPI Dashboard Design", "Measurement Plan"]'
  )
ON CONFLICT DO NOTHING;

-- Insert Main Tasks for Data Discovery & Assessment stage
INSERT INTO bi_main_tasks (stage_id, name, description, order_index, estimated_hours, is_required, prerequisites, best_practices, deliverables) VALUES
  (
    2,
    'Data Source Inventory',
    'Catalog all available data sources and their characteristics',
    1,
    12,
    true,
    '[]',
    '["Document all data sources", "Include both structured and unstructured data", "Note access methods and permissions"]',
    '["Data Source Catalog", "Access Requirements", "Data Dictionary"]'
  ),
  (
    2,
    'Data Quality Assessment',
    'Analyze data quality issues, completeness, and accuracy',
    2,
    16,
    true,
    '[1]',
    '["Use automated profiling tools", "Check for duplicates and inconsistencies", "Validate business rules", "Document quality issues"]',
    '["Data Quality Report", "Quality Rules Documentation", "Remediation Plan"]'
  ),
  (
    2,
    'Data Mapping & Lineage',
    'Map data flows and establish source-to-target relationships',
    3,
    20,
    true,
    '[1,2]',
    '["Create detailed mapping documents", "Trace data lineage", "Document transformations", "Validate with business users"]',
    '["Source-to-Target Mapping", "Data Lineage Documentation", "Transformation Rules"]'
  )
ON CONFLICT DO NOTHING;

-- Insert some sample subtasks for the first main task
INSERT INTO bi_subtasks (main_task_id, name, description, order_index, estimated_minutes, is_required, skill_level, tools, best_practices) VALUES
  (
    1,
    'Prepare Stakeholder Interview Questions',
    'Create structured questions for different stakeholder types',
    1,
    60,
    true,
    'intermediate',
    '["Microsoft Word", "Google Docs", "Interview Templates"]',
    '["Tailor questions to stakeholder role", "Include both open and closed questions", "Prepare follow-up questions"]'
  ),
  (
    1,
    'Schedule Stakeholder Interviews',
    'Coordinate and schedule interviews with all key stakeholders',
    2,
    45,
    true,
    'beginner',
    '["Outlook", "Google Calendar", "Calendly"]',
    '["Allow sufficient time for each interview", "Send agenda in advance", "Confirm attendance"]'
  ),
  (
    1,
    'Conduct Stakeholder Interviews',
    'Execute interviews and document findings',
    3,
    240,
    true,
    'intermediate',
    '["Teams", "Zoom", "Recording Software", "Note-taking Apps"]',
    '["Record sessions with permission", "Take detailed notes", "Ask clarifying questions", "Summarize key points"]'
  ),
  (
    1,
    'Analyze Interview Results',
    'Synthesize interview findings and identify common themes',
    4,
    120,
    true,
    'intermediate',
    '["Excel", "Miro", "Confluence", "Analysis Tools"]',
    '["Look for patterns and themes", "Identify conflicting requirements", "Prioritize findings", "Validate understanding"]'
  )
ON CONFLICT DO NOTHING;

-- Insert BI Project Templates
INSERT INTO bi_project_templates (name, description, category, complexity, estimated_duration_weeks, required_skills, recommended_team_size, is_active) VALUES
  (
    'Standard Data Warehouse Project',
    'Complete data warehouse implementation with ETL processes and reporting',
    'data_warehouse',
    'complex',
    16,
    '["SQL", "ETL Tools", "Data Modeling", "Business Analysis", "Data Visualization"]',
    4,
    true
  ),
  (
    'Business Intelligence Dashboard',
    'Interactive dashboard development with data integration',
    'reporting',
    'medium',
    8,
    '["SQL", "BI Tools", "Data Visualization", "Business Analysis"]',
    2,
    true
  ),
  (
    'Data Analytics Platform',
    'Advanced analytics platform with machine learning capabilities',
    'analytics',
    'complex',
    20,
    '["Python/R", "Machine Learning", "SQL", "Data Engineering", "Statistics"]',
    5,
    true
  ),
  (
    'ETL Process Implementation',
    'Focused ETL development for data integration',
    'etl',
    'medium',
    6,
    '["SQL", "ETL Tools", "Data Integration", "Data Quality"]',
    2,
    true
  ),
  (
    'Quick Reporting Solution',
    'Rapid development of basic reports and dashboards',
    'reporting',
    'simple',
    4,
    '["SQL", "Reporting Tools", "Data Visualization"]',
    1,
    true
  )
ON CONFLICT DO NOTHING;

-- Link templates to stages (Standard Data Warehouse Project - includes all stages)
INSERT INTO bi_template_stages (template_id, stage_id, order_index, is_optional, custom_duration_days) VALUES
  (1, 1, 1, false, 10),
  (1, 2, 2, false, 7),
  (1, 3, 3, false, 14),
  (1, 4, 4, false, 21),
  (1, 5, 5, false, 10),
  (1, 6, 6, false, 5),
  (1, 7, 7, true, 30)
ON CONFLICT DO NOTHING;

-- Link templates to stages (BI Dashboard - simplified process)
INSERT INTO bi_template_stages (template_id, stage_id, order_index, is_optional, custom_duration_days) VALUES
  (2, 1, 1, false, 5),
  (2, 2, 2, false, 3),
  (2, 3, 3, false, 7),
  (2, 4, 4, false, 10),
  (2, 5, 5, false, 5),
  (2, 6, 6, false, 3),
  (2, 7, 7, true, 15)
ON CONFLICT DO NOTHING;

-- Link templates to stages (Analytics Platform - extended process)
INSERT INTO bi_template_stages (template_id, stage_id, order_index, is_optional, custom_duration_days) VALUES
  (3, 1, 1, false, 12),
  (3, 2, 2, false, 10),
  (3, 3, 3, false, 18),
  (3, 4, 4, false, 28),
  (3, 5, 5, false, 14),
  (3, 6, 6, false, 7),
  (3, 7, 7, false, 45)
ON CONFLICT DO NOTHING;
