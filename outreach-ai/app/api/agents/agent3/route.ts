import { NextRequest, NextResponse } from 'next/server';
import { getCollection, Collections } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { analyzeCV } from '@/lib/aiService';
import type { Job, UserProfile, CVInsight } from '@/types/types';

export async function POST(request: NextRequest) {
    let jobId: string | undefined;

    try {
        const body = await request.json();
        jobId = body.jobId;

        const jobsCollection = await getCollection<Job>(Collections.JOBS);
        const profilesCollection = await getCollection<UserProfile>(Collections.PROFILES);
        const insightsCollection = await getCollection<CVInsight>(Collections.CV_INSIGHTS);

        // Get job to find profile
        const job = await jobsCollection.findOne({ _id: new ObjectId(jobId) });
        if (!job) {
            throw new Error('Job not found');
        }

        // Update job status
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) },
            {
                $set: {
                    status: 'AGENT_3_ANALYZING_CV',
                    currentAgent: 3,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 3,
                        message: 'Agent 3 analyzing your CV and extracting relevant skills...',
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        // Get user profile
        const profile = await profilesCollection.findOne({ _id: new ObjectId(job.profileId) });
        if (!profile) {
            throw new Error('Profile not found');
        }

        // Simulate work
        await new Promise((resolve) => setTimeout(resolve, 2500));

        // Analyze CV using AI
        const cvInsights = await analyzeCV(profile.cvText, job.targetField);
        cvInsights.profileId = job.profileId;

        // Store insights in database
        await insightsCollection.insertOne(cvInsights as any);

        // Update job with CV insights
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) },
            {
                $set: {
                    cvInsights,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 3,
                        message: `Extracted ${cvInsights.skills.length} skills and ${cvInsights.experience.length} experiences from CV`,
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        // Trigger Agent 4
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/agents/agent4`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId }),
        }).catch(console.error);

        return NextResponse.json({ success: true, cvInsights });
    } catch (error: any) {
        console.error('Agent 3 error:', error);

        if (jobId) {
            const jobsCollection = await getCollection<Job>(Collections.JOBS);
            await jobsCollection.updateOne(
                { _id: new ObjectId(jobId) },
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
