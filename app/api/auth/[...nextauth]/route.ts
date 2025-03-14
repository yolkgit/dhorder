import { compare } from 'bcrypt';
import NextAuth, { type NextAuthOptions, Session, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';

// 세션 타입 확장
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image?: string | null;
      role: string;
      branchName: string | null;
    }
  }
  
  interface User {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    branchName: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: '아이디', type: 'text' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        console.log('NextAuth authorize 호출:', credentials);
        
        if (!credentials?.email || !credentials?.password) {
          console.log('아이디 또는 비밀번호 누락');
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        console.log('사용자 조회 결과:', user ? `사용자 찾음: ${user.email}` : '사용자 없음');

        if (!user) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.password);
        console.log('비밀번호 검증 결과:', isPasswordValid ? '일치' : '불일치');

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          branchName: user.branchName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.branchName = user.branchName;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = session.user || {};
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.branchName = token.branchName as string | null;
      }
      
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 