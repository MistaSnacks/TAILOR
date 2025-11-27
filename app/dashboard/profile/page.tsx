'use client';

import { useEffect, useState } from 'react';
import { Briefcase, Trash2, GraduationCap, User, Edit2, X, Check } from 'lucide-react';

type Experience = {
  id: string;
  company: string;
  title: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  source_count?: number; // Optional for legacy schema
  experience_bullets?: Bullet[];
};

type Bullet = {
  id: string;
  content?: string;
  text?: string; // Legacy schema
  importance_score?: number;
};

type Skill = {
  id: string;
  canonical_name: string;
  source_count?: number; // Optional for legacy schema
};

type PersonalInfo = {
  full_name?: string;
  email?: string;
  phone_number?: string;
  address?: string;
  linkedin_url?: string;
  portfolio_url?: string;
};

export default function ProfilePage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [editingPersonalInfo, setEditingPersonalInfo] = useState(false);
  const [personalInfoForm, setPersonalInfoForm] = useState<PersonalInfo>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setError(null);
      setSuccessMessage(null);
      const res = await fetch('/api/profile');
      if (!res.ok) {
        let errorMessage = 'Failed to fetch profile';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
        } catch {
          errorMessage = `Failed to fetch profile (${res.status}: ${res.statusText})`;
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      setExperiences(data.experiences || []);
      setSkills(data.skills || []);
      setPersonalInfo(data.personalInfo || null);
      setPersonalInfoForm(data.personalInfo || {});
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setError(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function savePersonalInfo() {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'personal_info',
          data: personalInfoForm,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save personal info');
      }

      setPersonalInfo(personalInfoForm);
      setEditingPersonalInfo(false);
      setSuccessMessage('Personal information updated successfully!');

      // Auto-dismiss success message
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving personal info:', error);
      setError(error.message || 'Failed to save personal info');
    } finally {
      setSaving(false);
    }
  }

  function cancelEditPersonalInfo() {
    setPersonalInfoForm(personalInfo || {});
    setEditingPersonalInfo(false);
    setError(null);
  }

  async function deleteSkill(skillId: string, skillName: string) {
    if (!confirm(`Delete skill "${skillName}"? This action cannot be undone.`)) return;

    try {
      setDeleting(skillId);
      setError(null);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'skill',
          action: 'delete',
          data: { id: skillId },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete skill');
      }

      // Remove from local state immediately
      setSkills(skills.filter(s => s.id !== skillId));
    } catch (error: any) {
      console.error('Error deleting skill:', error);
      setError(error.message || 'Failed to delete skill');
    } finally {
      setDeleting(null);
    }
  }

  async function deleteExperience(expId: string, title: string, company: string) {
    if (!confirm(`Delete "${title}" at ${company} and all its bullets? This action cannot be undone.`)) return;

    try {
      setDeleting(expId);
      setError(null);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'experience',
          action: 'delete',
          data: { id: expId },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete experience');
      }

      // Remove from local state immediately
      setExperiences(experiences.filter(e => e.id !== expId));
    } catch (error: any) {
      console.error('Error deleting experience:', error);
      setError(error.message || 'Failed to delete experience');
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold font-display mb-2">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your work history and skills. This data is used to generate tailored resumes.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600">
          {successMessage}
        </div>
      )}

      {/* Personal Information Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Personal Information
          </h2>
          {!editingPersonalInfo && (
            <button
              onClick={() => setEditingPersonalInfo(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        <div className="glass-card p-6">
          {editingPersonalInfo ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={personalInfoForm.full_name || ''}
                  onChange={(e) => setPersonalInfoForm({ ...personalInfoForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email <span className="text-muted-foreground text-xs">(read-only)</span>
                </label>
                <input
                  type="email"
                  value={personalInfoForm.email || ''}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg cursor-not-allowed"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone Number <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={personalInfoForm.phone_number || ''}
                  onChange={(e) => setPersonalInfoForm({ ...personalInfoForm, phone_number: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Address <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  type="text"
                  value={personalInfoForm.address || ''}
                  onChange={(e) => setPersonalInfoForm({ ...personalInfoForm, address: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="San Francisco, CA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  LinkedIn URL <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  type="url"
                  value={personalInfoForm.linkedin_url || ''}
                  onChange={(e) => setPersonalInfoForm({ ...personalInfoForm, linkedin_url: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Portfolio URL <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  type="url"
                  value={personalInfoForm.portfolio_url || ''}
                  onChange={(e) => setPersonalInfoForm({ ...personalInfoForm, portfolio_url: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://yourportfolio.com"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={savePersonalInfo}
                  disabled={saving || !personalInfoForm.full_name}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={cancelEditPersonalInfo}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{personalInfo?.full_name || 'Not set'}</h3>
                  <p className="text-muted-foreground">{personalInfo?.email || 'No email'}</p>
                </div>
              </div>

              {(personalInfo?.phone_number || personalInfo?.address || personalInfo?.linkedin_url || personalInfo?.portfolio_url) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                  {personalInfo?.phone_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{personalInfo.phone_number}</p>
                    </div>
                  )}
                  {personalInfo?.address && (
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{personalInfo.address}</p>
                    </div>
                  )}
                  {personalInfo?.linkedin_url && (
                    <div>
                      <p className="text-sm text-muted-foreground">LinkedIn</p>
                      <a
                        href={personalInfo.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        View Profile
                      </a>
                    </div>
                  )}
                  {personalInfo?.portfolio_url && (
                    <div>
                      <p className="text-sm text-muted-foreground">Portfolio</p>
                      <a
                        href={personalInfo.portfolio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        View Website
                      </a>
                    </div>
                  )}
                </div>
              )}

              {!personalInfo?.phone_number && !personalInfo?.address && !personalInfo?.linkedin_url && !personalInfo?.portfolio_url && (
                <p className="text-muted-foreground text-sm pt-2">
                  Add your contact information to personalize your resumes.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Experiences Section */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            Work Experience
          </h2>
        </div>

        {experiences.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No work experience found. Upload a resume to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {experiences.map((exp) => (
              <div key={exp.id} className="glass-card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{exp.title}</h3>
                    <p className="text-lg text-primary">{exp.company}</p>
                    <p className="text-sm text-muted-foreground">
                      {exp.location && `${exp.location} • `}
                      {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}
                    </p>
                    {exp.source_count !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Found in {exp.source_count} document{exp.source_count !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteExperience(exp.id, exp.title, exp.company)}
                    disabled={deleting === exp.id}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete experience"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Bullets */}
                {exp.experience_bullets && exp.experience_bullets.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground">Achievements:</h4>
                    <ul className="space-y-2">
                      {exp.experience_bullets.map((bullet) => (
                        <li
                          key={bullet.id}
                          className="flex items-start gap-2 text-sm bg-muted/30 p-3 rounded-lg"
                        >
                          <span className="text-primary mt-1">•</span>
                          <span className="flex-1">{bullet.content || bullet.text || 'No content available'}</span>
                          {bullet.importance_score !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              Score: {bullet.importance_score}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Skills Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            Skills
          </h2>
        </div>

        {skills.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No skills found. Upload a resume to get started.
            </p>
          </div>
        ) : (
          <div className="glass-card p-6">
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="group flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  <span className="font-medium">{skill.canonical_name}</span>
                  {skill.source_count !== undefined && (
                    <span className="text-xs text-primary/60">
                      ({skill.source_count})
                    </span>
                  )}
                  <button
                    onClick={() => deleteSkill(skill.id, skill.canonical_name)}
                    disabled={deleting === skill.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    title="Delete skill"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
