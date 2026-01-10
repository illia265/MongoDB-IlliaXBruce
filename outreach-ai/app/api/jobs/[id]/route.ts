import { NextRequest, NextResponse } from 'next/server';
import { getCollection, Collections } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Job, JobStatusResponse } from '@/types/types';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const jobsCollection = await getCollection<Job>(Collections.JOBS);
        const job = await jobsCollection.findOne({ _id: new ObjectId(id) } as any);

        if (!job) {
            return NextResponse.json(
                { success: false, message: 'Job not found' },
                { status: 404 }
            );
        }

        // Add the ID field for frontend
        const jobWithId = {
            ...job,
            id: job._id?.toString() || id,
        };

        const response: JobStatusResponse = {
            success: true,
            job: jobWithId as Job,
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Job status error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Failed to get job status' },
            { status: 500 }
        );
    }
}
