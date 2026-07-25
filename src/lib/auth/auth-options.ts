import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import AzureADProvider from 'next-auth/providers/azure-ad';
import bcrypt from 'bcryptjs';
import sql from 'mssql';
import { getPool } from '@/lib/db/clients/azure-sql';

const SESSION_MAX_AGE_SEC = 24 * 60 * 60; // 24 hours

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "admin",
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const emailNorm = credentials.email.trim().toLowerCase();

        try {
          const pool = await getPool();
          const result = await pool
            .request()
            .input('email', sql.NVarChar(255), emailNorm)
            .query<{
              id: number;
              name: string;
              email: string;
              password_hash: string;
              role: string;
              is_active: boolean | number | null;
            }>(`
              SELECT id, name, email, password_hash, role, is_active
              FROM admin_users
              WHERE LOWER(LTRIM(RTRIM(email))) = @email
            `);

          const row = result.recordset[0];
          if (!row) {
            return null;
          }

          const active =
            row.is_active === true ||
            row.is_active === 1 ||
            (Buffer.isBuffer(row.is_active) && row.is_active[0] === 1);
          if (!active) {
            return null;
          }

          const match = await bcrypt.compare(
            credentials.password,
            row.password_hash
          );
          if (!match) {
            return null;
          }

          return {
            id: String(row.id),
            name: row.name,
            email: row.email,
            role: row.role,
          };
        } catch {
          return null;
        }
      },
    }),

    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_SEC,
  },
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.name = user.name;
        token.email = user.email;

        // Admin users only
        if (account?.provider === 'admin') {
          token.id = (user as any).id;
          token.role = (user as any).role;
        }

        token.provider = account?.provider;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.id) {
          session.user.id = token.id as string;
        }

        if (token.role) {
          session.user.role = token.role as string;
        }
        session.user.name = (token.name as string) ?? session.user.name ?? '';
        session.user.email =
          (token.email as string) ?? session.user.email ?? '';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
