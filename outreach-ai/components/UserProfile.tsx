'use client';

import { ChevronDown, User, Upload, FileText, Check } from 'lucide-react';
import { useState, useRef } from 'react';

interface UserProfileProps {
    bio: string;
    researchInterests: string;
    cvFile: File | null;
    profileId: string | null;
    onBioChange: (bio: string) => void;
    onResearchInterestsChange: (interests: string) => void;
    onCVUpload: (file: File) => void;
    onSave: () => Promise<void>;
}

export default function UserProfile({
    bio,
    researchInterests,
    cvFile,
    profileId,
    onBioChange,
    onResearchInterestsChange,
    onCVUpload,
    onSave,
}: UserProfileProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && isValidFile(file)) {
            onCVUpload(file);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && isValidFile(file)) {
            onCVUpload(file);
        }
    };

    const isValidFile = (file: File) => {
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
        ];
        return validTypes.includes(file.type) || file.name.match(/\.(pdf|docx|txt)$/i);
    };

    const handleSave = async () => {
        setIsSaving(true);
        await onSave();
        setIsSaving(false);
    };

    const canSave = bio.trim() && researchInterests.trim() && cvFile && !profileId;

    return (
        <section className="glass rounded-lg overflow-hidden mb-6 animate-slide-up">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                aria-expanded={isExpanded}
                aria-controls="profile-content"
            >
                <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-cyan-400" />
                    <div className="text-left">
                        <h2 className="text-lg font-semibold text-slate-100">User Profile</h2>
                        <p className="text-sm text-slate-400">
                            {profileId ? '✓ Profile Created' : 'Upload CV & Set Research Interests'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {profileId && (
                        <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-xs text-green-300 font-semibold">
                            <Check className="w-3 h-3 inline mr-1" />
                            Ready
                        </span>
                    )}
                    <ChevronDown
                        className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''
                            }`}
                    />
                </div>
            </button>

            <div
                id="profile-content"
                className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[1000px]' : 'max-h-0'
                    }`}
            >
                <div className="px-6 pb-6 space-y-4">
                    {/* CV Upload */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                            Upload Your CV/Resume *
                        </label>
                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${isDragging
                                    ? 'border-cyan-400 bg-cyan-400/10'
                                    : cvFile
                                        ? 'border-green-400 bg-green-400/10'
                                        : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
                                }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.docx,.txt"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            {cvFile ? (
                                <div className="flex items-center justify-center gap-3 text-green-400">
                                    <FileText className="w-8 h-8" />
                                    <div className="text-left">
                                        <p className="font-medium">{cvFile.name}</p>
                                        <p className="text-xs text-slate-400">
                                            {(cvFile.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="w-8 h-8 text-slate-400" />
                                    <p className="text-sm text-slate-300">
                                        Drop your CV here or click to browse
                                    </p>
                                    <p className="text-xs text-slate-500">PDF, DOCX, or TXT (Max 10MB)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                        <label htmlFor="user-bio" className="block text-sm font-medium text-slate-300">
                            Your Background / Bio *
                        </label>
                        <textarea
                            id="user-bio"
                            value={bio}
                            onChange={(e) => onBioChange(e.target.value)}
                            placeholder="I am a Junior Full Stack Dev with experience in Next.js and MongoDB. I won 2 hackathons..."
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all resize-none"
                            disabled={!!profileId}
                        />
                    </div>

                    {/* Research Interests */}
                    <div className="space-y-2">
                        <label htmlFor="research-interests" className="block text-sm font-medium text-slate-300">
                            Research Interests *
                        </label>
                        <textarea
                            id="research-interests"
                            value={researchInterests}
                            onChange={(e) => onResearchInterestsChange(e.target.value)}
                            placeholder="Machine Learning, Bioinformatics, Computer Vision..."
                            rows={2}
                            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all resize-none"
                            disabled={!!profileId}
                        />
                    </div>

                    {/* Save Button */}
                    {!profileId && (
                        <button
                            onClick={handleSave}
                            disabled={!canSave || isSaving}
                            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95"
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Saving Profile...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    <span>Save Profile</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
