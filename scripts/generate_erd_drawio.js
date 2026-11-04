const fs = require('fs');
const path = require('path');

function escapeXml(unsafe) {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 5 Columns Layout
const COL_WIDTH = 420;
const COL_GAP = 180;
const START_X = 80;
const START_Y = 220;

const ENTITIES = [
  // COLUMN 1: IDENTITY, WHITELIST & AUDIT (x: 80)
  {
    id: "users",
    name: "users",
    type: "strong",
    x: START_X,
    y: START_Y,
    w: COL_WIDTH,
    h: 220,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "UK", name: "email", type: "VARCHAR(255)" },
      { key: "", name: "password_hash", type: "VARCHAR(255)" },
      { key: "", name: "role", type: "VARCHAR(20)" },
      { key: "", name: "is_verified", type: "BOOLEAN" },
      { key: "", name: "is_active", type: "BOOLEAN" },
      { key: "", name: "created_at", type: "TIMESTAMPTZ" }
    ]
  },
  {
    id: "alumni_eligible",
    name: "alumni_eligible",
    type: "strong",
    x: START_X,
    y: START_Y + 450,
    w: COL_WIDTH,
    h: 220,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "UK", name: "student_id", type: "VARCHAR(50)" },
      { key: "", name: "first_name", type: "VARCHAR(100)" },
      { key: "", name: "last_name", type: "VARCHAR(100)" },
      { key: "", name: "degree_program", type: "VARCHAR(150)" },
      { key: "", name: "graduation_year", type: "INTEGER" },
      { key: "FK", name: "user_id", type: "UUID (Nullable)" }
    ]
  },
  {
    id: "audit_logs",
    name: "audit_logs",
    type: "strong",
    x: START_X,
    y: START_Y + 900,
    w: COL_WIDTH,
    h: 200,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "user_id", type: "UUID (Nullable)" },
      { key: "", name: "action", type: "VARCHAR(50)" },
      { key: "", name: "entity", type: "VARCHAR(50)" },
      { key: "", name: "details", type: "JSONB" },
      { key: "", name: "created_at", type: "TIMESTAMPTZ" }
    ]
  },

  // COLUMN 2: PROFILES & CREDENTIAL SUBORDINATES (x: 680)
  {
    id: "profiles",
    name: "profiles",
    type: "strong",
    x: START_X + (COL_WIDTH + COL_GAP) * 1,
    y: START_Y,
    w: COL_WIDTH,
    h: 220,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "user_id", type: "UUID (1:1 Identifying)" },
      { key: "UK", name: "id_number", type: "VARCHAR(50)" },
      { key: "", name: "first_name", type: "VARCHAR(100)" },
      { key: "", name: "last_name", type: "VARCHAR(100)" },
      { key: "", name: "headline", type: "VARCHAR(200)" },
      { key: "", name: "privacy_settings", type: "JSONB" }
    ]
  },
  {
    id: "user_trusted_devices",
    name: "user_trusted_devices",
    type: "weak",
    x: START_X + (COL_WIDTH + COL_GAP) * 1,
    y: START_Y + 450,
    w: COL_WIDTH,
    h: 200,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "user_id", type: "UUID (Mandatory)" },
      { key: "", name: "device_hash", type: "VARCHAR(255)" },
      { key: "", name: "device_name", type: "VARCHAR(100)" },
      { key: "", name: "is_trusted", type: "BOOLEAN" },
      { key: "", name: "last_used_at", type: "TIMESTAMPTZ" }
    ]
  },
  {
    id: "otp_codes",
    name: "otp_codes",
    type: "weak",
    x: START_X + (COL_WIDTH + COL_GAP) * 1,
    y: START_Y + 900,
    w: COL_WIDTH,
    h: 200,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "user_id", type: "UUID (Mandatory)" },
      { key: "", name: "code_hash", type: "VARCHAR(255)" },
      { key: "", name: "purpose", type: "VARCHAR(50)" },
      { key: "", name: "expires_at", type: "TIMESTAMPTZ" },
      { key: "", name: "is_used", type: "BOOLEAN" }
    ]
  },

  // COLUMN 3: CAREER DOSSIER WEAK ENTITIES (x: 1280)
  {
    id: "education",
    name: "education",
    type: "weak",
    x: START_X + (COL_WIDTH + COL_GAP) * 2,
    y: START_Y - 100,
    w: COL_WIDTH,
    h: 200,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "profile_id", type: "UUID (Mandatory)" },
      { key: "", name: "program", type: "VARCHAR(200)" },
      { key: "", name: "major", type: "VARCHAR(200)" },
      { key: "", name: "year_graduated", type: "INTEGER" },
      { key: "", name: "campus", type: "VARCHAR(200)" }
    ]
  },
  {
    id: "employment",
    name: "employment",
    type: "weak",
    x: START_X + (COL_WIDTH + COL_GAP) * 2,
    y: START_Y + 220,
    w: COL_WIDTH,
    h: 220,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "profile_id", type: "UUID (Mandatory)" },
      { key: "", name: "company_name", type: "VARCHAR(200)" },
      { key: "", name: "position", type: "VARCHAR(200)" },
      { key: "", name: "employment_status", type: "VARCHAR(30)" },
      { key: "", name: "salary_range", type: "VARCHAR(50)" },
      { key: "", name: "is_current", type: "BOOLEAN" }
    ]
  },
  {
    id: "skills",
    name: "skills",
    type: "weak",
    x: START_X + (COL_WIDTH + COL_GAP) * 2,
    y: START_Y + 560,
    w: COL_WIDTH,
    h: 200,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "profile_id", type: "UUID (Mandatory)" },
      { key: "", name: "name", type: "VARCHAR(100)" },
      { key: "", name: "category", type: "VARCHAR(100)" },
      { key: "", name: "proficiency_level", type: "INTEGER" },
      { key: "", name: "is_verified", type: "BOOLEAN" }
    ]
  },
  {
    id: "certifications",
    name: "certifications",
    type: "weak",
    x: START_X + (COL_WIDTH + COL_GAP) * 2,
    y: START_Y + 880,
    w: COL_WIDTH,
    h: 200,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "profile_id", type: "UUID (Mandatory)" },
      { key: "", name: "name", type: "VARCHAR(200)" },
      { key: "", name: "issuer", type: "VARCHAR(200)" },
      { key: "", name: "issue_date", type: "DATE" },
      { key: "", name: "credential_url", type: "TEXT" }
    ]
  },
  {
    id: "career_feedback",
    name: "career_feedback",
    type: "weak",
    x: START_X + (COL_WIDTH + COL_GAP) * 2,
    y: START_Y + 1200,
    w: COL_WIDTH,
    h: 180,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "profile_id", type: "UUID (1:1 Mandatory)" },
      { key: "", name: "curriculum_suggestions", type: "TEXT" },
      { key: "", name: "relevance_rating", type: "VARCHAR(20)" },
      { key: "", name: "submitted_at", type: "TIMESTAMPTZ" }
    ]
  },

  // COLUMN 4: GTS TRACER & JOBS (x: 1880)
  {
    id: "surveys",
    name: "surveys",
    type: "strong",
    x: START_X + (COL_WIDTH + COL_GAP) * 3,
    y: START_Y - 100,
    w: COL_WIDTH,
    h: 200,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "", name: "title", type: "VARCHAR(300)" },
      { key: "", name: "questions", type: "JSONB" },
      { key: "", name: "target_groups", type: "TEXT[]" },
      { key: "", name: "is_active", type: "BOOLEAN" },
      { key: "", name: "expires_at", type: "TIMESTAMPTZ" }
    ]
  },
  {
    id: "survey_responses",
    name: "survey_responses",
    type: "weak",
    x: START_X + (COL_WIDTH + COL_GAP) * 3,
    y: START_Y + 220,
    w: COL_WIDTH,
    h: 190,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "survey_id", type: "UUID (Mandatory)" },
      { key: "FK", name: "user_id", type: "UUID (Mandatory)" },
      { key: "", name: "responses", type: "JSONB" },
      { key: "", name: "submitted_at", type: "TIMESTAMPTZ" }
    ]
  },
  {
    id: "job_postings",
    name: "job_postings",
    type: "strong",
    x: START_X + (COL_WIDTH + COL_GAP) * 3,
    y: START_Y + 560,
    w: COL_WIDTH,
    h: 220,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "company_id", type: "UUID (Nullable)" },
      { key: "FK", name: "posted_by", type: "UUID (Nullable)" },
      { key: "", name: "position", type: "VARCHAR(200)" },
      { key: "", name: "job_type", type: "VARCHAR(20)" },
      { key: "", name: "requirements", type: "TEXT[]" },
      { key: "", name: "expires_at", type: "TIMESTAMPTZ" }
    ]
  },
  {
    id: "job_applications",
    name: "job_applications",
    type: "weak",
    x: START_X + (COL_WIDTH + COL_GAP) * 3,
    y: START_Y + 900,
    w: COL_WIDTH,
    h: 200,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "job_id", type: "UUID (Mandatory)" },
      { key: "FK", name: "user_id", type: "UUID (Mandatory)" },
      { key: "", name: "status", type: "VARCHAR(20)" },
      { key: "", name: "match_score", type: "INTEGER" },
      { key: "", name: "applied_at", type: "TIMESTAMPTZ" }
    ]
  },

  // COLUMN 5: ENTERPRISE, COMMUNITY & NETWORKING (x: 2480)
  {
    id: "companies",
    name: "companies",
    type: "strong",
    x: START_X + (COL_WIDTH + COL_GAP) * 4,
    y: START_Y - 100,
    w: COL_WIDTH,
    h: 200,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "", name: "name", type: "VARCHAR(200)" },
      { key: "", name: "industry", type: "VARCHAR(100)" },
      { key: "", name: "is_verified", type: "BOOLEAN" },
      { key: "FK", name: "verified_by", type: "UUID (Nullable)" }
    ]
  },
  {
    id: "community_groups",
    name: "community_groups",
    type: "strong",
    x: START_X + (COL_WIDTH + COL_GAP) * 4,
    y: START_Y + 220,
    w: COL_WIDTH,
    h: 200,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "", name: "name", type: "VARCHAR(200)" },
      { key: "", name: "category", type: "VARCHAR(50)" },
      { key: "", name: "member_count", type: "INTEGER" },
      { key: "FK", name: "created_by", type: "UUID (Nullable)" }
    ]
  },
  {
    id: "group_members",
    name: "group_members",
    type: "weak",
    x: START_X + (COL_WIDTH + COL_GAP) * 4,
    y: START_Y + 560,
    w: COL_WIDTH,
    h: 190,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "group_id", type: "UUID (Mandatory)" },
      { key: "FK", name: "profile_id", type: "UUID (Mandatory)" },
      { key: "", name: "role", type: "VARCHAR(20)" },
      { key: "", name: "joined_at", type: "TIMESTAMPTZ" }
    ]
  },
  {
    id: "forum_posts",
    name: "forum_posts",
    type: "weak",
    x: START_X + (COL_WIDTH + COL_GAP) * 4,
    y: START_Y + 870,
    w: COL_WIDTH,
    h: 190,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "group_id", type: "UUID (Mandatory)" },
      { key: "FK", name: "author_id", type: "UUID (Mandatory)" },
      { key: "", name: "title", type: "VARCHAR(300)" },
      { key: "", name: "content", type: "TEXT" }
    ]
  },
  {
    id: "connections",
    name: "connections",
    type: "weak",
    x: START_X + (COL_WIDTH + COL_GAP) * 4,
    y: START_Y + 1180,
    w: COL_WIDTH,
    h: 180,
    attributes: [
      { key: "PK", name: "id", type: "UUID" },
      { key: "FK", name: "requester_id", type: "UUID (Mandatory)" },
      { key: "FK", name: "recipient_id", type: "UUID (Mandatory)" },
      { key: "", name: "status", type: "VARCHAR(20)" }
    ]
  }
];

