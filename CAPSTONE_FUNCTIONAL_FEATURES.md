# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## SYSTEM FUNCTIONAL FEATURES AND DECOMPOSITION DOCUMENT
**Project Title:** CTU-Naga Alumni Connect: A Web-Based Alumni Tracking, Graduate Tracer Study, and Career Analytics System  
**Institution:** Cebu Technological University – Naga Campus  
**Target Beneficiaries:** Alumni Relations Office, Placement & Career Services, Academic Program Chairs, Alumni Graduates, and Industry Employers  
**Regulatory Compliance:** Republic Act No. 10173 (Data Privacy Act of 2012) & CHED Memorandum Orders (CMO) on Graduate Tracer Studies  

---

## 1. Executive Summary & System Overview

The **CTU-Naga Alumni Connect** is a centralized, secure web-based application designed to bridge education and professional practice for Cebu Technological University – Naga Campus. It automates graduate tracer studies (GTS), monitors alumni career trajectories, measures degree-to-job alignment, facilitates professional alumni networking, and powers data-driven institutional curriculum enhancements.

The system replaces manual, error-prone tracking mechanisms with an integrated ecosystem featuring:
- **Institutional Governance & Verification:** Whitelist-based graduate validation, ensuring only authentic degree holders gain verified alumni status.
- **Dynamic Tracer Study Engine:** Multi-phase survey orchestration with question branching, cohort targeting, and live response analytics.
- **Curriculum & Career Intelligence:** Real-time analytics measuring curriculum relevance, salary brackets, absorption rates, and industry skill demands.
- **Career Portal & Algorithmic Job Matching:** Direct job board featuring skill-to-job match scoring, applicant screening, and employer candidate shortlisting.
- **Enterprise-Grade Security & DPA Compliance:** Row-Level Security (RLS), multi-factor authentication (MFA/OTP), device fingerprinting, immutable audit trails, and multi-format reports with Data Privacy Act (RA 10173) watermarking.

---

## 2. System User Roles & Actor Hierarchy

| Actor Code | Role Name | System Access Scope & Privileges |
| :--- | :--- | :--- |
| **ACT-01** | **System Administrator** *(Alumni Relations / Placement Office)* | Full system access: manage alumni records, import eligible graduate whitelists, orchestrate tracer surveys, verify partner employers, screen job applicants, monitor security audit logs, export accreditation reports, and configure system parameters. |
| **ACT-02** | **Verified Alumni Graduate** | Authenticated alumni access: complete mandatory onboarding and periodic tracer studies, manage career timeline and portfolio, upload private resumes, discover and apply for jobs with match scoring, network with peers, join community groups, and seek/provide mentorship. |
| **ACT-03** | **Partner Industry Employer** | Corporate portal access: view candidate applicant pools for posted vacancies, review match scores and anonymized candidate credentials, update application review statuses, and download shortlisted candidate rosters in CSV format. |
| **ACT-04** | **Public / Guest Visitor** | Public landing interface: view institutional manifesto, dynamic public alumni metrics, university announcements, upcoming public homecomings/events, and navigate to portal registration/login. |

---

## 3. Comprehensive Functional Feature Matrix by Subsystem

```
CTU-NAGA ALUMNI CONNECT ECOSYSTEM
│
├── 1.0 Authentication & Identity Security Subsystem
├── 2.0 Graduate Whitelist Verification & Mandatory Onboarding Subsystem
├── 3.0 Alumni Profile & Digital Career Dossier Subsystem
├── 4.0 Graduate Tracer Study (GTS) & Survey Administration Subsystem
├── 5.0 Job Portal, Algorithmic Matching & Applicant Screening Subsystem
├── 6.0 Career Analytics & Graduate Mobility Intelligence Subsystem
├── 7.0 Curriculum Insights & Institutional Alignment Subsystem
├── 8.0 Industry Partner & Employer Management Subsystem
├── 9.0 Alumni Networking, Peer Connections & Mentorship Subsystem
├── 10.0 Community Forums & Interactive Social Feed Subsystem
├── 11.0 Institutional Announcements & Event Management Subsystem
├── 12.0 Administrative Alumni Governance Subsystem
├── 13.0 Reports & Multi-Format Analytics Export Subsystem
└── 14.0 Security Monitoring, Audit Logging & SIEM-Lite Governance Subsystem
```

