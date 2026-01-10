import OpenAI from 'openai';
import type { Prospect, ResearchAnalysis, CVInsight } from '@/types/types';

// Agent Model Configuration
// Agent Model Configuration
// Agent Model Configuration
const AGENT_MODELS = {
    // Verified Model IDs from your account (Jan 2026)
    // Using Llama 3.3 70B for all agents as it is available and highly capable
    AGENT_1: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    AGENT_2: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    AGENT_3: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    AGENT_4: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
};

// Initialize OpenAI client compatible with Fireworks AI
const apiKey = process.env.FIREWORKS_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.FIREWORKS_API_KEY
    ? 'https://api.fireworks.ai/inference/v1'
    : undefined;

const openai = apiKey
    ? new OpenAI({ apiKey, baseURL })
    : null;

const USE_MOCK = !openai;

/**
 * Agent 1: Find prospects in the research field
 */
export async function findProspects(
    researchField: string,
    targetInstitution?: string
): Promise<Prospect[]> {
    if (USE_MOCK) {
        // Mock data for demo
        return [
            {
                name: 'Dr. Sarah Chen',
                title: 'Associate Professor',
                institution: targetInstitution || 'Stanford University',
                email: 's.chen@stanford.edu',
                profileUrl: 'https://profiles.stanford.edu/sarah-chen',
                researchAreas: [researchField, 'Machine Learning', 'Computer Vision'],
                foundBy: 'agent_1',
            },
            {
                name: 'Prof. Michael Rodriguez',
                title: 'Professor',
                institution: targetInstitution || 'MIT',
                profileUrl: 'https://www.mit.edu/~rodriguez',
                researchAreas: [researchField, 'Neural Networks', 'AI Safety'],
                foundBy: 'agent_1',
            },
        ];
    }

    // Real AI implementation
    const prompt = `Find 2-3 prominent professors or researchers in the field of "${researchField}"${targetInstitution ? ` at ${targetInstitution}` : ''
        }. Return as JSON array with fields: name, title, institution, researchAreas.`;

    const response = await openai!.chat.completions.create({
        model: AGENT_MODELS.AGENT_1,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
    });

    // Parse AI response to Prospect format
    const content = response.choices[0].message.content || '[]';
    console.log('AGENT 1 RAW RESPONSE:', content); // Debug log

    try {
        // Handle potential wrapper objects like { "prospects": [...] }
        const parsed = JSON.parse(content);
        const prospects = Array.isArray(parsed)
            ? parsed
            : (parsed.prospects || parsed.professors || parsed.researchers || []);
        return prospects.map((p: any) => ({ ...p, foundBy: 'agent_1' }));
    } catch (e) {
        console.error('Failed to parse Agent 1 response:', content);
        return [];
    }
}

/**
 * Agent 2: Analyze publications for a prospect
 */