// COMPLETE RELATIONSHIP CATALOG (ALL 23 RELATIONSHIPS FULLY SPECIFIED)
const RELATIONSHIPS = [
  // =========================================================================
  // STRONG IDENTIFYING RELATIONSHIPS (SOLID LINES, ON DELETE CASCADE)
  // =========================================================================
  {
    id: "rel_users_profiles",
    type: "strong",
    from: "users",
    to: "profiles",
    card: "1 : 1",
    label: "identifies (1:1 [CASCADE])",
    rule: "CASCADE",
    isOneToOne: true
  },
  {
    id: "rel_users_devices",
    type: "strong",
    from: "users",
    to: "user_trusted_devices",
    card: "1 : N",
    label: "fingerprints (1:N [CASCADE])",
    rule: "CASCADE"
  },
  {
    id: "rel_users_otp",
    type: "strong",
    from: "users",
    to: "otp_codes",
    card: "1 : N",
    label: "issues (1:N [CASCADE])",
    rule: "CASCADE"
  },
  {
    id: "rel_users_survey_responses",
    type: "strong",
    from: "users",
    to: "survey_responses",
    card: "1 : N",
    label: "submits (1:N [CASCADE])",
    rule: "CASCADE",
    waypoints: [
      { x: 500, y: 380 },
      { x: 590, y: 380 },
      { x: 590, y: 500 },
      { x: 1880, y: 500 }
    ]
  },
  {
    id: "rel_users_job_applications",
    type: "strong",
    from: "users",
    to: "job_applications",
    card: "1 : N",
    label: "applies (1:N [CASCADE])",
    rule: "CASCADE",
    waypoints: [
      { x: 290, y: 440 },
      { x: 290, y: 1480 },
      { x: 1880, y: 1480 },
      { x: 1880, y: 1040 }
    ]
  },
  {
    id: "rel_prof_edu",
    type: "strong",
    from: "profiles",
    to: "education",
    card: "1 : N",
    label: "attained (1:N [CASCADE])",
    rule: "CASCADE"
  },
  {
    id: "rel_prof_emp",
    type: "strong",
    from: "profiles",
    to: "employment",
    card: "1 : N",
    label: "records (1:N [CASCADE])",
    rule: "CASCADE"
  },
  {
    id: "rel_prof_skills",
    type: "strong",
    from: "profiles",
    to: "skills",
    card: "1 : N",
    label: "endorses (1:N [CASCADE])",
    rule: "CASCADE"
  },
  {
    id: "rel_prof_certs",
    type: "strong",
    from: "profiles",
    to: "certifications",
    card: "1 : N",
    label: "conferred (1:N [CASCADE])",
    rule: "CASCADE"
  },
  {
    id: "rel_prof_feedback",
    type: "strong",
    from: "profiles",
    to: "career_feedback",
    card: "1 : 1",
    label: "evaluates (1:1 [CASCADE])",
    rule: "CASCADE",
    isOneToOne: true
  },
  {
    id: "rel_prof_group_members",
    type: "strong",
    from: "profiles",
    to: "group_members",
    card: "1 : N",
    label: "joins (1:N [CASCADE])",
    rule: "CASCADE",
    waypoints: [
      { x: 1100, y: 400 },
      { x: 1200, y: 400 },
      { x: 1200, y: 520 },
      { x: 2480, y: 640 }
    ]
  },
  {
    id: "rel_prof_forum_posts",
    type: "strong",
    from: "profiles",
    to: "forum_posts",
    card: "1 : N",
    label: "authors (1:N [CASCADE])",
    rule: "CASCADE",
    waypoints: [
      { x: 1100, y: 420 },
      { x: 1220, y: 420 },
      { x: 1220, y: 1140 },
      { x: 2480, y: 1140 }
    ]
  },
  {
    id: "rel_prof_conn",
    type: "strong",
    from: "profiles",
    to: "connections",
    card: "1 : N",
    label: "networks (1:N [CASCADE])",
    rule: "CASCADE",
    waypoints: [
      { x: 890, y: 440 },
      { x: 890, y: 1540 },
      { x: 2480, y: 1540 },
      { x: 2480, y: 1280 }
    ]
  },
  {
    id: "rel_surveys_responses",
    type: "strong",
    from: "surveys",
    to: "survey_responses",
    card: "1 : N",
    label: "orchestrates (1:N [CASCADE])",
    rule: "CASCADE"
  },
  {
    id: "rel_jobs_applications",
    type: "strong",
    from: "job_postings",
    to: "job_applications",
    card: "1 : N",
    label: "receives (1:N [CASCADE])",
    rule: "CASCADE"
  },
  {
    id: "rel_groups_members",
    type: "strong",
    from: "community_groups",
    to: "group_members",
    card: "1 : N",
    label: "roster (1:N [CASCADE])",
    rule: "CASCADE"
  },
  {
    id: "rel_groups_posts",
    type: "strong",
    from: "community_groups",
    to: "forum_posts",
    card: "1 : N",
    label: "threads (1:N [CASCADE])",
    rule: "CASCADE"
  },

  // =========================================================================
  // WEAK NON-IDENTIFYING RELATIONSHIPS (BROKEN / DASHED LINES, SET NULL)
  // =========================================================================
  {
    id: "rel_users_eligible",
    type: "weak",
    from: "users",
    to: "alumni_eligible",
    card: "0..1 : N",
    label: "claims (0..1:N [SET NULL])",
    rule: "SET NULL"
  },
  {
    id: "rel_users_audit",
    type: "weak",
    from: "users",
    to: "audit_logs",
    card: "0..1 : N",
    label: "triggers (0..1:N [SET NULL])",
    rule: "SET NULL"
  },
  {
    id: "rel_users_companies",
    type: "weak",
    from: "users",
    to: "companies",
    card: "0..1 : N",
    label: "verifies (0..1:N [SET NULL])",
    rule: "SET NULL",
    waypoints: [
      { x: 290, y: 220 },
      { x: 290, y: 80 },
      { x: 2690, y: 80 },
      { x: 2690, y: 120 }
    ]
  },
  {
    id: "rel_companies_jobs",
    type: "weak",
    from: "companies",
    to: "job_postings",
    card: "0..1 : N",
    label: "hires_for (0..1:N [SET NULL])",
    rule: "SET NULL"
  },
  {
    id: "rel_prof_jobs",
    type: "weak",
    from: "profiles",
    to: "job_postings",
    card: "0..1 : N",
    label: "posted_by (0..1:N [SET NULL])",
    rule: "SET NULL",
    waypoints: [
      { x: 1100, y: 360 },
      { x: 1760, y: 360 },
      { x: 1760, y: 640 },
      { x: 1880, y: 640 }
    ]
  },
  {
    id: "rel_prof_groups",
    type: "weak",
    from: "profiles",
    to: "community_groups",
    card: "0..1 : N",
    label: "founded_by (0..1:N [SET NULL])",
    rule: "SET NULL",
    waypoints: [
      { x: 890, y: 220 },
      { x: 890, y: 100 },
      { x: 2480, y: 100 },
      { x: 2480, y: 300 }
    ]
  }
];