---

### Module 1.0: Authentication, Access Control & Identity Security

#### FR-AUTH-01: Secure Role-Based Authentication (RBAC)
- **Actor:** ACT-01, ACT-02, ACT-03
- **Description:** Implements JSON Web Token (JWT) session authorization with dual token lifecycles (short-lived access tokens and persistent refresh mechanisms). Uses `bcrypt` (12 rounds) salted hashing for password security. Automatically routes users to their role-specific landing spaces upon verification (`/admin`, `/`, or `/employer/dashboard`).

#### FR-AUTH-02: Self-Service Graduate Registration
- **Actor:** ACT-02
- **Description:** Allows graduates to register an account by submitting their CTU Student ID number, full name, institutional/personal email address, degree program, and graduation year. Enforces client-side and server-side Zod schema validation.

#### FR-AUTH-03: Two-Factor Authentication & Email OTP Verification
- **Actor:** ACT-01, ACT-02
- **Description:** Generates time-sensitive, cryptographically secure 6-digit One-Time Passwords (OTP) delivered via transactional email (`nodemailer`) for account verification, critical security actions, and password recovery. Implements expiry windows (10 minutes) and single-use invalidation.

#### FR-AUTH-04: Trusted Device Fingerprinting & Unfamiliar Device Detection
- **Actor:** ACT-01, ACT-02
- **Description:** Extracts client browser and hardware fingerprints (User-Agent, Canvas/WebGL signatures, IP address) to identify familiar devices. Alerts users upon login attempts from unfamiliar hardware or IP locations, requiring secondary email verification to establish trust.

#### FR-AUTH-05: Brute-Force Defense & Rate Limiting
- **Actor:** System Security
- **Description:** Employs `express-rate-limit` and an in-memory `failedAuthTracker` to monitor repeated unsuccessful login attempts per IP and account. Enforces progressive account lockout and exponential backoff after 5 consecutive failures, logging potential brute-force incidents to the security audit store.

#### FR-AUTH-06: Self-Service Password Recovery & Reset
- **Actor:** ACT-02
- **Description:** Enables alumni to reset forgotten passwords securely via an emailed cryptographic token or OTP. Validates password complexity against institutional standards (minimum 8 characters, uppercase, lowercase, numeric, and special character requirements).

#### FR-AUTH-07: Centralized Session Revocation
- **Actor:** ACT-01, ACT-02
- **Description:** Allows users to view all active login sessions and trusted devices, with the ability to unilaterally terminate remote sessions by adding tokens to an in-memory/database revocation blacklist (`revokedTokenService`).

---

### Module 2.0: Graduate Whitelist Verification & Mandatory Onboarding

#### FR-ONBD-01: Eligible Graduate Masterlist Matching (Whitelist Defense)
- **Actor:** ACT-02, System
- **Description:** Cross-references newly registered alumni against the pre-loaded registrar graduation masterlist (`eligible_alumni` table). Verifies Student ID Number, full name, birth date, and degree program. Prevents non-alumni or fraudulent individuals from claiming verified alumni status.

#### FR-ONBD-02: Multi-Step Mandatory Onboarding Workflow
- **Actor:** ACT-02
- **Description:** Intercepts newly registered accounts with an unavoidable onboarding gate (`OnboardingRoute`). Prevents access to the core platform until the graduate completes all five progressive onboarding phases.

