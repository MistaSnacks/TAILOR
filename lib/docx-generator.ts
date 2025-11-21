// 📄 DOCX Resume Generator
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { ResumeContent, normalizeResumeContent } from './resume-content';

export async function generateResumeDocx(
  resumeData: ResumeContent,
  template: string = 'modern'
): Promise<Buffer> {
  try {
    console.log('📄 Generating DOCX resume with template:', template);

    const data = normalizeResumeContent(resumeData);
    const sections: any[] = [];

    // Contact Information (if available)
    if (data.contact) {
      const contact = data.contact;
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
    if (data.summary) {
      sections.push(
        new Paragraph({
          text: 'PROFESSIONAL SUMMARY',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          thematicBreak: true,
        }),
        new Paragraph({
          text: data.summary,
          spacing: { after: 200 },
        })
      );
    }

    // Work Experience
    if (data.experience && data.experience.length > 0) {
      sections.push(
        new Paragraph({
          text: 'WORK EXPERIENCE',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          thematicBreak: true,
        })
      );

      data.experience.forEach((exp) => {
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
    if (data.skills && data.skills.length > 0) {
      sections.push(
        new Paragraph({
          text: 'SKILLS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          thematicBreak: true,
        }),
        new Paragraph({
          text: data.skills.join(' • '),
          spacing: { after: 200 },
        })
      );
    }

    // Education
    if (data.education && data.education.length > 0) {
      sections.push(
        new Paragraph({
          text: 'EDUCATION',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          thematicBreak: true,
        })
      );

      data.education.forEach((edu) => {
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
    if (data.certifications && data.certifications.length > 0) {
      sections.push(
        new Paragraph({
          text: 'CERTIFICATIONS',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          thematicBreak: true,
        })
      );

      data.certifications.forEach((cert) => {
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

export { normalizeResumeContent as parseResumeContent } from './resume-content';