function generateDrawioXml() {
  let cellIdCounter = 2;
  const entityCellMap = {};

  const columnHeaders = [
    { title: "1. IDENTITY, WHITELIST & AUDIT", x: START_X, w: COL_WIDTH },
    { title: "2. ALUMNI PROFILE & CREDENTIALS", x: START_X + (COL_WIDTH + COL_GAP) * 1, w: COL_WIDTH },
    { title: "3. CAREER DOSSIER (WEAK ENTITIES)", x: START_X + (COL_WIDTH + COL_GAP) * 2, w: COL_WIDTH },
    { title: "4. TRACER STUDIES & CAREER PORTAL", x: START_X + (COL_WIDTH + COL_GAP) * 3, w: COL_WIDTH },
    { title: "5. ENTERPRISE & ALUMNI NETWORK", x: START_X + (COL_WIDTH + COL_GAP) * 4, w: COL_WIDTH }
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Antigravity ERD Exporter" version="24.0.0" type="device">
  <diagram id="ctu_alumni_connect_erd" name="CTU-Naga Alumni Connect ERD">
    <mxGraphModel dx="2800" dy="1800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="3400" pageHeight="2200" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
`;

  // 1. Title Banner
  const titleId = cellIdCounter++;
  xml += `
        <!-- Title Banner -->
        <mxCell id="${titleId}" value="&lt;b style=&quot;font-size: 20px;&quot;&gt;CTU-NAGA ALUMNI CONNECT — ADVANCED ENTITY RELATIONSHIP DIAGRAM&lt;/b&gt;&lt;br&gt;&lt;span style=&quot;font-size: 13px; color: #333333;&quot;&gt;Complete Relational Architecture (3NF/BCNF) • All 23 Identifying &amp; Non-Identifying Relationships (Zero Missing Lines)&lt;/span&gt;" style="text;html=1;strokeColor=#000000;strokeWidth=1.5;fillColor=#ffffff;align=left;verticalAlign=middle;spacingLeft=16;rounded=1;fontFamily=Helvetica;fontColor=#000000;" vertex="1" parent="1">
          <mxGeometry x="${START_X}" y="40" width="1600" height="60" as="geometry" />
        </mxCell>
`;

  // 2. Column Domain Headers
  columnHeaders.forEach((ch, idx) => {
    const colHeaderId = cellIdCounter++;
    xml += `
        <!-- Column Header ${idx + 1} -->
        <mxCell id="${colHeaderId}" value="&lt;b&gt;${escapeXml(ch.title)}&lt;/b&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontSize=12;fontFamily=Helvetica;align=center;" vertex="1" parent="1">
          <mxGeometry x="${ch.x}" y="130" width="${ch.w}" height="40" as="geometry" />
        </mxCell>
`;
  });

  // 3. Entity Cards (Containers & Attributes)
  ENTITIES.forEach(ent => {
    const containerId = cellIdCounter++;
    entityCellMap[ent.id] = containerId;
    const isWeak = ent.type === "weak";

    // Strict Monochrome: pure white fill, black stroke, black font
    const containerStyle = isWeak
      ? `swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=34;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=0;marginBottom=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2;double=1;fontColor=#000000;fontFamily=Helvetica;fontSize=13;rounded=0;`
      : `swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=34;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=0;marginBottom=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontFamily=Helvetica;fontSize=13;rounded=0;`;

    const titleValue = isWeak ? `&lt;b&gt;${ent.name}&lt;/b&gt; &lt;span style=&quot;font-size:10px;font-weight:normal;&quot;&gt;[WEAK ENTITY]&lt;/span&gt;` : `&lt;b&gt;${ent.name}&lt;/b&gt;`;

    xml += `
        <!-- Entity: ${ent.name} (${ent.type.toUpperCase()}) -->
        <mxCell id="${containerId}" value="${titleValue}" style="${containerStyle}" vertex="1" parent="1">
          <mxGeometry x="${ent.x}" y="${ent.y}" width="${ent.w}" height="${ent.h}" as="geometry" />
        </mxCell>
`;

    // Attribute Rows inside the swimlane
    ent.attributes.forEach((attr) => {
      const rowId = cellIdCounter++;
      const keyPrefix = attr.key ? `&lt;b&gt;[${attr.key}]&lt;/b&gt; ` : `&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;`;
      const rowText = `${keyPrefix}&lt;span style=&quot;font-family:Courier New, monospace;&quot;&gt;${escapeXml(attr.name)}&lt;/span&gt; : &lt;i style=&quot;color:#444444;&quot;&gt;${escapeXml(attr.type)}&lt;/i&gt;`;

      xml += `        <mxCell id="${rowId}" value="${rowText}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=10;spacingRight=10;overflow=hidden;rotatable=0;whiteSpace=wrap;html=1;fontColor=#000000;fontSize=11;fontFamily=Helvetica;borderBottom=1;" vertex="1" parent="${containerId}">
          <mxGeometry y="${34 + ent.attributes.indexOf(attr) * 24}" width="${ent.w}" height="24" as="geometry" />
        </mxCell>
`;
    });
  });

  // 4. Relationships (Edges) - Solid for Strong, Dashed for Weak
  RELATIONSHIPS.forEach(rel => {
    const edgeId = cellIdCounter++;
    const sourceId = entityCellMap[rel.from];
    const targetId = entityCellMap[rel.to];

    const isStrong = rel.type === "strong";

    // Draw.io ER edge style: NO COLORS
    // Strong (Identifying): Solid line, strokeWidth=2.2, dashed=0, Crow's foot arrow
    // Weak (Non-Identifying): Broken / dashed line, strokeWidth=1.8, dashed=1, dashPattern=8 5
    const startArrow = isStrong ? "ERmandOne" : "ERzeroToOne";
    const endArrow = rel.isOneToOne ? "ERmandOne" : "ERmany";

    const edgeStyle = isStrong
      ? `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=2.2;dashed=0;endArrow=${endArrow};endFill=0;startArrow=${startArrow};startFill=0;fontColor=#000000;fontSize=10;fontFamily=Helvetica;labelBackgroundColor=#ffffff;labelBorderColor=#000000;`
      : `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.8;dashed=1;dashPattern=8 5;endArrow=ERmany;endFill=0;startArrow=ERzeroToOne;startFill=0;fontColor=#000000;fontSize=10;fontFamily=Helvetica;labelBackgroundColor=#ffffff;labelBorderColor=#000000;`;

    xml += `
        <!-- Relationship: ${rel.from} -> ${rel.to} (${rel.type.toUpperCase()}: ${rel.label}) -->
        <mxCell id="${edgeId}" value="${escapeXml(rel.label)}" style="${edgeStyle}" edge="1" parent="1" source="${sourceId}" target="${targetId}">
          <mxGeometry relative="1" as="geometry">
            ${rel.waypoints ? `<Array as="points">${rel.waypoints.map(p => `<mxPoint x="${p.x}" y="${p.y}" />`).join('')}</Array>` : ''}
          </mxGeometry>
        </mxCell>
`;
  });

  // 5. Professional Monochrome Legend Box
  const legendBoxId = cellIdCounter++;
  xml += `
        <!-- Monochrome Legend Box (No Colors) -->
        <mxCell id="${legendBoxId}" value="&lt;b style=&quot;font-size: 13px;&quot;&gt;ERD NOTATION STANDARDS &amp;amp; RELATIONSHIP CLASSIFICATION (COMPLETE REPLICATION)&lt;/b&gt;&lt;hr&gt;&lt;div style=&quot;text-align: left; line-height: 1.6; font-size: 11px;&quot;&gt;&lt;b&gt;── SOLID LINE (17 Strong Links):&lt;/b&gt; Identifying Relationship (&lt;i&gt;ON DELETE CASCADE&lt;/i&gt;). Child cannot exist without parent.&lt;br&gt;&lt;b&gt;- - BROKEN LINE (6 Weak Links):&lt;/b&gt; Non-Identifying Relationship (&lt;i&gt;ON DELETE SET NULL&lt;/i&gt;). Autonomous lifecycle reference.&lt;br&gt;&lt;b&gt;[ ] SINGLE BOX:&lt;/b&gt; Strong Entity (Regular entity with autonomous primary key).&lt;br&gt;&lt;b&gt;[[ ]] DOUBLE BOX:&lt;/b&gt; Weak Entity (Dependent on parent table for complete identification).&lt;br&gt;&lt;b&gt;KEYS:&lt;/b&gt; [PK] = Primary Key | [FK] = Foreign Key | [UK] = Unique Key Constraint&lt;/div&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.8;fontColor=#000000;fontFamily=Helvetica;align=center;verticalAlign=middle;spacing=14;" vertex="1" parent="1">
          <mxGeometry x="${START_X}" y="${START_Y + 1200}" width="840" height="180" as="geometry" />
        </mxCell>
`;

  xml += `      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

  return xml;
}

const drawioContent = generateDrawioXml();

// Output paths
const targetPathWorkspace = path.join(__dirname, '..', 'image', 'ctu_alumni_connect_erd.drawio');
const targetPathArtifact = path.join('C:', 'Users', 'shiro', '.gemini', 'antigravity', 'brain', '1e5b94a1-a7e2-4570-bc92-df9fe50e0f74', 'ctu_alumni_connect_erd.drawio');

fs.writeFileSync(targetPathWorkspace, drawioContent, 'utf8');
console.log(`Saved draw.io XML to: ${targetPathWorkspace}`);

try {
  fs.writeFileSync(targetPathArtifact, drawioContent, 'utf8');
  console.log(`Saved draw.io XML to: ${targetPathArtifact}`);
} catch (err) {
  console.error("Error saving to artifact directory:", err);
}
