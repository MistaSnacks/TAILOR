'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Briefcase, 
  MapPin, 
  Clock, 
  ExternalLink, 
  Bookmark, 
  BookmarkCheck,
  Filter,
  X,
  Building2,
  DollarSign,
  History,
  Star,
  Loader2,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { TailorLoading } from '@/components/ui/tailor-loader';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { NormalizedJob, SavedJob, SearchHistoryEntry, SavedSearch, JobSearchParams } from '@/lib/jobs/types';

type Tab = 'feed' | 'search' | 'saved' | 'history';

export default function JobsPage() {
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Feed state
  const [feedJobs, setFeedJobs] = useState<NormalizedJob[]>([]);
  const [feedMessage, setFeedMessage] = useState<string | null>(null);
  const [providersEnabled, setProvidersEnabled] = useState(true);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  // Work mode filter: allow up to 2 selections among remote/hybrid/onsite; remoteOnly is exclusive; empty selection = Any
  const [workModes, setWorkModes] = useState<Set<'remote' | 'hybrid' | 'onsite'>>(new Set());
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [searchResults, setSearchResults] = useState<NormalizedJob[]>([]);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [profileLocation, setProfileLocation] = useState<string | null>(null);
  
  // Saved jobs state
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  
  // History state
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | '2weeks' | 'month'>('2weeks');

  // Fetch personalized feed
  const fetchFeed = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/jobs/feed?limit=20');
      const data = await res.json();
      
      if (data.jobs) {
        setFeedJobs(data.jobs);
        setProvidersEnabled(data.providersEnabled !== false);
      }
      if (data.message) {
        setFeedMessage(data.message);
      }
    } catch (error) {
      console.error('Error fetching feed:', error);
      setFeedMessage('Failed to load job feed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch saved jobs
  const fetchSavedJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs/saved');
      const data = await res.json();
      
      if (data.jobs) {
        setSavedJobs(data.jobs);
        setSavedJobIds(new Set(data.jobs.map((j: SavedJob) => j.job.id)));
      }
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
    }
  }, []);

  // Fetch search history
  const fetchHistory = useCallback(async () => {
    try {
      const [historyRes, searchesRes] = await Promise.all([
        fetch('/api/jobs/history?limit=10'),
        fetch('/api/jobs/saved-searches'),
      ]);
      
      const [historyData, searchesData] = await Promise.all([
        historyRes.json(),
        searchesRes.json(),
      ]);
      
      if (historyData.history) {
        setSearchHistory(historyData.history);
      }
      if (searchesData.searches) {
        setSavedSearches(searchesData.searches);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }, []);

  // Load profile location for default search location
  useEffect(() => {
    async function fetchProfileLocation() {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (data.personalInfo?.city && data.personalInfo?.state) {
          const loc = `${data.personalInfo.city}, ${data.personalInfo.state}`;
          setProfileLocation(loc);
          setSearchLocation(loc); // Default to profile location
        } else if (data.personalInfo?.city) {
          setProfileLocation(data.personalInfo.city);
          setSearchLocation(data.personalInfo.city);
        }
      } catch (error) {
        console.error('Error fetching profile location:', error);
      }
    }
    fetchProfileLocation();
  }, []);

  // Initial load
  useEffect(() => {
    fetchFeed();
    fetchSavedJobs();
    fetchHistory();
  }, [fetchFeed, fetchSavedJobs, fetchHistory]);

  // Search jobs
  const handleSearch = async (e?: React.FormEvent, params?: JobSearchParams) => {
    e?.preventDefault();
    
    // Map work modes to API params
    const isRemoteSelected = workModes.has('remote') || remoteOnly;
    const remoteValue: boolean | undefined = isRemoteSelected ? true : undefined;
    const searchParams = params || {
      query: searchQuery,
      location: remoteOnly ? undefined : (searchLocation || undefined),
      remote: remoteValue,
      datePosted: dateFilter,
    };
    
    if (!searchParams.query?.trim()) {
      setSearchMessage('Enter a search query');
      return;
    }
    
    try {
      setSearchLoading(true);
      setSearchMessage(null);
      setActiveTab('search');
      
      const queryString = new URLSearchParams({
        q: searchParams.query,
        ...(searchParams.location && { location: searchParams.location }),
        ...(searchParams.remote && { remote: 'true' }),
        date: searchParams.datePosted || '2weeks',
        limit: '20',
      }).toString();
      
      const res = await fetch(`/api/jobs/search?${queryString}`);
      const data = await res.json();
      
      if (data.jobs) {
        setSearchResults(data.jobs);
        if (data.jobs.length === 0) {
          setSearchMessage('No jobs found. Try different keywords.');
        }
      }
      if (data.message) {
        setSearchMessage(data.message);
      }
      
      // Refresh history after search
      fetchHistory();
    } catch (error) {
      console.error('Error searching:', error);
      setSearchMessage('Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Save/unsave job
  const toggleSaveJob = async (job: NormalizedJob) => {
    const isSaved = savedJobIds.has(job.id);
    
    try {
      if (isSaved) {
        await fetch(`/api/jobs/saved?jobId=${encodeURIComponent(job.id)}`, {
          method: 'DELETE',
        });
        setSavedJobIds(prev => {
          const next = new Set(prev);
          next.delete(job.id);
          return next;
        });
        setSavedJobs(prev => prev.filter(j => j.job.id !== job.id));
      } else {
        const res = await fetch('/api/jobs/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job }),
        });
        const data = await res.json();
        
        if (data.savedJob) {
          setSavedJobIds(prev => new Set([...prev, job.id]));
          setSavedJobs(prev => [data.savedJob, ...prev]);
        }
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  // Mark job as applied
  const markApplied = async (jobId: string) => {
    try {
      await fetch('/api/jobs/saved', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, applied: true }),
      });
      
      setSavedJobs(prev => prev.map(j => 
        j.job.id === jobId ? { ...j, applied: true, appliedAt: new Date() } : j
      ));
    } catch (error) {
      console.error('Error marking applied:', error);
    }
  };

  // Re-run a saved search
  const runSavedSearch = (params: JobSearchParams) => {
    setSearchQuery(params.query);
    setSearchLocation(params.location || '');
    if (params.remote) {
      setRemoteOnly(false);
      setWorkModes(new Set(['remote']));
    } else {
      setRemoteOnly(false);
      setWorkModes(new Set());
    }
    if (params.datePosted) setDateFilter(params.datePosted);
    handleSearch(undefined, params);
  };

  // Format relative time
  const formatRelativeTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    return `${Math.floor(diffDays / 7)} weeks ago`;
  };

  // Job card component
  const JobCard = ({ job, showSave = true }: { job: NormalizedJob; showSave?: boolean }) => {
    const isSaved = savedJobIds.has(job.id);
    
    return (
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {job.companyLogo ? (
                <img 
                  src={job.companyLogo} 
                  alt={job.company} 
                  className="w-8 h-8 rounded object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{job.company}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {job.isRemote ? 'Remote' : job.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(job.postedAt)}
              </span>
              {job.salary && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {job.salary.min && job.salary.max 
                    ? `$${(job.salary.min/1000).toFixed(0)}k-$${(job.salary.max/1000).toFixed(0)}k`
                    : 'Salary listed'}
                </span>
              )}
              {job.employmentType && (
                <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] uppercase">
                  {job.employmentType.replace('_', '-')}
                </span>
              )}
            </div>
            
            {job.description && (
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {job.description.slice(0, 200)}...
              </p>
            )}
          </div>
          
          <div className="flex flex-col items-center gap-2">
            {showSave && (
              <button
                onClick={() => toggleSaveJob(job)}
                className={`p-2 rounded-lg transition-colors ${
                  isSaved 
                    ? 'bg-primary/10 text-primary' 
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
                title={isSaved ? 'Unsave' : 'Save job'}
              >
                {isSaved ? (
                  <BookmarkCheck className="w-5 h-5" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
              </button>
            )}
            
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              title="Apply"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </motion.div>
    );
  };

  // Loading state
  if (loading && activeTab === 'feed') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <TailorLoading mode="general" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'feed', label: 'For You', icon: Star },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'saved', label: 'Saved', icon: Bookmark },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <div className="px-0 md:px-0">
      {/* Header */}
      <motion.div
        {...(prefersReducedMotion ? {} : { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 } })}
        className="mb-6"
      >
        <h1 className="font-display text-2xl md:text-4xl font-bold mb-1 text-foreground flex items-center gap-3">
          <Briefcase className="w-8 h-8 text-primary" />
          Job Search
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Find opportunities that match your profile
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.form
        onSubmit={handleSearch}
        {...(prefersReducedMotion ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 } })}
        className="glass-card p-4 rounded-xl border border-border/50 mb-6"
      >
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Job title, skills, or keywords..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1 md:w-48">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="Location..."
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 border rounded-lg transition-colors ${
                showFilters || remoteOnly || workModes.size > 0 
                  ? 'bg-primary/10 border-primary/30 text-primary' 
                  : 'border-border hover:bg-muted'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
            
            <button
              type="submit"
              disabled={searchLoading}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {searchLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </button>
          </div>
        </div>
        
        {/* Filter Panel */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 items-center"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Work type:</span>
              <div className="flex gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setRemoteOnly(false);
                    setWorkModes(new Set());
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    !remoteOnly && workModes.size === 0
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary/50'
                  }`}
                >
                  Any
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRemoteOnly(true);
                    setWorkModes(new Set());
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    remoteOnly
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary/50'
                  }`}
                >
                  Remote Only
                </button>
                {[
                  { value: 'remote', label: 'Remote' },
                  { value: 'hybrid', label: 'Hybrid' },
                  { value: 'onsite', label: 'On-site' },
                ].map((opt) => {
                  const isActive = workModes.has(opt.value as any);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setRemoteOnly(false);
                        setWorkModes(prev => {
                          const next = new Set(prev);
                          if (next.has(opt.value as any)) {
                            next.delete(opt.value as any);
                          } else {
                            if (next.size >= 2) return next; // limit to 2 selections
                            next.add(opt.value as any);
                          }
                          return next;
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:border-primary/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-muted-foreground ml-2">Pick up to 2 (Remote Only is exclusive)</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Posted:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="today">Today</option>
                <option value="week">Past week</option>
                <option value="2weeks">Past 2 weeks</option>
                <option value="month">Past month</option>
              </select>
            </div>
            
            {profileLocation && searchLocation !== profileLocation && (
              <button
                type="button"
                onClick={() => setSearchLocation(profileLocation)}
                className="text-xs text-primary hover:underline"
              >
                Use profile location ({profileLocation})
              </button>
            )}
          </motion.div>
        )}
      </motion.form>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'saved' && savedJobs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                {savedJobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <>
            {!providersEnabled ? (
              <div className="glass-card p-8 rounded-xl border border-border/50 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Job Search Not Configured</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {feedMessage || 'Enable a job provider in your environment to see personalized job recommendations.'}
                </p>
              </div>
            ) : feedJobs.length === 0 ? (
              <div className="glass-card p-8 rounded-xl border border-border/50 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Jobs Yet</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {feedMessage || 'Upload a resume to get personalized job recommendations based on your experience.'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {feedJobs.length} jobs matching your profile
                  </p>
                  <button
                    onClick={fetchFeed}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>
                {feedJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </>
            )}
          </>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <>
            {searchLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : searchResults.length === 0 ? (
              <div className="glass-card p-8 rounded-xl border border-border/50 text-center">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Search for Jobs</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  {searchMessage || 'Enter keywords to find jobs across the web.'}
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchResults.length} results found
                </p>
                {searchResults.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </>
            )}
          </>
        )}

        {/* Saved Tab */}
        {activeTab === 'saved' && (
          <>
            {savedJobs.length === 0 ? (
              <div className="glass-card p-8 rounded-xl border border-border/50 text-center">
                <Bookmark className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Saved Jobs</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Save jobs you're interested in to keep track of them here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedJobs.map((saved) => (
                  <div key={saved.id} className="relative">
                    <JobCard job={saved.job} showSave={true} />
                    {saved.applied && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Applied
                      </div>
                    )}
                    {!saved.applied && (
                      <button
                        onClick={() => markApplied(saved.job.id)}
                        className="absolute top-2 right-2 px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        Mark Applied
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Searches */}
            <div className="glass-card p-4 rounded-xl border border-border/50">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Recent Searches
              </h3>
              {searchHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent searches</p>
              ) : (
                <div className="space-y-2">
                  {searchHistory.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => runSavedSearch(entry.params)}
                      className="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted text-left transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {entry.params.query}
                        </span>
                        <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {entry.params.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {entry.params.location}
                          </span>
                        )}
                        <span>{entry.resultCount} results</span>
                        <span>•</span>
                        <span>{formatRelativeTime(entry.searchedAt)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Searches */}
            <div className="glass-card p-4 rounded-xl border border-border/50">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Saved Searches
              </h3>
              {savedSearches.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved searches yet</p>
              ) : (
                <div className="space-y-2">
                  {savedSearches.map((search) => (
                    <button
                      key={search.id}
                      onClick={() => runSavedSearch(search.params)}
                      className="w-full p-3 rounded-lg bg-muted/50 hover:bg-muted text-left transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {search.name}
                        </span>
                        <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {search.params.query}
                        {search.params.location && ` • ${search.params.location}`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