#### FR-ONBD-03: Republic Act No. 10173 (DPA 2012) Explicit Informed Consent
- **Actor:** ACT-02
- **Description:** First step of onboarding requires explicit, unbundled consent checkboxes adhering to the National Privacy Commission (NPC) guidelines:
  1. Consent for data collection and tracer study processing.
  2. Consent for institutional storage and retention.
  3. Consent for congratulatory institutional publications.
  4. Consent for employment matching and partner recruitment referrals.

#### FR-ONBD-04: Baseline Demographic & Academic Capture
- **Actor:** ACT-02
- **Description:** Captures verified personal information (civil status, permanent address, contact numbers, current city of residence) and academic history (degree, campus, honors received, professional PRC licensure exam status).

#### FR-ONBD-05: Initial Employment & Graduate Tracer Baseline
- **Actor:** ACT-02
- **Description:** Records baseline tracer study metrics: initial employment status (`Employed`, `Unemployed`, `Self-Employed`), job-search duration (time to first job in months), entry-level salary bracket, current employer, job title, and initial degree-to-job curriculum relevance.

---

### Module 3.0: Alumni Profile & Digital Career Dossier

#### FR-PROF-01: Comprehensive Career Portfolio Management
- **Actor:** ACT-02
- **Description:** Allows alumni to maintain an interactive digital CV consisting of biographical data, professional headline, contact details, social links (LinkedIn, GitHub, Personal Portfolio), and profile picture avatar upload.

#### FR-PROF-02: Chronological Career & Employment Timeline
- **Actor:** ACT-02
- **Description:** Provides an interface to record past and current employment history. Captures company name, industry category, job title, employment status, job type (full-time, part-time, contract, freelance), start/end dates, current job flag, salary bracket, and job descriptions. Automatically calculates total career experience in years and months.

#### FR-PROF-03: Academic Credentials & Honors Ledger
- **Actor:** ACT-02
- **Description:** Manages post-graduate education, multiple degrees, certifications, special training programs, academic distinctions, and graduation honors.

#### FR-PROF-04: Marketable Skills & Competencies Inventory
- **Actor:** ACT-02
- **Description:** Allows alumni to catalog technical and soft competencies with self-assessed proficiency ratings (1 to 5 stars). Skills are utilized by the algorithmic matching engine for job recommendations.

#### FR-PROF-05: Private Resume / CV Storage (RLS Protected)
- **Actor:** ACT-02
- **Description:** Supports PDF resume uploads stored in private Supabase storage buckets. Enforces Row-Level Security policies ensuring resumes can only be accessed by the account owner and authorized recruitment administrators.

#### FR-PROF-06: Granular Privacy & Data Visibility Controls
- **Actor:** ACT-02
- **Description:** Empowers alumni to control their personal data visibility on the public and peer directory. Toggles include:
  - `show_email` (Public / Private)
  - `show_phone` (Public / Private)
  - `show_address` (Public / Private)
  - `show_employment` (Public / Private)

#### FR-PROF-07: Profile Completeness Scoring Meter
- **Actor:** ACT-02
- **Description:** Dynamically calculates an interactive 0–100% profile completion score with actionable recommendations to incentivize alumni to keep their records current for institutional reporting.

---

### Module 4.0: Graduate Tracer Study (GTS) & Dynamic Survey Engine

#### FR-TRAC-01: Visual Survey Lifecycle Management
- **Actor:** ACT-01
- **Description:** Enables administrators to manage tracer surveys through formal lifecycle states: `Draft`, `Published`, and `Closed`. Includes survey cloning, scheduling start/expiration dates, and real-time response counters.

#### FR-TRAC-02: Dynamic Survey Question Builder
- **Actor:** ACT-01
- **Description:** Form builder supporting diverse question archetypes:
  - Multiple Choice (Single Select / Radio)
  - Checkboxes (Multi-Select)
  - Likert Rating Scales (1 to 5 Stars)
  - Numerical / Text Input
  - Matrix / Grid Evaluation
  - Degree Relevance Scales

