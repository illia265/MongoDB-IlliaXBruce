import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getCollection, Collections } from '@/lib/mongodb';
import { ObjectId, MongoClient } from 'mongodb';
import type { Job, DeployResponse, UserProfile } from '@/types/types';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'outreach_ai';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();
        const body = await request.json();
        const { profileId, targetField } = body;

        if (!profileId || !targetField) {
            return NextResponse.json(
                { success: false, message: 'Profile ID and target field are required' },
                { status: 400 }
            );
        }

        // Verify profile exists
        const profilesCollection = await getCollection<UserProfile>(Collections.PROFILES);
        const profile = await profilesCollection.findOne({ _id: new ObjectId(profileId) } as any);

        if (!profile) {
            return NextResponse.json(
                { success: false, message: 'Profile not found' },
                { status: 404 }
            );
        }

        // Get user ID if authenticated
        let userId: string | undefined;
        if (session?.user?.email) {
            const client = new MongoClient(MONGODB_URI);
            await client.connect();
            const db = client.db(MONGODB_DB_NAME);
            const user = await db.collection('users').findOne({ email: session.user.email });
            if (user) userId = user._id.toString();
            await client.close();
        }

        // Create new job
        const jobsCollection = await getCollection<Job>(Collections.JOBS);

        const job = {
            userId, // Link to user if authenticated
            profileId,
            targetField: targetField.trim(),
            status: 'PENDING',
            currentAgent: 0,
            prospects: [],
            researchAnalyses: [],
            cvInsights: null,
            emailDrafts: [],
            logs: [
                {
                    agent: 0,
                    message: 'Job created. Initializing agent workflow...',
                    timestamp: new Date(),
                },
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await jobsCollection.insertOne(job as any);
        const jobId = result.insertedId.toString();

        // Trigger agent workflow asynchronously
        triggerAgentWorkflow(jobId, profileId, targetField).catch(console.error);

        const response: DeployResponse = {
            success: true,
            jobId,
            message: 'Agents deployed successfully',
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Deploy error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Failed to deploy agents' },
            { status: 500 }
        );
    }
}

// Trigger the 4-agent workflow
async function triggerAgentWorkflow(jobId: string, profileId: string, targetField: string) {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Agent 1: Analyze CV (runs first)
        await fetch(`${baseUrl}/api/agents/agent1`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId, profileId, targetField }),
        });

        // Agents 2, 3, 4 will be triggered in sequence by each previous agent
    } catch (error) {
        console.error('Workflow trigger error:', error);
    }
}
