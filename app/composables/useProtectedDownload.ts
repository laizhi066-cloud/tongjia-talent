/**
 * @description 使用当前登录态下载受保护的 CSV/文件响应，不把 Bearer token 放到 URL。
 * @file app/composables/useProtectedDownload.ts
 */
export function useProtectedDownload() {
  const session = useAuthSession();

  async function download(url: string, filename: string): Promise<void> {
    const response = await fetch(url, {
      headers: session.token.value ? { Authorization: `Bearer ${session.token.value}` } : undefined,
    });
    if (!response.ok) throw new Error("文件下载失败");
    const objectUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  return { download };
}