#### FR-TRAC-03: Cohort & Academic Program Targeting
- **Actor:** ACT-01
- **Description:** Allows tracer surveys to be targeted globally to all alumni or segmented by specific Graduation Batches (e.g., Class of 2023), Academic Programs (`BSIT`, `BIT`, `BEEd`, etc.), or Employment Statuses.

#### FR-TRAC-04: Responsive Alumni Survey Interface
- **Actor:** ACT-02
- **Description:** Modern, step-by-step survey-taking interface with progress indicators, validation checks, and automatic draft auto-saving to prevent loss of submission progress.

#### FR-TRAC-05: Real-Time Survey Response Analytics & Visualizations
- **Actor:** ACT-01
- **Description:** Generates real-time visual analytics per survey question, including distribution pie charts, frequency bar charts, response rates, and demographic breakdowns.

#### FR-TRAC-06: Individual Survey Response Dossier & Export
- **Actor:** ACT-01
- **Description:** Allows administrators to view individual graduate answer sheets and download complete response datasets in CSV/Excel format for institutional accreditation audits.

---

### Module 5.0: Job Portal, Algorithmic Matching & Applicant Screening

#### FR-JOB-01: Job Opportunity Marketplace
- **Actor:** ACT-01, ACT-02, ACT-03
- **Description:** Centralized job board featuring opportunities posted by partner companies and administrators. Displays company logo, role title, industry classification, employment type, location (remote/on-site), salary range, and expiry dates.

#### FR-JOB-02: Multi-Factor Algorithmic Match Scoring Engine
- **Actor:** ACT-02
- **Description:** Evaluates alumni qualifications against job posting requirements using an automated scoring algorithm:
  - Compares candidate technical skills against required skills.
  - Matches candidate academic degree program against target disciplines.
  - Compares candidate accumulated experience years against job seniority.
  - Generates a visual 0–100% match indicator (`MatchScoreBar`) for every active listing.

#### FR-JOB-03: Multi-Parameter Job Search & Filtering
- **Actor:** ACT-02
- **Description:** Allows filtering by job keyword, employment type (`Full-time`, `Part-time`, `Contract`, `Freelance`, `Internship`), work modality (Remote, On-site, Hybrid), location, and an "Alumni Exclusive" filter.

#### FR-JOB-04: In-App Job Application System
- **Actor:** ACT-02
- **Description:** Enables alumni to apply directly to active listings. Submits a tailored cover letter, attaches their latest uploaded profile resume, and snapshots current employment data.

#### FR-JOB-05: Job Application Status Tracking
- **Actor:** ACT-02
- **Description:** Dedicated "My Applications" tracking dashboard displaying real-time application progression states: `Submitted` → `Under Review` → `Screened` → `Shortlisted` → `Accepted / Hired` or `Closed`.

#### FR-JOB-06: Job Bookmarking & Saved Openings
- **Actor:** ACT-02
- **Description:** Allows alumni to save and bookmark vacancies for future review, persisted in the database.

#### FR-JOB-07: Administrative Applicant Screening & Candidate Management
- **Actor:** ACT-01, ACT-03
- **Description:** Interactive modal (`ScreeningModal`) enabling recruitment managers to review applicants per job vacancy, inspect candidate match scores, view resumes, and update applicant statuses with automatic notifications.

---

### Module 6.0: Career Trends & Graduate Mobility Intelligence

#### FR-CTRN-01: Alumni Career Leaderboard & Popular Roles
- **Actor:** ACT-01, ACT-02
- **Description:** Aggregates live graduate employment records into an interactive career leaderboard highlighting top job roles, volume of alumni employed per role, and employment growth velocity.

#### FR-CTRN-02: Career Pathway Deep-Dive Analytics
- **Actor:** ACT-01, ACT-02
- **Description:** Provides detailed insights for specific job roles (`CareerInsightsPage`):
  - Top hiring employers for the position.
  - Common academic feeder courses.
  - Essential skills and competency profiles.
  - Average professional experience in years before attaining the role.
  - Direct links to active open vacancies matching the role.

