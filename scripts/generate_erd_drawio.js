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

// User-Defined Custom Layout Coordinates
const ENTITY_POSITIONS = {
  users: { x: 80, y: 1547.44, w: 420, h: 202 },
  alumni_eligible: { x: 735, y: 1558.67, w: 420, h: 202 },
  audit_logs: { x: 735, y: 892.82, w: 420, h: 178 },
  profiles: { x: 735, y: 1100.82, w: 420, h: 202 },
  user_trusted_devices: { x: 735, y: 1965.67, w: 420, h: 178 },
  otp_codes: { x: 735, y: 1350.67, w: 420, h: 178 },
  education: { x: 1407, y: 498, w: 420, h: 178 },
  employment: { x: 1407, y: 706, w: 420, h: 202 },
  skills: { x: 1407, y: 1122, w: 420, h: 178 },
  certifications: { x: 1407, y: 290, w: 420, h: 178 },
  career_feedback: { x: 1407, y: 938, w: 420, h: 154 },
  surveys: { x: 80, y: 671.15, w: 420, h: 178 },
  survey_responses: { x: 735, y: 708.82, w: 420, h: 154 },
  job_postings: { x: 1407, y: 1733, w: 420, h: 202 },
  job_applications: { x: 2016, y: 1836, w: 420, h: 178 },
  companies: { x: 735, y: 1790.67, w: 420, h: 154 },
  community_groups: { x: 1407, y: 1490, w: 420, h: 154 },
  group_members: { x: 2016, y: 1401.83, w: 420, h: 154 },
  forum_posts: { x: 2016, y: 1585.83, w: 420, h: 154 },
  connections: { x: 1407, y: 1330, w: 420, h: 130 }
};

