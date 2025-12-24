'use client';

import { useEffect, useState, useCallback } from 'react';
import { Briefcase, Trash2, GraduationCap, User, Edit2, X, Check, ChevronDown, Plus, Download, Linkedin, Globe, Loader2, ExternalLink, Award, BookOpen, Medal } from 'lucide-react';
import { TailorLoading } from '@/components/ui/tailor-loader';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// --- Modal Components ---

type AddSkillModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (skillNames: string[]) => Promise<{ added: number; skipped: number }>;
  isSubmitting: boolean;
};

function AddSkillModal({ isOpen, onClose, onSubmit, isSubmitting }: AddSkillModalProps) {
  const [skillsInput, setSkillsInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  // Parse skills from input - supports comma-separated or newline-separated
  const parseSkills = (input: string): string[] => {
    return input
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  const skillsList = parseSkills(skillsInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (skillsList.length === 0) {
      setError('Enter at least one skill');
      return;
    }
    setError(null);
    setResult(null);
    try {
      const res = await onSubmit(skillsList);
      setResult(res);
      if (res.added > 0) {
        setSkillsInput('');
        // Auto-close after a short delay if all skills were added
        if (res.skipped === 0) {
          setTimeout(() => {
            onClose();
            setResult(null);
          }, 1500);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add skills');
    }
  };

  const handleClose = () => {
    setSkillsInput('');
    setError(null);
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-display flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  Add Skills
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Skills <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Enter skills separated by commas or new lines:&#10;React, Python, Project Management&#10;or&#10;React&#10;Python&#10;Project Management"
                    rows={5}
                    autoFocus
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {skillsList.length > 0 ? (
                      <span className="text-primary">{skillsList.length} skill{skillsList.length !== 1 ? 's' : ''} detected</span>
                    ) : (
                      'Separate skills with commas or new lines'
                    )}
                  </p>
                  {error && (
                    <p className="text-sm text-destructive mt-2">{error}</p>
                  )}
                  {result && (
                    <p className="text-sm mt-2">
                      <span className="text-green-600">{result.added} added</span>
                      {result.skipped > 0 && (
                        <span className="text-muted-foreground"> • {result.skipped} already existed</span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || skillsList.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    {isSubmitting ? 'Adding...' : `Add ${skillsList.length || ''} Skill${skillsList.length !== 1 ? 's' : ''}`}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                  >
                    {result?.added ? 'Done' : 'Cancel'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type ExperienceFormData = {
  company: string;
  title: string;
  location: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  bullets: string[];
};

type AddExperienceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExperienceFormData) => Promise<void>;
  isSubmitting: boolean;
};

function AddExperienceModal({ isOpen, onClose, onSubmit, isSubmitting }: AddExperienceModalProps) {
  const [formData, setFormData] = useState<ExperienceFormData>({
    company: '',
    title: '',
    location: '',
    start_date: '',
    end_date: '',
    is_current: false,
    bullets: [],
  });
  const [bulletsInput, setBulletsInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Parse bullets from input - one per line, strips bullet characters
  const parseBullets = (input: string): string[] => {
    return input
      .split('\n')
      .map(line => line.trim().replace(/^[-•*]\s*/, '')) // Strip leading bullet chars
      .filter(line => line.length > 0);
  };

  const bulletsList = parseBullets(bulletsInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company.trim() || !formData.title.trim()) {
      setError('Company and job title are required');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        ...formData,
        bullets: bulletsList,
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add experience');
    }
  };

  const resetForm = () => {
    setFormData({
      company: '',
      title: '',
      location: '',
      start_date: '',
      end_date: '',
      is_current: false,
      bullets: [],
    });
    setBulletsInput('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-display flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Add Work Experience
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Company <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Google"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Job Title <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Software Engineer"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Location <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., San Francisco, CA"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Start Date <span className="text-muted-foreground text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Jan 2020"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      End Date <span className="text-muted-foreground text-xs">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
                      placeholder="e.g., Dec 2023"
                      disabled={isSubmitting || formData.is_current}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_current"
                    checked={formData.is_current}
                    onChange={(e) => setFormData({ ...formData, is_current: e.target.checked, end_date: e.target.checked ? '' : formData.end_date })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    disabled={isSubmitting}
                  />
                  <label htmlFor="is_current" className="text-sm font-medium">
                    I currently work here
                  </label>
                </div>

                <div>
                  <div className="mb-2">
                    <label className="block text-sm font-medium">
                      Achievements / Bullets <span className="text-muted-foreground text-xs">(optional)</span>
                    </label>
                  </div>
                  <textarea
                    value={bulletsInput}
                    onChange={(e) => setBulletsInput(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono text-sm"
                    placeholder="Paste or type your bullet points (one per line):&#10;• Led development of customer-facing features&#10;• Reduced API response time by 40%&#10;• Mentored 3 junior developers"
                    rows={6}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {bulletsList.length > 0 ? (
                      <span className="text-primary">{bulletsList.length} bullet{bulletsList.length !== 1 ? 's' : ''} detected</span>
                    ) : (
                      'One bullet per line • Leading bullet characters (•, -, *) are removed automatically'
                    )}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-border bg-muted/30 flex-shrink-0">
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.company.trim() || !formData.title.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    {isSubmitting ? 'Adding...' : 'Add Experience'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Add Education Modal ---

type AddEducationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { institution: string; degree?: string; field_of_study?: string; start_date?: string; end_date?: string; gpa?: string }) => Promise<void>;
  isSubmitting: boolean;
};

function AddEducationModal({ isOpen, onClose, onSubmit, isSubmitting }: AddEducationModalProps) {
  const [formData, setFormData] = useState({
    institution: '',
    degree: '',
    field_of_study: '',
    start_date: '',
    end_date: '',
    gpa: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.institution.trim()) {
      setError('Institution name is required');
      return;
    }
    setError(null);
    try {
      await onSubmit(formData);
      setFormData({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '', gpa: '' });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add education');
    }
  };

  const handleClose = () => {
    setFormData({ institution: '', degree: '', field_of_study: '', start_date: '', end_date: '', gpa: '' });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-display flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Add Education
                </h2>
                <button onClick={handleClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">{error}</div>}

                <div>
                  <label className="block text-sm font-medium mb-2">Institution <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Stanford University"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Degree</label>
                    <input
                      type="text"
                      value={formData.degree}
                      onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Bachelor of Science"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Field of Study</label>
                    <input
                      type="text"
                      value={formData.field_of_study}
                      onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Computer Science"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Start Date</label>
                    <input
                      type="text"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="2018"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">End Date</label>
                    <input
                      type="text"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="2022"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">GPA</label>
                    <input
                      type="text"
                      value={formData.gpa}
                      onChange={(e) => setFormData({ ...formData, gpa: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="3.8"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.institution.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    {isSubmitting ? 'Adding...' : 'Add Education'}
                  </button>
                  <button type="button" onClick={handleClose} disabled={isSubmitting} className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Add Certification Modal ---

type AddCertificationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; issuer?: string; issue_date?: string; expiration_date?: string; credential_id?: string; credential_url?: string }) => Promise<void>;
  isSubmitting: boolean;
};

function AddCertificationModal({ isOpen, onClose, onSubmit, isSubmitting }: AddCertificationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    issuer: '',
    issue_date: '',
    expiration_date: '',
    credential_id: '',
    credential_url: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Certification name is required');
      return;
    }
    setError(null);
    try {
      await onSubmit(formData);
      setFormData({ name: '', issuer: '', issue_date: '', expiration_date: '', credential_id: '', credential_url: '' });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add certification');
    }
  };

  const handleClose = () => {
    setFormData({ name: '', issuer: '', issue_date: '', expiration_date: '', credential_id: '', credential_url: '' });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-display flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Add Certification
                </h2>
                <button onClick={handleClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">{error}</div>}

                <div>
                  <label className="block text-sm font-medium mb-2">Certification Name <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., AWS Solutions Architect"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Issuing Organization</label>
                  <input
                    type="text"
                    value={formData.issuer}
                    onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Amazon Web Services"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Issue Date</label>
                    <input
                      type="text"
                      value={formData.issue_date}
                      onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Jan 2023"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Expiration Date</label>
                    <input
                      type="text"
                      value={formData.expiration_date}
                      onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Jan 2026"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Credential URL</label>
                  <input
                    type="url"
                    value={formData.credential_url}
                    onChange={(e) => setFormData({ ...formData, credential_url: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="https://..."
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    {isSubmitting ? 'Adding...' : 'Add Certification'}
                  </button>
                  <button type="button" onClick={handleClose} disabled={isSubmitting} className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Add Military Award Modal ---

type AddMilitaryAwardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; abbreviation?: string; category?: string; description?: string; date_awarded?: string }) => Promise<void>;
  isSubmitting: boolean;
};

function AddMilitaryAwardModal({ isOpen, onClose, onSubmit, isSubmitting }: AddMilitaryAwardModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    category: 'medal' as string,
    description: '',
    date_awarded: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Award name is required');
      return;
    }
    setError(null);
    try {
      await onSubmit(formData);
      setFormData({ name: '', abbreviation: '', category: 'medal', description: '', date_awarded: '' });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add award');
    }
  };

  const handleClose = () => {
    setFormData({ name: '', abbreviation: '', category: 'medal', description: '', date_awarded: '' });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-display flex items-center gap-2">
                  <Medal className="w-5 h-5 text-primary" />
                  Add Military Award
                </h2>
                <button onClick={handleClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">{error}</div>}

                <div>
                  <label className="block text-sm font-medium mb-2">Award Name <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Army Commendation Medal"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Abbreviation</label>
                    <input
                      type="text"
                      value={formData.abbreviation}
                      onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., ARCOM"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={isSubmitting}
                    >
                      <option value="medal">Medal</option>
                      <option value="ribbon">Ribbon</option>
                      <option value="badge">Badge</option>
                      <option value="citation">Citation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Date Awarded</label>
                  <input
                    type="text"
                    value={formData.date_awarded}
                    onChange={(e) => setFormData({ ...formData, date_awarded: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., June 2020"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description / Citation</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    placeholder="Citation text or description..."
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    {isSubmitting ? 'Adding...' : 'Add Award'}
                  </button>
                  <button type="button" onClick={handleClose} disabled={isSubmitting} className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// --- Import Profile Modal ---

type ImportProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  linkedinUrl?: string;
  portfolioUrl?: string;
};

type ImportStep = 'select' | 'scraping' | 'parsing' | 'importing' | 'done' | 'error';
type ImportMode = 'url' | 'paste';

function ImportProfileModal({ isOpen, onClose, onSuccess, linkedinUrl, portfolioUrl }: ImportProfileModalProps) {
  const [step, setStep] = useState<ImportStep>('select');
  const [mode, setMode] = useState<ImportMode>('paste'); // Default to paste since URL scraping is unreliable
  const [selectedSource, setSelectedSource] = useState<'linkedin' | 'portfolio' | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [pastedContent, setPastedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    experiences: number;
    projects: number;
    skills: number;
    education: number;
    certifications: number;
  } | null>(null);

  const resetState = () => {
    setStep('select');
    setMode('paste');
    setSelectedSource(null);
    setCustomUrl('');
    setPastedContent('');
    setError(null);
    setResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const getUrlForSource = () => {
    if (customUrl.trim()) return customUrl.trim();
    if (selectedSource === 'linkedin' && linkedinUrl) return linkedinUrl;
    if (selectedSource === 'portfolio' && portfolioUrl) return portfolioUrl;
    return '';
  };

  const handleImport = async () => {
    // For paste mode, use pasted content directly
    if (mode === 'paste') {
      if (!pastedContent.trim()) {
        setError('Please paste your profile content');
        return;
      }
      if (!selectedSource) {
        setError('Please select a source (LinkedIn or Portfolio)');
        return;
      }

      setError(null);
      setStep('parsing');

      try {
        const importResponse = await fetch('/api/profile/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: getUrlForSource() || `manual-${selectedSource}-import`,
            type: selectedSource,
            scrapeContent: pastedContent,
          }),
        });

        if (!importResponse.ok) {
          const errorData = await importResponse.json();
          throw new Error(errorData.error || 'Failed to import profile');
        }

        setStep('importing');

        const importData = await importResponse.json();
        setResult(importData.imported);
        setStep('done');

        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);

      } catch (err: any) {
        console.error('Import error:', err);
        setError(err.message || 'Failed to import profile');
        setStep('error');
      }
      return;
    }

    // URL mode - try to scrape
    const url = getUrlForSource();
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setError(null);
    setStep('scraping');

    try {
      console.log('🔍 Scraping URL:', url);
      
      const scrapeResponse = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      let scrapeContent: string;
      
      if (!scrapeResponse.ok) {
        const errorData = await scrapeResponse.json();
        // Switch to paste mode with helpful message
        setError(errorData.suggestion || 'Unable to scrape automatically. Please use "Paste Content" mode instead.');
        setMode('paste');
        setStep('select');
        return;
      }

      const scrapeData = await scrapeResponse.json();
      scrapeContent = scrapeData.markdown || scrapeData.content || '';

      if (!scrapeContent || scrapeContent.length < 200) {
        setError('Could not extract enough content. Please use "Paste Content" mode instead.');
        setMode('paste');
        setStep('select');
        return;
      }

      setStep('parsing');

      const importResponse = await fetch('/api/profile/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          type: selectedSource || 'auto',
          scrapeContent,
        }),
      });

      if (!importResponse.ok) {
        const errorData = await importResponse.json();
        throw new Error(errorData.error || 'Failed to import profile');
      }

      setStep('importing');

      const importData = await importResponse.json();
      setResult(importData.imported);
      setStep('done');

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);

    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import profile');
      setStep('error');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold font-display flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary" />
                  Import Profile
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {step === 'select' && (
                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm">
                    Import your experiences, skills, and projects from LinkedIn or your portfolio website.
                  </p>

                  {/* Source Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setSelectedSource('linkedin');
                        if (linkedinUrl) setCustomUrl(linkedinUrl);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedSource === 'linkedin'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Linkedin className="w-8 h-8 mx-auto mb-2 text-[#0A66C2]" />
                      <p className="font-medium">LinkedIn</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Paste profile content
                      </p>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedSource('portfolio');
                        if (portfolioUrl) setCustomUrl(portfolioUrl);
                      }}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedSource === 'portfolio'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Globe className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium">Portfolio</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Paste or scrape URL
                      </p>
                    </button>
                  </div>

                  {/* Mode Toggle for Portfolio */}
                  {selectedSource === 'portfolio' && (
                    <div className="flex gap-2 p-1 bg-muted rounded-lg">
                      <button
                        onClick={() => setMode('paste')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          mode === 'paste' 
                            ? 'bg-background shadow text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Paste Content
                      </button>
                      <button
                        onClick={() => setMode('url')}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          mode === 'url' 
                            ? 'bg-background shadow text-foreground' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Scrape URL
                      </button>
                    </div>
                  )}

                  {/* Content Input */}
                  {selectedSource && (
                    <div>
                      {(mode === 'paste' || selectedSource === 'linkedin') ? (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium">
                              Paste {selectedSource === 'linkedin' ? 'LinkedIn' : 'Portfolio'} Content
                            </label>
                            {selectedSource === 'linkedin' && (
                              <a
                                href="https://www.linkedin.com/in/me/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                Open LinkedIn <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <textarea
                            value={pastedContent}
                            onChange={(e) => setPastedContent(e.target.value)}
                            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                            placeholder={selectedSource === 'linkedin' 
                              ? `How to copy LinkedIn content:
1. Go to your LinkedIn profile
2. Select all text (Cmd+A on Mac)
3. Copy (Cmd+C) and paste here

Or manually copy your:
• Experience section
• Skills section  
• About section`
                              : 'Paste your portfolio/website content here...'
                            }
                            rows={8}
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            {pastedContent.length > 0 
                              ? `${pastedContent.length.toLocaleString()} characters` 
                              : selectedSource === 'linkedin'
                                ? 'Tip: Select all and copy your entire LinkedIn profile page'
                                : 'Paste the text content from your portfolio website'
                            }
                          </p>
                        </>
                      ) : (
                        <>
                          <label className="block text-sm font-medium mb-2">
                            Portfolio URL
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={customUrl}
                              onChange={(e) => setCustomUrl(e.target.value)}
                              className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="https://yourportfolio.com"
                            />
                            {customUrl && (
                              <a
                                href={customUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-muted-foreground hover:text-foreground border border-border rounded-lg"
                              >
                                <ExternalLink className="w-5 h-5" />
                              </a>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleImport}
                      disabled={!selectedSource || (mode === 'paste' ? !pastedContent.trim() : !getUrlForSource())}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Import
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    {selectedSource === 'linkedin' 
                      ? 'LinkedIn blocks automated access, so please copy and paste your profile content.'
                      : mode === 'url'
                        ? 'We\'ll try to automatically extract content from the URL.'
                        : 'Paste the text content you want to import.'
                    }
                  </p>
                </div>
              )}

              {(step === 'scraping' || step === 'parsing' || step === 'importing') && (
                <div className="py-8 text-center">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                  <p className="font-medium mb-2">
                    {step === 'scraping' && 'Fetching profile content...'}
                    {step === 'parsing' && 'Extracting experiences and skills...'}
                    {step === 'importing' && 'Saving to your profile...'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This may take a moment
                  </p>
                </div>
              )}

              {step === 'done' && result && (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="font-medium mb-4 text-lg">Import Complete!</p>
                  <div className="grid grid-cols-3 gap-4 text-center mb-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-primary">{result.experiences}</p>
                      <p className="text-xs text-muted-foreground">Experiences</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-primary">{result.projects}</p>
                      <p className="text-xs text-muted-foreground">Projects</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-primary">{result.skills}</p>
                      <p className="text-xs text-muted-foreground">Skills</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your profile has been updated with the imported data.
                  </p>
                </div>
              )}

              {step === 'error' && (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                    <X className="w-8 h-8 text-destructive" />
                  </div>
                  <p className="font-medium mb-2 text-destructive">Import Failed</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {error || 'An error occurred while importing your profile'}
                  </p>
                  <button
                    onClick={resetState}
                    className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type Experience = {
  id: string;
  company: string;
  title: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  source_count?: number;
  experience_bullets?: Bullet[];
};

type Bullet = {
  id: string;
  content?: string;
  text?: string;
  importance_score?: number;
};

type Skill = {
  id: string;
  canonical_name: string;
  source_count?: number;
};

type Education = {
  id: string;
  institution: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  gpa?: string;
};

type Certification = {
  id: string;
  name: string;
  issuer?: string;
  issue_date?: string;
  expiration_date?: string;
  credential_id?: string;
  credential_url?: string;
};

type MilitaryAward = {
  id: string;
  name: string;
  abbreviation?: string;
  category?: 'medal' | 'ribbon' | 'badge' | 'citation' | 'other';
  description?: string;
  date_awarded?: string;
};

type PersonalInfo = {
  full_name?: string;
  email?: string;
  phone_number?: string;
  address?: string; // Legacy - kept for backward compat
  city?: string;
  state?: string;
  zip?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  // Job search prefs
  remote_preference?: 'any' | 'remote_only' | 'hybrid' | 'onsite';
};

// --- Sub-components for Collapsible Sections ---

function ExperienceItem({ exp, onDelete, isDeleting, prefersReducedMotion }: { exp: Experience, onDelete: (id: string, title: string, company: string) => void, isDeleting: boolean, prefersReducedMotion: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-card overflow-hidden transition-all duration-200 hover:border-primary/30">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-6 flex justify-between items-start cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold">{exp.title}</h3>
            {prefersReducedMotion ? (
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            ) : (
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            )}
          </div>
          <p className="text-lg text-primary font-medium">{exp.company}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(exp.id, exp.title, exp.company);
          }}
          disabled={isDeleting}
          className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
          title="Delete experience"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {prefersReducedMotion ? (
        isOpen && (
          <div className="px-6 pb-6 pt-0 border-t border-border/50 mt-2">
            <div className="pt-4">
              <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                <span>{exp.location}</span>
                {exp.source_count !== undefined && (
                  <span>Found in {exp.source_count} document{exp.source_count !== 1 ? 's' : ''}</span>
                )}
              </div>

              {exp.experience_bullets && exp.experience_bullets.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground/80">Achievements:</h4>
                  <ul className="space-y-2">
                    {exp.experience_bullets.map((bullet) => (
                      <li
                        key={bullet.id}
                        className="flex items-start gap-2 text-sm bg-muted/30 p-3 rounded-lg"
                      >
                        <span className="text-primary mt-1">•</span>
                        <span className="flex-1 leading-relaxed">{bullet.content || bullet.text || 'No content available'}</span>
                        {bullet.importance_score !== undefined && (
                          <span className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
                            Score: {bullet.importance_score}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-6 pb-6 pt-0 border-t border-border/50 mt-2">
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                    <span>{exp.location}</span>
                    {exp.source_count !== undefined && (
                      <span>Found in {exp.source_count} document{exp.source_count !== 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {exp.experience_bullets && exp.experience_bullets.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground/80">Achievements:</h4>
                      <ul className="space-y-2">
                        {exp.experience_bullets.map((bullet) => (
                          <li
                            key={bullet.id}
                            className="flex items-start gap-2 text-sm bg-muted/30 p-3 rounded-lg"
                          >
                            <span className="text-primary mt-1">•</span>
                            <span className="flex-1 leading-relaxed">{bullet.content || bullet.text || 'No content available'}</span>
                            {bullet.importance_score !== undefined && (
                              <span className="text-xs text-muted-foreground bg-background/50 px-2 py-1 rounded">
                                Score: {bullet.importance_score}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// Reusable Collapsible List Component
function CollapsibleList({ 
  title, 
  icon, 
  children, 
  defaultOpen = true, 
  prefersReducedMotion 
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  defaultOpen?: boolean; 
  prefersReducedMotion: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="glass-card overflow-hidden">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-6 flex justify-between items-center cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {prefersReducedMotion ? (
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        ) : (
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        )}
      </div>

      {prefersReducedMotion ? (
        isOpen && (
          <div className="p-6 pt-0 border-t border-border/50">
            <div className="pt-4">{children}</div>
          </div>
        )
      ) : (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-6 pt-0 border-t border-border/50">
                <div className="pt-4">{children}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function SkillsList({ skills, onDelete, isDeleting, prefersReducedMotion }: { skills: Skill[], onDelete: (id: string, name: string) => void, isDeleting: string | null, prefersReducedMotion: boolean }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="glass-card overflow-hidden">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-6 flex justify-between items-center cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">All Skills ({skills.length})</h3>
        </div>
        {prefersReducedMotion ? (
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        ) : (
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        )}
      </div>

      {prefersReducedMotion ? (
        isOpen && (
          <div className="p-6 pt-0 border-t border-border/50">
            <div className="flex flex-wrap gap-2 pt-4">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="group flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20 hover:bg-primary/20 transition-colors text-sm"
                >
                  <span className="font-medium">{skill.canonical_name}</span>
                  {skill.source_count !== undefined && (
                    <span className="text-xs text-primary/60">
                      ({skill.source_count})
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(skill.id, skill.canonical_name);
                    }}
                    disabled={isDeleting === skill.id}
                    className="opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 hover:text-destructive"
                    title="Delete skill"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-6 pt-0 border-t border-border/50">
                <div className="flex flex-wrap gap-2 pt-4">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="group flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20 hover:bg-primary/20 transition-colors text-sm"
                    >
                      <span className="font-medium">{skill.canonical_name}</span>
                      {skill.source_count !== undefined && (
                        <span className="text-xs text-primary/60">
                          ({skill.source_count})
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(skill.id, skill.canonical_name);
                        }}
                        disabled={isDeleting === skill.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 hover:text-destructive"
                        title="Delete skill"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// --- Main Page Component ---

export default function ProfilePage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [militaryAwards, setMilitaryAwards] = useState<MilitaryAward[]>([]);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [editingPersonalInfo, setEditingPersonalInfo] = useState(false);
  const [personalInfoForm, setPersonalInfoForm] = useState<PersonalInfo>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  // Modal states
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [showAddExperienceModal, setShowAddExperienceModal] = useState(false);
  const [showAddEducationModal, setShowAddEducationModal] = useState(false);
  const [showAddCertificationModal, setShowAddCertificationModal] = useState(false);
  const [showAddAwardModal, setShowAddAwardModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [isAddingExperience, setIsAddingExperience] = useState(false);
  const [isAddingEducation, setIsAddingEducation] = useState(false);
  const [isAddingCertification, setIsAddingCertification] = useState(false);
  const [isAddingAward, setIsAddingAward] = useState(false);

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
      setEducation(data.education || []);
      setCertifications(data.certifications || []);
      setMilitaryAwards(data.militaryAwards || []);
      setPersonalInfo(data.personalInfo || null);
      setPersonalInfoForm(data.personalInfo || {});
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load profile';
      setError(errorMessage);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save personal info';
      setError(errorMessage);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete skill';
      setError(errorMessage);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete experience';
      setError(errorMessage);
    } finally {
      setDeleting(null);
    }
  }

  const handleAddSkill = useCallback(async (skillNames: string[]): Promise<{ added: number; skipped: number }> => {
    setIsAddingSkill(true);
    setError(null);

    let added = 0;
    let skipped = 0;
    const newSkills: Skill[] = [];

    try {
      // Process skills sequentially to handle duplicates gracefully
      for (const skillName of skillNames) {
        try {
          const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'skill',
              action: 'create',
              data: { name: skillName },
            }),
          });

          const data = await res.json();

          if (res.ok && data.skill) {
            newSkills.push(data.skill);
            added++;
          } else if (res.status === 409) {
            // Skill already exists
            skipped++;
          } else {
            // Other error - still count as skipped but log
            console.warn(`[Profile] Failed to add skill "${skillName}":`, data.error);
            skipped++;
          }
        } catch {
          skipped++;
        }
      }

      // Add all new skills to local state
      if (newSkills.length > 0) {
        setSkills(prev => [...prev, ...newSkills]);
      }

      if (added > 0) {
        const message = added === 1 
          ? `Skill added successfully!`
          : `${added} skills added successfully!`;
        setSuccessMessage(skipped > 0 ? `${message} (${skipped} already existed)` : message);
        setTimeout(() => setSuccessMessage(null), 3000);
      }

      return { added, skipped };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add skills';
      throw new Error(errorMessage);
    } finally {
      setIsAddingSkill(false);
    }
  }, []);

  const handleAddExperience = useCallback(async (formData: ExperienceFormData) => {
    setIsAddingExperience(true);
    setError(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'experience',
          action: 'create',
          data: {
            company: formData.company,
            title: formData.title,
            location: formData.location || null,
            start_date: formData.start_date || null,
            end_date: formData.is_current ? null : (formData.end_date || null),
            is_current: formData.is_current,
            bullets: formData.bullets,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add experience');
      }

      // Refetch to get full experience with bullets
      await fetchProfile();
      setSuccessMessage(`Experience at "${formData.company}" added successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add experience';
      throw new Error(errorMessage);
    } finally {
      setIsAddingExperience(false);
    }
  }, []);

  const handleAddEducation = useCallback(async (data: { institution: string; degree?: string; field_of_study?: string; start_date?: string; end_date?: string; gpa?: string }) => {
    setIsAddingEducation(true);
    setError(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'education',
          action: 'create',
          data,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to add education');
      }

      setEducation(prev => [...prev, result.education]);
      setSuccessMessage(`Education at "${data.institution}" added successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add education';
      throw new Error(errorMessage);
    } finally {
      setIsAddingEducation(false);
    }
  }, []);

  const handleAddCertification = useCallback(async (data: { name: string; issuer?: string; issue_date?: string; expiration_date?: string; credential_id?: string; credential_url?: string }) => {
    setIsAddingCertification(true);
    setError(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'certification',
          action: 'create',
          data,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to add certification');
      }

      setCertifications(prev => [...prev, result.certification]);
      setSuccessMessage(`Certification "${data.name}" added successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add certification';
      throw new Error(errorMessage);
    } finally {
      setIsAddingCertification(false);
    }
  }, []);

  const handleAddMilitaryAward = useCallback(async (data: { name: string; abbreviation?: string; category?: string; description?: string; date_awarded?: string }) => {
    setIsAddingAward(true);
    setError(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'military_award',
          action: 'create',
          data,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to add military award');
      }

      setMilitaryAwards(prev => [...prev, result.award]);
      setSuccessMessage(`Award "${data.name}" added successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add military award';
      throw new Error(errorMessage);
    } finally {
      setIsAddingAward(false);
    }
  }, []);

  async function deleteEducation(id: string, institution: string) {
    if (!confirm(`Delete education at "${institution}"? This action cannot be undone.`)) return;

    try {
      setDeleting(id);
      setError(null);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'education',
          action: 'delete',
          data: { id },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete education');
      }

      setEducation(prev => prev.filter(e => e.id !== id));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete education';
      setError(errorMessage);
    } finally {
      setDeleting(null);
    }
  }

  async function deleteCertification(id: string, name: string) {
    if (!confirm(`Delete certification "${name}"? This action cannot be undone.`)) return;

    try {
      setDeleting(id);
      setError(null);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'certification',
          action: 'delete',
          data: { id },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete certification');
      }

      setCertifications(prev => prev.filter(c => c.id !== id));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete certification';
      setError(errorMessage);
    } finally {
      setDeleting(null);
    }
  }

  async function deleteMilitaryAward(id: string, name: string) {
    if (!confirm(`Delete award "${name}"? This action cannot be undone.`)) return;

    try {
      setDeleting(id);
      setError(null);

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'military_award',
          action: 'delete',
          data: { id },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete military award');
      }

      setMilitaryAwards(prev => prev.filter(a => a.id !== id));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete military award';
      setError(errorMessage);
    } finally {
      setDeleting(null);
    }
  }

  // Motion props must be defined BEFORE any early returns (Rules of Hooks)
  const pageMotion = prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } };

  const sectionMotion = (delay: number) => prefersReducedMotion
    ? {}
    : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay } };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <TailorLoading mode="general" />
      </div>
    );
  }

  return (
    <motion.div
      {...pageMotion}
      className="container mx-auto px-4 py-8 max-w-6xl"
    >
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
      <motion.section
        {...sectionMotion(0.1)}
        className="mb-12"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Personal Information
          </h2>
          {!editingPersonalInfo && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-all border border-border"
                title="Import from LinkedIn or Portfolio"
              >
                <Download className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={() => setEditingPersonalInfo(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
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

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    City <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={personalInfoForm.city || ''}
                    onChange={(e) => setPersonalInfoForm({ ...personalInfoForm, city: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="San Francisco"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    State <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={personalInfoForm.state || ''}
                    onChange={(e) => setPersonalInfoForm({ ...personalInfoForm, state: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ZIP <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={personalInfoForm.zip || ''}
                    onChange={(e) => setPersonalInfoForm({ ...personalInfoForm, zip: e.target.value })}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="94102"
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Work Location Preference <span className="text-muted-foreground text-xs">(for job search)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'any', label: 'Any' },
                    { value: 'remote_only', label: 'Remote Only' },
                    { value: 'hybrid', label: 'Hybrid' },
                    { value: 'onsite', label: 'On-site' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPersonalInfoForm({ ...personalInfoForm, remote_preference: opt.value as any })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        (personalInfoForm.remote_preference || 'any') === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  This preference will be used for your personalized job feed
                </p>
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
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

              {(personalInfo?.phone_number || personalInfo?.city || personalInfo?.state || personalInfo?.linkedin_url || personalInfo?.portfolio_url || personalInfo?.remote_preference) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                  {personalInfo?.phone_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{personalInfo.phone_number}</p>
                    </div>
                  )}
                  {(personalInfo?.city || personalInfo?.state) && (
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">
                        {[personalInfo.city, personalInfo.state, personalInfo.zip].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  )}
                  {personalInfo?.remote_preference && personalInfo.remote_preference !== 'any' && (
                    <div>
                      <p className="text-sm text-muted-foreground">Work Preference</p>
                      <p className="font-medium capitalize">{personalInfo.remote_preference.replace('_', ' ')}</p>
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

              {!personalInfo?.phone_number && !personalInfo?.city && !personalInfo?.state && !personalInfo?.linkedin_url && !personalInfo?.portfolio_url && (
                <p className="text-muted-foreground text-sm pt-2">
                  Add your contact information to personalize your resumes.
                </p>
              )}
            </div>
          )}
        </div>
      </motion.section>

      {/* Experiences Section */}
      <motion.section
        {...sectionMotion(0.2)}
        className="mb-12"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            Work Experience
          </h2>
          <button
            onClick={() => setShowAddExperienceModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Experience
          </button>
        </div>

        {experiences.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No work experience found. Upload a resume or add manually.
            </p>
            <button
              onClick={() => setShowAddExperienceModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Experience
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {experiences.map((exp) => (
              <ExperienceItem
                key={exp.id}
                exp={exp}
                onDelete={deleteExperience}
                isDeleting={deleting === exp.id}
                prefersReducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* Skills Section */}
      <motion.section
        {...sectionMotion(0.3)}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            Skills
          </h2>
          <button
            onClick={() => setShowAddSkillModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        </div>

        {skills.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No skills found. Upload a resume or add manually.
            </p>
            <button
              onClick={() => setShowAddSkillModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Your First Skill
            </button>
          </div>
        ) : (
          <SkillsList
            skills={skills}
            onDelete={deleteSkill}
            isDeleting={deleting}
            prefersReducedMotion={prefersReducedMotion}
          />
        )}
      </motion.section>

      {/* Education Section */}
      <motion.section
        {...sectionMotion(0.4)}
        className="mb-12"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Education
          </h2>
          <button
            onClick={() => setShowAddEducationModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Education
          </button>
        </div>

        {education.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No education found. Add your educational background.
            </p>
            <button
              onClick={() => setShowAddEducationModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Education
            </button>
          </div>
        ) : (
          <CollapsibleList
            title={`Education (${education.length})`}
            icon={<BookOpen className="w-5 h-5" />}
            defaultOpen={true}
            prefersReducedMotion={prefersReducedMotion}
          >
            <div className="space-y-3">
              {education.map((edu) => (
                <div key={edu.id} className="flex items-start justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{edu.institution}</h4>
                    {edu.degree && (
                      <p className="text-sm text-primary">
                        {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                      </p>
                    )}
                    {(edu.start_date || edu.end_date) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {edu.start_date} - {edu.end_date || 'Present'}
                      </p>
                    )}
                    {edu.gpa && (
                      <p className="text-xs text-muted-foreground">GPA: {edu.gpa}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteEducation(edu.id, edu.institution)}
                    disabled={deleting === edu.id}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors disabled:opacity-50"
                    title="Delete education"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CollapsibleList>
        )}
      </motion.section>

      {/* Certifications Section */}
      <motion.section
        {...sectionMotion(0.5)}
        className="mb-12"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Certifications
          </h2>
          <button
            onClick={() => setShowAddCertificationModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Certification
          </button>
        </div>

        {certifications.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No certifications found. Add your professional certifications.
            </p>
            <button
              onClick={() => setShowAddCertificationModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Certification
            </button>
          </div>
        ) : (
          <CollapsibleList
            title={`Certifications (${certifications.length})`}
            icon={<Award className="w-5 h-5" />}
            defaultOpen={true}
            prefersReducedMotion={prefersReducedMotion}
          >
            <div className="space-y-3">
              {certifications.map((cert) => (
                <div key={cert.id} className="flex items-start justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{cert.name}</h4>
                    {cert.issuer && (
                      <p className="text-sm text-primary">{cert.issuer}</p>
                    )}
                    {cert.issue_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Issued: {cert.issue_date}
                        {cert.expiration_date && ` • Expires: ${cert.expiration_date}`}
                      </p>
                    )}
                    {cert.credential_url && (
                      <a
                        href={cert.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        View Credential <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => deleteCertification(cert.id, cert.name)}
                    disabled={deleting === cert.id}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors disabled:opacity-50"
                    title="Delete certification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CollapsibleList>
        )}
      </motion.section>

      {/* Military Awards Section (only show if user has awards) */}
      {militaryAwards.length > 0 && (
        <motion.section
          {...sectionMotion(0.6)}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold font-display flex items-center gap-2">
              <Medal className="w-6 h-6 text-primary" />
              Military Awards & Decorations
            </h2>
            <button
              onClick={() => setShowAddAwardModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground rounded-lg hover:opacity-90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Award
            </button>
          </div>

          <CollapsibleList
            title={`Awards & Decorations (${militaryAwards.length})`}
            icon={<Medal className="w-5 h-5" />}
            defaultOpen={true}
            prefersReducedMotion={prefersReducedMotion}
          >
            <div className="space-y-3">
              {militaryAwards.map((award) => (
                <div key={award.id} className="flex items-start justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">
                      {award.name}
                      {award.abbreviation && (
                        <span className="text-muted-foreground ml-2">({award.abbreviation})</span>
                      )}
                    </h4>
                    {award.category && (
                      <span className="inline-block px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full capitalize mt-1">
                        {award.category}
                      </span>
                    )}
                    {award.date_awarded && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Awarded: {award.date_awarded}
                      </p>
                    )}
                    {award.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{award.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMilitaryAward(award.id, award.name)}
                    disabled={deleting === award.id}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors disabled:opacity-50"
                    title="Delete award"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CollapsibleList>
        </motion.section>
      )}

      {/* Modals */}
      <AddSkillModal
        isOpen={showAddSkillModal}
        onClose={() => setShowAddSkillModal(false)}
        onSubmit={handleAddSkill}
        isSubmitting={isAddingSkill}
      />
      <AddExperienceModal
        isOpen={showAddExperienceModal}
        onClose={() => setShowAddExperienceModal(false)}
        onSubmit={handleAddExperience}
        isSubmitting={isAddingExperience}
      />
      <ImportProfileModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchProfile}
        linkedinUrl={personalInfo?.linkedin_url}
        portfolioUrl={personalInfo?.portfolio_url}
      />
      <AddEducationModal
        isOpen={showAddEducationModal}
        onClose={() => setShowAddEducationModal(false)}
        onSubmit={handleAddEducation}
        isSubmitting={isAddingEducation}
      />
      <AddCertificationModal
        isOpen={showAddCertificationModal}
        onClose={() => setShowAddCertificationModal(false)}
        onSubmit={handleAddCertification}
        isSubmitting={isAddingCertification}
      />
      <AddMilitaryAwardModal
        isOpen={showAddAwardModal}
        onClose={() => setShowAddAwardModal(false)}
        onSubmit={handleAddMilitaryAward}
        isSubmitting={isAddingAward}
      />
    </motion.div>
  );
}
