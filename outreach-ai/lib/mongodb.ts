import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
    throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'outreach_ai';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
    // Return cached connection if available
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    // Create new connection
    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);

    // Cache the connection
    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

export async function getCollection<T = any>(collectionName: string) {
    const { db } = await connectToDatabase();
    return db.collection<T>(collectionName);
}

// Collection names
export const Collections = {
    PROFILES: 'profiles',
    JOBS: 'jobs',
    PROSPECTS: 'prospects',
    RESEARCH_ANALYSES: 'research_analyses',
    CV_INSIGHTS: 'cv_insights',
    EMAIL_DRAFTS: 'email_drafts',
} as const;
