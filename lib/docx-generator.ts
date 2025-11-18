// 📄 DOCX Resume Generator
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx';

interface ResumeData {
  summary?: string;
  experience?: Array<{
    title: string;
    company: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    bullets?: string[];
    description?: string;
  }>;
  skills?: string[];
  education?: Array<{
    degree: string;
    school: string;
    year?: string;
    gpa?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
    date?: string;
  }>;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
}

export async function generateResumeDocx(
  resumeData: ResumeData,
  template: string = 'modern'
): Promise<Buffer> {
  try {
    console.log('📄 Generating DOCX resume with template:', template);

    const sections: any[] = [];

    // Contact Information (if available)
    if (resumeData.contact) {
      const contact = resumeData.contact;
      sections.push(
        new Paragraph({
          text: contact.name || 'Your Name',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      );

      const contactDetails: string[] = [];
      if (contact.email) contactDetails.push(contact.email);
      if (contact.phone) contactDetails.push(contact.phone);
      if (contact.location) contactDetails.push(contact.location);
      if (contact.linkedin) contactDetails.push(contact.linkedin);

      if (contactDetails.length > 0) {
        sections.push(
          new Paragraph({
            text: contactDetails.join(' | '),
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })
        );
      }
    }

    // Professional Summary
    if (resumeData.summary) {
      sections.push(
        new Paragraph({
          text: 'PROFESSIONAL SUMMARY',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          thematicBreak: true,
        }),
        new Paragraph({
          text: resumeData.summary,
          spacing: { after: 200 },
        })
      );
    }

    // Work Experience
    if (resumeData.experience && resumeData.experience.length > 0) {
      sections.push(
        new Paragraph({
          text: 'WORK EXPERIENCE',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          thematicBreak: true,
        })
      );

      resumeData.experience.forEach((exp) => {
        // Job title and company
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: exp.title,
                bold: true,
                size: 24,
              }),
              new TextRun({
                text: ` | ${exp.company}`,
                size: 24,
              }),
            ],
            spacing: { before: 100, after: 50 },
          })
        );

        // Date range
        const dateRange = [exp.startDate, exp.endDate].filter(Boolean).join(' - ') || 'Present';
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: dateRange,
                italics: true,
              }),
              ...(exp.location ? [new TextRun({ text: ` | ${exp.location}` })] : []),
            ],
            spacing: { after: 100 },
          })
        );

        // Bullet points or description
        if (exp.bullets && exp.bullets.length > 0) {
          exp.bullets.forEach((bullet) => {
            sections.push(
              new Paragraph({
                text: bullet,
                bullet: {
                  level: 0,
                },
                spacing: { after: 50 },
              })
            );
          });
        } else if (exp.description) {
          sections.push(
            new Paragraph({
              text: exp.description,
              spacing: { after: 100 },
            })
          );
        }

        sections.push(
          new Paragraph({
            text: '',
            spacing: { after: 100 },
          })
        );
      });
    }

    // Skills
    if (resumeData.skills && resumeData.skills.length > 0) {
      sections.push(
        new Paragraph({
          text: 'SKILLS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          thematicBreak: true,
        }),
        new Paragraph({
          text: resumeData.skills.join(' • '),
          spacing: { after: 200 },
        })
      );
    }

    // Education
    if (resumeData.education && resumeData.education.length > 0) {
      sections.push(
        new Paragraph({
          text: 'EDUCATION',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          thematicBreak: true,
        })
      );

      resumeData.education.forEach((edu) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: edu.degree,
                bold: true,
              }),
              new TextRun({
                text: ` | ${edu.school}`,
              }),
            ],
            spacing: { after: 50 },
          })
        );

        const eduDetails: string[] = [];
        if (edu.year) eduDetails.push(edu.year);
        if (edu.gpa) eduDetails.push(`GPA: ${edu.gpa}`);

        if (eduDetails.length > 0) {
          sections.push(
            new Paragraph({
              text: eduDetails.join(' | '),
              spacing: { after: 100 },
            })
          );
        }
      });
    }

    // Certifications
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      sections.push(
        new Paragraph({
          text: 'CERTIFICATIONS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          thematicBreak: true,
        })
      );

      resumeData.certifications.forEach((cert) => {
        const certText = [cert.name, cert.issuer, cert.date].filter(Boolean).join(' | ');
        sections.push(
          new Paragraph({
            text: certText,
            bullet: {
              level: 0,
            },
            spacing: { after: 50 },
          })
        );
      });
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: sections,
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    console.log('✅ DOCX generated, size:', buffer.length, 'bytes');

    return buffer;
  } catch (error) {
    console.error('❌ Error generating DOCX:', error);
    throw error;
  }
}

// Parse resume content from various formats
export function parseResumeContent(content: any): ResumeData {
  try {
    // If content is already structured
    if (typeof content === 'object' && !Array.isArray(content)) {
      return content as ResumeData;
    }

    // If content is a string (JSON or raw text)
    if (typeof content === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(content);
        return parsed as ResumeData;
      } catch {
        // If not JSON, create basic structure from raw text
        return {
          summary: content.substring(0, 500),
        };
      }
    }

    // Default empty structure
    return {
      summary: 'Resume content not available',
    };
  } catch (error) {
    console.error('Error parsing resume content:', error);
    return {
      summary: 'Error parsing resume content',
    };
  }
}

