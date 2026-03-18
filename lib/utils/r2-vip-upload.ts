import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { config } from "~/lib/config/config"

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
}

function getExt(filename: string, mimeType?: string): string {
  if (mimeType && EXT_BY_MIME[mimeType]) return EXT_BY_MIME[mimeType]
  if (filename.includes(".")) return filename.slice(filename.lastIndexOf(".")).toLowerCase()
  return ".jpg"
}

/**
 * Upload a VIP image to Cloudflare R2 (S3-compatible). Key format: {vpfId}/{type}.{ext} (e.g. VPF000901/avatar.png).
 * Requires Cloudflare R2 to be configured.
 * @returns Public URL of the uploaded object.
 */
export async function uploadVipImage(
  vpfId: string,
  type: string,
  data: Uint8Array,
  options: { filename?: string; mimeType?: string },
): Promise<string> {
  const { r2 } = config

  const ext = getExt(options.filename ?? "", options.mimeType ?? "")
  const key = `${vpfId}/${type}${ext}`

  const endpoint = `https://${r2.accountId}.r2.cloudflarestorage.com`
  const client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
    },
    forcePathStyle: true,
  })

  await client.send(
    new PutObjectCommand({
      Bucket: r2.vipBucket,
      Key: key,
      Body: data,
      ContentType: options.mimeType ?? "image/jpeg",
    }),
  )

  const base = r2.vipPublicUrlBase.trim().replace(/\/$/, "")
  return `${base}/${key}`
}
