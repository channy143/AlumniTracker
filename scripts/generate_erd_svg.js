const fs = require('fs');
const path = require('path');

// SVG Configuration
const WIDTH = 3400;
const HEIGHT = 2150;

// Entities definition
const ENTITIES = [
  // COLUMN 1: IDENTITY, WHITELIST & COMPLIANCE (x: 80)
  {
    id: "users",
    name: "users",
    type: "strong",
    col: 1,
    x: 80,
    y: 220,
    w: 420,
    h: 280,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "email", type: "VARCHAR(255)", key: "UK", note: "Institutional Email" },
      { name: "password_hash", type: "VARCHAR(255)", key: "", note: "Bcrypt Hash" },
      { name: "role", type: "VARCHAR(20)", key: "", note: "admin | staff | alumni" },
      { name: "is_verified", type: "BOOLEAN", key: "", note: "Registrar Verified" },
      { name: "is_active", type: "BOOLEAN", key: "", note: "Active Status" },
      { name: "created_at", type: "TIMESTAMPTZ", key: "", note: "Audit Timestamp" }
    ]
  },
  {
    id: "alumni_eligible",
    name: "alumni_eligible",
    type: "strong",
    col: 1,
    x: 80,
    y: 670,
    w: 420,
    h: 270,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "student_id", type: "VARCHAR(50)", key: "UK", note: "Institutional ID" },
      { name: "first_name", type: "VARCHAR(100)", key: "", note: "Legal First Name" },
      { name: "last_name", type: "VARCHAR(100)", key: "", note: "Legal Last Name" },
      { name: "degree_program", type: "VARCHAR(150)", key: "", note: "Degree Program" },
      { name: "graduation_year", type: "INTEGER", key: "", note: "Batch Year" },
      { name: "user_id", type: "UUID", key: "FK", note: "Nullable (Claimed)" }
    ]
  },
  {
    id: "audit_logs",
    name: "audit_logs",
    type: "strong",
    col: 1,
    x: 80,
    y: 1120,
    w: 420,
    h: 240,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "user_id", type: "UUID", key: "FK", note: "Nullable (Forensic Trail)" },
      { name: "action", type: "VARCHAR(50)", key: "", note: "Action performed" },
      { name: "entity", type: "VARCHAR(50)", key: "", note: "Affected Table" },
      { name: "details", type: "JSONB", key: "", note: "Before/After state" },
      { name: "created_at", type: "TIMESTAMPTZ", key: "", note: "RA 10173 Audit Log" }
    ]
  },

  // COLUMN 2: PROFILES & CREDENTIAL SUBORDINATES (x: 680)
  {
    id: "profiles",
    name: "profiles",
    type: "strong",
    col: 2,
    x: 680,
    y: 220,
    w: 420,
    h: 280,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "user_id", type: "UUID", key: "FK", note: "1:1 Identifying (CASCADE)" },
      { name: "id_number", type: "VARCHAR(50)", key: "UK", note: "CTU Student ID" },
      { name: "first_name", type: "VARCHAR(100)", key: "", note: "First Name" },
      { name: "last_name", type: "VARCHAR(100)", key: "", note: "Last Name" },
      { name: "headline", type: "VARCHAR(200)", key: "", note: "Professional Title" },
      { name: "privacy_settings", type: "JSONB", key: "", note: "Field Visibility Controls" }
    ]
  },
  {
    id: "user_trusted_devices",
    name: "user_trusted_devices",
    type: "weak",
    col: 2,
    x: 680,
    y: 670,
    w: 420,
    h: 240,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "user_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "device_hash", type: "VARCHAR(255)", key: "", note: "Hardware Signature" },
      { name: "device_name", type: "VARCHAR(100)", key: "", note: "OS / Browser" },
      { name: "is_trusted", type: "BOOLEAN", key: "", note: "MFA Bypassed" },
      { name: "last_used_at", type: "TIMESTAMPTZ", key: "", note: "Session Timestamp" }
    ]
  },
  {
    id: "otp_codes",
    name: "otp_codes",
    type: "weak",
    col: 2,
    x: 680,
    y: 1120,
    w: 420,
    h: 240,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "user_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "code_hash", type: "VARCHAR(255)", key: "", note: "Cryptographic OTP" },
      { name: "purpose", type: "VARCHAR(50)", key: "", note: "login_mfa | reset" },
      { name: "expires_at", type: "TIMESTAMPTZ", key: "", note: "10-Minute Window" },
      { name: "is_used", type: "BOOLEAN", key: "", note: "Single-Use Flag" }
    ]
  },

  // COLUMN 3: CAREER DOSSIER WEAK ENTITIES (x: 1280)
  {
    id: "education",
    name: "education",
    type: "weak",
    col: 3,
    x: 1280,
    y: 120,
    w: 420,
    h: 240,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "profile_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "program", type: "VARCHAR(200)", key: "", note: "Degree Program" },
      { name: "major", type: "VARCHAR(200)", key: "", note: "Specialization" },
      { name: "year_graduated", type: "INTEGER", key: "", note: "Batch Year" },
      { name: "campus", type: "VARCHAR(200)", key: "", note: "CTU Naga Campus" }
    ]
  },
  {
    id: "employment",
    name: "employment",
    type: "weak",
    col: 3,
    x: 1280,
    y: 450,
    w: 420,
    h: 270,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "profile_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "company_name", type: "VARCHAR(200)", key: "", note: "Employer" },
      { name: "position", type: "VARCHAR(200)", key: "", note: "Job Title" },
      { name: "employment_status", type: "VARCHAR(30)", key: "", note: "employed | self-emp" },
      { name: "salary_range", type: "VARCHAR(50)", key: "", note: "Income Bracket" },
      { name: "is_current", type: "BOOLEAN", key: "", note: "Active Role" }
    ]
  },
  {
    id: "skills",
    name: "skills",
    type: "weak",
    col: 3,
    x: 1280,
    y: 810,
    w: 420,
    h: 240,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "profile_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "name", type: "VARCHAR(100)", key: "", note: "Skill Keyword" },
      { name: "category", type: "VARCHAR(100)", key: "", note: "technical | domain" },
      { name: "proficiency_level", type: "INTEGER", key: "", note: "Scale 1 to 5" },
      { name: "is_verified", type: "BOOLEAN", key: "", note: "Assessed Flag" }
    ]
  },
  {
    id: "certifications",
    name: "certifications",
    type: "weak",
    col: 3,
    x: 1280,
    y: 1140,
    w: 420,
    h: 240,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "profile_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "name", type: "VARCHAR(200)", key: "", note: "Certificate Title" },
      { name: "issuer", type: "VARCHAR(200)", key: "", note: "Accredited Body" },
      { name: "issue_date", type: "DATE", key: "", note: "Conferral Date" },
      { name: "credential_url", type: "TEXT", key: "", note: "Verification Link" }
    ]
  },
  {
    id: "career_feedback",
    name: "career_feedback",
    type: "weak",
    col: 3,
    x: 1280,
    y: 1470,
    w: 420,
    h: 220,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "profile_id", type: "UUID", key: "FK", note: "1:1 Mandatory (CASCADE)" },
      { name: "curriculum_suggestions", type: "TEXT", key: "", note: "Curriculum Critique" },
      { name: "relevance_rating", type: "VARCHAR(20)", key: "", note: "relevance_metric" },
      { name: "submitted_at", type: "TIMESTAMPTZ", key: "", note: "Timestamp" }
    ]
  },

  // COLUMN 4: GTS TRACER & JOBS (x: 1900)
  {
    id: "surveys",
    name: "surveys",
    type: "strong",
    col: 4,
    x: 1900,
    y: 120,
    w: 420,
    h: 240,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "title", type: "VARCHAR(300)", key: "", note: "Campaign Title" },
      { name: "questions", type: "JSONB", key: "", note: "Questionnaire Schema" },
      { name: "target_groups", type: "TEXT[]", key: "", note: "Target Cohorts" },
      { name: "is_active", type: "BOOLEAN", key: "", note: "Live Campaign Flag" },
      { name: "expires_at", type: "TIMESTAMPTZ", key: "", note: "Deadline" }
    ]
  },
  {
    id: "survey_responses",
    name: "survey_responses",
    type: "weak",
    col: 4,
    x: 1900,
    y: 470,
    w: 420,
    h: 240,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "survey_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "user_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "responses", type: "JSONB", key: "", note: "CHED GTS Data" },
      { name: "submitted_at", type: "TIMESTAMPTZ", key: "", note: "Submission Timestamp" }
    ]
  },
  {
    id: "job_postings",
    name: "job_postings",
    type: "strong",
    col: 4,
    x: 1900,
    y: 840,
    w: 420,
    h: 270,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "company_id", type: "UUID", key: "FK", note: "Nullable (Corporate Post)" },
      { name: "posted_by", type: "UUID", key: "FK", note: "Nullable (Alumni Post)" },
      { name: "position", type: "VARCHAR(200)", key: "", note: "Job Title" },
      { name: "job_type", type: "VARCHAR(20)", key: "", note: "full-time | contract" },
      { name: "requirements", type: "TEXT[]", key: "", note: "Skills Array" },
      { name: "expires_at", type: "TIMESTAMPTZ", key: "", note: "Expiration Date" }
    ]
  },
  {
    id: "job_applications",
    name: "job_applications",
    type: "weak",
    col: 4,
    x: 1900,
    y: 1230,
    w: 420,
    h: 240,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "job_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "user_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "status", type: "VARCHAR(20)", key: "", note: "pending | shortlisted" },
      { name: "match_score", type: "INTEGER", key: "", note: "Algorithmic % Score" },
      { name: "applied_at", type: "TIMESTAMPTZ", key: "", note: "Timestamp" }
    ]
  },

  // COLUMN 5: ENTERPRISE, COMMUNITY & NETWORKING (x: 2520)
  {
    id: "companies",
    name: "companies",
    type: "strong",
    col: 5,
    x: 2520,
    y: 120,
    w: 420,
    h: 240,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "name", type: "VARCHAR(200)", key: "", note: "Corporate Partner Name" },
      { name: "industry", type: "VARCHAR(100)", key: "", note: "Industry Sector" },
      { name: "is_verified", type: "BOOLEAN", key: "", note: "University Vetted" },
      { name: "verified_by", type: "UUID", key: "FK", note: "Nullable FK -> users(id)" }
    ]
  },
  {
    id: "community_groups",
    name: "community_groups",
    type: "strong",
    col: 5,
    x: 2520,
    y: 470,
    w: 420,
    h: 240,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "name", type: "VARCHAR(200)", key: "", note: "Chapter Name" },
      { name: "category", type: "VARCHAR(50)", key: "", note: "tech | business | general" },
      { name: "member_count", type: "INTEGER", key: "", note: "Roster Count" },
      { name: "created_by", type: "UUID", key: "FK", note: "Nullable FK -> profiles(id)" }
    ]
  },
  {
    id: "group_members",
    name: "group_members",
    type: "weak",
    col: 5,
    x: 2520,
    y: 840,
    w: 420,
    h: 220,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "group_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "profile_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "role", type: "VARCHAR(20)", key: "", note: "member | moderator | admin" },
      { name: "joined_at", type: "TIMESTAMPTZ", key: "", note: "Membership Timestamp" }
    ]
  },
  {
    id: "forum_posts",
    name: "forum_posts",
    type: "weak",
    col: 5,
    x: 2520,
    y: 1180,
    w: 420,
    h: 220,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "group_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "author_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "title", type: "VARCHAR(300)", key: "", note: "Discussion Thread Title" },
      { name: "content", type: "TEXT", key: "", note: "Body Content" }
    ]
  },
  {
    id: "connections",
    name: "connections",
    type: "weak",
    col: 5,
    x: 2520,
    y: 1520,
    w: 420,
    h: 210,
    attributes: [
      { name: "id", type: "UUID", key: "PK", note: "Primary Key" },
      { name: "requester_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "recipient_id", type: "UUID", key: "FK", note: "MANDATORY FK (CASCADE)" },
      { name: "status", type: "VARCHAR(20)", key: "", note: "pending | accepted" }
    ]
  }
];

