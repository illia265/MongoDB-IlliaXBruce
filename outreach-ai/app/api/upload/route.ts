import { NextRequest, NextResponse } from 'next/server';
import { getCollection, Collections } from '@/lib/mongodb';
import { parseFile, validateCV } from '@/lib/fileParser';
import type { UserProfile, UploadResponse } from '@/types/types';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('cv') as File;
        const bio = formData.get('bio') as string;
        const researchInterests = formData.get('researchInterests') as string;

        if (!file) {
            return NextResponse.json(
                { success: false, message: 'No file uploaded' },
                { status: 400 }
            );
        }

        if (!bio || !researchInterests) {
            return NextResponse.json(
                { success: false, message: 'Bio and research interests are required' },
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

        // Store in MongoDB
        const profilesCollection = await getCollection<UserProfile>(Collections.PROFILES);

        const profile: Omit<UserProfile, '_id'> = {
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
