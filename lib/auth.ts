import type { NextAuthOptions } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { db } from '@/lib/db';
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const hasGoogle = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const hasEmail = () =>
  Boolean(process.env.EMAIL_SERVER && process.env.EMAIL_FROM) ||
  Boolean(process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD && process.env.EMAIL_FROM);

const DrizzleAdapter: any = {
  async createUser(user: any) {
    const id = crypto.randomUUID();
    console.log('📦 DrizzleAdapter: Creating user', { id, email: user.email });
    const [newUser] = await db.insert(users).values({ ...user, id }).returning();
    return newUser;
  },
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  },
  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || null;
  },
  async getUserByAccount({ providerAccountId, provider }: any) {
    console.log('🔍 DrizzleAdapter: getUserByAccount', { provider, providerAccountId });
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)));
    if (!account) return null;
    const [user] = await db.select().from(users).where(eq(users.id, account.userId!));
    return user || null;
  },
  async updateUser(user: any) {
    const [updatedUser] = await db.update(users).set(user).where(eq(users.id, user.id!)).returning();
    return updatedUser;
  },
  async deleteUser(userId: string) {
    await db.delete(users).where(eq(users.id, userId));
  },
  async linkAccount(account: any) {
    const id = crypto.randomUUID();
    console.log('🔗 DrizzleAdapter: linkAccount', { id, provider: account.provider, userId: account.userId });
    await db.insert(accounts).values({ ...account, id });
  },
  async unlinkAccount({ providerAccountId, provider }: any) {
    await db
      .delete(accounts)
      .where(and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)));
  },
  async createSession(session: any) {
    const id = crypto.randomUUID();
    console.log('🎫 DrizzleAdapter: createSession', { id, userId: session.userId });
    const [newSession] = await db.insert(sessions).values({ ...session, id }).returning();
    return newSession;
  },
  async getSessionAndUser(sessionToken: string) {
    const [session] = await db.select().from(sessions).where(eq(sessions.sessionToken, sessionToken));
    if (!session) return null;
    const [user] = await db.select().from(users).where(eq(users.id, session.userId!));
    return { session, user };
  },
  async updateSession(session: any) {
    const [updatedSession] = await db
      .update(sessions)
      .set(session)
      .where(eq(sessions.sessionToken, session.sessionToken))
      .returning();
    return updatedSession;
  },
  async deleteSession(sessionToken: string) {
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
  },
  async createVerificationToken(token: any) {
    const [newToken] = await db.insert(verificationTokens).values(token).returning();
    return newToken;
  },
  async useVerificationToken({ identifier, token }: any) {
    const [existingToken] = await db
      .select()
      .from(verificationTokens)
      .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, token)));
    if (!existingToken) return null;
    await db
      .delete(verificationTokens)
      .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, token)));
    return existingToken;
  },
};

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter,
  providers: [
    ...(hasGoogle()
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          }),
        ]
      : []),
    ...(hasEmail()
      ? [
          EmailProvider({
            server:
              process.env.EMAIL_SERVER ??
              ({
                host: process.env.EMAIL_SERVER_HOST,
                port: process.env.EMAIL_SERVER_PORT ? Number(process.env.EMAIL_SERVER_PORT) : 587,
                auth: {
                  user: process.env.EMAIL_SERVER_USER,
                  pass: process.env.EMAIL_SERVER_PASSWORD,
                },
              } as any),
            from: process.env.EMAIL_FROM as string,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('⚠️ Login fallido: Faltan credenciales');
          return null;
        }
        
        const [user] = await db.select().from(users).where(eq(users.email, credentials.email.toLowerCase()));
        
        if (!user) {
          console.log('⚠️ Login fallido: Usuario no encontrado:', credentials.email);
          return null;
        }

        if (!user.password) {
          console.log('⚠️ Login fallido: El usuario no tiene contraseña (posiblemente registro vía Google):', credentials.email);
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        
        if (!isPasswordValid) {
          console.log('⚠️ Login fallido: Contraseña incorrecta para:', credentials.email);
          return null;
        }

        console.log('✅ Login exitoso:', user.email);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: { 
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login', // Redirigir errores aquí también
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
        console.log('🔑 JWT Callback: User logged in', { id: user.id, email: user.email });
      }
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        console.log('👤 Session Callback: Session created for', { id: token.id });
      }
      return session;
    },
  },
};
