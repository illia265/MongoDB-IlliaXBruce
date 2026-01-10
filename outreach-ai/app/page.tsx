'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Sparkles, Search, ChevronDown, ChevronUp, Upload, LogOut, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JobCard from '@/components/JobCard';
import type { Job } from '@/types/types';

export default function Home() {
  const { data: session, status } = useSession();
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load user's profile and jobs when logged in
  useEffect(() => {
    if (session?.user) {
      loadUserData();
    }
  }, [session]);

  const loadUserData = async () => {
    try {
      const res = await fetch('/api/user/data');
      const data = await res.json();
      if (data.success) {
        if (data.profileId) setProfileId(data.profileId);
        if (data.jobs) setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  // Poll for active job updates
  const hasActiveJobs = jobs.some(job => job.status !== 'COMPLETE' && job.status !== 'ERROR');
  useEffect(() => {
    if (!hasActiveJobs) return;
    const interval = setInterval(async () => {
      const activeJobs = jobs.filter(job => job.status !== 'COMPLETE' && job.status !== 'ERROR');
      for (const job of activeJobs) {
        const jobId = job.id || job._id;
        if (!jobId) continue;
        try {
          const res = await fetch(`/api/jobs/${jobId}`);
          const data = await res.json();
          if (data.success && data.job) {
            setJobs(prev => prev.map(j => (j.id === jobId || j._id === jobId) ? data.job : j));
          }
        } catch (error) { console.error(error); }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [hasActiveJobs, jobs]);

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCvFile(file);
      const formData = new FormData();
      formData.append('cv', file);
      formData.append('bio', 'Researcher');
      formData.append('researchInterests', 'General');
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          setProfileId(data.profileId);
          setIsContextOpen(false);
        } else {
          alert('Upload failed: ' + data.message);
        }
      } catch (err) { alert('Upload error'); }
    }
  };

  const handleLaunch = async () => {
    if (!session) {
      signIn('google');
      return;
    }
    if (!profileId) {
      setIsContextOpen(true);
      return;
    }
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, targetField: searchQuery }),
      });
      const data = await res.json();
      if (data.success) {
        const newJob: Job = {
          id: data.jobId, _id: data.jobId, profileId, targetField: searchQuery, status: 'PENDING',
          currentAgent: 0, prospects: [], researchAnalyses: [], cvInsights: null, emailDrafts: [], logs: [],
          createdAt: new Date(), updatedAt: new Date()
        };
        setJobs(prev => [newJob, ...prev]);
        setSearchQuery('');
      }
    } catch (err) { alert('Launch failed'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">OutreachAI</h1>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <>
                {profileId && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    History
                  </button>
                )}
                <button
                  onClick={() => setIsContextOpen(!isContextOpen)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 ${profileId
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {profileId ? '✓ CV Uploaded' : 'Upload CV'}
                  {isContextOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                  <img
                    src={session.user?.image || ''}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm text-gray-700 hidden sm:block">{session.user?.name?.split(' ')[0]}</span>
                  <button
                    onClick={() => signOut()}
                    className="p-2 text-gray-500 hover:text-gray-700"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isContextOpen && session && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200 bg-white"
            >
              <div className="max-w-md mx-auto p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3 text-center">Upload Your CV / Resume</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer relative">
                  <input type="file" onChange={handleCVUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.docx,.txt" />
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 font-medium">{cvFile ? cvFile.name : 'Click to upload'}</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOCX, or TXT</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Find Your Research Match</h2>
          <p className="text-gray-600">
            {session
              ? 'Deploy AI agents to find professors and draft personalized outreach emails.'
              : 'Sign in to start finding professors and generating outreach emails.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex items-center bg-white rounded-lg border border-gray-300 shadow-sm overflow-hidden">
            <Search className="w-5 h-5 text-gray-400 ml-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Neuroscience professors at Stanford"
              className="flex-1 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleLaunch()}
            />
            <button
              onClick={handleLaunch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 font-medium transition-colors"
            >
              {session ? 'Launch' : 'Sign In'}
            </button>
          </div>
        </div>

        {/* Jobs Grid */}
        {jobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard key={job.id || job._id} job={job} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {session && jobs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No searches yet</h3>
            <p className="text-gray-500">Enter a field above to start finding professors</p>
          </div>
        )}
      </main>
    </div>
  );
}
