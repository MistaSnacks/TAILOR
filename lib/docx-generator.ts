// 📄 DOCX Resume Generator with Template Styling
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Tab,
  TabStopPosition,
  TabStopType,
} from 'docx';
import { ResumeContent, normalizeResumeContent } from './resume-content';

// Template configurations
const TEMPLATE_STYLES = {
  classic: {
    fontFamily: 'Times New Roman',
    headerFontFamily: 'Times New Roman',
    accentColorHex: '000000',
    headerSize: 48, // half-points (24pt)
    sectionHeaderSize: 24, // 12pt
    bodySize: 22, // 11pt
    dateSize: 20, // 10pt
  },
  modern: {
    fontFamily: 'Calibri',
    headerFontFamily: 'Calibri Light',
    accentColorHex: '4FD1C5',
    headerSize: 52, // 26pt
    sectionHeaderSize: 24, // 12pt
    bodySize: 22, // 11pt
    dateSize: 20, // 10pt
  },
  technical: {
    fontFamily: 'Consolas',
    headerFontFamily: 'Calibri',
    accentColorHex: '00D9FF',
    headerSize: 44, // 22pt
    sectionHeaderSize: 22, // 11pt
    bodySize: 20, // 10pt
    dateSize: 18, // 9pt
  },
};

type TemplateType = keyof typeof TEMPLATE_STYLES;

export async function generateResumeDocx(
  resumeData: ResumeContent,
  template: string = 'modern'
): Promise<Buffer> {
  try {
    console.log('📄 Generating DOCX resume with template:', template);

    const data = normalizeResumeContent(resumeData);
    const style = TEMPLATE_STYLES[template as TemplateType] || TEMPLATE_STYLES.modern;
    const sections: any[] = [];

    // Contact Information Header
    if (data.contact) {
      const contact = data.contact;
      
      // Name
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: (contact.name || 'Your Name').toUpperCase(),
              bold: true,
              size: style.headerSize,
              font: style.headerFontFamily,
              color: template === 'classic' ? '000000' : style.accentColorHex,
            }),
          ],
          alignment: template === 'technical' ? AlignmentType.LEFT : AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      );

      // Contact details
      const contactDetails: string[] = [];
      if (contact.email) contactDetails.push(contact.email);
      if (contact.phone) contactDetails.push(contact.phone);
      if (contact.location) contactDetails.push(contact.location);
      if (contact.linkedin) contactDetails.push(contact.linkedin);
      if (contact.portfolio) contactDetails.push(contact.portfolio);

      if (contactDetails.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: contactDetails.join(' | '),
                size: style.dateSize,
                font: style.fontFamily,
                color: '666666',
              }),
            ],
            alignment: template === 'technical' ? AlignmentType.LEFT : AlignmentType.CENTER,
            spacing: { after: 200 },
            border: template === 'classic' ? {
              bottom: {
                color: '000000',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 12,
              },
            } : template === 'technical' ? {
              bottom: {
                color: style.accentColorHex,
                space: 1,
                style: BorderStyle.SINGLE,
                size: 18,
              },
            } : undefined,
          })
        );
      }

      // Add accent bar for modern template
      if (template === 'modern') {
        sections.push(
          new Paragraph({
            spacing: { after: 200 },
            border: {
              bottom: {
                color: style.accentColorHex,
                space: 1,
                style: BorderStyle.SINGLE,
                size: 24,
              },
            },
          })
        );
      }
    }

    // Skills section - at top for technical template
    if (template === 'technical' && data.skills && data.skills.length > 0) {
      sections.push(createSectionHeader('TECHNICAL SKILLS', style, template));
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: data.skills.join(' • '),
              size: style.bodySize,
              font: style.fontFamily,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Professional Summary
    if (data.summary) {
      const summaryTitle = template === 'classic' ? 'OBJECTIVE' : 'PROFESSIONAL SUMMARY';
      sections.push(createSectionHeader(summaryTitle, style, template));
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: data.summary,
              size: style.bodySize,
              font: style.fontFamily,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }

    // Work Experience
    if (data.experience && data.experience.length > 0) {
      const expTitle = template === 'classic' ? 'PROFESSIONAL EXPERIENCE' : 'WORK EXPERIENCE';
      sections.push(createSectionHeader(expTitle, style, template));

      data.experience.forEach((exp) => {
        // Company and date row
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: template === 'technical' 
                  ? `${exp.title} @ ${exp.company}`
                  : exp.company || '',
                bold: true,
                size: style.bodySize + 2,
                font: style.fontFamily,
              }),
              new TextRun({
                text: '\t',
              }),
              new TextRun({
                text: [exp.startDate, exp.endDate || 'Present'].filter(Boolean).join(' - '),
                size: style.dateSize,
                font: style.fontFamily,
                color: template === 'technical' && (exp.endDate === 'Present' || !exp.endDate) 
                  ? style.accentColorHex 
                  : '666666',
              }),
            ],
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: TabStopPosition.MAX,
              },
            ],
            spacing: { before: 100, after: 50 },
          })
        );

        // Title row (for non-technical templates)
        if (template !== 'technical') {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: exp.title || '',
                  italics: true,
                  size: style.bodySize,
                  font: style.fontFamily,
                  color: '444444',
                }),
                ...(exp.location ? [
                  new TextRun({
                    text: '\t',
                  }),
                  new TextRun({
                    text: exp.location,
                    size: style.dateSize,
                    font: style.fontFamily,
                    color: '666666',
                  }),
                ] : []),
              ],
              tabStops: [
                {
                  type: TabStopType.RIGHT,
                  position: TabStopPosition.MAX,
                },
              ],
              spacing: { after: 100 },
            })
          );
        } else if (exp.location) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: exp.location,
                  size: style.dateSize,
                  font: style.fontFamily,
                  color: '888888',
                }),
              ],
              spacing: { after: 80 },
            })
          );
        }

        // Bullet points
        if (exp.bullets && exp.bullets.length > 0) {
          exp.bullets.forEach((bullet) => {
            const bulletText = typeof bullet === 'string' ? bullet : (bullet as any)?.text || '';
            if (bulletText) {
              sections.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: template === 'technical' ? '▸ ' : '• ',
                      size: style.bodySize,
                      font: style.fontFamily,
                      color: template === 'technical' ? style.accentColorHex : undefined,
                    }),
                    new TextRun({
                      text: bulletText,
                      size: style.bodySize,
                      font: style.fontFamily,
                    }),
                  ],
                  indent: { left: convertInchesToTwip(0.25) },
                  spacing: { after: 50 },
                })
              );
            }
          });
        }

        sections.push(
          new Paragraph({
            text: '',
            spacing: { after: 100 },
          })
        );
      });
    }

    // Skills (for non-technical templates - it's already at the top for technical)
    if (template !== 'technical' && data.skills && data.skills.length > 0) {
      sections.push(createSectionHeader('SKILLS', style, template));
      
      if (template === 'modern') {
        // Modern: skills as comma-separated with accent color bullets
        sections.push(
          new Paragraph({
            children: data.skills.map((skill, i) => [
              new TextRun({
                text: i > 0 ? ' • ' : '',
                size: style.bodySize,
                font: style.fontFamily,
                color: style.accentColorHex,
              }),
              new TextRun({
                text: skill,
                size: style.bodySize,
                font: style.fontFamily,
              }),
            ]).flat(),
            spacing: { after: 200 },
          })
        );
      } else {
        // Classic: simple comma list
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: data.skills.join(', '),
                size: style.bodySize,
                font: style.fontFamily,
              }),
            ],
            spacing: { after: 200 },
          })
        );
      }
    }

    // Education
    if (data.education && data.education.length > 0) {
      sections.push(createSectionHeader('EDUCATION', style, template));

      data.education.forEach((edu) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: edu.degree || '',
                bold: true,
                size: style.bodySize,
                font: style.fontFamily,
              }),
              new TextRun({
                text: ` | ${edu.school || ''}`,
                size: style.bodySize,
                font: style.fontFamily,
              }),
              new TextRun({
                text: '\t',
              }),
              new TextRun({
                text: edu.year || edu.endDate || '',
                size: style.dateSize,
                font: style.fontFamily,
                color: '666666',
              }),
            ],
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: TabStopPosition.MAX,
              },
            ],
            spacing: { after: 50 },
          })
        );

        const eduDetails: string[] = [];
        if (edu.field) eduDetails.push(edu.field);
        if (edu.gpa) eduDetails.push(`GPA: ${edu.gpa}`);

        if (eduDetails.length > 0) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: eduDetails.join(' | '),
                  size: style.dateSize,
                  font: style.fontFamily,
                  color: '666666',
                }),
              ],
              spacing: { after: 100 },
            })
          );
        }
      });
    }

    // Certifications
    if (data.certifications && data.certifications.length > 0) {
      sections.push(createSectionHeader('CERTIFICATIONS', style, template));

      data.certifications.forEach((cert) => {
        const certText = [cert.name, cert.issuer, cert.date].filter(Boolean).join(' | ');
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: template === 'technical' ? '▸ ' : '• ',
                size: style.bodySize,
                font: style.fontFamily,
                color: template === 'technical' ? style.accentColorHex : undefined,
              }),
              new TextRun({
                text: certText,
                size: style.bodySize,
                font: style.fontFamily,
              }),
            ],
            indent: { left: convertInchesToTwip(0.25) },
            spacing: { after: 50 },
          })
        );
      });
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.75),
                bottom: convertInchesToTwip(0.75),
                left: convertInchesToTwip(0.75),
                right: convertInchesToTwip(0.75),
              },
            },
          },
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

