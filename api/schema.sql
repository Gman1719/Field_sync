-- ============================================================
-- FieldSync PostgreSQL Database Schema
-- Database: fieldsync_db
-- ============================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    region VARCHAR(50),
    supervisor_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    phone VARCHAR(50),
    shift VARCHAR(50) DEFAULT 'Day',
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. REPORTS TABLE
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(50) UNIQUE NOT NULL,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100),
    supervisor_id VARCHAR(50),
    report_date DATE NOT NULL,
    region VARCHAR(50),
    site_name VARCHAR(100),
    registrations INTEGER DEFAULT 0,
    operational_status VARCHAR(50),
    attendance VARCHAR(50),
    work_hours NUMERIC(5,2) DEFAULT 0,
    activities TEXT,
    equipment_status TEXT,
    materials_used TEXT,
    team_members TEXT,
    weather_conditions VARCHAR(100),
    community_feedback TEXT,
    challenges TEXT,
    issues TEXT,
    comments TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100),
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    check_in VARCHAR(20),
    check_out VARCHAR(20),
    work_hours NUMERIC(5,2) DEFAULT 0,
    region VARCHAR(50),
    supervisor_id VARCHAR(50),
    supervisor_name VARCHAR(100),
    notes TEXT,
    approved BOOLEAN DEFAULT false,
    approved_by VARCHAR(50),
    approved_at TIMESTAMP WITH TIME ZONE,
    seen_by_manager BOOLEAN DEFAULT false,
    seen_at TIMESTAMP WITH TIME ZONE,
    submitted_to_manager BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CITIZENS TABLE
CREATE TABLE IF NOT EXISTS citizens (
    id SERIAL PRIMARY KEY,
    national_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(100),
    address TEXT,
    region VARCHAR(50),
    district VARCHAR(100),
    village VARCHAR(100),
    occupation VARCHAR(100),
    marital_status VARCHAR(50),
    registration_date DATE DEFAULT CURRENT_DATE,
    registered_by VARCHAR(50),
    registered_by_name VARCHAR(100),
    id_type VARCHAR(50),
    id_number VARCHAR(50),
    biometrics BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. LEAVES TABLE
CREATE TABLE IF NOT EXISTS leaves (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_by VARCHAR(50),
    approved_at TIMESTAMP WITH TIME ZONE,
    synced BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    type VARCHAR(50),
    permission_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_by VARCHAR(50),
    approved_at TIMESTAMP WITH TIME ZONE,
    synced BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    assigned_by VARCHAR(50),
    assigned_by_name VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 8. SCREEN TIME TABLE
CREATE TABLE IF NOT EXISTS screen_time (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) NOT NULL,
    employee_name VARCHAR(100),
    date DATE NOT NULL,
    login_time VARCHAR(20),
    logout_time VARCHAR(20),
    total_screen_time NUMERIC(5,2) DEFAULT 0,
    screen_time_limit NUMERIC(5,2) DEFAULT 8,
    trust_score INTEGER DEFAULT 100,
    is_logged_in BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    verified_by VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    user_name VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip VARCHAR(50) DEFAULT '127.0.0.1'
);

-- 10. ALERTS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    type VARCHAR(50) DEFAULT 'emergency',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT false,
    target_all BOOLEAN DEFAULT true,
    target_employee_id VARCHAR(50),
    sent_by VARCHAR(50),
    sent_by_name VARCHAR(100)
);

-- 11. VERIFICATION HISTORY TABLE
CREATE TABLE IF NOT EXISTS verification_history (
    id VARCHAR(50) PRIMARY KEY,
    officer_id VARCHAR(50) NOT NULL,
    officer_name VARCHAR(100),
    question TEXT,
    answer TEXT,
    success BOOLEAN DEFAULT false,
    score INTEGER DEFAULT 0,
    response_time INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    message TEXT,
    penalties JSONB DEFAULT '[]'::jsonb
);

-- 12. SUPERVISOR REPORTS TABLE
CREATE TABLE IF NOT EXISTS supervisor_reports (
    id VARCHAR(50) PRIMARY KEY,
    supervisor_id VARCHAR(50) NOT NULL,
    supervisor_name VARCHAR(100),
    officer_id VARCHAR(50),
    officer_name VARCHAR(100),
    report_date DATE NOT NULL,
    region VARCHAR(50),
    punctuality VARCHAR(50),
    teamwork VARCHAR(50),
    communication VARCHAR(50),
    comments TEXT,
    recommendations TEXT,
    overall_rating INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    site_visits INTEGER DEFAULT 0,
    issues_resolved INTEGER DEFAULT 0,
    challenges TEXT,
    achievements TEXT,
    team_morale VARCHAR(50),
    resource_status VARCHAR(50),
    overall_status VARCHAR(50)
);

-- ============================================================
-- SEED DATA: INITIAL SYSTEM USERS
-- ============================================================
INSERT INTO users (id, employee_id, name, email, password_hash, role, region, status, phone)
VALUES 
    ('u_off', 'FO000', 'Field Officer', 'officer@fieldsync.com', 'Password123!', 'field_officer', 'North', 'active', '+251911000200'),
    ('u_sup', 'SUP000', 'Regional Supervisor', 'supervisor@fieldsync.com', 'Password123!', 'supervisor', 'North', 'active', '+251911000100'),
    ('u_mgr', 'MGR000', 'System Manager', 'manager@fieldsync.com', 'Password123!', 'manager', 'All', 'active', '+251911000000'),
    ('o1', 'FO001', 'መሠረት አለሙ', 'meseret@fieldsync.com', 'officer123', 'field_officer', 'North', 'active', '+251911000201'),
    ('s1', 'SUP001', 'ብርሃን ገብረእግዚአብሔር', 'birhan@fieldsync.com', 'super123', 'supervisor', 'North', 'active', '+251911000101'),
    ('m1', 'MGR001', 'አበበ በቀለ', 'abebe@fieldsync.com', 'manager123', 'manager', 'All', 'active', '+251911000001')
ON CONFLICT (id) DO NOTHING;
