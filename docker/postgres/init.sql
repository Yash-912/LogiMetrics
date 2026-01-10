-- ============================================================
-- LogiMetrics PostgreSQL Initialization Script
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS logistics;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS audit;

-- Grant permissions to Yash
GRANT ALL PRIVILEGES ON DATABASE logimetrics TO "Yash";
GRANT ALL PRIVILEGES ON SCHEMA logistics TO "Yash";
GRANT ALL PRIVILEGES ON SCHEMA analytics TO "Yash";
GRANT ALL PRIVILEGES ON SCHEMA audit TO "Yash";

-- Set default schema search path
ALTER DATABASE logimetrics SET search_path TO public, logistics, analytics;

-- Create audit function for tracking changes
CREATE OR REPLACE FUNCTION audit.log_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit.change_log (table_name, operation, old_data, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), current_user, NOW());
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.change_log (table_name, operation, old_data, new_data, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_user, NOW());
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit.change_log (table_name, operation, new_data, changed_by, changed_at)
        VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW), current_user, NOW());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit.change_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(100),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Create index on audit log
CREATE INDEX IF NOT EXISTS idx_audit_table_name ON audit.change_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON audit.change_log(changed_at);

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'LogiMetrics PostgreSQL initialized successfully for user Yash';
END $$;