const ENTITIES = [
  {
    id: "users",
    name: "users",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "UK", name: "email", type: "varchar" },
      { key: "", name: "password_hash", type: "varchar" },
      { key: "", name: "role", type: "varchar" },
      { key: "", name: "is_verified", type: "boolean" },
      { key: "", name: "is_active", type: "boolean" },
      { key: "", name: "created_at", type: "timestamp" }
    ]
  },
  {
    id: "alumni_eligible",
    name: "alumni_eligible",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "UK", name: "student_id", type: "varchar" },
      { key: "", name: "first_name", type: "varchar" },
      { key: "", name: "last_name", type: "varchar" },
      { key: "", name: "degree_program", type: "varchar" },
      { key: "", name: "graduation_year", type: "int" },
      { key: "FK", name: "user_id", type: "int" }
    ]
  },
  {
    id: "audit_logs",
    name: "audit_logs",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "user_id", type: "int" },
      { key: "", name: "action", type: "varchar" },
      { key: "", name: "entity", type: "varchar" },
      { key: "", name: "details", type: "text" },
      { key: "", name: "created_at", type: "timestamp" }
    ]
  },
  {
    id: "profiles",
    name: "profiles",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "user_id", type: "int" },
      { key: "UK", name: "id_number", type: "varchar" },
      { key: "", name: "first_name", type: "varchar" },
      { key: "", name: "last_name", type: "varchar" },
      { key: "", name: "headline", type: "varchar" },
      { key: "", name: "privacy_settings", type: "text" }
    ]
  },
  {
    id: "user_trusted_devices",
    name: "user_trusted_devices",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "user_id", type: "int" },
      { key: "", name: "device_hash", type: "varchar" },
      { key: "", name: "device_name", type: "varchar" },
      { key: "", name: "is_trusted", type: "boolean" },
      { key: "", name: "last_used_at", type: "timestamp" }
    ]
  },
  {
    id: "otp_codes",
    name: "otp_codes",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "user_id", type: "int" },
      { key: "", name: "code_hash", type: "varchar" },
      { key: "", name: "purpose", type: "varchar" },
      { key: "", name: "expires_at", type: "timestamp" },
      { key: "", name: "is_used", type: "boolean" }
    ]
  },
  {
    id: "education",
    name: "education",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "profile_id", type: "int" },
      { key: "", name: "program", type: "varchar" },
      { key: "", name: "major", type: "varchar" },
      { key: "", name: "year_graduated", type: "int" },
      { key: "", name: "campus", type: "varchar" }
    ]
  },
  {
    id: "employment",
    name: "employment",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "profile_id", type: "int" },
      { key: "", name: "company_name", type: "varchar" },
      { key: "", name: "position", type: "varchar" },
      { key: "", name: "employment_status", type: "varchar" },
      { key: "", name: "salary_range", type: "varchar" },
      { key: "", name: "is_current", type: "boolean" }
    ]
  },
  {
    id: "skills",
    name: "skills",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "profile_id", type: "int" },
      { key: "", name: "name", type: "varchar" },
      { key: "", name: "category", type: "varchar" },
      { key: "", name: "proficiency_level", type: "int" },
      { key: "", name: "is_verified", type: "boolean" }
    ]
  },
  {
    id: "certifications",
    name: "certifications",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "profile_id", type: "int" },
      { key: "", name: "name", type: "varchar" },
      { key: "", name: "issuer", type: "varchar" },
      { key: "", name: "issue_date", type: "date" },
      { key: "", name: "credential_url", type: "varchar" }
    ]
  },
  {
    id: "career_feedback",
    name: "career_feedback",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "profile_id", type: "int" },
      { key: "", name: "curriculum_suggestions", type: "text" },
      { key: "", name: "relevance_rating", type: "varchar" },
      { key: "", name: "submitted_at", type: "timestamp" }
    ]
  },
  {
    id: "surveys",
    name: "surveys",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "", name: "title", type: "varchar" },
      { key: "", name: "questions", type: "text" },
      { key: "", name: "target_groups", type: "text" },
      { key: "", name: "is_active", type: "boolean" },
      { key: "", name: "expires_at", type: "timestamp" }
    ]
  },
  {
    id: "survey_responses",
    name: "survey_responses",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "survey_id", type: "int" },
      { key: "FK", name: "user_id", type: "int" },
      { key: "", name: "responses", type: "text" },
      { key: "", name: "submitted_at", type: "timestamp" }
    ]
  },
  {
    id: "job_postings",
    name: "job_postings",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "company_id", type: "int" },
      { key: "FK", name: "posted_by", type: "int" },
      { key: "", name: "position", type: "varchar" },
      { key: "", name: "job_type", type: "varchar" },
      { key: "", name: "requirements", type: "text" },
      { key: "", name: "expires_at", type: "timestamp" }
    ]
  },
  {
    id: "job_applications",
    name: "job_applications",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "job_id", type: "int" },
      { key: "FK", name: "user_id", type: "int" },
      { key: "", name: "status", type: "varchar" },
      { key: "", name: "match_score", type: "int" },
      { key: "", name: "applied_at", type: "timestamp" }
    ]
  },
  {
    id: "companies",
    name: "companies",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "", name: "name", type: "varchar" },
      { key: "", name: "industry", type: "varchar" },
      { key: "", name: "is_verified", type: "boolean" },
      { key: "FK", name: "verified_by", type: "int" }
    ]
  },
  {
    id: "community_groups",
    name: "community_groups",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "", name: "name", type: "varchar" },
      { key: "", name: "category", type: "varchar" },
      { key: "", name: "member_count", type: "int" },
      { key: "FK", name: "created_by", type: "int" }
    ]
  },
  {
    id: "group_members",
    name: "group_members",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "group_id", type: "int" },
      { key: "FK", name: "profile_id", type: "int" },
      { key: "", name: "role", type: "varchar" },
      { key: "", name: "joined_at", type: "timestamp" }
    ]
  },
  {
    id: "forum_posts",
    name: "forum_posts",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "group_id", type: "int" },
      { key: "FK", name: "author_id", type: "int" },
      { key: "", name: "title", type: "varchar" },
      { key: "", name: "content", type: "text" }
    ]
  },
  {
    id: "connections",
    name: "connections",
    attributes: [
      { key: "PK", name: "id", type: "int" },
      { key: "FK", name: "requester_id", type: "int" },
      { key: "FK", name: "recipient_id", type: "int" },
      { key: "", name: "status", type: "varchar" }
    ]
  }
];

const RELATIONSHIPS = [
  // 17 STRONG IDENTIFYING RELATIONSHIPS (SOLID LINES)
  { from: "users", to: "profiles", type: "strong", label: "identifies (1:1)", isOneToOne: true },
  { from: "users", to: "user_trusted_devices", type: "strong", label: "fingerprints (1:N)" },
  { from: "users", to: "otp_codes", type: "strong", label: "issues (1:N)" },
  { from: "users", to: "survey_responses", type: "strong", label: "submits (1:N)" },
  { from: "users", to: "job_applications", type: "strong", label: "applies (1:N)" },
  { from: "profiles", to: "education", type: "strong", label: "attained (1:N)" },
  { from: "profiles", to: "employment", type: "strong", label: "records (1:N)" },
  { from: "profiles", to: "skills", type: "strong", label: "endorses (1:N)" },
  { from: "profiles", to: "certifications", type: "strong", label: "conferred (1:N)" },
  { from: "profiles", to: "career_feedback", type: "strong", label: "evaluates (1:1)", isOneToOne: true },
  { from: "profiles", to: "group_members", type: "strong", label: "joins (1:N)" },
  { from: "profiles", to: "forum_posts", type: "strong", label: "authors (1:N)" },
  { from: "profiles", to: "connections", type: "strong", label: "networks (1:N)" },
  { from: "surveys", to: "survey_responses", type: "strong", label: "orchestrates (1:N)" },
  { from: "job_postings", to: "job_applications", type: "strong", label: "receives (1:N)" },
  { from: "community_groups", to: "group_members", type: "strong", label: "roster (1:N)" },
  { from: "community_groups", to: "forum_posts", type: "strong", label: "threads (1:N)" },

  // 6 WEAK NON-IDENTIFYING RELATIONSHIPS (BROKEN / DASHED LINES)
  { from: "users", to: "alumni_eligible", type: "weak", label: "claims (0..1:N)" },
  { from: "users", to: "audit_logs", type: "weak", label: "triggers (0..1:N)" },
  { from: "users", to: "companies", type: "weak", label: "verifies (0..1:N)" },
  { from: "companies", to: "job_postings", type: "weak", label: "hires_for (0..1:N)" },
  { from: "profiles", to: "job_postings", type: "weak", label: "posted_by (0..1:N)" },
  { from: "profiles", to: "community_groups", type: "weak", label: "founded_by (0..1:N)" }
];

