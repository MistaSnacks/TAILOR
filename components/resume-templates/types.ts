// Types for resume template components
import type { ResumeContent } from '@/lib/resume-content';

export type TemplateType = 'classic' | 'modern' | 'technical';

export interface TemplateConfig {
  name: string;
  description: string;
  font: string;
  headerFont: string;
  accentColor: string;
  spacing: 'compact' | 'comfortable';
}

export const TEMPLATE_CONFIGS: Record<TemplateType, TemplateConfig> = {
  classic: {
    name: 'Classic',
    description: 'Traditional, professional format',
    font: 'Times New Roman, serif',
    headerFont: 'Times New Roman, serif',
    accentColor: '#000000',
    spacing: 'compact',
  },
  modern: {
    name: 'Modern',
    description: 'Clean, contemporary design with accent colors',
    font: 'Inter, sans-serif',
    headerFont: 'Outfit, sans-serif',
    accentColor: '#4FD1C5',
    spacing: 'comfortable',
  },
  technical: {
    name: 'Technical',
    description: 'Optimized for technical roles with skills emphasis',
    font: 'Roboto Mono, monospace',
    headerFont: 'Roboto, sans-serif',
    accentColor: '#00D9FF',
    spacing: 'comfortable',
  },
};

export interface TemplatePreviewProps {
  content: ResumeContent;
  scale?: number;
}

// Sample data for template preview cards
export const SAMPLE_RESUME_CONTENT: ResumeContent = {
  contact: {
    name: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    phone: '(555) 123-4567',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alexjohnson',
    portfolio: 'alexjohnson.dev',
  },
  summary: 'Experienced software engineer with 5+ years building scalable web applications. Led teams of 3-5 engineers to deliver high-impact products serving millions of users.',
  experience: [
    {
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      startDate: 'Jan 2022',
      endDate: 'Present',
      isCurrent: true,
      bullets: [
        'Led development of microservices architecture reducing latency by 40%',
        'Mentored 3 junior engineers through structured onboarding program',
        'Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes',
      ],
    },
    {
      title: 'Software Engineer',
      company: 'StartupXYZ',
      location: 'Remote',
      startDate: 'Jun 2019',
      endDate: 'Dec 2021',
      bullets: [
        'Built real-time data processing system handling 10M+ events daily',
        'Designed and implemented RESTful APIs used by 50+ enterprise clients',
      ],
    },
  ],
  education: [
    {
      degree: 'B.S. Computer Science',
      school: 'Stanford University',
      year: '2019',
      gpa: '3.8',
    },
  ],
  skills: [
    'TypeScript',
    'React',
    'Node.js',
    'Python',
    'AWS',
    'PostgreSQL',
    'Docker',
    'Kubernetes',
    'GraphQL',
    'Redis',
  ],
  certifications: [
    {
      name: 'AWS Solutions Architect',
      issuer: 'Amazon',
      date: '2023',
    },
  ],
};



