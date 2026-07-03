-- Seed data for CTU-Naga Alumni Connect
-- Password: password123 (hashed with bcrypt)

-- USERS
INSERT INTO public.users (id, email, password_hash, role, is_verified) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@ctu.edu.ph', '$2a$12$Nn7ZbrAyJpJ2nCj3dAieTuAOyaDnsgBj9EVyuniBN0tWShbM/MLFq', 'admin', TRUE),
  ('a0000000-0000-0000-0000-000000000002', 'maria.santos@ctu.edu.ph', '$2a$12$Nn7ZbrAyJpJ2nCj3dAieTuAOyaDnsgBj9EVyuniBN0tWShbM/MLFq', 'alumni', TRUE),
  ('a0000000-0000-0000-0000-000000000003', 'juan.delacruz@ctu.edu.ph', '$2a$12$Nn7ZbrAyJpJ2nCj3dAieTuAOyaDnsgBj9EVyuniBN0tWShbM/MLFq', 'alumni', TRUE),
  ('a0000000-0000-0000-0000-000000000004', 'ana.gonzales@ctu.edu.ph', '$2a$12$Nn7ZbrAyJpJ2nCj3dAieTuAOyaDnsgBj9EVyuniBN0tWShbM/MLFq', 'alumni', TRUE);

-- PROFILES
INSERT INTO public.profiles (id, user_id, first_name, last_name, email, phone, city, headline, bio) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Admin', 'User', 'admin@ctu.edu.ph', '+63 912 345 6789', 'Naga, Cebu', 'System Administrator at CTU-Naga', 'Managing the alumni tracking system.'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Maria', 'Santos', 'maria.santos@ctu.edu.ph', '+63 923 456 7890', 'Cebu City', 'Senior Engineer at Google', 'Passionate software engineer and mentor.'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Juan', 'Dela Cruz', 'juan.delacruz@ctu.edu.ph', '+63 934 567 8901', 'Cebu City', 'Software Developer at Tech Corp', 'Full-stack developer and lifelong learner.'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'Ana', 'Gonzales', 'ana.gonzales@ctu.edu.ph', '+63 945 678 9012', 'Manila', 'Data Science Lead at Amazon', 'Data scientist specializing in ML and AI.');

-- EDUCATION
INSERT INTO public.education (profile_id, program, major, year_started, year_graduated, honors) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'BS Information Technology', 'Web Development', 2015, 2019, 'Cum Laude'),
  ('b0000000-0000-0000-0000-000000000003', 'BS Information Technology', 'Web Development', 2019, 2023, NULL),
  ('b0000000-0000-0000-0000-000000000004', 'BS Computer Science', 'Data Science', 2014, 2018, 'Magna Cum Laude');

-- EMPLOYMENT
INSERT INTO public.employment (profile_id, company_name, company_industry, position, employment_status, job_type, start_date, is_current, salary_range) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'Google', 'Technology', 'Senior Engineer', 'employed', 'full-time', '2023-01-15', TRUE, '₱200,000+'),
  ('b0000000-0000-0000-0000-000000000002', 'Microsoft', 'Technology', 'Software Engineer', 'employed', 'full-time', '2019-06-01', FALSE, '₱150,000 - ₱200,000'),
  ('b0000000-0000-0000-0000-000000000003', 'Tech Corp', 'Technology', 'Software Developer', 'employed', 'full-time', '2024-01-10', TRUE, '₱60,000 - ₱80,000'),
  ('b0000000-0000-0000-0000-000000000003', 'StartUp Inc.', 'Technology', 'Junior Developer', 'employed', 'full-time', '2023-06-01', FALSE, '₱35,000 - ₱50,000'),
  ('b0000000-0000-0000-0000-000000000004', 'Amazon', 'Technology', 'Data Science Lead', 'employed', 'full-time', '2022-03-01', TRUE, '₱250,000+'),
  ('b0000000-0000-0000-0000-000000000004', 'Shopee', 'Technology', 'Data Analyst', 'employed', 'full-time', '2018-07-01', FALSE, '₱80,000 - ₱120,000');

-- SKILLS
INSERT INTO public.skills (profile_id, name, category, proficiency_level) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'JavaScript', 'Programming', 5),
  ('b0000000-0000-0000-0000-000000000002', 'React', 'Frontend', 5),
  ('b0000000-0000-0000-0000-000000000002', 'Node.js', 'Backend', 4),
  ('b0000000-0000-0000-0000-000000000002', 'Python', 'Programming', 4),
  ('b0000000-0000-0000-0000-000000000003', 'JavaScript', 'Programming', 4),
  ('b0000000-0000-0000-0000-000000000003', 'React', 'Frontend', 4),
  ('b0000000-0000-0000-0000-000000000003', 'Node.js', 'Backend', 3),
  ('b0000000-0000-0000-0000-000000000004', 'Python', 'Programming', 5),
  ('b0000000-0000-0000-0000-000000000004', 'Machine Learning', 'AI/ML', 5),
  ('b0000000-0000-0000-0000-000000000004', 'SQL', 'Data', 5),
  ('b0000000-0000-0000-0000-000000000004', 'TensorFlow', 'AI/ML', 4);

-- COMMUNITY GROUPS
INSERT INTO public.community_groups (id, name, description, category, member_count, created_by) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Tech Innovators', 'For alumni working in or interested in technology', 'tech', 245, 'b0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000002', 'Business Network', 'Connect with alumni in business and entrepreneurship', 'business', 180, 'b0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000003', 'Educators Circle', 'For alumni working in education and training', 'education', 120, 'b0000000-0000-0000-0000-000000000001');

-- FORUM POSTS
INSERT INTO public.forum_posts (group_id, author_id, title, content, tags) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Welcome to Tech Innovators!', 'Let us discuss all things tech. Share your projects, ask questions, and connect with fellow tech alumni.', ARRAY['tech', 'welcome']),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'Business Opportunities', 'Looking to collaborate on business ventures? This is the place to start.', ARRAY['business', 'networking']);

-- SURVEYS
INSERT INTO public.surveys (id, title, description, questions, is_active) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Graduate Tracer Study 2024', 'Help us understand your career journey after graduation.', '[
    {"id": "q1", "type": "mcq", "question": "What is your current employment status?", "options": ["Employed", "Self-Employed", "Unemployed", "Further Studies", "Entrepreneur"], "required": true},
    {"id": "q2", "type": "text", "question": "What is your current job title?", "required": false},
    {"id": "q3", "type": "rating", "question": "How relevant was your curriculum to your current role?", "required": true},
    {"id": "q4", "type": "scale", "question": "Rate your overall satisfaction with your career progress", "required": true}
  ]'::jsonb, TRUE);

-- JOB POSTINGS
INSERT INTO public.job_postings (company_name, position, description, requirements, location, job_type, salary_range, posted_by, is_alumni_exclusive, expires_at) VALUES
  ('Tech Corp', 'Senior React Developer', 'Looking for an experienced React developer to join our team.', ARRAY['3+ years React', 'TypeScript', 'Node.js'], 'Cebu City', 'full-time', '₱80,000 - ₱120,000', 'b0000000-0000-0000-0000-000000000003', TRUE, '2025-12-31T23:59:59Z'),
  ('DataFlow Inc.', 'Data Analyst', 'Join our data team and help drive insights.', ARRAY['SQL', 'Python', 'Data Visualization'], 'Remote', 'full-time', '₱50,000 - ₱70,000', 'b0000000-0000-0000-0000-000000000004', FALSE, '2025-12-31T23:59:59Z');
