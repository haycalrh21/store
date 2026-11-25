// server/api/admin/upload.post.ts
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'

const MAX_SIZE = 5 * 1024 * 1024
const TYPES: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
}

export default eventHandler(async (event) => {
    await requireUserSession(event, { user: { role: 'admin' } })

    const form = await readFormData(event)
    const file = form.get('file')

    if (!(file instanceof File) || !file.size) {
        throw createError({ statusCode: 400, statusMessage: 'File tidak ditemukan.' })
    }
    const ext = TYPES[file.type]
    if (!ext) {
        throw createError({ statusCode: 400, statusMessage: 'Format harus JPG, PNG, atau WebP.' })
    }
    if (file.size > MAX_SIZE) {
        throw createError({ statusCode: 400, statusMessage: 'Ukuran foto maksimal 5 MB.' })
    }

    const key = `products/${randomUUID()}.${ext}`
    const { s3, bucket, publicUrl } = useS3()

    await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: new Uint8Array(await file.arrayBuffer()),
        ContentType: file.type,
    }))

    return { url: `${publicUrl}/${key}` }
})