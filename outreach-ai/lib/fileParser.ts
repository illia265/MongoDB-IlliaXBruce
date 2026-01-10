// @ts-ignore
const pdf = require('pdf-parse');
import mammoth from 'mammoth';

export async function parseFile(file: File): Promise<string> {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    try {
        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
            return await parsePDF(file);
        } else if (
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            fileName.endsWith('.docx')
        ) {
            return await parseDOCX(file);
        } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
            return await parseTXT(file);
        } else {
            throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT files.');
        }
    } catch (error) {
        console.error('Error parsing file:', error);
        throw new Error('Failed to parse file. Please ensure it is a valid CV document.');
    }
}

async function parsePDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    return data.text;
}

async function parseDOCX(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

async function parseTXT(file: File): Promise<string> {
    return await file.text();
}

export function validateCV(text: string): { valid: boolean; error?: string } {
    if (!text || text.trim().length < 100) {
        return {
            valid: false,
            error: 'CV text is too short. Please upload a complete CV document.',
        };
    }

    // Basic validation - check for common CV keywords
    const cvKeywords = [
        'experience',
        'education',
        'skills',
        'university',
        'degree',
        'work',
        'project',
    ];

    const textLower = text.toLowerCase();
    const foundKeywords = cvKeywords.filter((keyword) => textLower.includes(keyword));

    if (foundKeywords.length < 2) {
        return {
            valid: false,
            error: 'Document does not appear to be a CV. Please upload your resume/CV.',
        };
    }

    return { valid: true };
}
