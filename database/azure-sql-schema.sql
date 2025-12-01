-- =============================================
-- InterTalent Portal - Azure SQL Schema
-- =============================================
-- Run this script in your Azure SQL Database
-- to create all necessary tables and indexes

-- Profiles Table
CREATE TABLE profiles (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    first_name NVARCHAR(100) NOT NULL,
    last_initial NVARCHAR(1) NOT NULL,
    city NVARCHAR(100) NOT NULL,
    state NVARCHAR(2) NOT NULL,
    zip_code NVARCHAR(10) NOT NULL,
    professional_summary NVARCHAR(MAX) NOT NULL,
    office NVARCHAR(100) NOT NULL,
    profession_type NVARCHAR(100) NOT NULL,
    skills NVARCHAR(MAX) NULL, -- JSON array stored as text
    source_file NVARCHAR(255) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Location Emails Table (for request routing)
CREATE TABLE location_emails (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    location_name NVARCHAR(100) NOT NULL UNIQUE,
    distribution_email NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Indexes for Performance
CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE is_active = 1;
CREATE INDEX idx_profiles_profession ON profiles(profession_type);
CREATE INDEX idx_profiles_state ON profiles(state);
CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_zip ON profiles(zip_code);
CREATE INDEX idx_profiles_office ON profiles(office);
CREATE INDEX idx_profiles_name ON profiles(first_name, last_initial);

-- Full-text search index for professional_summary (optional but recommended)
-- Note: Requires full-text catalog to be enabled on database
-- Uncomment if you want full-text search capabilities:
-- CREATE FULLTEXT CATALOG ft_catalog AS DEFAULT;
-- CREATE FULLTEXT INDEX ON profiles(professional_summary)
--     KEY INDEX PK__profiles__3213E83F (id);

-- Trigger to auto-update updated_at timestamp
GO
CREATE TRIGGER trg_profiles_updated_at
ON profiles
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE profiles
    SET updated_at = GETUTCDATE()
    FROM profiles p
    INNER JOIN inserted i ON p.id = i.id;
END;
GO

-- Trigger for location_emails
CREATE TRIGGER trg_location_emails_updated_at
ON location_emails
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE location_emails
    SET updated_at = GETUTCDATE()
    FROM location_emails le
    INNER JOIN inserted i ON le.id = i.id;
END;
GO

-- Verify tables created
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- Check profile count after migration
-- SELECT COUNT(*) as total_profiles FROM profiles WHERE is_active = 1;
