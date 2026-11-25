import 'dotenv/config' // memastikan AWS_* terbaca di dev
import { S3Client } from '@aws-sdk/client-s3'

let client: S3Client | null = null

export function useS3() {
    const c = useRuntimeConfig().s3
    client ??= new S3Client({
        forcePathStyle: true,
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
    })
    return { s3: client, bucket: c.bucket, publicUrl: c.publicUrl }
}