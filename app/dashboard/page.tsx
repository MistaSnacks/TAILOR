'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Files, Sparkles, TrendingUp, ArrowRight, Plus, UploadCloud, UserCheck, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { TailorLoading } from '@/components/ui/tailor-loader';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type DashboardStats = {
  documentsCount: number;
  resumesCount: number;
  recentResumes: {
    id: string;
    template: string;
    created_at: string;
    job: { id: string; title: string; company: string } | null;
    ats_score: { score: number; analysis: any } | null;
  }[];
  profileCompleteness: number;
  experienceCount: number;
  skillsCount: number;
  averageAtsScore: number | null;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Silent fail - UI will show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <TailorLoading mode="general" />
      </div>
    );
  }

  // Motion variants - only used when reduced motion is not preferred
  const container = {
    hidden: { opacity: prefersReducedMotion ? 1 : 0 },
    show: {
      opacity: 1,
      transition: prefersReducedMotion ? { duration: 0 } : {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="px-0 md:px-0">
      <motion.div
        {...(prefersReducedMotion ? {} : { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } })}
        className="mb-6 md:mb-8"
      >
        <h1 className="font-display text-2xl md:text-4xl font-bold mb-1 md:mb-2 text-foreground">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">Welcome back to your command center.</p>
      </motion.div>

      <motion.div
        variants={container}
        {...(prefersReducedMotion ? {} : { initial: "hidden", animate: "show" })}
        className="space-y-6 md:space-y-8"
      >
        {/* Stats Grid - 2 columns on mobile, 4 on larger screens */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <motion.div variants={item} className="glass-card p-4 md:p-6 rounded-xl md:rounded-2xl border border-border/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText className="w-12 h-12 md:w-20 md:h-20 text-primary" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2 text-muted-foreground">
                <UploadCloud className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium">Documents</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-0.5 md:mb-1">{stats?.documentsCount || 0}</div>
              <Link href="/dashboard/documents" className="text-[10px] md:text-xs text-primary hover:underline flex items-center gap-1">
                Manage <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
              </Link>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card p-4 md:p-6 rounded-xl md:rounded-2xl border border-border/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Files className="w-12 h-12 md:w-20 md:h-20 text-primary" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2 text-muted-foreground">
                <Files className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium">Resumes</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-0.5 md:mb-1">{stats?.resumesCount || 0}</div>
              <Link href="/dashboard/resumes" className="text-[10px] md:text-xs text-primary hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
              </Link>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card p-4 md:p-6 rounded-xl md:rounded-2xl border border-border/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-12 h-12 md:w-20 md:h-20 text-green-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2 text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium">ATS Score</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-0.5 md:mb-1">
                {stats?.averageAtsScore != null ? (
                  <span className={stats.averageAtsScore >= 80 ? 'text-green-500' : stats.averageAtsScore >= 60 ? 'text-yellow-500' : 'text-red-500'}>
                    {stats.averageAtsScore}%
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xl md:text-2xl">—</span>
                )}
              </div>
              <div className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">
                {stats?.resumesCount ? `${stats.resumesCount} resume${stats.resumesCount > 1 ? 's' : ''}` : 'No resumes'}
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card p-4 md:p-6 rounded-xl md:rounded-2xl border border-border/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <UserCheck className="w-12 h-12 md:w-20 md:h-20 text-primary" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2 text-muted-foreground">
                <UserCheck className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm font-medium">Profile</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-0.5 md:mb-1">{stats?.profileCompleteness || 0}%</div>
              <div className="w-full bg-muted/50 rounded-full h-1 md:h-1.5 mt-0.5 md:mt-1 mb-1 md:mb-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${(stats?.profileCompleteness || 0) >= 80 ? 'bg-green-500' :
                    (stats?.profileCompleteness || 0) >= 50 ? 'bg-yellow-500' : 'bg-primary'
                    }`}
                  style={{ width: `${stats?.profileCompleteness || 0}%` }}
                />
              </div>
              <Link href="/dashboard/profile" className="text-[10px] md:text-xs text-primary hover:underline flex items-center gap-1">
                Complete <ArrowRight className="w-2.5 h-2.5 md:w-3 md:h-3" />
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Recent Activity */}
          <motion.div variants={item} className="lg:col-span-2 space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-bold font-display flex items-center gap-2">
              <Files className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              Recent Resumes
            </h2>

            {stats?.recentResumes && stats.recentResumes.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {stats.recentResumes.map((resume, i) => (
                  <motion.div
                    key={resume.id}
                    {...(prefersReducedMotion ? {} : { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { delay: i * 0.1 } })}
                    className="glass-card p-3 md:p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <FileText className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm md:text-base text-foreground truncate">{resume.job?.title || 'Untitled Resume'}</h3>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">{resume.job?.company || 'No Company'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                      {resume.ats_score?.score != null && (
                        <div className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium border ${resume.ats_score.score >= 80 ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                          resume.ats_score.score >= 60 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                            'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                          {resume.ats_score.score}%
                        </div>
                      )}
                      <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                        {new Date(resume.created_at).toLocaleDateString()}
                      </span>
                      <Link
                        href="/dashboard/resumes"
                        className="p-1.5 md:p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-6 md:p-8 rounded-xl border border-dashed border-border text-center">
                <p className="text-sm text-muted-foreground mb-4">No resumes generated yet.</p>
                <Link href="/dashboard/generate" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" /> Create First Resume
                </Link>
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={item} className="space-y-4 md:space-y-6">
            <h2 className="text-lg md:text-xl font-bold font-display flex items-center gap-2">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              Quick Actions
            </h2>
            <div className="grid gap-3 md:gap-4">
              <Link href="/dashboard/generate" className="group glass-card p-3 md:p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform flex-shrink-0">
                  <Plus className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm md:text-base">New Resume</h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Tailor for a job</p>
                </div>
              </Link>

              <Link href="/dashboard/documents" className="group glass-card p-3 md:p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform flex-shrink-0">
                  <UploadCloud className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm md:text-base">Upload Document</h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Add PDF or DOCX</p>
                </div>
              </Link>

              <Link href="/dashboard/profile" className="group glass-card p-3 md:p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform flex-shrink-0">
                  <Briefcase className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm md:text-base">Update Profile</h3>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Manage experience</p>
                </div>
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
