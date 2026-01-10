import { NextRequest, NextResponse } from 'next/server';
import { getCollection, Collections } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { analyzeCV } from '@/lib/aiService';
import type { Job, UserProfile } from '@/types/types';

/**
 * Agent 1: Analyze CV (runs first)
 * Extracts skills, experience, and achievements from user's CV
 */
export async function POST(request: NextRequest) {
    let jobId: string | undefined;

    try {
        const body = await request.json();
        jobId = body.jobId;
        const { profileId, targetField } = body;

        const jobsCollection = await getCollection<Job>(Collections.JOBS);
        const profilesCollection = await getCollection<UserProfile>(Collections.PROFILES);

        // Update job status to CV analysis
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) } as any,
            {
                $set: {
                    status: 'AGENT_1_ANALYZING_CV',
                    currentAgent: 1,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 1,
                        message: 'Agent 1 initialized. Analyzing CV...',
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        // Get user profile with CV
        const profile = await profilesCollection.findOne({ _id: new ObjectId(profileId) } as any);
        if (!profile) {
            throw new Error('Profile not found');
        }

        // Analyze CV using AI
        const cvInsights = await analyzeCV(profile.cvText, targetField);
        cvInsights.profileId = profileId;

        // Update job with CV insights
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) } as any,
            {
                $set: {
                    cvInsights,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 1,
                        message: `Extracted ${cvInsights.skills.length} skills and ${cvInsights.experience.length} experiences from CV`,
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        // Trigger Agent 2 (Find Prospects)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/agents/agent2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId, targetField }),
        }).catch(console.error);

        return NextResponse.json({ success: true, cvInsights });
    } catch (error: any) {
        console.error('Agent 1 error:', error);

        if (jobId) {
            const jobsCollection = await getCollection<Job>(Collections.JOBS);
            await jobsCollection.updateOne(
                { _id: new ObjectId(jobId) } as any,
                {
                    $set: {
                        status: 'ERROR',
                        error: error.message,
                        updatedAt: new Date(),
                    },
                }
            );
        }

        return NextResponse.json(
            { success: false, message: error.message },
            { status: 500 }
        );
    }
}
