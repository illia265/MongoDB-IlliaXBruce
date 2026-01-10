import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getCollection, Collections } from '@/lib/mongodb';
import { parseFile, validateCV } from '@/lib/fileParser';
import { MongoClient } from 'mongodb';
import type { UserProfile, UploadResponse } from '@/types/types';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'outreach_ai';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();

        const formData = await request.formData();
        const file = formData.get('cv') as File;
        const bio = formData.get('bio') as string || 'Researcher';
        const researchInterests = formData.get('researchInterests') as string || 'General';

        if (!file) {
            return NextResponse.json(
                { success: false, message: 'No file uploaded' },
                { status: 400 }
            );
        }

        // Parse the CV file
        const cvText = await parseFile(file);

        // Validate CV content
        const validation = validateCV(cvText);
        if (!validation.valid) {
            return NextResponse.json(
                { success: false, message: validation.error },
                { status: 400 }
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

        // Store in MongoDB
        const profilesCollection = await getCollection<UserProfile>(Collections.PROFILES);

        const profile: Omit<UserProfile, '_id'> = {
            userId, // Link to user if authenticated
            bio: bio.trim(),
            researchInterests: researchInterests.trim(),
            cvText,
            cvFileName: file.name,
            uploadedAt: new Date(),
        };

        const result = await profilesCollection.insertOne(profile as any);

        const response: UploadResponse = {
            success: true,
            profileId: result.insertedId.toString(),
            message: 'CV uploaded and profile created successfully',
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { success: false, message: error.message || 'Failed to upload CV' },
            { status: 500 }
        );
    }
}
