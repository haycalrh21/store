import { eq, sql } from 'drizzle-orm'
import { userProfiles } from '../../db/schema'

export default defineEventHandler(async (event) => {
    const session = await getUserSession(event)
    const sessionUser = session?.user as { id?: string; name?: string; email?: string } | undefined

    if (!sessionUser?.id) {
        throw createError({ statusCode: 401, statusMessage: 'Silakan login terlebih dahulu.' })
    }

    // GET: Ambil data diri dari database (fallback ke data sesi jika belum pernah disimpan)
    if (event.method === 'GET') {
        const existing = await db
            .select()
            .from(userProfiles)
            .where(eq(userProfiles.userId, sessionUser.id))
            .limit(1)

        if (existing.length > 0) {
            return existing[0]
        }

        return {
            userId: sessionUser.id,
            name: sessionUser.name || '',
            email: sessionUser.email || '',
            phone: '',
            city: '',
            address: '',
        }
    }

    // POST: Simpan ke user_profiles sekaligus sinkronkan name & email ke tabel "user"
    if (event.method === 'POST') {
        const body = await readBody(event)

        const nextName = String(body.name || sessionUser.name || '').trim()
        const nextEmail = String(body.email || sessionUser.email || '').trim().toLowerCase()

        if (!nextName || !nextEmail) {
            throw createError({ statusCode: 400, statusMessage: 'Nama dan email wajib diisi.' })
        }

        // Cek apakah email baru sudah dipakai user lain di tabel "user"
        const duplicateResult = await db.execute(
            sql`SELECT "id" FROM "user" WHERE "email" = ${nextEmail} AND "id" != ${sessionUser.id} LIMIT 1`
        )
        const duplicateRows = (Array.isArray(duplicateResult)
            ? duplicateResult
            : (duplicateResult as any).rows ?? []) as any[]

        if (duplicateRows.length > 0) {
            throw createError({
                statusCode: 400,
                statusMessage: 'Email tersebut sudah digunakan oleh akun lain.',
            })
        }

        // Cek format nama kolom timestamp di tabel "user" (camelCase vs snake_case)
        const currentUserResult = await db.execute(
            sql`SELECT * FROM "user" WHERE "id" = ${sessionUser.id} LIMIT 1`
        )
        const currentUserRows = (Array.isArray(currentUserResult)
            ? currentUserResult
            : (currentUserResult as any).rows ?? []) as any[]
        const targetAuthUser = currentUserRows[0]

        if (targetAuthUser) {
            const usesCamelCase = 'createdAt' in targetAuthUser || 'updatedAt' in targetAuthUser

            if (usesCamelCase) {
                await db.execute(
                    sql`UPDATE "user" SET "name" = ${nextName}, "email" = ${nextEmail}, "updatedAt" = NOW() WHERE "id" = ${sessionUser.id}`
                )
            } else {
                await db.execute(
                    sql`UPDATE "user" SET "name" = ${nextName}, "email" = ${nextEmail}, "updated_at" = NOW() WHERE "id" = ${sessionUser.id}`
                )
            }
        }

        const payload = {
            name: nextName,
            email: nextEmail,
            phone: String(body.phone || '').trim(),
            city: String(body.city || '').trim(),
            address: String(body.address || '').trim(),
            updatedAt: new Date(),
        }

        const [saved] = await db
            .insert(userProfiles)
            .values({
                userId: sessionUser.id,
                ...payload,
            })
            .onConflictDoUpdate({
                target: userProfiles.userId,
                set: payload,
            })
            .returning()

        return saved
    }
})