#### FR-CTRN-03: Salary & Compensation Distribution Modeling
- **Actor:** ACT-01
- **Description:** Visualizes graduate income distribution across predefined salary brackets (e.g., `Below ₱15,000`, `₱15,000–₱25,000`, `₱25,000–₱50,000`, `₱50,000–₱100,000`, `Above ₱100,000`). Displays average compensation by academic program and industry sector.

#### FR-CTRN-04: Longitudinal Batch / Cohort Mobility Tracking
- **Actor:** ACT-01
- **Description:** Analyzes employment absorption rates across graduation batches (2014 to present). Tracks unemployment rates, career shifts, and promotional velocity over time.

---

### Module 7.0: Curriculum Insights & Institutional Alignment

#### FR-CURR-01: Degree-to-Job Alignment (Curriculum Relevance) Index
- **Actor:** ACT-01
- **Description:** Calculates and visualizes the percentage of employed graduates working in fields directly aligned, partially aligned, or non-aligned with their completed degree program. Provides critical KPI metrics for CHED and institutional quality assurance audits.

#### FR-CURR-02: Market-Driven Skills Gap Analysis
- **Actor:** ACT-01
- **Description:** Identifies disparities between the competencies taught in academic programs and the technical skills demanded in active job postings and employer feedback. Categorizes gaps into `High Priority`, `Medium Priority`, and `Low Priority`.

#### FR-CURR-03: Emerging Skills & Industry Trend Radar
- **Actor:** ACT-01
- **Description:** Tracks emerging technical and soft skills registered by alumni and demanded by employers, tagging trends as `Trending Up`, `New`, or `Stable` to guide curriculum revision committees.

#### FR-CURR-04: Time-to-Employment (Absorption Speed) Metric
- **Actor:** ACT-01
- **Description:** Calculates the average job search duration from graduation day to first employment in months, segmented by academic department.

---

### Module 8.0: Industry Partner & Employer Management

#### FR-EMPL-01: Partner Employer Directory & Verification
- **Actor:** ACT-01
- **Description:** Manages verified industry partner companies. Tracks company name, industry, corporate website, address, contact persons, verification status, and formal Memorandum of Agreement (MOA) partnership tiers (`Partner` vs. `Non-Partner`).

#### FR-EMPL-02: Employer Corporate Portal & Dashboard
- **Actor:** ACT-03
- **Description:** Dedicated interface for industry recruiters to monitor company job vacancies, view applicant pools, inspect candidate match percentages, and manage recruitment funnels.

#### FR-EMPL-03: Candidate Roster & Shortlist Export
- **Actor:** ACT-03
- **Description:** Allows partner employers to download a structured CSV roster of shortlisted candidates, containing applicant contact details (with consent), degrees, honors, match scores, and resume links.

#### FR-EMPL-04: Institutional Employer Intelligence & Analytics
- **Actor:** ACT-01
- **Description:** Tracks corporate hiring volume, identifying top industry recruiters of CTU-Naga alumni, distribution across economic sectors (BPO, Tech, Manufacturing, Education), and average employee retention.

---

### Module 9.0: Alumni Networking, Peer Connections & Mentorship

#### FR-NETW-01: Searchable Alumni Directory
- **Actor:** ACT-01, ACT-02
- **Description:** Directory of verified graduates with multi-parameter filtering by Degree Program, Graduation Batch, Current City/Location, and Employment Status. Respects user privacy toggles.

#### FR-NETW-02: Peer Connection Requests & Network Building
- **Actor:** ACT-02
- **Description:** Enables alumni to send, accept, decline, and manage mutual peer connection requests. Maintains lists of `Connected`, `Pending`, and `Incoming` connections.

#### FR-NETW-03: Smart Alumni Connection Suggestions
- **Actor:** ACT-02
- **Description:** Algorithmically suggests networking connections based on shared academic programs, graduating cohorts, shared employers, or common geographic cities.

