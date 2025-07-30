import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { prisma } from './db'
import bcrypt from 'bcryptjs'

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })

          if (!user || !user.password) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            username: user.username
          }
        } catch (error) {
          console.error('Authorization error:', error)
          return null
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.role = user.role
        token.username = user.username
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.username = token.username
      }
      return session
    },
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === 'credentials') {
          return true
        }
        
        if (account?.provider === 'google' || account?.provider === 'github') {
          // Check if user exists
          let existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })
          
          if (!existingUser) {
            // Create new user for OAuth
            let username = user.email.split('@')[0].toLowerCase().replace(/[^a-zA-Z0-9]/g, '')
            
            // Check if username exists
            const existingUsername = await prisma.user.findUnique({
              where: { username }
            })
            
            if (existingUsername) {
              username = `${username}${Math.floor(Math.random() * 10000)}`
            }
            
            existingUser = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name,
                image: user.image,
                username,
                emailVerified: new Date()
              }
            })
          }
          
          // Update user object with database user info
          user.id = existingUser.id
          user.role = existingUser.role
          user.username = existingUser.username
          
          // Handle pending invitations
          const pendingInvitations = await prisma.invitation.findMany({
            where: {
              email: user.email,
              status: 'PENDING',
              expiresAt: {
                gt: new Date()
              }
            }
          })
          
          // Auto-accept invitations
          for (const invitation of pendingInvitations) {
            await prisma.$transaction(async (tx) => {
              // Create project member
              await tx.projectMember.create({
                data: {
                  userId: existingUser.id,
                  projectId: invitation.projectId,
                  role: invitation.role
                }
              })
              
              // Update invitation status
              await tx.invitation.update({
                where: { id: invitation.id },
                data: { status: 'ACCEPTED' }
              })
              
              // Create activity log
              await tx.activity.create({
                data: {
                  type: 'MEMBER_JOINED',
                  content: `${user.name || user.email} joined the project`,
                  userId: existingUser.id,
                  projectId: invitation.projectId,
                  metadata: { role: invitation.role }
                }
              })
            })
          }
        }
        
        return true
      } catch (error) {
        console.error('Sign in callback error:', error)
        return false
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
}

export const getAuthSession = () => getServerSession(authOptions)
