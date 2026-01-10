import { NextRequest, NextResponse } from 'next/server';
import { getCollection, Collections } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { analyzePublications } from '@/lib/aiService';
import type { Job, Prospect, ResearchAnalysis } from '@/types/types';

export async function POST(request: NextRequest) {
    let jobId: string | undefined;

    try {
        const body = await request.json();
        jobId = body.jobId;
        const { prospects } = body;

        const jobsCollection = await getCollection<Job>(Collections.JOBS);
        const analysesCollection = await getCollection<ResearchAnalysis>(Collections.RESEARCH_ANALYSES);

        // Update job status
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) },
            {
                $set: {
                    status: 'AGENT_2_ANALYZING_PUBLICATIONS',
                    currentAgent: 2,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 2,
                        message: 'Agent 2 analyzing publications and research work...',
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        // Simulate work
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Analyze publications for each prospect
        const analyses: ResearchAnalysis[] = [];

        for (const prospect of prospects) {
            await jobsCollection.updateOne(
                { _id: new ObjectId(jobId) },
                {
                    $push: {
                        logs: {
                            agent: 2,
                            message: `Analyzing publications for ${prospect.name}...`,
                            timestamp: new Date(),
                        } as any,
                    },
                }
            );

            const analysis = await analyzePublications(prospect);
            analyses.push(analysis);

            // Small delay between prospects
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Store analyses in database
        if (analyses.length > 0) {
            await analysesCollection.insertMany(analyses as any[]);
        }

        // Update job with analyses
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) },
            {
                $set: {
                    researchAnalyses: analyses,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 2,
                        message: `Completed analysis of ${analyses.length} prospects' research work`,
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        // Trigger Agent 3
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/agents/agent3`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId }),
        }).catch(console.error);

        return NextResponse.json({ success: true, analyses });
    } catch (error: any) {
        console.error('Agent 2 error:', error);

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