#### FR-NETW-04: Alumni Mentorship Platform
- **Actor:** ACT-02
- **Description:** Connects senior alumni mentors with junior graduates and students:
  - Mentors toggle their availability flag (`available_for_mentoring`).
  - Mentees discover available mentors by industry and skill domain.
  - Facilitates formal mentorship application requests and goal setting.

#### FR-NETW-05: Job Referral Network Toggle
- **Actor:** ACT-02
- **Description:** Allows alumni to flag their profile as `available_for_referral`, indicating willingness to refer fellow CTU-Naga graduates into their respective organizations.

---

### Module 10.0: Community Forums & Interactive Social Feed

#### FR-COMM-01: Interest-Based Community Groups
- **Actor:** ACT-01, ACT-02
- **Description:** Organized discussion groups categorized by interest domains: `Technology / IT`, `Business & Entrepreneurship`, `Education`, and `General Alumni Affairs`.

#### FR-COMM-02: Discussion Forums & Knowledge Exchange
- **Actor:** ACT-02
- **Description:** Allows alumni to create threaded discussions within community groups, share industry experiences, ask career advice, and comment on peer discussions.

#### FR-COMM-03: Centralized Alumni Dashboard Social Feed
- **Actor:** ACT-01, ACT-02
- **Description:** Dynamic feed on the alumni home dashboard broadcasting institutional announcements, upcoming events, career guides, and peer updates. Supports interactive likes, comment counters, and category tags.

---

### Module 11.0: Institutional Announcements & Event Management

#### FR-EVNT-01: Targeted Institutional Announcement Broadcasts
- **Actor:** ACT-01
- **Description:** Allows administrators to draft, publish, pin, and schedule institutional announcements. Supports targeted delivery to specific graduation batches or academic courses, with rich media and document attachments.

#### FR-EVNT-02: Survey-Linked Announcements
- **Actor:** ACT-01
- **Description:** Enables administrators to link an active tracer study directly to an announcement banner (`linked_survey_id`), providing alumni with a one-click gateway to increase response compliance.

#### FR-EVNT-03: Alumni Events & Reunions Calendar
- **Actor:** ACT-01, ACT-02
- **Description:** Comprehensive event calendar tracking Alumni Homecomings, Job Fairs, Webinars, and Workshops. Displays event date, time, modality (Online / In-Person / Hybrid), venue location, and meeting links.

#### FR-EVNT-04: Event RSVP & Participant Tracking
- **Actor:** ACT-01, ACT-02
- **Description:** Allows alumni to confirm attendance (RSVP) and allows administrators to monitor attendance counts against maximum venue capacity limits.

---

### Module 12.0: Administrative Alumni Governance & Records Management

#### FR-ADMN-01: Alumni Master Ledger & Dossier Viewer
- **Actor:** ACT-01
- **Description:** Searchable, paginated administrative ledger of all registered graduates. Administrators can view comprehensive profiles including academic records, employment history, survey responses, and account logs.

#### FR-ADMN-02: Account Lifecycle Controls (Archive / Restore / Delete)
- **Actor:** ACT-01
- **Description:** Enables administrators to edit alumni records, archive dormant accounts, or restore archived users. Features cascade-safe permanent deletion with foreign key safety on historical audit tables.

#### FR-ADMN-03: Graduation Whitelist Management
- **Actor:** ACT-01
- **Description:** Interface to upload, add, edit, or delete eligible graduating student records (`eligible_alumni`) supplied by the campus registrar, establishing the foundation for registration verification.

#### FR-ADMN-04: System Configuration & Parameter Management
- **Actor:** ACT-01
- **Description:** Allows administrators to configure institutional settings: campus name, contact emails, active academic year, maintenance mode, and registration toggles.

---

### Module 13.0: Reports & Multi-Format Analytics Export Subsystem

