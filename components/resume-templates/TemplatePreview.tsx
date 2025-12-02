'use client';

import type { ResumeContent } from '@/lib/resume-content';
import type { TemplateType } from './types';
import { ClassicTemplate } from './ClassicTemplate';
import { ModernTemplate } from './ModernTemplate';
import { TechnicalTemplate } from './TechnicalTemplate';

interface TemplatePreviewProps {
  template: TemplateType;
  content: ResumeContent;
  scale?: number;
}

export function TemplatePreview({ template, content, scale = 1 }: TemplatePreviewProps) {
  switch (template) {
    case 'classic':
      return <ClassicTemplate content={content} scale={scale} />;
    case 'modern':
      return <ModernTemplate content={content} scale={scale} />;
    case 'technical':
      return <TechnicalTemplate content={content} scale={scale} />;
    default:
      return <ModernTemplate content={content} scale={scale} />;
  }
}


