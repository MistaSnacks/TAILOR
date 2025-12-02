'use client';

import type { TemplatePreviewProps } from './types';
import { TEMPLATE_CONFIGS } from './types';

export function TechnicalTemplate({ content, scale = 1 }: TemplatePreviewProps) {
  const config = TEMPLATE_CONFIGS.technical;
  
  // Categorize skills for technical template
  const categorizeSkills = (skills: string[]) => {
    const categories: Record<string, string[]> = {
      'Languages': [],
      'Frameworks': [],
      'Tools & Cloud': [],
    };
    
    const languageKeywords = ['typescript', 'javascript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'sql', 'html', 'css'];
    const frameworkKeywords = ['react', 'angular', 'vue', 'next', 'node', 'express', 'django', 'flask', 'spring', 'rails', '.net', 'fastapi', 'graphql', 'redux', 'tailwind'];
    
    skills.forEach(skill => {
      const lower = skill.toLowerCase();
      if (languageKeywords.some(kw => lower.includes(kw))) {
        categories['Languages'].push(skill);
      } else if (frameworkKeywords.some(kw => lower.includes(kw))) {
        categories['Frameworks'].push(skill);
      } else {
        categories['Tools & Cloud'].push(skill);
      }
    });
    
    return categories;
  };

  const skillCategories = content.skills ? categorizeSkills(content.skills) : {};
  
  return (
    <div 
      className="bg-white text-black shadow-lg origin-top-left"
      style={{
        fontFamily: config.font,
        transform: `scale(${scale})`,
        width: '210mm',
        minHeight: '297mm',
        padding: '16mm',
        fontSize: '10px',
        lineHeight: '1.4',
      }}
    >
      {/* Header - Technical style with links */}
      <div 
        className="mb-5 pb-4"
        style={{ borderBottom: `2px solid ${config.accentColor}` }}
      >
        <h1 
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: config.headerFont }}
        >
          {content.contact?.name || 'Your Name'}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px]" style={{ color: '#666' }}>
          {content.contact?.email && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" style={{ color: config.accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {content.contact.email}
            </span>
          )}
          {content.contact?.phone && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" style={{ color: config.accentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {content.contact.phone}
            </span>
          )}
          {content.contact?.linkedin && (
            <span 
              className="flex items-center gap-1"
              style={{ color: config.accentColor }}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              {content.contact.linkedin}
            </span>
          )}
          {content.contact?.portfolio && (
            <span 
              className="flex items-center gap-1"
              style={{ color: config.accentColor }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {content.contact.portfolio}
            </span>
          )}
        </div>
      </div>

      {/* Technical Skills - Prominent, categorized */}
      {content.skills && content.skills.length > 0 && (
        <div className="mb-5">
          <h2 
            className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: config.accentColor, fontFamily: config.headerFont }}
          >
            <span 
              className="w-1 h-4"
              style={{ backgroundColor: config.accentColor }}
            />
            Technical Skills
          </h2>
          <div className="space-y-2">
            {Object.entries(skillCategories).map(([category, skills]) => (
              skills.length > 0 && (
                <div key={category} className="flex items-start gap-2">
                  <span 
                    className="text-[9px] font-semibold w-24 flex-shrink-0 pt-0.5"
                    style={{ fontFamily: config.headerFont }}
                  >
                    {category}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill, i) => (
                      <span 
                        key={i}
                        className="px-2 py-0.5 rounded text-[9px] font-medium"
                        style={{ 
                          backgroundColor: `${config.accentColor}15`,
                          color: '#333',
                          border: `1px solid ${config.accentColor}40`,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Professional Experience */}
      {content.experience && content.experience.length > 0 && (
        <div className="mb-5">
          <h2 
            className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: config.accentColor, fontFamily: config.headerFont }}
          >
            <span 
              className="w-1 h-4"
              style={{ backgroundColor: config.accentColor }}
            />
            Professional Experience
          </h2>
          <div className="space-y-4">
            {content.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline mb-1">
                  <div className="flex items-center gap-2">
                    <h3 
                      className="font-bold text-[11px]"
                      style={{ fontFamily: config.headerFont }}
                    >
                      {exp.title}
                    </h3>
                    <span className="text-gray-400">@</span>
                    <span className="font-medium">{exp.company}</span>
                  </div>
                  <span 
                    className="text-[9px] px-2 py-0.5 rounded"
                    style={{ 
                      backgroundColor: exp.isCurrent || exp.endDate === 'Present' ? `${config.accentColor}20` : '#f5f5f5',
                      color: exp.isCurrent || exp.endDate === 'Present' ? config.accentColor : '#666',
                    }}
                  >
                    {exp.startDate} — {exp.endDate || 'Present'}
                  </span>
                </div>
                {exp.location && (
                  <p className="text-[9px] text-gray-500 mb-2">{exp.location}</p>
                )}
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="space-y-1 ml-2">
                    {exp.bullets.map((bullet, j) => (
                      <li key={j} className="flex gap-2 text-gray-700">
                        <span 
                          className="mt-1.5 flex-shrink-0"
                          style={{ color: config.accentColor }}
                        >
                          ▸
                        </span>
                        <span>{typeof bullet === 'string' ? bullet : (bullet as any)?.text || ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {content.education && content.education.length > 0 && (
        <div className="mb-5">
          <h2 
            className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: config.accentColor, fontFamily: config.headerFont }}
          >
            <span 
              className="w-1 h-4"
              style={{ backgroundColor: config.accentColor }}
            />
            Education
          </h2>
          <div className="space-y-2">
            {content.education.map((edu, i) => (
              <div key={i} className="flex justify-between items-baseline">
                <div>
                  <span className="font-semibold" style={{ fontFamily: config.headerFont }}>
                    {edu.degree}
                  </span>
                  {edu.field && <span className="text-gray-600"> — {edu.field}</span>}
                  <span className="text-gray-500"> · {edu.school}</span>
                </div>
                <span className="text-[9px] text-gray-500">
                  {edu.startDate || edu.year} {edu.endDate && `- ${edu.endDate}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {content.certifications && content.certifications.length > 0 && (
        <div className="mb-5">
          <h2 
            className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2"
            style={{ color: config.accentColor, fontFamily: config.headerFont }}
          >
            <span 
              className="w-1 h-4"
              style={{ backgroundColor: config.accentColor }}
            />
            Certifications
          </h2>
          <div className="flex flex-wrap gap-2">
            {content.certifications.map((cert, i) => (
              <span 
                key={i}
                className="px-2 py-1 rounded text-[9px]"
                style={{ 
                  backgroundColor: '#f8f8f8',
                  border: `1px solid ${config.accentColor}30`,
                }}
              >
                <span className="font-medium">{cert.name}</span>
                {cert.issuer && <span className="text-gray-500"> · {cert.issuer}</span>}
                {cert.date && <span className="text-gray-400"> ({cert.date})</span>}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