#### FR-REPT-01: Real-Time Institutional Metric Tallies
- **Actor:** ACT-01
- **Description:** Live database metrics bar displaying real-time record tallies across all core modules: Registered Alumni, Employed Graduates, Verified Employers, Survey Responses, Job Vacancies, and Historical Export Operations.

#### FR-REPT-02: Universal Institutional Filtering Toolbar
- **Actor:** ACT-01
- **Description:** Global filtering system updating both live data previews and exported files simultaneously:
  - By Academic Degree Program (`BSIT`, `BIT`, `BEEd`, `BSEd-Math`, `BTLED-HE`, `BTLED-ICT`, etc.)
  - By Graduation Batch Year (`2014` to `2026`, or All)
  - By Employment Status (`Employed`, `Unemployed`, `Self-Employed`, `Seeking`, etc.)

#### FR-REPT-03: Interactive Live Data Preview Modal
- **Actor:** ACT-01
- **Description:** Allows administrators to preview actual live database rows in a formatted, searchable modal table before committing to file downloads.

#### FR-REPT-04: 13 Live Institutional Report Modules
- **Actor:** ACT-01
- **Description:** Dedicated export modules covering every reporting dimension:
  1. *Alumni Master Registry*
  2. *Graduate Employment Tracker*
  3. *Career Progression & Mobility*
  4. *Salary & Compensation Distribution*
  5. *Employment Rate by Academic Program*
  6. *Batch / Cohort Longitudinal Employment*
  7. *Degree-to-Job Alignment (Tracer)*
  8. *Partner Employers & Industry Directory*
  9. *Graduate Tracer Survey Summary*
  10. *Survey Detailed Response Dossier*
  11. *Skills & Competencies Inventory*
  12. *Job Market & Hiring Trends*
  13. *Institutional Accreditation Master Dataset (AACCUP/CHED)*

#### FR-REPT-05: Multi-Sheet Master Institutional Excel Export (`.xlsx`)
- **Actor:** ACT-01
- **Description:** Single-click generator compiling all system datasets into an organized, multi-tab native Excel workbook via SheetJS (`xlsx`), formatted specifically for institutional accreditors.

#### FR-REPT-06: Multi-Format Serialization (CSV, Excel, JSON, PDF)
- **Actor:** ACT-01
- **Description:** 
  - **CSV (RFC 4180):** Injected with UTF-8 BOM (`\ufeff`) for Excel compatibility and Rule 5 RA 10173 legal headers.
  - **Excel (.xlsx):** Formatted spreadsheets with headers and column auto-widths.
  - **JSON:** Formatted raw payloads for data exchange.
  - **Print / PDF:** Official institutional layout with CTU-Naga header, generation timestamp, and confidentiality watermark.

#### FR-REPT-07: RA 10173 Pre-Export Confidentiality Acknowledgment Modal
- **Actor:** ACT-01
- **Description:** Enforces Rule 5 Data Privacy Act legal acknowledgment prior to downloading PII, requiring the admin to acknowledge institutional confidentiality restrictions.

#### FR-REPT-08: Immutable Export Audit Logging
- **Actor:** ACT-01, System
- **Description:** Every export operation is permanently recorded in `public.report_exports`, capturing admin email, report type, format, record count, filters applied, IP address, and timestamp. Accessible via a searchable **Export Audit History** tab.

---

### Module 14.0: Security Monitoring, Audit Logging & Governance

#### FR-SECU-01: SIEM-Lite Security Activity Dashboard
- **Actor:** ACT-01
- **Description:** Centralized security monitoring console (`AdminActivity.tsx`) tracking authentication events, administrative actions, record alterations, and security incidents.

#### FR-SECU-02: Severity-Classified Audit Logging
- **Actor:** ACT-01, System
- **Description:** Categorizes system events into three severity tiers:
  - **Critical:** Brute-force lockouts, unauthorized privilege escalations, suspicious IP logins, and data deletions.
  - **Warning:** Failed logins, unfamiliar device connections, and permission rejections.
  - **Info:** Successful logins, profile updates, and report exports.

