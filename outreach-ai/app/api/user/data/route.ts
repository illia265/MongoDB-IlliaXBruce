import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'outreach_ai';

export async function GET() {
    try {
        const session = await getServerSession();

        if (!session?.user?.email) {
            return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
        }

        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db(MONGODB_DB_NAME);

        // Find user by email
        const user = await db.collection('users').findOne({ email: session.user.email });

        if (!user) {
            await client.close();
            return NextResponse.json({ success: true, profileId: null, jobs: [] });
        }

        // Find user's profile
        const profile = await db.collection('profiles').findOne({ userId: user._id.toString() });

        // Find user's jobs (most recent first)
        const jobs = await db.collection('jobs')
            .find({ userId: user._id.toString() })
            .sort({ createdAt: -1 })
            .limit(20)
            .toArray();

        await client.close();

        return NextResponse.json({
            success: true,
            profileId: profile?._id?.toString() || null,
            cvFileName: profile?.cvFileName || null,
            jobs: jobs.map(job => ({
                ...job,
                _id: job._id.toString(),
                id: job._id.toString(),
            })),
        });
    } catch (error) {
        console.error('User data error:', error);
        return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
    }
}
