import { NextRequest, NextResponse } from 'next/server';
import { getCollection, Collections } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { findProspects } from '@/lib/aiService';
import type { Job, Prospect } from '@/types/types';

/**
 * Agent 2: Find Prospects
 * Searches for professors and researchers in the target field
 */
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
            { _id: new ObjectId(jobId) } as any,
            {
                $set: {
                    status: 'AGENT_2_FINDING_PROSPECTS',
                    currentAgent: 2,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 2,
                        message: 'Agent 2 initialized. Searching for professors...',
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        // Find prospects using AI
        const prospects = await findProspects(targetField);

        if (!prospects || prospects.length === 0) {
            throw new Error('No prospects found. Please try a different target field.');
        }

        // Store prospects in database
        const prospectInserts = await prospectsCollection.insertMany(prospects as any[]);
        const prospectIds = Object.values(prospectInserts.insertedIds).map((id) => id.toString());

        const prospectsWithIds = prospects.map((p: any, idx: number) => ({
            ...p,
            _id: prospectIds[idx],
        }));

        // Update job with prospects
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) } as any,
            {
                $set: {
                    prospects: prospectsWithIds as any,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 2,
                        message: `Found ${prospects.length} potential prospects in ${targetField}`,
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        // Trigger Agent 3 (Verify Publications)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/agents/agent3`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId, prospects: prospectsWithIds }),
        }).catch(console.error);

        return NextResponse.json({ success: true, prospects: prospectsWithIds });
    } catch (error: any) {
        console.error('Agent 2 error:', error);

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
