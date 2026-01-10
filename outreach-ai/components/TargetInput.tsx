'use client';

import { Target, Rocket } from 'lucide-react';
import { useState } from 'react';

interface TargetInputProps {
    onDeploy: (target: string) => void;
    disabled: boolean;
}

export default function TargetInput({ onDeploy, disabled }: TargetInputProps) {
    const [target, setTarget] = useState('');

    const handleDeploy = () => {
        if (target.trim() && !disabled) {
            onDeploy(target.trim());
            setTarget('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleDeploy();
        }
    };

    return (
        <section className="glass rounded-lg p-6 mb-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
                <Target className="w-5 h-5 text-cyan-400" />
                <div>
                    <h2 className="text-lg font-semibold text-slate-100">Target Acquisition</h2>
                    <p className="text-sm text-slate-400">Deploy Multi-Agent System</p>
                </div>
            </div>

            {disabled && (
                <div className="mb-4 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm text-amber-300">
                        ⚠️ Please complete your profile first before deploying agents
                    </p>
                </div>
            )}

            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        id="target-input"
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={disabled}
                        placeholder="e.g., 'Machine Learning' or 'Bioinformatics at Stanford'"
                        className="w-full px-4 py-3 pl-4 bg-slate-800/50 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                <button
                    onClick={handleDeploy}
                    disabled={!target.trim() || disabled}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-cyan-500/50"
                >
                    <Rocket className="w-5 h-5" />
                    <span>Deploy Agents</span>
                </button>
            </div>
        </section>
    );
}
