// Agent Status Types
export type AgentStatus =
  | 'PENDING'
  | 'AGENT_1_ANALYZING_CV'
  | 'AGENT_2_FINDING_PROSPECTS'
  | 'AGENT_3_VERIFYING_PUBLICATIONS'
  | 'AGENT_4_WRITING_EMAIL'
  | 'COMPLETE'
  | 'ERROR';

// User Profile
export interface UserProfile {
  _id?: string;
  bio: string;
  researchInterests: string;
  cvText: string;
  cvFileName: string;
  uploadedAt: Date;
}

// Prospect (found by Agent 1)
export interface Prospect {
  _id?: string;
  name: string;
  title: string;
  institution: string;
  email?: string;
  profileUrl?: string;
  researchAreas: string[];
  foundBy: 'agent_1';
}

// Research Analysis (by Agent 2)
export interface ResearchAnalysis {
  _id?: string;
  prospectId: string;
  prospectName: string;
  publications: {
    title: string;
    year: number;
    summary: string;
    relevance: string;
    url?: string;
    verified?: boolean;
    verifiedUrl?: string;
  }[];
  keyThemes: string[];
  talkingPoints: string[];
  analyzedBy: 'agent_2';
}

// CV Insights (by Agent 3)
export interface CVInsight {
  _id?: string;
  profileId: string;
  skills: string[];
  experience: {
    role: string;
    organization: string;
    highlights: string[];
  }[];
  achievements: string[];
  relevantStrengths: string[];
  analyzedBy: 'agent_3';
}

// Email Draft (by Agent 4)
export interface EmailDraft {
  _id?: string;
  jobId: string;
  prospectName: string;
  subject: string;
  body: string;
  personalizedElements: {
    publicationMention: string;
    cvMatch: string;
    sharedInterest: string;
  };
  generatedBy: 'agent_4';
  createdAt: Date;
}

// Job (tracks entire workflow)
export interface Job {
  _id?: string;
  id: string;
  profileId: string;
  targetField: string;
  status: AgentStatus;
  currentAgent: number; // 0-4

  // Agent outputs
  prospects: Prospect[];
  researchAnalyses: ResearchAnalysis[];
  cvInsights: CVInsight | null;
  emailDrafts: EmailDraft[];

  // Logs for each agent
  logs: {
    agent: number;
    message: string;
    timestamp: Date;
  }[];

  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

// Agent Communication Message
export interface AgentMessage {
  from: number; // agent number
  to: number; // agent number
  data: any;
  timestamp: Date;
}

// API Response Types
export interface UploadResponse {
  success: boolean;
  profileId: string;
  message: string;
}

export interface DeployResponse {
  success: boolean;
  jobId: string;
  message: string;
}

export interface JobStatusResponse {
  success: boolean;
  job: Job;
}
