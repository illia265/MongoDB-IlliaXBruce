import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'outreach_ai';

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === 'google') {
                try {
                    const client = new MongoClient(MONGODB_URI);
                    await client.connect();
                    const db = client.db(MONGODB_DB_NAME);
                    const usersCollection = db.collection('users');

                    // Upsert user in database
                    await usersCollection.updateOne(
                        { googleId: account.providerAccountId },
                        {
                            $set: {
                                googleId: account.providerAccountId,
                                email: user.email,
                                name: user.name,
                                image: user.image,
                                updatedAt: new Date(),
                            },
                            $setOnInsert: {
                                createdAt: new Date(),
                            },
                        },
                        { upsert: true }
                    );

                    await client.close();
                } catch (error) {
                    console.error('Error saving user:', error);
                    return false;
                }
            }
            return true;
        },
        async session({ session, token }) {
            // Add user ID to session
            if (session.user) {
                (session.user as any).id = token.sub;
                (session.user as any).googleId = token.googleId;
            }
            return session;
        },
        async jwt({ token, account }) {
            if (account) {
                token.googleId = account.providerAccountId;
            }
            return token;
        },
    },
    pages: {
        signIn: '/',
    },
    secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
