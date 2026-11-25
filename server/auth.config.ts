// server/auth.config.ts
import { defineServerAuth } from '@nuxtjs/better-auth/config'
import { admin } from 'better-auth/plugins'
import { user as userTable } from '#auth/schema'

export default defineServerAuth(({ db }) => ({
  emailAndPassword: { enabled: true, minPasswordLength: 6, autoSignIn: false, },
  plugins: [admin()],

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // cek apakah sudah ada user di database
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