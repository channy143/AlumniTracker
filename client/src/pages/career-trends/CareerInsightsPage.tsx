import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BriefcaseIcon, BuildingOfficeIcon, AcademicCapIcon, ClockIcon, ArrowLeftIcon, SparklesIcon, ChartBarIcon, UserGroupIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { careerTrendsApi } from '@/services/api';

const INDUSTRY_COLORS = ['#059669', '#2563eb', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#6b7280'];

function cloneCareer(base: any, overrides: Record<string, any>) {
  return { ...base, ...overrides };
}

const mockData: Record<string, any> = {
  'Software Engineer': {
    position: 'Software Engineer',
    alumniCount: 186,
    currentCount: 142,
    averageExperienceYears: 2.8,
    topIndustry: 'Information Technology',
    mostCommonCourse: 'Bachelor of Science in Information Technology',
    careerOverview: 'Software Engineers are among the most common careers of CTU-Naga alumni. Most alumni in this field work in the Information Technology industry, primarily at Accenture. Most alumni in this field graduated from Bachelor of Science in Information Technology. The average reported experience is 2.8 years.',
    topEmployers: [
      { name: 'Accenture', count: 28 }, { name: 'IBM', count: 15 }, { name: 'Lexmark', count: 12 },
      { name: 'Globe Telecom', count: 8 }, { name: 'Concentrix', count: 6 },
    ],
    topSkills: [
      { name: 'JavaScript', count: 150, percentage: 81 }, { name: 'React', count: 147, percentage: 79 },
      { name: 'Node.js', count: 134, percentage: 72 }, { name: 'Git', count: 113, percentage: 61 },
      { name: 'SQL', count: 106, percentage: 57 }, { name: 'TypeScript', count: 89, percentage: 48 },
    ],
    industryDistribution: [
      { name: 'Information Technology', count: 128, percentage: 90 },
      { name: 'Finance', count: 7, percentage: 5 },
      { name: 'Education', count: 4, percentage: 3 },
      { name: 'Government', count: 3, percentage: 2 },
    ],
    employmentTimeline: [
      { year: 2020, count: 5 }, { year: 2021, count: 11 }, { year: 2022, count: 18 },
      { year: 2023, count: 26 }, { year: 2024, count: 34 }, { year: 2025, count: 42 },
    ],
    relatedCareers: [
      { name: 'Frontend Developer', count: 12 }, { name: 'Backend Developer', count: 10 },
      { name: 'Full Stack Developer', count: 8 }, { name: 'QA Engineer', count: 6 },
      { name: 'DevOps Engineer', count: 5 },
    ],
    suggestedSkills: [
      { name: 'React', percentage: 81 }, { name: 'JavaScript', percentage: 79 },
      { name: 'Node.js', percentage: 72 }, { name: 'Git', percentage: 61 },
      { name: 'SQL', percentage: 57 }, { name: 'TypeScript', percentage: 48 },
    ],
    recentAlumni: [
      { id: '1', name: 'Christian Salinas', position: 'Software Engineer', company: 'Accenture', batch: 2026, employmentStatus: 'Employed', location: 'Minglanilla, Cebu' },
      { id: '2', name: 'Maria Santos', position: 'Software Engineer', company: 'IBM', batch: 2025, employmentStatus: 'Employed', location: 'Cebu City' },
      { id: '3', name: 'Juan Dela Cruz', position: 'Software Engineer', company: 'Lexmark', batch: 2025, employmentStatus: 'Employed', location: 'Talisay, Cebu' },
      { id: '4', name: 'Ana Gonzales', position: 'Software Engineer', company: 'Globe Telecom', batch: 2024, employmentStatus: 'Employed', location: 'Naga, Cebu' },
      { id: '5', name: 'Pedro Reyes', position: 'Software Engineer', company: 'Concentrix', batch: 2024, employmentStatus: 'Employed', location: 'Cebu City' },
      { id: '6', name: 'Luisa Tan', position: 'Software Engineer', company: 'Accenture', batch: 2023, employmentStatus: 'Employed', location: 'San Fernando, Cebu' },
      { id: '7', name: 'Jose Garcia', position: 'Software Engineer', company: 'IBM', batch: 2023, employmentStatus: 'Employed', location: 'Carcar, Cebu' },
    ],
  },
  'Frontend Developer': {
    position: 'Frontend Developer',
    alumniCount: 64, currentCount: 52, averageExperienceYears: 2.1, topIndustry: 'Information Technology',
    mostCommonCourse: 'Bachelor of Science in Information Technology',
    careerOverview: 'Frontend Developers are among the most common careers of CTU-Naga alumni. Most alumni in this field work in the Information Technology industry, primarily at Accenture. Most alumni graduated from Bachelor of Science in Information Technology. The average reported experience is 2.1 years.',
    topEmployers: [{ name: 'Accenture', count: 12 }, { name: 'TechStart Solutions', count: 8 }, { name: 'CreativeHub PH', count: 6 }, { name: 'IBM', count: 5 }, { name: 'Globe Telecom', count: 4 }],
    topSkills: [{ name: 'HTML/CSS', count: 58, percentage: 91 }, { name: 'JavaScript', count: 55, percentage: 86 }, { name: 'React', count: 48, percentage: 75 }, { name: 'Git', count: 40, percentage: 63 }, { name: 'TypeScript', count: 32, percentage: 50 }],
    industryDistribution: [{ name: 'Information Technology', count: 47, percentage: 90 }, { name: 'Business', count: 3, percentage: 6 }, { name: 'Education', count: 2, percentage: 4 }],
    employmentTimeline: [{ year: 2020, count: 2 }, { year: 2021, count: 5 }, { year: 2022, count: 9 }, { year: 2023, count: 14 }, { year: 2024, count: 18 }, { year: 2025, count: 22 }],
    relatedCareers: [{ name: 'Software Engineer', count: 15 }, { name: 'Full Stack Developer', count: 10 }, { name: 'Backend Developer', count: 8 }, { name: 'UI/UX Designer', count: 6 }],
    suggestedSkills: [{ name: 'HTML/CSS', percentage: 91 }, { name: 'JavaScript', percentage: 86 }, { name: 'React', percentage: 75 }, { name: 'Git', percentage: 63 }, { name: 'TypeScript', percentage: 50 }],
    recentAlumni: [
      { id: 'f1', name: 'Carlos Mendez', position: 'Frontend Developer', company: 'Accenture', batch: 2025, employmentStatus: 'Employed', location: 'Cebu City' },
      { id: 'f2', name: 'Rosa Villanueva', position: 'Frontend Developer', company: 'TechStart Solutions', batch: 2024, employmentStatus: 'Employed', location: 'Mandaue, Cebu' },
      { id: 'f3', name: 'Mark Lopez', position: 'Frontend Developer', company: 'CreativeHub PH', batch: 2024, employmentStatus: 'Employed', location: 'Lapu-Lapu, Cebu' },
    ],
  },
  'Backend Developer': {
    position: 'Backend Developer',
    alumniCount: 48, currentCount: 39, averageExperienceYears: 2.5, topIndustry: 'Information Technology',
    mostCommonCourse: 'Bachelor of Science in Information Technology',
    careerOverview: 'Backend Developers are a growing career path for CTU-Naga alumni. Most work in the Information Technology industry, primarily at IBM. The average reported experience is 2.5 years.',
    topEmployers: [{ name: 'IBM', count: 10 }, { name: 'Accenture', count: 8 }, { name: 'Lexmark', count: 6 }, { name: 'Globe Telecom', count: 4 }],
    topSkills: [{ name: 'Node.js', count: 42, percentage: 88 }, { name: 'Java', count: 38, percentage: 79 }, { name: 'SQL', count: 35, percentage: 73 }, { name: 'Python', count: 30, percentage: 63 }, { name: 'Git', count: 28, percentage: 58 }],
    industryDistribution: [{ name: 'Information Technology', count: 35, percentage: 90 }, { name: 'Finance', count: 2, percentage: 5 }, { name: 'Business', count: 2, percentage: 5 }],
    employmentTimeline: [{ year: 2020, count: 3 }, { year: 2021, count: 6 }, { year: 2022, count: 10 }, { year: 2023, count: 14 }, { year: 2024, count: 18 }, { year: 2025, count: 22 }],
    relatedCareers: [{ name: 'Software Engineer', count: 14 }, { name: 'Full Stack Developer', count: 9 }, { name: 'DevOps Engineer', count: 6 }, { name: 'Database Administrator', count: 4 }],
    suggestedSkills: [{ name: 'Node.js', percentage: 88 }, { name: 'Java', percentage: 79 }, { name: 'SQL', percentage: 73 }, { name: 'Python', percentage: 63 }, { name: 'Git', percentage: 58 }],
    recentAlumni: [
      { id: 'b1', name: 'Dennis Ramirez', position: 'Backend Developer', company: 'IBM', batch: 2025, employmentStatus: 'Employed', location: 'Cebu City' },
      { id: 'b2', name: 'Angela Fernandez', position: 'Backend Developer', company: 'Accenture', batch: 2024, employmentStatus: 'Employed', location: 'Talisay, Cebu' },
    ],
  },
  'Full Stack Developer': {
    position: 'Full Stack Developer',
    alumniCount: 52, currentCount: 41, averageExperienceYears: 2.6, topIndustry: 'Information Technology',
    mostCommonCourse: 'Bachelor of Science in Information Technology',
    careerOverview: 'Full Stack Developers represent a versatile career path. Most alumni in this field work in the Information Technology industry at Accenture. The average reported experience is 2.6 years.',
    topEmployers: [{ name: 'Accenture', count: 10 }, { name: 'IBM', count: 7 }, { name: 'Lexmark', count: 5 }, { name: 'TechStart Solutions', count: 4 }],
    topSkills: [{ name: 'JavaScript', count: 48, percentage: 92 }, { name: 'React', count: 42, percentage: 81 }, { name: 'Node.js', count: 38, percentage: 73 }, { name: 'SQL', count: 32, percentage: 62 }, { name: 'Git', count: 30, percentage: 58 }],
    industryDistribution: [{ name: 'Information Technology', count: 37, percentage: 90 }, { name: 'Business', count: 3, percentage: 7 }, { name: 'Education', count: 1, percentage: 3 }],
    employmentTimeline: [{ year: 2020, count: 2 }, { year: 2021, count: 5 }, { year: 2022, count: 9 }, { year: 2023, count: 14 }, { year: 2024, count: 18 }, { year: 2025, count: 22 }],
    relatedCareers: [{ name: 'Software Engineer', count: 12 }, { name: 'Frontend Developer', count: 10 }, { name: 'Backend Developer', count: 8 }, { name: 'DevOps Engineer', count: 5 }],
    suggestedSkills: [{ name: 'JavaScript', percentage: 92 }, { name: 'React', percentage: 81 }, { name: 'Node.js', percentage: 73 }, { name: 'SQL', percentage: 62 }, { name: 'Git', percentage: 58 }],
    recentAlumni: [
      { id: 'fs1', name: 'Kevin Torres', position: 'Full Stack Developer', company: 'Accenture', batch: 2025, employmentStatus: 'Employed', location: 'Cebu City' },
      { id: 'fs2', name: 'Patricia Santos', position: 'Full Stack Developer', company: 'IBM', batch: 2024, employmentStatus: 'Employed', location: 'Minglanilla, Cebu' },
    ],
  },
  'Web Developer': {
    position: 'Web Developer',
    alumniCount: 74, currentCount: 58, averageExperienceYears: 2.1, topIndustry: 'Information Technology',
    mostCommonCourse: 'Bachelor of Science in Information Technology',
    careerOverview: 'Web Developers are among the most common careers of CTU-Naga alumni. Most work in the Information Technology industry at TechStart Solutions. The average reported experience is 2.1 years.',
    topEmployers: [{ name: 'TechStart Solutions', count: 10 }, { name: 'CreativeHub PH', count: 6 }, { name: 'Accenture', count: 5 }, { name: 'Globe Telecom', count: 4 }],
    topSkills: [{ name: 'HTML/CSS', count: 68, percentage: 92 }, { name: 'JavaScript', count: 60, percentage: 81 }, { name: 'PHP', count: 42, percentage: 57 }, { name: 'WordPress', count: 35, percentage: 47 }, { name: 'MySQL', count: 30, percentage: 41 }],
    industryDistribution: [{ name: 'Information Technology', count: 50, percentage: 86 }, { name: 'Business', count: 5, percentage: 9 }, { name: 'Education', count: 3, percentage: 5 }],
    employmentTimeline: [{ year: 2020, count: 4 }, { year: 2021, count: 8 }, { year: 2022, count: 14 }, { year: 2023, count: 20 }, { year: 2024, count: 26 }, { year: 2025, count: 30 }],
    relatedCareers: [{ name: 'Frontend Developer', count: 8 }, { name: 'Software Engineer', count: 6 }, { name: 'Full Stack Developer', count: 5 }],
    suggestedSkills: [{ name: 'HTML/CSS', percentage: 92 }, { name: 'JavaScript', percentage: 81 }, { name: 'PHP', percentage: 57 }, { name: 'WordPress', percentage: 47 }, { name: 'MySQL', percentage: 41 }],
    recentAlumni: [
      { id: 'w1', name: 'Bryan Lim', position: 'Web Developer', company: 'TechStart Solutions', batch: 2025, employmentStatus: 'Employed', location: 'Cebu City' },
      { id: 'w2', name: 'Diane Cruz', position: 'Web Developer', company: 'CreativeHub PH', batch: 2024, employmentStatus: 'Employed', location: 'Naga, Cebu' },
    ],
  },
  'Data Analyst': {
    position: 'Data Analyst',
    alumniCount: 45, currentCount: 36, averageExperienceYears: 1.9, topIndustry: 'Information Technology',
    mostCommonCourse: 'Bachelor of Science in Information Technology',
    careerOverview: 'Data Analysts are an emerging career for CTU-Naga alumni. Most work in the Information Technology industry at Accenture. The average reported experience is 1.9 years.',
    topEmployers: [{ name: 'Accenture', count: 8 }, { name: 'UnionBank', count: 5 }, { name: 'Globe Telecom', count: 4 }, { name: 'IBM', count: 3 }],
    topSkills: [{ name: 'SQL', count: 40, percentage: 89 }, { name: 'Python', count: 35, percentage: 78 }, { name: 'Excel', count: 32, percentage: 71 }, { name: 'Tableau', count: 25, percentage: 56 }, { name: 'Power BI', count: 22, percentage: 49 }],
    industryDistribution: [{ name: 'Information Technology', count: 28, percentage: 78 }, { name: 'Finance', count: 5, percentage: 14 }, { name: 'Business', count: 3, percentage: 8 }],
    employmentTimeline: [{ year: 2021, count: 3 }, { year: 2022, count: 7 }, { year: 2023, count: 12 }, { year: 2024, count: 18 }, { year: 2025, count: 22 }],
    relatedCareers: [{ name: 'Software Engineer', count: 5 }, { name: 'Business Analyst', count: 4 }, { name: 'Data Scientist', count: 3 }],
    suggestedSkills: [{ name: 'SQL', percentage: 89 }, { name: 'Python', percentage: 78 }, { name: 'Excel', percentage: 71 }, { name: 'Tableau', percentage: 56 }, { name: 'Power BI', percentage: 49 }],
    recentAlumni: [
      { id: 'd1', name: 'Sophia Martinez', position: 'Data Analyst', company: 'Accenture', batch: 2025, employmentStatus: 'Employed', location: 'Cebu City' },
      { id: 'd2', name: 'Michael Reyes', position: 'Data Analyst', company: 'UnionBank', batch: 2024, employmentStatus: 'Employed', location: 'Mandaue, Cebu' },
    ],
  },
  'IT Support Specialist': {
    position: 'IT Support Specialist',
    alumniCount: 92, currentCount: 71, averageExperienceYears: 3.2, topIndustry: 'Information Technology',
    mostCommonCourse: 'Bachelor of Science in Information Technology',
    careerOverview: 'IT Support Specialists form a significant career path for CTU-Naga alumni. Most work at Concentrix in the Information Technology industry. The average reported experience is 3.2 years.',
    topEmployers: [{ name: 'Concentrix', count: 18 }, { name: 'Teleperformance', count: 14 }, { name: 'Globe Telecom', count: 8 }, { name: 'PLDT', count: 6 }],
    topSkills: [{ name: 'Network Administration', count: 75, percentage: 82 }, { name: 'Troubleshooting', count: 70, percentage: 76 }, { name: 'Windows Server', count: 55, percentage: 60 }, { name: 'Active Directory', count: 48, percentage: 52 }, { name: 'Linux', count: 40, percentage: 43 }],
    industryDistribution: [{ name: 'Information Technology', count: 60, percentage: 85 }, { name: 'Business', count: 6, percentage: 8 }, { name: 'Government', count: 5, percentage: 7 }],
    employmentTimeline: [{ year: 2020, count: 8 }, { year: 2021, count: 14 }, { year: 2022, count: 20 }, { year: 2023, count: 26 }, { year: 2024, count: 30 }, { year: 2025, count: 34 }],
    relatedCareers: [{ name: 'Network Administrator', count: 8 }, { name: 'Systems Administrator', count: 6 }, { name: 'Cybersecurity Analyst', count: 4 }],
    suggestedSkills: [{ name: 'Network Administration', percentage: 82 }, { name: 'Troubleshooting', percentage: 76 }, { name: 'Windows Server', percentage: 60 }, { name: 'Active Directory', percentage: 52 }, { name: 'Linux', percentage: 43 }],
    recentAlumni: [
      { id: 'it1', name: 'Ramon Gomez', position: 'IT Support Specialist', company: 'Concentrix', batch: 2023, employmentStatus: 'Employed', location: 'Cebu City' },
      { id: 'it2', name: 'Jennifer Tan', position: 'IT Support Specialist', company: 'Teleperformance', batch: 2022, employmentStatus: 'Employed', location: 'Lapu-Lapu, Cebu' },
    ],
  },
  'Cybersecurity Analyst': {
    position: 'Cybersecurity Analyst',
    alumniCount: 38, currentCount: 31, averageExperienceYears: 3.5, topIndustry: 'Information Technology',
    mostCommonCourse: 'Bachelor of Science in Information Technology',
    careerOverview: 'Cybersecurity Analysts represent a growing specialized career. Most work at Accenture in the Information Technology industry. The average reported experience is 3.5 years.',
    topEmployers: [{ name: 'Accenture', count: 10 }, { name: 'DOST', count: 4 }, { name: 'PLDT', count: 3 }, { name: 'Globe Telecom', count: 3 }],
    topSkills: [{ name: 'Network Security', count: 35, percentage: 92 }, { name: 'Python', count: 28, percentage: 74 }, { name: 'Penetration Testing', count: 25, percentage: 66 }, { name: 'SIEM', count: 22, percentage: 58 }, { name: 'Risk Assessment', count: 20, percentage: 53 }],
    industryDistribution: [{ name: 'Information Technology', count: 30, percentage: 97 }, { name: 'Government', count: 1, percentage: 3 }],
    employmentTimeline: [{ year: 2020, count: 2 }, { year: 2021, count: 4 }, { year: 2022, count: 7 }, { year: 2023, count: 10 }, { year: 2024, count: 14 }, { year: 2025, count: 18 }],
    relatedCareers: [{ name: 'Software Engineer', count: 4 }, { name: 'IT Support Specialist', count: 3 }, { name: 'Network Administrator', count: 3 }],
    suggestedSkills: [{ name: 'Network Security', percentage: 92 }, { name: 'Python', percentage: 74 }, { name: 'Penetration Testing', percentage: 66 }, { name: 'SIEM', percentage: 58 }, { name: 'Risk Assessment', percentage: 53 }],
    recentAlumni: [
      { id: 'c1', name: 'Victor Santos', position: 'Cybersecurity Analyst', company: 'Accenture', batch: 2024, employmentStatus: 'Employed', location: 'Cebu City' },
    ],
  },
  'Teacher': {
    position: 'Teacher',
    alumniCount: 83, currentCount: 68, averageExperienceYears: 5.2, topIndustry: 'Education',
    mostCommonCourse: 'Bachelor of Science in Education',
    careerOverview: 'Teachers represent a significant career path for CTU-Naga alumni. Most work at DepEd in the Education industry. The average reported experience is 5.2 years.',
    topEmployers: [{ name: 'DepEd', count: 35 }, { name: 'CTU-Naga', count: 10 }, { name: 'Private Schools', count: 8 }],
    topSkills: [{ name: 'Classroom Management', count: 70, percentage: 84 }, { name: 'Curriculum Design', count: 55, percentage: 66 }, { name: 'Lesson Planning', count: 50, percentage: 60 }, { name: 'Assessment', count: 45, percentage: 54 }],
    industryDistribution: [{ name: 'Education', count: 65, percentage: 96 }, { name: 'Government', count: 3, percentage: 4 }],
    employmentTimeline: [{ year: 2020, count: 10 }, { year: 2021, count: 14 }, { year: 2022, count: 18 }, { year: 2023, count: 22 }, { year: 2024, count: 26 }, { year: 2025, count: 28 }],
    relatedCareers: [{ name: 'School Administrator', count: 5 }, { name: 'Guidance Counselor', count: 3 }],
    suggestedSkills: [{ name: 'Classroom Management', percentage: 84 }, { name: 'Curriculum Design', percentage: 66 }, { name: 'Lesson Planning', percentage: 60 }, { name: 'Assessment Design', percentage: 54 }],
    recentAlumni: [
      { id: 't1', name: 'Gloria Reyes', position: 'Teacher', company: 'DepEd', batch: 2020, employmentStatus: 'Employed', location: 'Naga, Cebu' },
      { id: 't2', name: 'Rizaldy Castro', position: 'Teacher', company: 'CTU-Naga', batch: 2019, employmentStatus: 'Employed', location: 'San Fernando, Cebu' },
    ],
  },
  'Civil Engineer': {
    position: 'Civil Engineer',
    alumniCount: 67, currentCount: 52, averageExperienceYears: 4.1, topIndustry: 'Construction',
    mostCommonCourse: 'Bachelor of Science in Civil Engineering',
    careerOverview: 'Civil Engineers are a prominent career path for CTU-Naga alumni. Most work at DPWH in the Construction industry. The average reported experience is 4.1 years.',
    topEmployers: [{ name: 'DPWH', count: 20 }, { name: 'AECOM', count: 8 }, { name: 'DMCI Homes', count: 5 }, { name: 'Mega Construction', count: 4 }],
    topSkills: [{ name: 'AutoCAD', count: 60, percentage: 90 }, { name: 'Project Management', count: 45, percentage: 67 }, { name: 'Structural Analysis', count: 40, percentage: 60 }, { name: 'STAAD', count: 35, percentage: 52 }],
    industryDistribution: [{ name: 'Construction', count: 42, percentage: 80 }, { name: 'Government', count: 8, percentage: 15 }, { name: 'Real Estate', count: 2, percentage: 5 }],
    employmentTimeline: [{ year: 2020, count: 6 }, { year: 2021, count: 9 }, { year: 2022, count: 13 }, { year: 2023, count: 16 }, { year: 2024, count: 20 }, { year: 2025, count: 22 }],
    relatedCareers: [{ name: 'Project Manager', count: 5 }, { name: 'Structural Engineer', count: 4 }, { name: 'Architect', count: 3 }],
    suggestedSkills: [{ name: 'AutoCAD', percentage: 90 }, { name: 'Project Management', percentage: 67 }, { name: 'Structural Analysis', percentage: 60 }, { name: 'STAAD', percentage: 52 }],
    recentAlumni: [
      { id: 'ce1', name: 'Ferdinand Cruz', position: 'Civil Engineer', company: 'DPWH', batch: 2021, employmentStatus: 'Employed', location: 'Cebu City' },
      { id: 'ce2', name: 'Luis Antonio', position: 'Civil Engineer', company: 'AECOM', batch: 2020, employmentStatus: 'Employed', location: 'Mandaue, Cebu' },
    ],
  },
  'QA Engineer': {
    position: 'QA Engineer',
    alumniCount: 34, currentCount: 27, averageExperienceYears: 2.3, topIndustry: 'Information Technology',
    mostCommonCourse: 'Bachelor of Science in Information Technology',
    careerOverview: 'QA Engineers play a vital role in software quality for CTU-Naga alumni. Most work in the Information Technology industry at Accenture. The average reported experience is 2.3 years.',
    topEmployers: [{ name: 'Accenture', count: 8 }, { name: 'Lexmark', count: 5 }, { name: 'IBM', count: 4 }, { name: 'Concentrix', count: 3 }],
    topSkills: [{ name: 'Test Automation', count: 30, percentage: 88 }, { name: 'Selenium', count: 26, percentage: 76 }, { name: 'Manual Testing', count: 24, percentage: 71 }, { name: 'JIRA', count: 20, percentage: 59 }, { name: 'API Testing', count: 18, percentage: 53 }],
    industryDistribution: [{ name: 'Information Technology', count: 25, percentage: 93 }, { name: 'Business', count: 2, percentage: 7 }],
    employmentTimeline: [{ year: 2020, count: 2 }, { year: 2021, count: 4 }, { year: 2022, count: 7 }, { year: 2023, count: 10 }, { year: 2024, count: 14 }, { year: 2025, count: 18 }],
    relatedCareers: [{ name: 'Software Engineer', count: 6 }, { name: 'Frontend Developer', count: 4 }, { name: 'Backend Developer', count: 3 }],
    suggestedSkills: [{ name: 'Test Automation', percentage: 88 }, { name: 'Selenium', percentage: 76 }, { name: 'Manual Testing', percentage: 71 }, { name: 'JIRA', percentage: 59 }, { name: 'API Testing', percentage: 53 }],
    recentAlumni: [
      { id: 'q1', name: 'Katherine Lee', position: 'QA Engineer', company: 'Accenture', batch: 2024, employmentStatus: 'Employed', location: 'Cebu City' },
    ],
  },
  'DevOps Engineer': {
    position: 'DevOps Engineer',
    alumniCount: 28, currentCount: 23, averageExperienceYears: 3.0, topIndustry: 'Information Technology',
    mostCommonCourse: 'Bachelor of Science in Information Technology',
    careerOverview: 'DevOps Engineers are an emerging specialized career for CTU-Naga alumni. Most work in the Information Technology industry at IBM. The average reported experience is 3.0 years.',
    topEmployers: [{ name: 'IBM', count: 6 }, { name: 'Accenture', count: 5 }, { name: 'Lexmark', count: 3 }, { name: 'Globe Telecom', count: 2 }],
    topSkills: [{ name: 'Docker', count: 25, percentage: 89 }, { name: 'AWS', count: 22, percentage: 79 }, { name: 'CI/CD', count: 20, percentage: 71 }, { name: 'Kubernetes', count: 18, percentage: 64 }, { name: 'Linux', count: 16, percentage: 57 }],
    industryDistribution: [{ name: 'Information Technology', count: 21, percentage: 91 }, { name: 'Finance', count: 2, percentage: 9 }],
    employmentTimeline: [{ year: 2021, count: 2 }, { year: 2022, count: 5 }, { year: 2023, count: 8 }, { year: 2024, count: 12 }, { year: 2025, count: 15 }],
    relatedCareers: [{ name: 'Software Engineer', count: 8 }, { name: 'Backend Developer', count: 5 }, { name: 'Systems Administrator', count: 4 }],
    suggestedSkills: [{ name: 'Docker', percentage: 89 }, { name: 'AWS', percentage: 79 }, { name: 'CI/CD', percentage: 71 }, { name: 'Kubernetes', percentage: 64 }, { name: 'Linux', percentage: 57 }],
    recentAlumni: [
      { id: 'devops1', name: 'Nathaniel Cruz', position: 'DevOps Engineer', company: 'IBM', batch: 2023, employmentStatus: 'Employed', location: 'Cebu City' },
    ],
  },
  'Business Analyst': {
    position: 'Business Analyst',
    alumniCount: 41, currentCount: 32, averageExperienceYears: 2.5, topIndustry: 'Information Technology',
    mostCommonCourse: 'Bachelor of Science in Business Administration',
    careerOverview: 'Business Analysts represent a growing career path for CTU-Naga alumni. Most work in the Information Technology industry at Accenture. The average reported experience is 2.5 years.',
    topEmployers: [{ name: 'Accenture', count: 10 }, { name: 'IBM', count: 5 }, { name: 'Globe Telecom', count: 4 }, { name: 'UnionBank', count: 3 }],
    topSkills: [{ name: 'Data Analysis', count: 38, percentage: 93 }, { name: 'Excel', count: 35, percentage: 85 }, { name: 'SQL', count: 28, percentage: 68 }, { name: 'Process Modeling', count: 22, percentage: 54 }, { name: 'Tableau', count: 18, percentage: 44 }],
    industryDistribution: [{ name: 'Information Technology', count: 28, percentage: 88 }, { name: 'Finance', count: 3, percentage: 9 }, { name: 'Business', count: 1, percentage: 3 }],
    employmentTimeline: [{ year: 2020, count: 2 }, { year: 2021, count: 5 }, { year: 2022, count: 8 }, { year: 2023, count: 12 }, { year: 2024, count: 16 }, { year: 2025, count: 20 }],
    relatedCareers: [{ name: 'Data Analyst', count: 6 }, { name: 'Project Manager', count: 4 }, { name: 'Management Consultant', count: 3 }],
    suggestedSkills: [{ name: 'Data Analysis', percentage: 93 }, { name: 'Excel', percentage: 85 }, { name: 'SQL', percentage: 68 }, { name: 'Process Modeling', percentage: 54 }, { name: 'Tableau', percentage: 44 }],
    recentAlumni: [
      { id: 'ba1', name: 'Isabella Chang', position: 'Business Analyst', company: 'Accenture', batch: 2024, employmentStatus: 'Employed', location: 'Cebu City' },
    ],
  },
};

function makeFallback(position: string) {
  const base = mockData['Software Engineer'];
  return {
    ...base,
    position,
    careerOverview: `${position}s are among the careers pursued by CTU-Naga alumni. Data is being collected as more alumni update their employment information.`,
    topEmployers: [],
    topSkills: [],
    industryDistribution: [],
    employmentTimeline: [],
    relatedCareers: [],
    suggestedSkills: [],
    recentAlumni: [],
    alumniCount: 0,
    currentCount: 0,
    averageExperienceYears: 0,
    topIndustry: 'N/A',
    mostCommonCourse: null,
  };
}

export default function CareerInsightsPage() {
  const { position } = useParams<{ position: string }>();
  const navigate = useNavigate();
  const fallbackData = position ? (mockData[position] || makeFallback(position)) : null;
  const [data, setData] = useState<any>(fallbackData);

  useEffect(() => {
    if (!position) return;
    careerTrendsApi.get(position)
      .then((res) => setData(res))
      .catch(() => {});
  }, [position]);

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto text-center py-12">
        <p className="text-gray-500">Career data not found.</p>
        <button onClick={() => navigate('/career-trends')} className="mt-4 text-sm text-orange-600 hover:underline">Back to Career Trends</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => navigate('/career-trends')}
        className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors mb-4"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Career Trends
      </button>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <BriefcaseIcon className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">{position}</h1>
            <p className="text-xs text-gray-500">{data.alumniCount} alumni tracked &middot; {data.currentCount} currently employed</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-gray-900">{data.alumniCount}</p>
            <p className="text-[10px] text-gray-500">Total Alumni</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-gray-900">{data.currentCount}</p>
            <p className="text-[10px] text-gray-500">Currently Employed</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-gray-900">{data.averageExperienceYears}yrs</p>
            <p className="text-[10px] text-gray-500">Avg Experience</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-gray-900 truncate" title={data.topIndustry || 'N/A'}>{data.topIndustry || 'N/A'}</p>
            <p className="text-[10px] text-gray-500">Top Industry</p>
          </div>
        </div>
      </div>

      {/* Overview + Course */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <SparklesIcon className="w-4 h-4 text-orange-500" />
          Career Overview
        </h3>
        <p className="text-sm text-gray-700 leading-relaxed">{data.careerOverview}</p>
        {data.mostCommonCourse && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs">
            <AcademicCapIcon className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="text-gray-500">Most Common Course:</span>
            <span className="font-semibold text-gray-800">{data.mostCommonCourse}</span>
          </div>
        )}
      </div>

      {/* Where They Work */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Where They Work</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {data.topEmployers?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BuildingOfficeIcon className="w-4 h-4 text-orange-500" />
              Top Employers
            </h4>
            <div className="space-y-1">
              {data.topEmployers.map((emp: any, i: number) => (
                <div key={emp.name} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center text-[9px] font-bold text-orange-600 shrink-0">{i + 1}</span>
                    <span className="text-gray-700 font-medium">{emp.name}</span>
                  </div>
                  <span className="text-gray-400">{emp.count} alumni</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.industryDistribution?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ChartBarIcon className="w-4 h-4 text-orange-500" />
              Industry Distribution
            </h4>
            <div className="space-y-2">
              {data.industryDistribution.map((ind: any, i: number) => (
                <div key={ind.name}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length] }} />
                      <span className="text-gray-700 font-medium">{ind.name}</span>
                    </div>
                    <span className="text-gray-500">{ind.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden ml-4">
                    <div className="h-full rounded-full" style={{ width: `${ind.percentage}%`, backgroundColor: INDUSTRY_COLORS[i % INDUSTRY_COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Skills & Growth */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Skills & Growth</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {data.topSkills?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AcademicCapIcon className="w-4 h-4 text-orange-500" />
              Skills Distribution
            </h4>
            <div className="space-y-2">
              {data.topSkills.slice(0, 6).map((skill: any) => (
                <div key={skill.name}>
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="text-gray-700 font-medium">{skill.name}</span>
                    <span className="text-gray-500">{skill.percentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(skill.percentage, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.employmentTimeline?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 text-orange-500" />
              Employment Growth
            </h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.employmentTimeline}>
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip formatter={(value: number) => [Math.round(value), 'Alumni']} />
                  <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: '#f97316' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Career Paths */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Career Paths</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {data.relatedCareers?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <BriefcaseIcon className="w-4 h-4 text-orange-500" />
              Related Careers
            </h4>
            <p className="text-[11px] text-gray-500 mb-2">Alumni who work as {position} also pursue these roles:</p>
            <div className="space-y-1">
              {data.relatedCareers.map((rc: any) => (
                <button
                  key={rc.name}
                  onClick={() => navigate(`/career-trends/${encodeURIComponent(rc.name)}`)}
                  className="flex items-center justify-between w-full text-xs px-2 py-1.5 rounded hover:bg-orange-50 transition-colors text-left"
                >
                  <span className="text-orange-700 font-medium">{rc.name}</span>
                  <span className="text-gray-400">{rc.count} alumni</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {data.suggestedSkills?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircleIcon className="w-4 h-4 text-orange-500" />
              Suggested Skills
            </h4>
            <p className="text-[11px] text-gray-500 mb-2">
              If you want to become a {position}, the most common skills among alumni are:
            </p>
            <div className="space-y-1.5">
              {data.suggestedSkills.map((skill: any) => (
                <div key={skill.name} className="flex items-center gap-2 text-xs">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-gray-700 font-medium flex-1">{skill.name}</span>
                  <span className="text-gray-400">{skill.percentage}% of alumni</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alumni List */}
      {data.recentAlumni?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserGroupIcon className="w-4 h-4 text-orange-500" />
            Alumni Working as {position}
          </h3>
          <div className="space-y-2">
            {data.recentAlumni.slice(0, 10).map((alumni: any) => (
              <div key={alumni.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-gray-50 last:border-0">
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600 shrink-0">
                  {alumni.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{alumni.name}</p>
                  <p className="text-gray-500 truncate">
                    {alumni.position || position}
                    {alumni.company && <span> at {alumni.company}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0 text-xs leading-relaxed">
                  {alumni.batch && <p className="text-gray-500">Batch {alumni.batch}</p>}
                  {alumni.employmentStatus && <p className="text-emerald-600 font-medium">{alumni.employmentStatus}</p>}
                  {alumni.location && <p className="text-gray-400">{alumni.location}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
