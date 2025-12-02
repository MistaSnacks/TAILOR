'use client';

import type { TemplatePreviewProps } from './types';
import { TEMPLATE_CONFIGS } from './types';

export function ClassicTemplate({ content, scale = 1 }: TemplatePreviewProps) {
  const config = TEMPLATE_CONFIGS.classic;
  
  return (
    <div 
      className="bg-white text-black shadow-lg origin-top-left"
      style={{
        fontFamily: config.font,
        transform: `scale(${scale})`,
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        fontSize: '11px',
        lineHeight: '1.4',
      }}
    >
      {/* Header - Centered, Traditional */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 
          className="text-2xl font-bold uppercase tracking-wider mb-2"
          style={{ fontFamily: config.headerFont }}
        >
          {content.contact?.name || 'Your Name'}
        </h1>
        <div className="text-[10px] text-gray-700 flex justify-center gap-3 flex-wrap">
          {content.contact?.email && <span>{content.contact.email}</span>}
          {content.contact?.phone && <span>• {content.contact.phone}</span>}
          {content.contact?.location && <span>• {content.contact.location}</span>}
          {content.contact?.linkedin && <span>• {content.contact.linkedin}</span>}
        </div>
      </div>

      {/* Objective/Summary */}
      {content.summary && (
        <div className="mb-5">
          <h2 
            className="text-sm font-bold uppercase border-b border-gray-400 mb-2 pb-1"
            style={{ fontFamily: config.headerFont }}
          >
            Objective
          </h2>
          <p className="text-gray-800 leading-relaxed">
            {content.summary}
          </p>
        </div>
      )}

      {/* Professional Experience */}
      {content.experience && content.experience.length > 0 && (
        <div className="mb-5">
          <h2 
            className="text-sm font-bold uppercase border-b border-gray-400 mb-3 pb-1"
            style={{ fontFamily: config.headerFont }}
          >
            Professional Experience
          </h2>
          <div className="space-y-4">
            {content.experience.map((exp, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-bold">{exp.company}</span>
                  <span className="text-[10px] text-gray-600">
                    {exp.startDate} - {exp.endDate || 'Present'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="italic text-gray-700">{exp.title}</span>
                  {exp.location && (
                    <span className="text-[10px] text-gray-600">{exp.location}</span>
                  )}
                </div>
                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="list-disc list-outside ml-5 space-y-1">
                    {exp.bullets.map((bullet, j) => (
                      <li key={j} className="text-gray-800 pl-1">
                        {typeof bullet === 'string' ? bullet : (bullet as any)?.text || ''}
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
            className="text-sm font-bold uppercase border-b border-gray-400 mb-3 pb-1"
            style={{ fontFamily: config.headerFont }}
          >
            Education
          </h2>
          <div className="space-y-2">
            {content.education.map((edu, i) => (
              <div key={i}>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold">{edu.school}</span>
                  <span className="text-[10px] text-gray-600">
                    {edu.startDate || edu.year} {edu.endDate && `- ${edu.endDate}`}
                  </span>
                </div>
                <div className="text-gray-700">
                  {edu.degree} {edu.field && `in ${edu.field}`}
                  {edu.gpa && <span className="ml-2">(GPA: {edu.gpa})</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical Skills */}
      {content.skills && content.skills.length > 0 && (
        <div className="mb-5">
          <h2 
            className="text-sm font-bold uppercase border-b border-gray-400 mb-2 pb-1"
            style={{ fontFamily: config.headerFont }}
          >
            Technical Skills
          </h2>
          <p className="text-gray-800">
            {content.skills.join(', ')}
          </p>
        </div>
      )}

      {/* Certifications */}
      {content.certifications && content.certifications.length > 0 && (
        <div className="mb-5">
          <h2 
            className="text-sm font-bold uppercase border-b border-gray-400 mb-2 pb-1"
            style={{ fontFamily: config.headerFont }}
          >
            Certifications & Awards
          </h2>
          <ul className="list-disc list-outside ml-5 space-y-1">
            {content.certifications.map((cert, i) => (
              <li key={i} className="text-gray-800">
                {cert.name}
                {cert.issuer && <span> — {cert.issuer}</span>}
                {cert.date && <span className="text-gray-600"> ({cert.date})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