export async function analyzePublications(
    prospect: Prospect
): Promise<ResearchAnalysis> {
    if (USE_MOCK) {
        // Mock data for demo
        return {
            prospectName: prospect.name,
            prospectId: prospect._id || '',
            publications: [
                {
                    title: 'Advances in Deep Learning for Medical Imaging',
                    year: 2025,
                    summary:
                        'Proposes novel architecture for analyzing medical scans using transformer-based models',
                    relevance: 'Highly relevant - combines AI with practical healthcare applications',
                },
                {
                    title: 'Ethical Considerations in AI Deployment',
                    year: 2024,
                    summary: 'Discusses frameworks for responsible AI implementation in sensitive domains',
                    relevance: 'Shows commitment to AI safety and ethics',
                },
            ],
            keyThemes: ['Medical AI', 'Computer Vision', 'Ethical AI', 'Deep Learning'],
            talkingPoints: [
                'Recent work on medical imaging aligns with healthcare AI trends',
                'Strong focus on ethical AI deployment',
                'Published in top-tier venues (NeurIPS, ICML)',
            ],
            analyzedBy: 'agent_2',
        };
    }

    // Real AI implementation
    const prompt = `Analyze recent publications for ${prospect.name}, a ${prospect.title} at ${prospect.institution} researching ${prospect.researchAreas.join(', ')}. Find 2-3 recent papers and extract: title, year, summary, relevance, key themes, and talking points for outreach. Return JSON.`;

    const response = await openai!.chat.completions.create({
        model: AGENT_MODELS.AGENT_2,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    console.log('AGENT 2 RAW RESPONSE:', content); // Debug log

    let analysis;
    try {
        analysis = JSON.parse(content);
    } catch (e) {
        console.error('Failed to parse Agent 2 response', e);
        analysis = {};
    }

    return {
        prospectId: prospect._id,
        prospectName: prospect.name,
        publications: analysis.publications || analysis.papers || [],
        keyThemes: analysis.keyThemes || analysis.themes || [],
        talkingPoints: analysis.talkingPoints || [],
        analyzedBy: 'agent_2'
    } as ResearchAnalysis;
}

/**
 * Agent 3: Analyze user's CV
 */
export async function analyzeCV(
    cvText: string,
    researchField: string
): Promise<CVInsight> {
    if (USE_MOCK) {
        // Mock data for demo
        return {
            profileId: '',
            skills: ['Python', 'Machine Learning', 'Data Analysis', 'React', 'MongoDB'],
            experience: [
                {
                    role: 'Research Intern',
                    organization: 'AI Lab',
                    highlights: [
                        'Developed ML models for image classification',
                        'Published paper at undergraduate research conference',
                    ],
                },
                {
                    role: 'Full Stack Developer',
                    organization: 'Tech Startup',
                    highlights: ['Built web applications with React and Node.js', 'Won 2 hackathons'],
                },
            ],
            achievements: [
                'Dean\'s List for 3 consecutive semesters',
                'Winner of University Hackathon 2024',
                'Published research paper on neural networks',
            ],
            relevantStrengths: [
                `Strong programming skills in Python and ML libraries`,
                `Demonstrated research experience in ${researchField}`,
                `Proven track record of completing projects`,
            ],
            analyzedBy: 'agent_3',
        };
    }

    // Real AI implementation
    const prompt = `Analyze this CV for someone interested in ${researchField} research. Extract: skills, experience (role, organization, highlights), achievements, and relevant strengths for academic outreach.\n\nCV:\n${cvText.substring(0, 10000)}\n\nReturn JSON.`;

    const response = await openai!.chat.completions.create({
        model: AGENT_MODELS.AGENT_3,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    console.log('AGENT 3 RAW RESPONSE:', content); // Debug log

    let insights;
    try {
        insights = JSON.parse(content);
    } catch (e) {
        console.error('Failed to parse Agent 3 response', e);
        insights = {};
    }

    return {
        profileId: '', // Will be set by caller
        skills: insights.skills || [],
        experience: insights.experience || [],
        achievements: insights.achievements || [],
        relevantStrengths: insights.relevantStrengths || insights.strengths || [],
        analyzedBy: 'agent_3'
    };
}

/**
 * Agent 4: Generate personalized email
 */
export async function generateEmail(
    prospect: Prospect,
    research: ResearchAnalysis,
    cvInsights: CVInsight,
    userBio: string
): Promise<{ subject: string; body: string }> {
    if (USE_MOCK) {
        // Mock data for demo
        return {
            subject: `Research Opportunity - Interest in ${prospect.researchAreas[0]}`,
            body: `Dear ${prospect.name},
${userBio || 'I am a motivated student with a strong interest in research.'}

I have been following your recent work on "${research.publications[0]?.title}" with great interest. Your research on ${research.keyThemes[0]} resonates strongly with my background in ${cvInsights.skills.slice(0, 3).join(', ')}.

During my time as ${cvInsights.experience[0]?.role} at ${cvInsights.experience[0]?.organization}, I ${cvInsights.experience[0]?.highlights[0]}. This experience, combined with my ${cvInsights.achievements[0]}, has prepared me to contribute meaningfully to research in this area.

I am particularly drawn to your work because ${research.talkingPoints[0]}. I believe my skills in ${cvInsights.relevantStrengths[0]} would allow me to make valuable contributions to your lab.

Would you be open to a brief conversation about potential research opportunities? I would be grateful for the chance to discuss how I might contribute to your ongoing work.

Thank you for considering my inquiry.

Best regards,
[Your Name]`,
        };
    }

    // Real AI implementation
    const prompt = `Write a personalized academic outreach email to ${prospect.name} (${prospect.title} at ${prospect.institution}).

Context:
- Their research: ${JSON.stringify(research)}
- Student's CV insights: ${JSON.stringify(cvInsights)}
- Student's bio: ${userBio}

Write a professional, genuine email that:
1. References specific publications
2. Connects student's experience to professor's work
3. Shows genuine interest
4. Requests a conversation

Return as JSON: { subject: string, body: string }`;

    const response = await openai!.chat.completions.create({
        model: AGENT_MODELS.AGENT_4,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';
    return JSON.parse(content);
}

export const isUsingMockData = USE_MOCK;
