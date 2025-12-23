import type { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'

const requiredEnv = (value: string | undefined, key: string) => {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

const discordClientId = process.env.DISCORD_CLIENT_ID
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  providers: [
    DiscordProvider({
      clientId: requiredEnv(discordClientId, 'DISCORD_CLIENT_ID'),
      clientSecret: requiredEnv(discordClientSecret, 'DISCORD_CLIENT_SECRET'),
      authorization: {
        params: {
          scope: 'identify email',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.discordId = (profile as any).id as string
        token.username = (profile as any).global_name || (profile as any).username
        token.discriminator = (profile as any).discriminator
        token.avatar = (profile as any).avatar
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.discordId = token.discordId as string | undefined
        session.user.name = token.username as string | undefined || session.user.name
        session.user.image = token.avatar
        session.user.id = token.discordId as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