#### FR-SECU-03: Tamper-Proof PostgreSQL Audit Triggers
- **Actor:** System Security
- **Description:** Database-level triggers (`trg_prevent_audit_tamper`) intercepting and strictly prohibiting any `UPDATE` or `DELETE` statements on `public.audit_logs`, guaranteeing non-repudiation.

#### FR-SECU-04: IP & User-Agent Telemetry Logging
- **Actor:** System Security
- **Description:** Records client IPv4/IPv6 addresses, browser signatures, and timestamps for every administrative mutation and security event.

---

## 4. Summary Traceability Matrix (Module vs. Actor)

| Subsystem / Module | Guest (ACT-04) | Alumni (ACT-02) | Employer (ACT-03) | Admin (ACT-01) |
| :--- | :---: | :---: | :---: | :---: |
| **1.0 Authentication & Identity Security** | Access Login/Reg | Active User | Active User | Full Admin |
| **2.0 Whitelist Verification & Onboarding** | — | Mandatory Complete | — | Manage Whitelist |
| **3.0 Alumni Profile & Digital Dossier** | — | Full Manage Own | — | View / Audit |
| **4.0 Graduate Tracer Study Engine** | — | Complete Surveys | — | Author / Analyze |
| **5.0 Job Portal & Matching ATS** | — | Search, Match, Apply | Post / Review Apps | Full Governance |
| **6.0 Career Trends & Mobility** | Public Trends | Personal Insights | — | Full Intelligence |
| **7.0 Curriculum Insights & Alignment** | — | Provide Data | Provide Feedback | Academic Quality |
| **8.0 Partner Employer Management** | View Partners | View Verified | Company Portal | Verify & Partner |
| **9.0 Networking & Mentorship** | — | Connect / Mentor | — | Moderate |
| **10.0 Community Forums & Feed** | — | Post / Discuss | — | Moderate |
| **11.0 Announcements & Events** | Public Events | View & RSVP | — | Create & Target |
| **12.0 Administrative Alumni Governance** | — | — | — | Full Control |
| **13.0 Reports & Multi-Format Export** | — | — | Shortlist Export | Multi-Format Master |
| **14.0 Security Monitoring & Auditing** | — | Manage Own Devices | — | Full SIEM Monitor |

---

## 5. Non-Functional Requirements & Compliance Architecture

### 5.1 Security Architecture
- **Data Encryption in Transit:** Enforced HTTPS / TLS 1.3 protocol.
- **Data Encryption at Rest:** PostgreSQL database encryption with salted Bcrypt password digests.
- **Defense in Depth:** Multi-tiered defense comprising Helmet HTTP header hardening, CORS origin whitelisting, Express rate limiting, parameterized queries, and database Row-Level Security (RLS) policies.

### 5.2 Regulatory & Legal Compliance
- **Republic Act No. 10173 (Data Privacy Act of 2012):**
  - Granular privacy switches enabling alumni data anonymization on public directories.
  - Mandatory informed consent during student onboarding.
  - Rule 5 strict non-disclosure notices embedded into all exported institutional files.
  - Right to be Forgotten: Cascade-safe account deletion mechanisms preserving audit non-repudiation.
- **CHED CMO Guidelines on Graduate Tracer Studies:**
  - Standardized metrics tracking employment absorption, relevance of curriculum, salary brackets, and time-to-employment.

### 5.3 Performance & Usability Engineering
- **Component Design System:** TailwindCSS styling with a tailored institutional color palette (CTU Blue, Marigold, Emerald).
- **Responsive Layout:** 100% mobile-friendly responsive view across smartphones, tablets, and desktop workstations.
- **Zero-Latency In-Browser Processing:** Client-side SheetJS multi-tab Excel compilation reducing backend server strain.
