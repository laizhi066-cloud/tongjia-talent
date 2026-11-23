/**
 * @description 给所有 application/json 响应补 `; charset=utf-8`。
 *   nitro/h3 默认只发 `Content-Type: application/json`（不带 charset）。`uni.request` 能正常按 UTF-8 解析，
 *   但**微信小程序的 `uni.uploadFile`** 在缺 charset 时会按非 UTF-8 解码响应体 → 中文消息变乱码（如「操作成功」→「æä½æå」），
 *   严重时还会让前端 `JSON.parse(res.data)` 失败 → 头像上传被判失败。这里统一补 charset，从源头消除。
 *
 *   注意：beforeResponse 阶段 content-type 往往尚未由 nitro 写入（序列化时才设），故不能读现有头判断，
 *   改为看 response.body：返回普通对象/数组 → nitro 会序列化成 JSON，主动带上带 charset 的 content-type。
 *   排除字符串(可能是 HTML/纯文本)与二进制(Uint8Array/ArrayBuffer/Blob，如小程序码图片)。
 * @file server/plugins/json-charset.ts
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event, response) => {
    const body = (response as any)?.body
    if (
      body
      && typeof body === 'object'
      && !(body instanceof Uint8Array)
      && !(body instanceof ArrayBuffer)
      && !(typeof Blob !== 'undefined' && body instanceof Blob)
    ) {
      setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
    }
  })
})
