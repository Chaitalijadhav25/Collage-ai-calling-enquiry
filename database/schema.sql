-- ============================================================================
-- SVKM NMIMS Global University, Dhule - Database Schema (PostgreSQL)
-- ============================================================================

CREATE TABLE IF NOT EXISTS academic_years (
    id VARCHAR(50) PRIMARY KEY,
    year_name VARCHAR(20) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT false,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schools (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programs (
    id VARCHAR(50) PRIMARY KEY,
    school_id VARCHAR(50) REFERENCES schools(id) ON DELETE CASCADE,
    school_name VARCHAR(255) NOT NULL,
    program_name VARCHAR(255) NOT NULL,
    degree VARCHAR(50) NOT NULL,
    specialization VARCHAR(100),
    total_seats INT,           -- NULL if unverified / awaiting official publish
    available_seats INT,       -- NULL if unverified
    academic_year VARCHAR(20) NOT NULL,
    admission_status VARCHAR(30) DEFAULT 'OPEN',
    eligibility TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_programs_school ON programs(school_id);
CREATE INDEX IF NOT EXISTS idx_programs_year ON programs(academic_year);
CREATE INDEX IF NOT EXISTS idx_programs_active ON programs(is_active);

CREATE TABLE IF NOT EXISTS counsellors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    department VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_primary_transfer BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    user_type VARCHAR(20) DEFAULT 'unknown',
    preferred_language VARCHAR(10) DEFAULT 'en',
    interested_school VARCHAR(255),
    engineering_interest BOOLEAN,
    marks_10th NUMERIC(5,2),
    marks_12th NUMERIC(5,2),
    cet_percentile NUMERIC(5,2),
    interested_branch VARCHAR(255),
    call_status VARCHAR(30) DEFAULT 'QUEUED',
    call_outcome VARCHAR(30) DEFAULT 'COMPLETED',
    transfer_status VARCHAR(30) DEFAULT 'NOT_TRANSFERRED',
    last_call_id VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_outcome ON leads(call_outcome);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE TABLE IF NOT EXISTS calls (
    id VARCHAR(50) PRIMARY KEY,
    lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE SET NULL,
    student_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    provider VARCHAR(30) NOT NULL,
    provider_call_id VARCHAR(100),
    status VARCHAR(30) NOT NULL,
    outcome VARCHAR(30) DEFAULT 'COMPLETED',
    language VARCHAR(10) DEFAULT 'en',
    conversation_state VARCHAR(50) NOT NULL,
    duration_seconds INT DEFAULT 0,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    transferred_to VARCHAR(50),
    transfer_reason TEXT,
    recording_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_calls_phone ON calls(phone_number);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);

CREATE TABLE IF NOT EXISTS call_transcripts (
    id VARCHAR(50) PRIMARY KEY,
    call_id VARCHAR(50) REFERENCES calls(id) ON DELETE CASCADE,
    speaker VARCHAR(20) NOT NULL,
    text TEXT NOT NULL,
    language VARCHAR(10),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transcripts_call_id ON call_transcripts(call_id);

CREATE TABLE IF NOT EXISTS callback_requests (
    id VARCHAR(50) PRIMARY KEY,
    lead_id VARCHAR(50) REFERENCES leads(id) ON DELETE SET NULL,
    student_name VARCHAR(150) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time VARCHAR(20) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_callback_status ON callback_requests(status);
CREATE INDEX IF NOT EXISTS idx_callback_phone ON callback_requests(phone_number);

CREATE TABLE IF NOT EXISTS knowledge_documents (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    source_url TEXT,
    academic_year VARCHAR(20) NOT NULL,
    is_verified BOOLEAN DEFAULT true,
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
