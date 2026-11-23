/**
 * @description 阿里云 OSS 服务端适配器。仅在 OSS_ENABLED=true 时初始化，密钥不会下发浏览器。
 * @file server/utils/oss.ts
 */
import OSS from 'ali-oss'
import { getOssConfig, type OssConfig } from './oss-config'

let client: OSS | null = null
let clientConfigKey = ''

function getOssClient(config: OssConfig): OSS {
  const nextKey = [config.endpoint, config.region, config.bucket, config.accessKeyId].join('|')
  if (!client || clientConfigKey !== nextKey) {
    const sdkRegion = config.region.startsWith('oss-') ? config.region : `oss-${config.region}`
    client = new OSS({
      endpoint: config.endpoint,
      region: sdkRegion,
      bucket: config.bucket,
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      secure: true,
      timeout: 60_000,
    })
    clientConfigKey = nextKey
  }
  return client
}

/** 上传对象并返回私有 OSS 对象 key。对象不得配置为公开读。 */
export async function uploadOssObject(
  bytes: Uint8Array,
  objectKey: string,
  contentType: string,
): Promise<{ objectKey: string }> {
  const config = getOssConfig()
  if (!config) throw new Error('OSS 未开启，不能调用 OSS 上传')
  const ossClient = getOssClient(config)
  await ossClient.put(objectKey, Buffer.from(bytes), { mime: contentType })
  // 即使 bucket 历史上被误配为 public-read，也逐对象收紧为 private。
  await ossClient.putACL(objectKey, 'private')
  return { objectKey }
}

/** 生成短期下载地址；仅由服务端权限代理调用，不返回给浏览器。 */
export function signOssObjectUrl(objectKey: string, expires = 60): string {
  const config = getOssConfig()
  if (!config) throw new Error('OSS 未开启，不能生成 OSS 下载地址')
  // 不覆盖 response header：部分 OSS 兼容域名会拒绝 response-content-type 参数；
  // 上传时已写入 application/pdf，代理层会重新设置最终响应头。
  return getOssClient(config).signatureUrl(objectKey, { expires })
}
