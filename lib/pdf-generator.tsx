// 📄 PDF Resume Generator using @react-pdf/renderer
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from '@react-pdf/renderer';
import { ResumeContent, normalizeResumeContent } from './resume-content';

// Disable hyphenation to prevent potential issues
Font.registerHyphenationCallback((word) => [word]);

// Use built-in PDF fonts to avoid CDN loading issues in server environment
// These are guaranteed to work without external dependencies:
// - Helvetica, Helvetica-Bold, Helvetica-Oblique, Helvetica-BoldOblique
// - Times-Roman, Times-Bold, Times-Italic, Times-BoldItalic
// - Courier, Courier-Bold, Courier-Oblique, Courier-BoldOblique

// Note: For custom fonts, you would need to embed .ttf files locally
// For now, using built-in PDF standard fonts for reliability

// Template configurations using built-in PDF fonts
const TEMPLATE_STYLES = {
  classic: {
    fontFamily: 'Times-Roman',  // Built-in PDF font
    accentColor: '#000000',
    headerSize: 22,
    sectionHeaderSize: 12,
    bodySize: 10,
    spacing: 'compact' as const,
  },
  modern: {
    fontFamily: 'Helvetica',  // Built-in PDF font (similar to Inter)
    accentColor: '#4FD1C5',
    headerSize: 24,
    sectionHeaderSize: 11,
    bodySize: 10,
    spacing: 'comfortable' as const,
  },
  technical: {
    fontFamily: 'Courier',  // Built-in PDF font (monospace)
    accentColor: '#00D9FF',
    headerSize: 20,
    sectionHeaderSize: 10,
    bodySize: 9,
    spacing: 'comfortable' as const,
  },
};

type TemplateType = keyof typeof TEMPLATE_STYLES;

