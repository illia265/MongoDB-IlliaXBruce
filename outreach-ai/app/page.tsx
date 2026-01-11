'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Sparkles, Search, Upload, LogOut, History, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import JobCard from '@/components/JobCard';
import type { Job } from '@/types/types';

export default function Home() {
  const { data: session, status } = useSession();
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);

  // Load user's profile and jobs when logged in
  useEffect(() => {
    if (session?.user) {
      loadUserData();
    }
  }, [session]);

  const loadUserData = async () => {
    setIsLoadingUserData(true);
    try {
      const res = await fetch('/api/user/data');
      const data = await res.json();
      if (data.success) {
        if (data.profileId) setProfileId(data.profileId);
        if (data.jobs) setJobs(data.jobs);
        if (data.cvFileName) setCvFile({ name: data.cvFileName } as File);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoadingUserData(false);
    }
  };

  // Poll for active job updates, placed correctly at component level
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

  // Loading Screen
  if (status === 'loading' || isLoadingUserData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

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
      alert('Please upload your CV first');
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
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display text-gray-900">OutreachAI</h1>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <>
                {jobs.length > 0 && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow active:scale-95 flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    History
                  </button>
                )}
                <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                  <div className="flex items-center gap-2">
                    <img
                      src={session.user?.image || ''}
                      alt=""
                      className="w-9 h-9 rounded-full border-2 border-white shadow-sm"
                    />
                    <span className="text-sm font-medium text-gray-700 hidden sm:block font-sans">{session.user?.name?.split(' ')[0]}</span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                    title="Sign out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-600/30 active:scale-95 flex items-center gap-2 font-sans"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold font-display text-gray-900 mb-3">Find Your Research Match</h2>
          <p className="text-gray-600">
            {session
              ? 'Deploy AI agents to find professors and draft personalized outreach emails.'
              : 'Sign in to start finding professors and generating outreach emails.'}
          </p>
        </div>

        {/* CV Upload - Below Title */}
        {session && (
          <div className="max-w-lg mx-auto mb-10">
            <label
              className={`group flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-300 ${profileId
                ? 'border-green-300 bg-green-50/50 hover:bg-green-50 hover:border-green-400'
                : 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/30 hover:shadow-lg hover:shadow-blue-500/5'
                }`}
            >
              <input
                type="file"
                onChange={handleCVUpload}
                className="hidden"
                accept=".pdf,.docx,.txt"
              />
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300 ${profileId ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-500 group-hover:bg-blue-100 group-hover:scale-110 group-hover:text-blue-600'}`}>
                <Upload className="w-7 h-7" />
              </div>
              <p className={`text-base font-semibold mb-1 ${profileId ? 'text-green-700' : 'text-gray-900'}`}>
                {profileId ? `✓ ${cvFile?.name || 'CV Uploaded'}` : 'Upload your CV / Resume'}
              </p>
              <p className="text-sm text-gray-500 group-hover:text-blue-500/80 transition-colors">PDF, DOCX, or TXT</p>
            </label>
          </div>
        )}

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex items-center bg-white p-2 rounded-full border border-gray-200 shadow-xl shadow-blue-900/5 focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all duration-300">
            <Search className="w-5 h-5 text-gray-400 ml-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. MRI research at UCSF"
              className="flex-1 px-4 py-3 text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none font-medium"
              onKeyDown={(e) => e.key === 'Enter' && handleLaunch()}
            />
            <button
              onClick={handleLaunch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 font-semibold rounded-full transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
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
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium font-display text-gray-900 mb-2">No searches yet</h3>
            <p className="text-gray-500">Upload your CV and enter a field to start</p>
          </div>
        )}
      </main>
    </div>
  );
}