// Helper function to create section headers with template styling
function createSectionHeader(
  title: string, 
  style: typeof TEMPLATE_STYLES.modern, 
  template: string
): Paragraph {
  if (template === 'modern') {
    return new Paragraph({
      children: [
        new TextRun({
          text: '■ ',
          size: style.sectionHeaderSize,
          font: style.fontFamily,
          color: style.accentColorHex,
        }),
        new TextRun({
          text: title,
          bold: true,
          size: style.sectionHeaderSize,
          font: style.fontFamily,
          color: style.accentColorHex,
        }),
      ],
      spacing: { before: 200, after: 100 },
    });
  }

  if (template === 'technical') {
    return new Paragraph({
      children: [
        new TextRun({
          text: '│ ',
          size: style.sectionHeaderSize,
          font: style.fontFamily,
          color: style.accentColorHex,
        }),
        new TextRun({
          text: title,
          bold: true,
          size: style.sectionHeaderSize,
          font: style.fontFamily,
          color: style.accentColorHex,
        }),
      ],
      spacing: { before: 200, after: 100 },
    });
  }

  // Classic template
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: style.sectionHeaderSize,
        font: style.fontFamily,
      }),
    ],
    spacing: { before: 200, after: 100 },
    border: {
      bottom: {
        color: '888888',
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
  });
}

export { normalizeResumeContent as parseResumeContent } from './resume-content';