// Classic Template PDF
function ClassicResumePDF({ data }: { data: ResumeContent }) {
  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Times-Roman',
      fontSize: 10,
      padding: 50,
      backgroundColor: '#ffffff',
    },
    header: {
      textAlign: 'center',
      borderBottomWidth: 2,
      borderBottomColor: '#000000',
      paddingBottom: 12,
      marginBottom: 16,
    },
    name: {
      fontSize: 22,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 6,
    },
    contactRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      fontSize: 9,
      color: '#444444',
    },
    contactItem: {
      marginHorizontal: 6,
    },
    section: {
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      borderBottomWidth: 1,
      borderBottomColor: '#888888',
      paddingBottom: 3,
      marginBottom: 8,
    },
    summary: {
      fontSize: 10,
      lineHeight: 1.4,
      color: '#333333',
    },
    experienceItem: {
      marginBottom: 10,
    },
    experienceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    company: {
      fontWeight: 'bold',
      fontSize: 10,
    },
    dates: {
      fontSize: 9,
      color: '#666666',
    },
    title: {
      fontStyle: 'italic',
      fontSize: 10,
      color: '#444444',
      marginBottom: 4,
    },
    bullet: {
      flexDirection: 'row',
      marginBottom: 2,
      paddingLeft: 12,
    },
    bulletDot: {
      width: 10,
      fontSize: 10,
    },
    bulletText: {
      flex: 1,
      fontSize: 10,
      lineHeight: 1.3,
    },
    skillsText: {
      fontSize: 10,
      lineHeight: 1.4,
    },
    educationItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{data.contact?.name || 'Your Name'}</Text>
          <View style={styles.contactRow}>
            {data.contact?.email && <Text style={styles.contactItem}>{data.contact.email}</Text>}
            {data.contact?.phone && <Text style={styles.contactItem}>• {data.contact.phone}</Text>}
            {data.contact?.location && <Text style={styles.contactItem}>• {data.contact.location}</Text>}
            {data.contact?.linkedin && <Text style={styles.contactItem}>• {data.contact.linkedin}</Text>}
          </View>
        </View>

        {/* Objective/Summary */}
        {data.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Objective</Text>
            <Text style={styles.summary}>{data.summary}</Text>
          </View>
        )}

        {/* Experience */}
        {data.experience && data.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Experience</Text>
            {data.experience.map((exp, i) => (
              <View key={i} style={styles.experienceItem}>
                <View style={styles.experienceHeader}>
                  <Text style={styles.company}>{exp.company}</Text>
                  <Text style={styles.dates}>{exp.startDate} - {exp.endDate || 'Present'}</Text>
                </View>
                <Text style={styles.title}>{exp.title}{exp.location ? ` | ${exp.location}` : ''}</Text>
                {exp.bullets?.map((bullet, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>
                      {typeof bullet === 'string' ? bullet : (bullet as any)?.text || ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {data.education && data.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {data.education.map((edu, i) => (
              <View key={i} style={styles.educationItem}>
                <View>
                  <Text style={styles.company}>{edu.school}</Text>
                  <Text style={styles.title}>{edu.degree}{edu.gpa ? ` (GPA: ${edu.gpa})` : ''}</Text>
                </View>
                <Text style={styles.dates}>{edu.startDate || edu.year}{edu.endDate ? ` - ${edu.endDate}` : ''}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {data.skills && data.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Technical Skills</Text>
            <Text style={styles.skillsText}>{data.skills.join(', ')}</Text>
          </View>
        )}

        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications & Awards</Text>
            {data.certifications.map((cert, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>
                  {cert.name}{cert.issuer ? ` — ${cert.issuer}` : ''}{cert.date ? ` (${cert.date})` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

// Modern Template PDF
function ModernResumePDF({ data }: { data: ResumeContent }) {
  const accentColor = '#4FD1C5';

  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 10,
      padding: 45,
      backgroundColor: '#ffffff',
    },
    accentBar: {
      width: 50,
      height: 4,
      backgroundColor: accentColor,
      marginBottom: 12,
      borderRadius: 2,
    },
    name: {
      fontSize: 26,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    contactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      fontSize: 9,
      color: '#666666',
      marginBottom: 20,
    },
    section: {
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: accentColor,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionIcon: {
      width: 10,
      height: 10,
      backgroundColor: accentColor,
      marginRight: 8,
      borderRadius: 2,
    },
    summary: {
      fontSize: 10,
      lineHeight: 1.5,
      color: '#444444',
    },
    experienceItem: {
      marginBottom: 12,
    },
    experienceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    title: {
      fontWeight: 'bold',
      fontSize: 11,
    },
    company: {
      fontSize: 10,
      color: '#666666',
    },
    dates: {
      fontSize: 9,
      color: '#888888',
      textAlign: 'right',
    },
    bullet: {
      flexDirection: 'row',
      marginBottom: 3,
      paddingLeft: 4,
    },
    bulletDot: {
      width: 6,
      height: 6,
      backgroundColor: accentColor,
      borderRadius: 3,
      marginRight: 8,
      marginTop: 4,
    },
    bulletText: {
      flex: 1,
      fontSize: 10,
      lineHeight: 1.4,
      color: '#444444',
    },
    skillsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    skillTag: {
      backgroundColor: `${accentColor}15`,
      borderWidth: 1,
      borderColor: `${accentColor}30`,
      borderRadius: 12,
      paddingVertical: 3,
      paddingHorizontal: 10,
    },
    skillText: {
      fontSize: 9,
      color: accentColor,
    },
    educationItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.accentBar} />
        <Text style={styles.name}>{data.contact?.name || 'Your Name'}</Text>
        <View style={styles.contactRow}>
          {data.contact?.email && <Text>{data.contact.email}</Text>}
          {data.contact?.phone && <Text>{data.contact.phone}</Text>}
          {data.contact?.location && <Text>{data.contact.location}</Text>}
          {data.contact?.linkedin && <Text>{data.contact.linkedin}</Text>}
        </View>

        {/* Summary */}
        {data.summary && (
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionIcon} />
              <Text>Professional Summary</Text>
            </View>
            <Text style={styles.summary}>{data.summary}</Text>
          </View>
        )}

        {/* Experience */}
        {data.experience && data.experience.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionIcon} />
              <Text>Work Experience</Text>
            </View>
            {data.experience.map((exp, i) => (
              <View key={i} style={styles.experienceItem}>
                <View style={styles.experienceHeader}>
                  <View>
                    <Text style={styles.title}>{exp.title}</Text>
                    <Text style={styles.company}>{exp.company}</Text>
                  </View>
                  <View>
                    <Text style={styles.dates}>{exp.startDate} - {exp.endDate || 'Present'}</Text>
                    {exp.location && <Text style={styles.dates}>{exp.location}</Text>}
                  </View>
                </View>
                {exp.bullets?.map((bullet, j) => (
                  <View key={j} style={styles.bullet}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>
                      {typeof bullet === 'string' ? bullet : (bullet as any)?.text || ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {data.skills && data.skills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionIcon} />
              <Text>Skills</Text>
            </View>
            <View style={styles.skillsContainer}>
              {data.skills.map((skill, i) => (
                <View key={i} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Education */}
        {data.education && data.education.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionIcon} />
              <Text>Education</Text>
            </View>
            {data.education.map((edu, i) => (
              <View key={i} style={styles.educationItem}>
                <View>
                  <Text style={styles.title}>{edu.degree}</Text>
                  <Text style={styles.company}>{edu.school}</Text>
                </View>
                <Text style={styles.dates}>{edu.startDate || edu.year}{edu.endDate ? ` - ${edu.endDate}` : ''}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionIcon} />
              <Text>Certifications</Text>
            </View>
            {data.certifications.map((cert, i) => (
              <View key={i} style={styles.educationItem}>
                <Text style={styles.title}>{cert.name}{cert.issuer ? ` — ${cert.issuer}` : ''}</Text>
                {cert.date && <Text style={styles.dates}>{cert.date}</Text>}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

// Technical Template PDF
function TechnicalResumePDF({ data }: { data: ResumeContent }) {
  const accentColor = '#00D9FF';

  // Categorize skills
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

  const skillCategories = data.skills ? categorizeSkills(data.skills) : {};

  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Courier',
      fontSize: 9,
      padding: 40,
      backgroundColor: '#ffffff',
    },
    header: {
      borderBottomWidth: 2,
      borderBottomColor: accentColor,
      paddingBottom: 10,
      marginBottom: 14,
    },
    name: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 6,
    },
    contactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      fontSize: 8,
      color: '#666666',
    },
    linkText: {
      color: accentColor,
    },
    section: {
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 10,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: accentColor,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionBar: {
      width: 3,
      height: 12,
      backgroundColor: accentColor,
      marginRight: 8,
    },
    skillCategory: {
      flexDirection: 'row',
      marginBottom: 6,
    },
    categoryLabel: {
      width: 80,
      fontSize: 8,
      fontWeight: 'bold',
    },
    skillsContainer: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    skillTag: {
      backgroundColor: `${accentColor}15`,
      borderWidth: 1,
      borderColor: `${accentColor}40`,
      borderRadius: 3,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    skillText: {
      fontSize: 8,
      color: '#333333',
    },
    experienceItem: {
      marginBottom: 10,
    },
    experienceHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      fontWeight: 'bold',
      fontSize: 10,
    },
    atSymbol: {
      color: '#888888',
      marginHorizontal: 4,
    },
    company: {
      fontSize: 10,
    },
    dateTag: {
      backgroundColor: '#f5f5f5',
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 3,
      fontSize: 8,
    },
    currentDateTag: {
      backgroundColor: `${accentColor}20`,
      color: accentColor,
    },
    location: {
      fontSize: 8,
      color: '#888888',
      marginBottom: 4,
    },
    bullet: {
      flexDirection: 'row',
      marginBottom: 2,
      paddingLeft: 8,
    },
    bulletArrow: {
      color: accentColor,
      marginRight: 6,
      fontSize: 9,
    },
    bulletText: {
      flex: 1,
      fontSize: 9,
      lineHeight: 1.3,
      color: '#444444',
    },
    educationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    certContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    certTag: {
      backgroundColor: '#f8f8f8',
      borderWidth: 1,
      borderColor: `${accentColor}30`,
      borderRadius: 3,
      paddingVertical: 3,
      paddingHorizontal: 8,
    },
    certText: {
      fontSize: 8,
    },
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{data.contact?.name || 'Your Name'}</Text>
          <View style={styles.contactRow}>
            {data.contact?.email && <Text>{data.contact.email}</Text>}
            {data.contact?.phone && <Text>{data.contact.phone}</Text>}
            {data.contact?.linkedin && <Text style={styles.linkText}>{data.contact.linkedin}</Text>}
            {data.contact?.portfolio && <Text style={styles.linkText}>{data.contact.portfolio}</Text>}
          </View>
        </View>

        {/* Technical Skills - Prominent */}
        {data.skills && data.skills.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionBar} />
              <Text>Technical Skills</Text>
            </View>
            {Object.entries(skillCategories).map(([category, skills]) => (
              skills.length > 0 && (
                <View key={category} style={styles.skillCategory}>
                  <Text style={styles.categoryLabel}>{category}:</Text>
                  <View style={styles.skillsContainer}>
                    {skills.map((skill, i) => (
                      <View key={i} style={styles.skillTag}>
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )
            ))}
          </View>
        )}

        {/* Experience */}
        {data.experience && data.experience.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionBar} />
              <Text>Professional Experience</Text>
            </View>
            {data.experience.map((exp, i) => (
              <View key={i} style={styles.experienceItem}>
                <View style={styles.experienceHeader}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>{exp.title}</Text>
                    <Text style={styles.atSymbol}>@</Text>
                    <Text style={styles.company}>{exp.company}</Text>
                  </View>
                  <Text style={[
                    styles.dateTag,
                    ...((exp.isCurrent || exp.endDate === 'Present') ? [styles.currentDateTag] : [])
                  ]}>
                    {exp.startDate} — {exp.endDate || 'Present'}
                  </Text>
                </View>
                {exp.location && <Text style={styles.location}>{exp.location}</Text>}
                {exp.bullets?.map((bullet, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletArrow}>▸</Text>
                    <Text style={styles.bulletText}>
                      {typeof bullet === 'string' ? bullet : (bullet as any)?.text || ''}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {data.education && data.education.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionBar} />
              <Text>Education</Text>
            </View>
            {data.education.map((edu, i) => (
              <View key={i} style={styles.educationRow}>
                <Text>
                  <Text style={styles.title}>{edu.degree}</Text>
                  {edu.field && <Text style={{ color: '#666666' }}> — {edu.field}</Text>}
                  <Text style={{ color: '#888888' }}> · {edu.school}</Text>
                </Text>
                <Text style={styles.dateTag}>{edu.startDate || edu.year}{edu.endDate ? ` - ${edu.endDate}` : ''}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitle}>
              <View style={styles.sectionBar} />
              <Text>Certifications</Text>
            </View>
            <View style={styles.certContainer}>
              {data.certifications.map((cert, i) => (
                <View key={i} style={styles.certTag}>
                  <Text style={styles.certText}>
                    {cert.name}{cert.issuer ? ` · ${cert.issuer}` : ''}{cert.date ? ` (${cert.date})` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  );
}

// Main PDF generation function
export async function generateResumePdf(
  resumeData: ResumeContent,
  template: string = 'modern'
): Promise<Buffer> {
  try {
    console.log('📄 Generating PDF resume with template:', template);

    const data = normalizeResumeContent(resumeData);

    let PdfDocument: React.ReactElement;

    switch (template) {
      case 'classic':
        PdfDocument = <ClassicResumePDF data={data} />;
        break;
      case 'technical':
        PdfDocument = <TechnicalResumePDF data={data} />;
        break;
      case 'modern':
      default:
        PdfDocument = <ModernResumePDF data={data} />;
        break;
    }

    const buffer = await renderToBuffer(PdfDocument as React.ReactElement<any>);
    console.log('✅ PDF generated, size:', buffer.length, 'bytes');

    return Buffer.from(buffer);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
}

