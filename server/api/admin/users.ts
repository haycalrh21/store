import { eq, sql } from 'drizzle-orm'
import { userProfiles } from '../../db/schema'

export default defineEventHandler(async (event) => {
    const session = await getUserSession(event)
    const currentUser = session?.user as { id?: string; role?: string } | undefined

    if (!currentUser?.id || currentUser.role?.toLowerCase() !== 'admin') {
        throw createError({
            statusCode: 403,
            statusMessage: 'Akses ditolak. Hanya Admin yang dapat mengelola pengguna.',
        })
    }

    // GET: Ambil seluruh baris dari tabel "user" tanpa asumsi nama kolom ORDER BY
    if (event.method === 'GET') {
        const [usersResult, allProfiles] = await Promise.all([
            db.execute(sql`SELECT * FROM "user"`),
            db.select().from(userProfiles),
        ])

        const allUsers = (Array.isArray(usersResult) ? usersResult : (usersResult as any).rows ?? []) as any[]
        const profileByUserId = new Map(allProfiles.map((p) => [p.userId, p]))

        // Urutkan terbaru di atas (mendukung baik createdAt maupun created_at)
        allUsers.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || 0).getTime()
            const dateB = new Date(b.createdAt || b.created_at || 0).getTime()
            return dateB - dateA
        })

        return allUsers.map((u) => {
            const profile = profileByUserId.get(u.id)
            const isAdmin = String(u.role || '').toLowerCase() === 'admin'
            const isBanned = Boolean(u.banned)

            return {
                id: u.id,
                name: u.name || u.email?.split('@')[0] || 'Pengguna',
                email: u.email,
                city: profile?.city || '-',
                role: isAdmin ? 'Admin' : 'Member',
                rawRole: u.role || 'user',
                status: isBanned ? 'Nonaktif' : 'Aktif',
                banned: isBanned,
            }
        })
    }

    // POST: Update role, status aktif/ban, atau hapus user
    if (event.method === 'POST') {
        const body = await readBody<{
            userId: string
            action: 'toggle-role' | 'toggle-status' | 'delete'
            role?: string
        }>(event)

        if (!body?.userId || !body?.action) {
            throw createError({ statusCode: 400, statusMessage: 'Parameter userId dan action wajib diisi.' })
        }

        if (body.userId === currentUser.id && body.action !== 'toggle-role') {
            throw createError({
                statusCode: 400,
                statusMessage: 'Tidak dapat menonaktifkan atau menghapus akun sendiri.',
            })
        }

        const foundResult = await db.execute(sql`SELECT * FROM "user" WHERE "id" = ${body.userId} LIMIT 1`)
        const foundRows = (Array.isArray(foundResult) ? foundResult : (foundResult as any).rows ?? []) as any[]
        const targetUser = foundRows[0]

        if (!targetUser) {
            throw createError({ statusCode: 404, statusMessage: 'Pengguna tidak ditemukan.' })
        }

        const usesCamelCase = 'createdAt' in targetUser || 'updatedAt' in targetUser

        if (body.action === 'toggle-role') {
            const nextRole =
                body.role ?? (String(targetUser.role || '').toLowerCase() === 'admin' ? 'user' : 'admin')

            if (usesCamelCase) {
                await db.execute(
                    sql`UPDATE "user" SET "role" = ${nextRole}, "updatedAt" = NOW() WHERE "id" = ${body.userId}`
                )
            } else {
                await db.execute(
                    sql`UPDATE "user" SET "role" = ${nextRole}, "updated_at" = NOW() WHERE "id" = ${body.userId}`
                )
            }

            return { ok: true, role: nextRole }
        }

        if (body.action === 'toggle-status') {
            const nextBanned = !Boolean(targetUser.banned)

            if (usesCamelCase) {
                await db.execute(
                    sql`UPDATE "user" SET "banned" = ${nextBanned}, "updatedAt" = NOW() WHERE "id" = ${body.userId}`
                )
            } else {
                await db.execute(
                    sql`UPDATE "user" SET "banned" = ${nextBanned}, "updated_at" = NOW() WHERE "id" = ${body.userId}`
                )
            }

            return { ok: true, banned: nextBanned }
        }

        if (body.action === 'delete') {
            await db.delete(userProfiles).where(eq(userProfiles.userId, body.userId))
            if (usesCamelCase) {
                await db.execute(sql`DELETE FROM "session" WHERE "userId" = ${body.userId}`)
                await db.execute(sql`DELETE FROM "account" WHERE "userId" = ${body.userId}`)
            } else {
                await db.execute(sql`DELETE FROM "session" WHERE "user_id" = ${body.userId}`)
                await db.execute(sql`DELETE FROM "account" WHERE "user_id" = ${body.userId}`)
            }
            await db.execute(sql`DELETE FROM "user" WHERE "id" = ${body.userId}`)

            return { ok: true }
        }
    }
})