// Relationships with exact collision-free orthogonal paths
const RELATIONSHIPS = [
  // ----------------------------------------------------
  // STRONG (SOLID LINES: Identifying / ON DELETE CASCADE)
  // ----------------------------------------------------
  {
    id: "rel_users_profiles",
    type: "strong",
    from: "users",
    to: "profiles",
    card: "1 : 1",
    label: "identifies (1:1)",
    rule: "CASCADE",
    path: "M 500 360 L 680 360",
    labelPos: { x: 590, y: 350 }
  },
  {
    id: "rel_users_devices",
    type: "strong",
    from: "users",
    to: "user_trusted_devices",
    card: "1 : N",
    label: "fingerprints (1:N)",
    rule: "CASCADE",
    path: "M 380 500 L 380 580 L 760 580 L 760 670",
    labelPos: { x: 570, y: 570 }
  },
  {
    id: "rel_users_otp",
    type: "strong",
    from: "users",
    to: "otp_codes",
    card: "1 : N",
    label: "issues (1:N)",
    rule: "CASCADE",
    path: "M 320 500 L 320 600 L 600 600 L 600 1200 L 680 1200",
    labelPos: { x: 600, y: 920 }
  },
  {
    id: "rel_prof_edu",
    type: "strong",
    from: "profiles",
    to: "education",
    card: "1 : N",
    label: "attained (1:N)",
    rule: "CASCADE",
    path: "M 1100 270 L 1180 270 L 1180 220 L 1280 220",
    labelPos: { x: 1180, y: 245 }
  },
  {
    id: "rel_prof_emp",
    type: "strong",
    from: "profiles",
    to: "employment",
    card: "1 : N",
    label: "records (1:N)",
    rule: "CASCADE",
    path: "M 1100 330 L 1190 330 L 1190 560 L 1280 560",
    labelPos: { x: 1190, y: 440 }
  },
  {
    id: "rel_prof_skills",
    type: "strong",
    from: "profiles",
    to: "skills",
    card: "1 : N",
    label: "endorses (1:N)",
    rule: "CASCADE",
    path: "M 1100 390 L 1200 390 L 1200 900 L 1280 900",
    labelPos: { x: 1200, y: 680 }
  },
  {
    id: "rel_prof_certs",
    type: "strong",
    from: "profiles",
    to: "certifications",
    card: "1 : N",
    label: "conferred (1:N)",
    rule: "CASCADE",
    path: "M 1100 450 L 1210 450 L 1210 1230 L 1280 1230",
    labelPos: { x: 1210, y: 1040 }
  },
  {
    id: "rel_prof_feedback",
    type: "strong",
    from: "profiles",
    to: "career_feedback",
    card: "1 : 1",
    label: "submits (1:1)",
    rule: "CASCADE",
    path: "M 960 500 L 960 1560 L 1280 1560",
    labelPos: { x: 1080, y: 1550 }
  },
  {
    id: "rel_surveys_responses",
    type: "strong",
    from: "surveys",
    to: "survey_responses",
    card: "1 : N",
    label: "orchestrates (1:N)",
    rule: "CASCADE",
    path: "M 2110 360 L 2110 470",
    labelPos: { x: 2110, y: 415 }
  },
  {
    id: "rel_users_survey_responses",
    type: "strong",
    from: "users",
    to: "survey_responses",
    card: "1 : N",
    label: "submits (1:N)",
    rule: "CASCADE",
    path: "M 500 400 L 600 400 L 600 520 L 1900 520",
    labelPos: { x: 1250, y: 510 }
  },
  {
    id: "rel_jobs_applications",
    type: "strong",
    from: "job_postings",
    to: "job_applications",
    card: "1 : N",
    label: "receives (1:N)",
    rule: "CASCADE",
    path: "M 2110 1110 L 2110 1230",
    labelPos: { x: 2110, y: 1170 }
  },
  {
    id: "rel_users_job_applications",
    type: "strong",
    from: "users",
    to: "job_applications",
    card: "1 : N",
    label: "applies (1:N)",
    rule: "CASCADE",
    path: "M 300 500 L 300 1740 L 1900 1740 L 1900 1350",
    labelPos: { x: 1100, y: 1730 }
  },
  {
    id: "rel_groups_members",
    type: "strong",
    from: "community_groups",
    to: "group_members",
    card: "1 : N",
    label: "roster (1:N)",
    rule: "CASCADE",
    path: "M 2730 710 L 2730 840",
    labelPos: { x: 2730, y: 775 }
  },
  {
    id: "rel_prof_group_members",
    type: "strong",
    from: "profiles",
    to: "group_members",
    card: "1 : N",
    label: "joins (1:N)",
    rule: "CASCADE",
    path: "M 1100 420 L 1220 420 L 1220 950 L 2520 950",
    labelPos: { x: 1870, y: 940 }
  },
  {
    id: "rel_groups_posts",
    type: "strong",
    from: "community_groups",
    to: "forum_posts",
    card: "1 : N",
    label: "threads (1:N)",
    rule: "CASCADE",
    path: "M 2840 710 L 2840 800 L 2970 800 L 2970 1260 L 2940 1260",
    labelPos: { x: 2970, y: 1020 }
  },
  {
    id: "rel_prof_forum_posts",
    type: "strong",
    from: "profiles",
    to: "forum_posts",
    card: "1 : N",
    label: "authors (1:N)",
    rule: "CASCADE",
    path: "M 1100 460 L 1240 460 L 1240 1290 L 2520 1290",
    labelPos: { x: 1880, y: 1280 }
  },
  {
    id: "rel_prof_conn",
    type: "strong",
    from: "profiles",
    to: "connections",
    card: "1 : N",
    label: "networks (1:N)",
    rule: "CASCADE",
    path: "M 880 500 L 880 1780 L 2520 1780 L 2520 1680",
    labelPos: { x: 1700, y: 1770 }
  },

  // ----------------------------------------------------
  // WEAK (BROKEN LINES: Non-Identifying / ON DELETE SET NULL)
  // ----------------------------------------------------
  {
    id: "rel_users_eligible",
    type: "weak",
    from: "users",
    to: "alumni_eligible",
    card: "0..1 : N",
    label: "claims (0..1:N)",
    rule: "SET NULL",
    path: "M 220 500 L 220 670",
    labelPos: { x: 220, y: 585 }
  },
  {
    id: "rel_users_audit",
    type: "weak",
    from: "users",
    to: "audit_logs",
    card: "0..1 : N",
    label: "triggers (0..1:N)",
    rule: "SET NULL",
    path: "M 160 500 L 160 630 L 50 630 L 50 1200 L 80 1200",
    labelPos: { x: 50, y: 880 }
  },
  {
    id: "rel_users_companies",
    type: "weak",
    from: "users",
    to: "companies",
    card: "0..1 : N",
    label: "verifies (0..1:N)",
    rule: "SET NULL",
    path: "M 290 220 L 290 80 L 2690 80 L 2690 120",
    labelPos: { x: 1490, y: 70 }
  },
  {
    id: "rel_companies_jobs",
    type: "weak",
    from: "companies",
    to: "job_postings",
    card: "0..1 : N",
    label: "hires_for (0..1:N)",
    rule: "SET NULL",
    path: "M 2520 280 L 2420 280 L 2420 950 L 2320 950",
    labelPos: { x: 2420, y: 615 }
  },
  {
    id: "rel_prof_jobs",
    type: "weak",
    from: "profiles",
    to: "job_postings",
    card: "0..1 : N",
    label: "posted_by (0..1:N)",
    rule: "SET NULL",
    path: "M 820 500 L 820 1720 L 1800 1720 L 1800 1020 L 1900 1020",
    labelPos: { x: 1310, y: 1710 }
  },
  {
    id: "rel_prof_groups",
    type: "weak",
    from: "profiles",
    to: "community_groups",
    card: "0..1 : N",
    label: "founded_by (0..1:N)",
    rule: "SET NULL",
    path: "M 890 220 L 890 80 L 2730 80 L 2730 470",
    labelPos: { x: 1810, y: 70 }
  }
];

