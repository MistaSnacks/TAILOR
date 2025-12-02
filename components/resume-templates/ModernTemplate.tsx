'use client';

import type { TemplatePreviewProps } from './types';
import { TEMPLATE_CONFIGS } from './types';

export function ModernTemplate({ content, scale = 1 }: TemplatePreviewProps) {
  const config = TEMPLATE_CONFIGS.modern;
  
  return (
    <div 
      className="bg-white text-black shadow-lg origin-top-left"
      style={{
        fontFamily: config.font,
        transform: `scale(${scale})`,
        width: '210mm',
        minHeight: '297mm',
        padding: '18mm',
        fontSize: '11px',
        lineHeight: '1.5',
      }}
    >
      {/* Header - Modern with accent bar */}
      <div className="mb-6">
        <div 
          className="h-1 w-16 mb-4 rounded"
          style={{ backgroundColor: config.accentColor }}
        />
        <h1 
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: config.headerFont }}
        >
          {content.contact?.name || 'Your Name'}
        </h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-600">
          {content.contact?.email && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {content.contact.email}
            </span>
          )}
          {content.contact?.phone && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {content.contact.phone}
            </span>
          )}
          {content.contact?.location && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {content.contact.location}
            </span>
          )}
          {content.contact?.linkedin && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              {content.contact.linkedin}
            </span>
          )}
        </div>
      </div>

      {/* Professional Summary */}
      {content.summary && (
        <div className="mb-6">
          <h2 
            className="text-sm font-semibold uppercase tracking-wide mb-2 flex items-center gap-2"
            style={{ color: config.accentColor, fontFamily: config.headerFont }}
          >
            <span 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: config.accentColor }}
            />
            Professional Summary
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {content.summary}
          </p>
        </div>
      )}

      {/* Work Experience */}
      {content.experience && content.experience.length > 0 && (
        <div className="mb-6">
          <h2 
            className="text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
            style={{ color: config.accentColor, fontFamily: config.headerFont }}
          >
            <span 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: config.accentColor }}
            />
            Work Experience
          </h2>
          <div className="space-y-5">
            {content.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-semibold text-[12px]">{exp.title}</h3>
                    <p className="text-gray-600">{exp.company}</p>
                  </div>
                  <div className="text-right text-[10px] text-gray-500">
                    <div>{exp.startDate} - {exp.endDate || 'Present'}</div>
                    {exp.location && <div>{exp.location}</div>}
                  </div>
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {exp.bullets.map((bullet, j) => (
                      <li key={j} className="flex gap-2 text-gray-700">
                        <span 
                          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: config.accentColor }}
                        />
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

      {/* Skills - Tag style */}
      {content.skills && content.skills.length > 0 && (
        <div className="mb-6">
          <h2 
            className="text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
            style={{ color: config.accentColor, fontFamily: config.headerFont }}
          >
            <span 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: config.accentColor }}
            />
            Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {content.skills.map((skill, i) => (
              <span 
                key={i}
                className="px-3 py-1 rounded-full text-[10px] font-medium"
                style={{ 
                  backgroundColor: `${config.accentColor}15`,
                  color: config.accentColor,
                  border: `1px solid ${config.accentColor}30`,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {content.education && content.education.length > 0 && (
        <div className="mb-6">
          <h2 
            className="text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
            style={{ color: config.accentColor, fontFamily: config.headerFont }}
          >
            <span 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: config.accentColor }}
            />
            Education
          </h2>
          <div className="space-y-3">
            {content.education.map((edu, i) => (
              <div key={i} className="flex justify-between">
                <div>
                  <h3 className="font-semibold">{edu.degree}</h3>
                  <p className="text-gray-600">{edu.school}</p>
                </div>
                <div className="text-right text-[10px] text-gray-500">
                  {edu.startDate || edu.year} {edu.endDate && `- ${edu.endDate}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {content.certifications && content.certifications.length > 0 && (
        <div className="mb-6">
          <h2 
            className="text-sm font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
            style={{ color: config.accentColor, fontFamily: config.headerFont }}
          >
            <span 
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: config.accentColor }}
            />
            Certifications
          </h2>
          <div className="space-y-2">
            {content.certifications.map((cert, i) => (
              <div key={i} className="flex justify-between">
                <div>
                  <span className="font-medium">{cert.name}</span>
                  {cert.issuer && <span className="text-gray-600"> — {cert.issuer}</span>}
                </div>
                {cert.date && (
                  <span className="text-[10px] text-gray-500">{cert.date}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

