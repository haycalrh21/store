import { defineServerAuth } from '@nuxtjs/better-auth/config'
import { admin } from 'better-auth/plugins'
import { user as userTable } from '#auth/schema'

export default defineServerAuth(({ db }) => ({
  emailAndPassword: { enabled: true, minPasswordLength: 6, autoSignIn: false },
  plugins: [admin()],
  trustedOrigins: [
    process.env.NUXT_PUBLIC_SITE_URL || 'https://store-tawny-six.vercel.app',
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // user pertama otomatis jadi admin
          const existing = await db.select({ id: userTable.id }).from(userTable).limit(1)
          return {
            data: {
              ...user,
              role: existing.length === 0 ? 'admin' : 'user',
            },
          }
        },
      },
    },
  },
}))