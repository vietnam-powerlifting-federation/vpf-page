import { randomUUID } from "node:crypto"
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
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

function publicUrlBase(): string {
  return config.r2.vipPublicUrlBase.trim().replace(/\/$/, "")
}

function createClient(): S3Client {
  const { r2 } = config
  return new S3Client({
    region: "auto",
    endpoint: `https://${r2.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
    },
    forcePathStyle: true,
  })
}

/**
 * Upload a VIP image to Cloudflare R2 (S3-compatible). Requires Cloudflare R2 to be configured.
 *
 * The bucket is publicly readable, so the key determines who can reach the object. The default
 * key is deterministic ({vpfId}/{type}.{ext}, e.g. VPF000901/avatar.png), which is what we want
 * for images that are public anyway and should be overwritten in place.
 *
 * Pass `unguessable` for images that must not be enumerable: vpfId is sequential (VPF000001,
 * VPF000002, ...) and the extension has only a few possible values, so a deterministic key can be
 * guessed by anyone. The random component makes the URL the only way to reach the object. Callers
 * using this are responsible for deleting the previous object, since the key no longer repeats.
 *
 * @returns Public URL of the uploaded object.
 */
export async function uploadVipImage(
  vpfId: string,
  type: string,
  data: Uint8Array,
  options: { filename?: string; mimeType?: string; unguessable?: boolean },
): Promise<string> {
  const ext = getExt(options.filename ?? "", options.mimeType ?? "")
  const name = options.unguessable ? `${type}-${randomUUID()}` : type
  const key = `${vpfId}/${name}${ext}`

  await createClient().send(
    new PutObjectCommand({
      Bucket: config.r2.vipBucket,
      Key: key,
      Body: data,
      ContentType: options.mimeType ?? "image/jpeg",
    }),
  )

  return `${publicUrlBase()}/${key}`
}

/**
 * Delete a previously uploaded VIP image, given the public URL returned by {@link uploadVipImage}.
 * Throws if the URL does not belong to the configured public base.
 */
export async function deleteVipImage(url: string): Promise<void> {
  const base = publicUrlBase()
  if (!url.startsWith(`${base}/`)) {
    throw new Error("Refusing to delete an object outside the configured R2 public base")
  }

  await createClient().send(
    new DeleteObjectCommand({
      Bucket: config.r2.vipBucket,
      Key: url.slice(base.length + 1),
    }),
  )
}