// Generate SVG Elements
function generateSVG() {
  const columnHeaders = [
    { title: "1. IDENTITY, WHITELIST & AUDITING", x: 80, w: 420 },
    { title: "2. ALUMNI PROFILE & CREDENTIALS", x: 680, w: 420 },
    { title: "3. CAREER DOSSIER (WEAK ENTITIES)", x: 1280, w: 420 },
    { title: "4. TRACER STUDIES & CAREER PORTAL", x: 1900, w: 420 },
    { title: "5. ENTERPRISE & ALUMNI NETWORK", x: 2520, w: 420 }
  ];

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" height="100%" style="background-color: #090d16; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
  
  <defs>
    <!-- Background Dot Grid -->
    <pattern id="dot-grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#334155" opacity="0.25" />
    </pattern>

    <!-- Strong Crow's Foot End Marker (Solid Sapphire Blue) -->
    <marker id="crows-foot-strong" viewBox="0 0 16 16" refX="15" refY="8" markerWidth="14" markerHeight="14" orient="auto-start-reverse">
      <path d="M 0 2 L 15 8 L 0 14 M 5 2 L 5 14" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" />
    </marker>

    <!-- Weak Crow's Foot End Marker (Broken Amber Orange) -->
    <marker id="crows-foot-weak" viewBox="0 0 16 16" refX="15" refY="8" markerWidth="14" markerHeight="14" orient="auto-start-reverse">
      <path d="M 0 2 L 15 8 L 0 14 M 5 2 L 5 14" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" />
    </marker>

    <!-- Drop Shadow for Cards -->
    <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#000000" flood-opacity="0.5" />
    </filter>

    <!-- Glow for Strong Lines -->
    <filter id="strong-glow">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#38bdf8" flood-opacity="0.4" />
    </filter>

    <!-- Glow for Weak Lines -->
    <filter id="weak-glow">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#f59e0b" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="100%" height="100%" fill="#090d16" />
  <rect width="100%" height="100%" fill="url(#dot-grid)" />

  <!-- ============================================================== -->
  <!-- HEADER SECTION                                                 -->
  <!-- ============================================================== -->
  <g id="header-group" transform="translate(80, 40)">
    <!-- University Logo Badge Box -->
    <rect x="0" y="0" width="54" height="54" rx="12" fill="#1e293b" stroke="#3b82f6" stroke-width="2" />
    <text x="27" y="35" fill="#38bdf8" font-size="22" font-weight="bold" font-family="monospace" text-anchor="middle">ER</text>
    
    <!-- Title Text -->
    <text x="75" y="26" fill="#ffffff" font-size="24" font-weight="bold" letter-spacing="0.5">CTU-NAGA ALUMNI CONNECT — ADVANCED ENTITY RELATIONSHIP DIAGRAM</text>
    <text x="75" y="48" fill="#94a3b8" font-size="14">Extended Relational Model (3NF/BCNF) • Strong (Solid) vs. Weak (Broken) Relationship Semantics &amp; Non-Intertwining Orthogonal Bus Routing</text>

    <!-- Institutional Meta Badges -->
    <g transform="translate(2300, 10)">
      <rect x="0" y="0" width="160" height="34" rx="8" fill="#10b981" fill-opacity="0.1" stroke="#10b981" stroke-width="1.2" />
      <text x="80" y="22" fill="#34d399" font-size="12" font-weight="bold" text-anchor="middle">RA 10173 DPA Compliant</text>

      <rect x="175" y="0" width="170" height="34" rx="8" fill="#3b82f6" fill-opacity="0.1" stroke="#3b82f6" stroke-width="1.2" />
      <text x="260" y="22" fill="#60a5fa" font-size="12" font-weight="bold" text-anchor="middle">CHED GTS Architecture</text>

      <rect x="360" y="0" width="160" height="34" rx="8" fill="#8b5cf6" fill-opacity="0.1" stroke="#8b5cf6" stroke-width="1.2" />
      <text x="440" y="22" fill="#a78bfa" font-size="12" font-weight="bold" text-anchor="middle">Orthogonal Bus Lanes</text>
    </g>
  </g>

  <!-- ============================================================== -->
  <!-- COLUMN DOMAIN HEADERS                                          -->
  <!-- ============================================================== -->
  <g id="column-headers">
    ${columnHeaders.map(ch => `
      <g transform="translate(${ch.x}, 150)">
        <rect x="0" y="0" width="${ch.w}" height="38" rx="8" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
        <text x="${ch.w / 2}" y="24" fill="#cbd5e1" font-size="13" font-weight="bold" letter-spacing="1" text-anchor="middle">${ch.title}</text>
      </g>
    `).join('')}
  </g>

  <!-- ============================================================== -->
  <!-- RELATIONSHIP LINES (UNDERLAYS, CORES & LABELS)                -->
  <!-- ============================================================== -->
  <g id="relationship-lines">
    <!-- 1. Dark Underlays (eliminates line-clashing) -->
    ${RELATIONSHIPS.map(rel => `
      <path d="${rel.path}" fill="none" stroke="#090d16" stroke-width="8" stroke-linecap="round" />
    `).join('')}

    <!-- 2. Active Colored Paths -->
    ${RELATIONSHIPS.map(rel => {
      const isStrong = rel.type === "strong";
      const strokeColor = isStrong ? "#38bdf8" : "#f59e0b";
      const strokeWidth = isStrong ? 3.5 : 2.8;
      const dash = isStrong ? "none" : "10,6";
      const marker = isStrong ? "url(#crows-foot-strong)" : "url(#crows-foot-weak)";
      const filter = isStrong ? "url(#strong-glow)" : "url(#weak-glow)";

      return `<path d="${rel.path}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${dash}" marker-end="${marker}" filter="${filter}" />`;
    }).join('')}

    <!-- 3. Midpoint Label Badges -->
    ${RELATIONSHIPS.map(rel => {
      const isStrong = rel.type === "strong";
      const text = rel.label;
      const badgeW = text.length * 7.5 + 24;
      const borderColor = isStrong ? "#0284c7" : "#d97706";
      const textColor = isStrong ? "#bae6fd" : "#fef08a";

      return `
        <g transform="translate(${rel.labelPos.x}, ${rel.labelPos.y})">
          <rect x="${-badgeW / 2}" y="-13" width="${badgeW}" height="26" rx="6" fill="#0f172a" stroke="${borderColor}" stroke-width="1.5" />
          <text x="0" y="4" fill="${textColor}" font-size="11" font-family="monospace" font-weight="bold" text-anchor="middle">${text}</text>
        </g>
      `;
    }).join('')}
  </g>

  <!-- ============================================================== -->
  <!-- ENTITY CARDS                                                   -->
  <!-- ============================================================== -->
  <g id="entity-cards">
    ${ENTITIES.map(ent => {
      const isWeak = ent.type === "weak";
      const borderColor = isWeak ? "#f59e0b" : "#334155";
      const headerBg = isWeak ? "#1e293b" : "#0f172a";
      const dotColor = isWeak ? "#f59e0b" : "#38bdf8";
      const badgeBg = isWeak ? "rgba(245, 158, 11, 0.15)" : "rgba(56, 189, 248, 0.15)";
      const badgeBorder = isWeak ? "#f59e0b" : "#38bdf8";
      const badgeText = isWeak ? "WEAK ENTITY" : "STRONG ENTITY";
      const badgeTextColor = isWeak ? "#fbbf24" : "#7dd3fc";

      return `
        <g id="card-${ent.id}" transform="translate(${ent.x}, ${ent.y})" filter="url(#card-shadow)">
          <!-- Outer Card Background -->
          <rect x="0" y="0" width="${ent.w}" height="${ent.h}" rx="12" fill="#131d31" stroke="${borderColor}" stroke-width="1.8" />
          
          ${isWeak ? `
            <!-- Double Border for Weak Entity (Relational Standard) -->
            <rect x="4" y="4" width="${ent.w - 8}" height="${ent.h - 8}" rx="8" fill="none" stroke="#f59e0b" stroke-width="1.2" opacity="0.8" />
          ` : ''}

          <!-- Card Header Bar -->
          <path d="M 0 12 C 0 5.37 5.37 0 12 0 L ${ent.w - 12} 0 C ${ent.w - 5.37} 0 ${ent.w} 5.37 ${ent.w} 12 L ${ent.w} 42 L 0 42 Z" fill="${headerBg}" />
          <line x1="0" y1="42" x2="${ent.w}" y2="42" stroke="${borderColor}" stroke-width="1.2" />

          <!-- Header Icon & Entity Name -->
          <circle cx="20" cy="21" r="5" fill="${dotColor}" />
          <text x="34" y="27" fill="#ffffff" font-size="15" font-weight="bold" font-family="monospace">${ent.name}</text>

          <!-- Type Badge -->
          <rect x="${ent.w - 110}" y="10" width="98" height="22" rx="5" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1" />
          <text x="${ent.w - 61}" y="25" fill="${badgeTextColor}" font-size="10" font-weight="bold" font-family="monospace" text-anchor="middle">${badgeText}</text>

          <!-- Attributes Table -->
          <g transform="translate(16, 52)">
            ${ent.attributes.map((attr, idx) => {
              const rowY = idx * 30 + 16;
              const hasKey = attr.key !== "";
              const keyBg = attr.key.includes("PK") ? "rgba(245, 158, 11, 0.2)" : (attr.key.includes("UK") ? "rgba(168, 85, 247, 0.2)" : "rgba(56, 189, 248, 0.2)");
              const keyBorder = attr.key.includes("PK") ? "#f59e0b" : (attr.key.includes("UK") ? "#a855f7" : "#38bdf8");
              const keyColor = attr.key.includes("PK") ? "#fbbf24" : (attr.key.includes("UK") ? "#c084fc" : "#7dd3fc");

              return `
                <g transform="translate(0, ${rowY})">
                  <!-- Row divider -->
                  ${idx > 0 ? `<line x1="0" y1="-10" x2="${ent.w - 32}" y2="-10" stroke="#1e293b" stroke-width="1" />` : ''}

                  <!-- Key Badge (PK / FK / UK) -->
                  ${hasKey ? `
                    <rect x="0" y="-12" width="28" height="17" rx="4" fill="${keyBg}" stroke="${keyBorder}" stroke-width="0.8" />
                    <text x="14" y="0" fill="${keyColor}" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">${attr.key}</text>
                  ` : ''}

                  <!-- Attribute Name -->
                  <text x="${hasKey ? 36 : 0}" y="0" fill="#f8fafc" font-size="12" font-family="monospace" font-weight="600">${attr.name}</text>

                  <!-- Attribute Type -->
                  <text x="${ent.w - 32}" y="0" fill="#94a3b8" font-size="11" font-family="monospace" text-anchor="end">${attr.type}</text>
                </g>
              `;
            }).join('')}
          </g>
        </g>
      `;
    }).join('')}
  </g>

  <!-- ============================================================== -->
  <!-- FLOATING PROFESSIONAL LEGEND                                   -->
  <!-- ============================================================== -->
  <g id="diagram-legend" transform="translate(80, 1840)">
    <!-- Legend Container -->
    <rect x="0" y="0" width="840" height="240" rx="14" fill="#0f172a" stroke="#334155" stroke-width="1.8" filter="url(#card-shadow)" />

    <!-- Legend Title -->
    <text x="24" y="32" fill="#ffffff" font-size="14" font-weight="bold" letter-spacing="0.5">ERD NOTATION STANDARDS &amp; INTEGRITY RULES</text>
    <line x1="24" y1="44" x2="816" y2="44" stroke="#1e293b" stroke-width="1.5" />

    <!-- Strong Relationship Sample (Solid) -->
    <g transform="translate(24, 70)">
      <line x1="0" y1="12" x2="60" y2="12" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" />
      <path d="M 45 4 L 60 12 L 45 20 M 52 4 L 52 20" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" />
      <text x="75" y="10" fill="#ffffff" font-size="13" font-weight="bold">SOLID LINE (Strong / Identifying Relationship)</text>
      <text x="75" y="27" fill="#94a3b8" font-size="11">Child entity cannot exist without parent. Foreign Key is mandatory. Enforces <tspan fill="#38bdf8" font-family="monospace">ON DELETE CASCADE</tspan>.</text>
    </g>

    <!-- Weak Relationship Sample (Broken) -->
    <g transform="translate(24, 125)">
      <line x1="0" y1="12" x2="60" y2="12" stroke="#f59e0b" stroke-width="3" stroke-dasharray="8,5" stroke-linecap="round" />
      <path d="M 45 4 L 60 12 L 45 20 M 52 4 L 52 20" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" />
      <text x="75" y="10" fill="#ffffff" font-size="13" font-weight="bold">BROKEN LINE (Weak / Non-Identifying Relationship)</text>
      <text x="75" y="27" fill="#94a3b8" font-size="11">Child entity possesses independent identity. Foreign Key is optional/nullable. Enforces <tspan fill="#f59e0b" font-family="monospace">ON DELETE SET NULL</tspan>.</text>
    </g>

    <!-- Entity Types Sample -->
    <g transform="translate(24, 180)">
      <!-- Strong Entity Single Box -->
      <rect x="0" y="0" width="30" height="22" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1.8" />
      <text x="38" y="15" fill="#e2e8f0" font-size="12" font-weight="600">Strong Entity <tspan fill="#64748b" font-size="10">(Own Independent PK)</tspan></text>

      <!-- Weak Entity Double Box -->
      <rect x="220" y="0" width="30" height="22" rx="4" fill="#1e293b" stroke="#f59e0b" stroke-width="1.8" />
      <rect x="223" y="3" width="24" height="16" rx="2" fill="none" stroke="#f59e0b" stroke-width="1.2" />
      <text x="258" y="15" fill="#e2e8f0" font-size="12" font-weight="600">Weak Entity <tspan fill="#64748b" font-size="10">(Double Box / Dependent Key)</tspan></text>

      <!-- Badges -->
      <g transform="translate(500, 2)">
        <rect x="0" y="-2" width="26" height="18" rx="4" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" stroke-width="0.8" />
        <text x="13" y="10" fill="#fbbf24" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">PK</text>
        <text x="32" y="10" fill="#94a3b8" font-size="11">Primary Key</text>

        <rect x="120" y="-2" width="26" height="18" rx="4" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" stroke-width="0.8" />
        <text x="133" y="10" fill="#7dd3fc" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">FK</text>
        <text x="152" y="10" fill="#94a3b8" font-size="11">Foreign Key</text>

        <rect x="240" y="-2" width="26" height="18" rx="4" fill="rgba(168, 85, 247, 0.2)" stroke="#a855f7" stroke-width="0.8" />
        <text x="253" y="10" fill="#c084fc" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">UK</text>
        <text x="272" y="10" fill="#94a3b8" font-size="11">Unique Key</text>
      </g>
    </g>
  </g>

  <!-- Footer Meta -->
  <g transform="translate(2520, 2030)">
    <text x="420" y="0" fill="#475569" font-size="12" font-family="monospace" text-anchor="end">Rendered for CTU-Naga Alumni Connect System Architecture • 3300 x 2150 px Vector SVG</text>
  </g>

</svg>
`;

  return svg;
}

const svgContent = generateSVG();

// Output Paths
const targetPath1 = path.join(__dirname, '..', 'image', 'ctu_alumni_connect_erd.svg');
const targetPath2 = path.join('C:', 'Users', 'shiro', '.gemini', 'antigravity', 'brain', '1e5b94a1-a7e2-4570-bc92-df9fe50e0f74', 'ctu_alumni_connect_erd.svg');

fs.writeFileSync(targetPath1, svgContent, 'utf8');
console.log(`Saved SVG to ${targetPath1}`);

try {
  fs.writeFileSync(targetPath2, svgContent, 'utf8');
  console.log(`Saved SVG to ${targetPath2}`);
} catch (e) {
  console.error("Error saving to brain dir:", e);
}

