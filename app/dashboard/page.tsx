'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Files, Sparkles, TrendingUp, ArrowRight, Plus, UploadCloud, UserCheck, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { TailorLoading } from '@/components/ui/tailor-loader';

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

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="font-display text-4xl font-bold mb-2 text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back to your professional command center.</p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div variants={item} className="glass-card p-6 rounded-2xl border border-border/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText className="w-20 h-20 text-primary" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <UploadCloud className="w-4 h-4" />
                <span className="text-sm font-medium">Documents</span>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stats?.documentsCount || 0}</div>
              <Link href="/dashboard/documents" className="text-xs text-primary hover:underline flex items-center gap-1">
                Manage <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card p-6 rounded-2xl border border-border/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Files className="w-20 h-20 text-primary" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <Files className="w-4 h-4" />
                <span className="text-sm font-medium">Resumes</span>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stats?.resumesCount || 0}</div>
              <Link href="/dashboard/resumes" className="text-xs text-primary hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card p-6 rounded-2xl border border-border/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-20 h-20 text-green-500" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Avg ATS Score</span>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">
                {stats?.averageAtsScore != null ? (
                  <span className={stats.averageAtsScore >= 80 ? 'text-green-500' : stats.averageAtsScore >= 60 ? 'text-yellow-500' : 'text-red-500'}>
                    {stats.averageAtsScore}%
                  </span>
                ) : (
                  <span className="text-muted-foreground text-2xl">—</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {stats?.resumesCount ? `Based on ${stats.resumesCount} resume${stats.resumesCount > 1 ? 's' : ''}` : 'Generate a resume to see'}
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="glass-card p-6 rounded-2xl border border-border/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <UserCheck className="w-20 h-20 text-primary" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                <UserCheck className="w-4 h-4" />
                <span className="text-sm font-medium">Profile</span>
              </div>
              <div className="text-3xl font-bold text-foreground mb-1">{stats?.profileCompleteness || 0}%</div>
              <div className="w-full bg-muted/50 rounded-full h-1.5 mt-1 mb-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${(stats?.profileCompleteness || 0) >= 80 ? 'bg-green-500' :
                    (stats?.profileCompleteness || 0) >= 50 ? 'bg-yellow-500' : 'bg-primary'
                    }`}
                  style={{ width: `${stats?.profileCompleteness || 0}%` }}
                />
              </div>
              <Link href="/dashboard/profile" className="text-xs text-primary hover:underline flex items-center gap-1">
                Complete <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <motion.div variants={item} className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <Files className="w-5 h-5 text-primary" />
              Recent Resumes
            </h2>

            {stats?.recentResumes && stats.recentResumes.length > 0 ? (
              <div className="space-y-4">
                {stats.recentResumes.map((resume, i) => (
                  <motion.div
                    key={resume.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{resume.job?.title || 'Untitled Resume'}</h3>
                        <p className="text-sm text-muted-foreground">{resume.job?.company || 'No Company'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {resume.ats_score?.score != null && (
                        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${resume.ats_score.score >= 80 ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                          resume.ats_score.score >= 60 ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                            'bg-red-500/10 text-red-500 border-red-500/20'
                          }`}>
                          ATS: {resume.ats_score.score}%
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(resume.created_at).toLocaleDateString()}
                      </span>
                      <Link
                        href="/dashboard/resumes"
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-8 rounded-xl border border-dashed border-border text-center">
                <p className="text-muted-foreground mb-4">No resumes generated yet.</p>
                <Link href="/dashboard/generate" className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create First Resume
                </Link>
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={item} className="space-y-6">
            <h2 className="text-xl font-bold font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Quick Actions
            </h2>
            <div className="grid gap-4">
              <Link href="/dashboard/generate" className="group glass-card p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">New Resume</h3>
                  <p className="text-xs text-muted-foreground">Tailor for a job description</p>
                </div>
              </Link>

              <Link href="/dashboard/documents" className="group glass-card p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Upload Document</h3>
                  <p className="text-xs text-muted-foreground">Add PDF or Word files</p>
                </div>
              </Link>

              <Link href="/dashboard/profile" className="group glass-card p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold">Update Profile</h3>
                  <p className="text-xs text-muted-foreground">Manage experience & skills</p>
                </div>
              </Link>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
