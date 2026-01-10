import { NextRequest, NextResponse } from 'next/server';
import { getCollection, Collections } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Job, Prospect, ResearchAnalysis } from '@/types/types';

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY;

interface Publication {
    title: string;
    year: number;
    summary: string;
    relevance: string;
    url?: string;
    verified?: boolean;
    verifiedUrl?: string;
}

interface SemanticScholarPaper {
    paperId: string;
    title: string;
    year: number;
    authors: { name: string }[];
    url: string;
}

/**
 * Agent 3: Find and Verify Publications
 * Uses Semantic Scholar API to verify papers exist and match the author
 */
export async function POST(request: NextRequest) {
    let jobId: string | undefined;

    try {
        const body = await request.json();
        jobId = body.jobId;
        const prospects: Prospect[] = body.prospects || [];

        const jobsCollection = await getCollection<Job>(Collections.JOBS);

        // Update job status
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) } as any,
            {
                $set: {
                    status: 'AGENT_3_VERIFYING_PUBLICATIONS',
                    currentAgent: 3,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 3,
                        message: 'Agent 3 initialized. Finding and verifying publications...',
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        const researchAnalyses: ResearchAnalysis[] = [];

        // Process each prospect
        for (const prospect of prospects) {
            // Search for real publications using Semantic Scholar
            const verifiedPubs = await findVerifiedPublications(prospect.name, prospect.researchAreas);

            if (verifiedPubs.length > 0) {
                // Generate analysis for verified publications
                const analysis = await generateAnalysisFromPubs(prospect, verifiedPubs);
                researchAnalyses.push(analysis);
            }
        }

        // Count verified publications
        let verifiedCount = 0;
        let totalCount = 0;
        for (const analysis of researchAnalyses) {
            for (const pub of analysis.publications) {
                totalCount++;
                if (pub.verified) verifiedCount++;
            }
        }

        // Update job with verified analyses
        await jobsCollection.updateOne(
            { _id: new ObjectId(jobId) } as any,
            {
                $set: {
                    researchAnalyses,
                    updatedAt: new Date(),
                },
                $push: {
                    logs: {
                        agent: 3,
                        message: `Found ${verifiedCount} verified publications for ${researchAnalyses.length} prospects`,
                        timestamp: new Date(),
                    } as any,
                },
            }
        );

        // Trigger Agent 4 (Email drafting)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/agents/agent4`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId }),
        }).catch(console.error);

        return NextResponse.json({ success: true, researchAnalyses, verifiedCount, totalCount });
    } catch (error: any) {
        console.error('Agent 3 error:', error);

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

/**
 * Search Semantic Scholar for real publications by author
 */
async function findVerifiedPublications(
    authorName: string,
    researchAreas: string[]
): Promise<Publication[]> {
    const publications: Publication[] = [];

    try {
        // Search Semantic Scholar by author name
        const searchQuery = encodeURIComponent(authorName);
        const response = await fetch(
            `https://api.semanticscholar.org/graph/v1/author/search?query=${searchQuery}&limit=3`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            console.error('Semantic Scholar author search failed:', response.status);
            return publications;
        }

        const authorData = await response.json();
        const authors = authorData.data || [];

        if (authors.length === 0) {
            console.log('No authors found for:', authorName);
            return publications;
        }

        // Get papers for the first matching author
        const authorId = authors[0].authorId;
        const papersResponse = await fetch(
            `https://api.semanticscholar.org/graph/v1/author/${authorId}/papers?fields=title,year,authors,url&limit=5`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!papersResponse.ok) {
            console.error('Semantic Scholar papers fetch failed:', papersResponse.status);
            return publications;
        }

        const papersData = await papersResponse.json();
        const papers: SemanticScholarPaper[] = papersData.data || [];

        // Convert to our publication format
        for (const paper of papers.slice(0, 3)) {
            if (paper.title && paper.year) {
                publications.push({
                    title: paper.title,
                    year: paper.year,
                    summary: `Research paper by ${authorName}`,
                    relevance: 'High - verified publication from Semantic Scholar',
                    url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
                    verified: true,
                    verifiedUrl: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
                });
            }
        }

        return publications;
    } catch (error) {
        console.error('Semantic Scholar error:', error);
        return publications;
    }
}

/**
 * Generate research analysis from verified publications
 */
async function generateAnalysisFromPubs(
    prospect: Prospect,
    publications: Publication[]
): Promise<ResearchAnalysis> {
    // Extract key themes from publication titles
    const allWords = publications
        .map(p => p.title.toLowerCase())
        .join(' ')
        .split(/\s+/)
        .filter(w => w.length > 5);

    const wordFreq: Record<string, number> = {};
    for (const word of allWords) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
    }

    const keyThemes = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

    // Add research areas as themes if available
    const themes = [...new Set([...keyThemes, ...prospect.researchAreas.slice(0, 2)])].slice(0, 5);

    return {
        prospectId: prospect._id || '',
        prospectName: prospect.name,
        publications,
        keyThemes: themes.length > 0 ? themes : ['Research', 'Analysis', 'Study'],
        talkingPoints: publications.map(p => `Their work on "${p.title}" is relevant to your interests`),
        analyzedBy: 'agent_2', // Keep for compatibility
    };
}
