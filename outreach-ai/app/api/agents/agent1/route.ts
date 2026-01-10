import { NextRequest, NextResponse } from 'next/server';
import { getCollection, Collections } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { findProspects } from '@/lib/aiService';
import type { Job, Prospect } from '@/types/types';

export async function POST(request: NextRequest) {
    let jobId: string | undefined;

    try {
        const body = await request.json();
        jobId = body.jobId;
        const { targetField } = body;

        const jobsCollection = await getCollection<Job>(Collections.JOBS);
        const prospectsCollection = await getCollection<Prospect>(Collections.PROSPECTS);

        // Update job status
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) },
            {
                $set: {
                    status: 'AGENT_1_FINDING_PROSPECTS',
                    currentAgent: 1,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 1,
                        message: 'Agent 1 initialized. Searching for professors and researchers...',
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        // Simulate work (in real app, this would be web scraping/API calls)
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Find prospects using AI
        const prospects = await findProspects(targetField);

        // Store prospects in database
        if (!prospects || prospects.length === 0) {
            throw new Error('No prospects found by AI. Please try a different target field or try again.');
        }

        const prospectInserts = await prospectsCollection.insertMany(prospects as any[]);
        const prospectIds = Object.values(prospectInserts.insertedIds).map((id) => id.toString());

        // Update prospects with their IDs
        const prospectsWithIds = prospects.map((p, idx) => ({
            ...p,
            _id: prospectIds[idx],
        }));

        // Log findings
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) },
            {
                $set: {
                    prospects: prospectsWithIds,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 1,
                        message: `Found ${prospects.length} potential prospects in ${targetField}`,
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        // Trigger Agent 2
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/agents/agent2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId, prospects: prospectsWithIds }),
        }).catch(console.error);

        return NextResponse.json({ success: true, prospects: prospectsWithIds });
    } catch (error: any) {
        console.error('Agent 1 error:', error);

        // Update job with error
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
