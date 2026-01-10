'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, Copy, BookOpen, Mail } from 'lucide-react';
import type { Job, ResearchAnalysis, EmailDraft } from '@/types/types';

interface JobCardProps {
    job: Job;
}

const STATUS_MAP: Record<string, { text: string; color: string; bg: string }> = {
    'PENDING': { text: 'Starting...', color: 'text-gray-600', bg: 'bg-gray-100' },
    'AGENT_1_FINDING_PROSPECTS': { text: 'Finding prospects', color: 'text-blue-600', bg: 'bg-blue-100' },
    'AGENT_2_ANALYZING_PUBLICATIONS': { text: 'Analyzing publications', color: 'text-purple-600', bg: 'bg-purple-100' },
    'AGENT_3_ANALYZING_CV': { text: 'Analyzing CV', color: 'text-orange-600', bg: 'bg-orange-100' },
    'AGENT_4_WRITING_EMAIL': { text: 'Writing emails', color: 'text-pink-600', bg: 'bg-pink-100' },
    'COMPLETE': { text: 'Complete', color: 'text-green-600', bg: 'bg-green-100' },
    'ERROR': { text: 'Error', color: 'text-red-600', bg: 'bg-red-100' },
};

export default function JobCard({ job }: JobCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'insights' | 'draft'>('insights');

    const status = STATUS_MAP[job.status] || STATUS_MAP['PENDING'];
    const isComplete = job.status === 'COMPLETE';
    const isError = job.status === 'ERROR';
    const isActive = !isComplete && !isError;

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="font-semibold text-gray-900">{job.targetField}</h3>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium mt-2 ${status.bg} ${status.color}`}>
                            {isActive && <Loader2 className="w-3 h-3 animate-spin" />}
                            {isComplete && <CheckCircle2 className="w-3 h-3" />}
                            {isError && <AlertCircle className="w-3 h-3" />}
                            {status.text}
                        </div>
                    </div>
                    {isComplete && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                        >
                            {isExpanded ? 'Hide' : 'View'}
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    )}
                </div>

                {isActive && (
                    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-blue-600"
                            initial={{ width: 0 }}
                            animate={{ width: `${(Math.max(job.currentAgent, 0.5) / 4) * 100}%` }}
                        />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isExpanded && isComplete && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="border-t border-gray-200"
                    >
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setActiveTab('insights')}
                                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'insights' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                            >
                                <BookOpen className="w-4 h-4 inline mr-1" /> Insights
                            </button>
                            <button
                                onClick={() => setActiveTab('draft')}
                                className={`flex-1 py-3 text-sm font-medium ${activeTab === 'draft' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
                            >
                                <Mail className="w-4 h-4 inline mr-1" /> Drafts
                            </button>
                        </div>

                        <div className="p-4 max-h-80 overflow-y-auto">
                            {activeTab === 'insights' && (
                                <div className="space-y-3">
                                    {(job.researchAnalyses || []).map((analysis: ResearchAnalysis, i: number) => (
                                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                                            <p className="font-medium text-gray-900">{analysis.prospectName}</p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {analysis.keyThemes.slice(0, 3).map((theme: string, idx: number) => (
                                                    <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                                        {theme}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {(!job.researchAnalyses || job.researchAnalyses.length === 0) && (
                                        <p className="text-gray-500 text-sm">No insights available.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'draft' && (
                                <div className="space-y-4">
                                    {(job.emailDrafts || []).map((draft: EmailDraft, i: number) => (
                                        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                                            <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs text-gray-500">To: {draft.prospectName}</p>
                                                    <p className="text-sm font-medium text-gray-900">{draft.subject}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(draft.body)}
                                                    className="p-1.5 hover:bg-gray-200 rounded text-gray-500"
                                                    title="Copy"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="p-3">
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{draft.body}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!job.emailDrafts || job.emailDrafts.length === 0) && (
                                        <p className="text-gray-500 text-sm">No drafts available.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
