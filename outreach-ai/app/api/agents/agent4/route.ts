import { NextRequest, NextResponse } from 'next/server';
import { getCollection, Collections } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { generateEmail } from '@/lib/aiService';
import type { Job, UserProfile, EmailDraft } from '@/types/types';

export async function POST(request: NextRequest) {
    let jobId: string | undefined;

    try {
        const body = await request.json();
        jobId = body.jobId;

        const jobsCollection = await getCollection<Job>(Collections.JOBS);
        const emailDraftsCollection = await getCollection<EmailDraft>(Collections.EMAIL_DRAFTS);
        const userProfilesCollection = await getCollection<UserProfile>(Collections.PROFILES);

        // Get job
        const job = await jobsCollection.findOne({ _id: new ObjectId(jobId) });
        if (!job) {
            throw new Error('Job not found');
        }

        // Update job status
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) },
            {
                $set: {
                    status: 'AGENT_4_WRITING_EMAIL',
                    currentAgent: 4,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 4,
                        message: 'Agent 4 reviewing analysis and drafting personalized emails...',
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        // Get user profile for bio
        const userProfile = await userProfilesCollection.findOne({ _id: new ObjectId(job.profileId) });
        const userBio = userProfile?.bio || '';

        // Simulate work
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Check if we have necessary data
        if (!job.prospects || !job.researchAnalyses || !job.cvInsights) {
            throw new Error('Missing required data from previous agents');
        }

        const emailDrafts: EmailDraft[] = [];

        // Generate email for each prospect
        for (let i = 0; i < job.prospects.length; i++) {
            const prospect = job.prospects[i];
            const research = job.researchAnalyses.find(r => r.prospectId === prospect._id);

            if (!research) continue;

            await jobsCollection.updateOne(
                { _id: new ObjectId(jobId) },
                {
                    $push: {
                        logs: {
                            agent: 4,
                            message: `Drafting email to ${prospect.name}...`,
                            timestamp: new Date(),
                        } as any,
                    },
                }
            );

            const emailContent = await generateEmail(prospect, research, job.cvInsights as any, userBio);

            const draft: EmailDraft = {
                jobId,
                prospectName: prospect.name,
                subject: emailContent.subject,
                body: emailContent.body,
                personalizedElements: {
                    publicationMention: research.publications?.[0]?.title || 'your recent work',
                    cvMatch: job.cvInsights?.relevantStrengths?.[0] || 'background',
                    sharedInterest: research.keyThemes?.[0] || 'research',
                },
                generatedBy: 'agent_4',
                createdAt: new Date(),
            };

            emailDrafts.push(draft);

            // Small delay
            await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        // Store drafts
        if (emailDrafts.length > 0) {
            await emailDraftsCollection.insertMany(emailDrafts as any[]);
        }

        // Complete job
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) },
            {
                $set: {
                    status: 'COMPLETE',
                    currentAgent: 4,
                    emailDrafts,
                    completedAt: new Date(),
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 4,
                        message: `Successfully drafted ${emailDrafts.length} personalized emails. Job complete!`,
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        return NextResponse.json({ success: true, emailDrafts });
    } catch (error: any) {
        console.error('Agent 4 error:', error);

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