function generateDrawioXml() {
  let cellIdCounter = 2;
  const entityCellMap = {};

  let xml = `<mxfile host="app.diagrams.net" agent="Antigravity ERD Exporter">
  <diagram id="ctu_alumni_connect_erd" name="CTU-Naga Alumni Connect ERD">
    <mxGraphModel dx="2039" dy="1742" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="3400" pageHeight="2200" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
`;

  // Entity Cards (Uniform Clean Swimlanes, No Weak Entity Indicator, No Colors)
  ENTITIES.forEach(ent => {
    const containerId = cellIdCounter++;
    entityCellMap[ent.id] = containerId;
    const pos = ENTITY_POSITIONS[ent.id] || { x: 100, y: 100, w: 420, h: 200 };

    // Standard Clean Draw.io Swimlane Style
    const containerStyle = `swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=34;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=0;marginBottom=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=1.5;fontColor=#000000;fontFamily=Helvetica;fontSize=13;rounded=0;`;
    const titleValue = `&lt;b&gt;${ent.name}&lt;/b&gt;`;

    xml += `        <mxCell id="${containerId}" parent="1" style="${containerStyle}" value="${titleValue}" vertex="1">
          <mxGeometry height="${pos.h}" width="${pos.w}" x="${pos.x}" y="${pos.y}" as="geometry" />
        </mxCell>
`;

    // Attributes
    ent.attributes.forEach((attr, idx) => {
      const rowId = cellIdCounter++;
      const keyPrefix = attr.key ? `&lt;b&gt;[${attr.key}]&lt;/b&gt; ` : `&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;`;
      const rowText = `${keyPrefix}&lt;span style=&quot;font-family:Courier New, monospace;&quot;&gt;${escapeXml(attr.name)}&lt;/span&gt; : &lt;i style=&quot;color:#444444;&quot;&gt;${escapeXml(attr.type)}&lt;/i&gt;`;

      xml += `        <mxCell id="${rowId}" parent="${containerId}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=10;spacingRight=10;overflow=hidden;rotatable=0;whiteSpace=wrap;html=1;fontColor=#000000;fontSize=11;fontFamily=Helvetica;borderBottom=1;" value="${rowText}" vertex="1">
          <mxGeometry height="24" width="${pos.w}" y="${34 + idx * 24}" as="geometry" />
        </mxCell>
`;
    });
  });

  // Relationships (Solid for Strong, Broken for Weak, Clean Labels without CASCADE/SET NULL)
  RELATIONSHIPS.forEach(rel => {
    const edgeId = cellIdCounter++;
    const sourceId = entityCellMap[rel.from];
    const targetId = entityCellMap[rel.to];

    const isStrong = rel.type === "strong";
    const startArrow = isStrong ? "ERmandOne" : "ERzeroToOne";
    const endArrow = rel.isOneToOne ? "ERmandOne" : "ERmany";

    const edgeStyle = isStrong
      ? `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=2.2;dashed=0;endArrow=${endArrow};endFill=0;startArrow=${startArrow};startFill=0;fontColor=#000000;fontSize=10;fontFamily=Helvetica;labelBackgroundColor=#ffffff;labelBorderColor=#000000;`
      : `edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth=1.8;dashed=1;dashPattern=8 5;endArrow=ERmany;endFill=0;startArrow=ERzeroToOne;startFill=0;fontColor=#000000;fontSize=10;fontFamily=Helvetica;labelBackgroundColor=#ffffff;labelBorderColor=#000000;`;

    xml += `        <mxCell id="${edgeId}" edge="1" parent="1" source="${sourceId}" target="${targetId}" style="${edgeStyle}" value="${escapeXml(rel.label)}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
`;
  });

  xml += `      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;

  return xml;
}

const drawioContent = generateDrawioXml();
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
