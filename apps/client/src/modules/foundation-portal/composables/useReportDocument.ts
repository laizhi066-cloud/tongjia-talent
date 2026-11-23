/**
 * @description 报告 PDF 的平台预览与下载状态，失败后允许重试。
 * @file src/modules/foundation-portal/composables/useReportDocument.ts
 */
import { shallowRef } from 'vue'

export function useReportDocument() {
  const openingPdf = shallowRef(false)
  const pdfError = shallowRef('')

  function openPdf(url: string | undefined): void {
    if (!url || openingPdf.value)
      return
    pdfError.value = ''
    const token = String(uni.getStorageSync('foundation_access_token') || '')
    const header = token ? { Authorization: `Bearer ${token}` } : {}
    // #ifdef MP-WEIXIN
    openingPdf.value = true
    uni.downloadFile({
      url,
      header,
      success: (result) => {
        if (result.statusCode !== 200 || !result.tempFilePath) {
          pdfError.value = '报告下载失败，请重新尝试'
          openingPdf.value = false
          return
        }
        uni.openDocument({
          filePath: result.tempFilePath,
          fileType: 'pdf',
          showMenu: true,
          fail: () => {
            pdfError.value = '报告文件暂时无法打开，请重试'
          },
          complete: () => {
            openingPdf.value = false
          },
        })
      },
      fail: () => {
        pdfError.value = '报告下载失败，请检查网络后重试'
        openingPdf.value = false
      },
    })
    // #endif
    // #ifdef H5
    // 先同步占用窗口，再带 Authorization 读取受保护代理，避免直链绕过权限。
    const openedWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!openedWindow) {
      pdfError.value = '浏览器已拦截新窗口，请允许弹出窗口后重试'
      return
    }
    fetch(url, { headers: header })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('报告下载失败')
        }
        const blobUrl = URL.createObjectURL(await response.blob())
        openedWindow.location.href = blobUrl
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
      })
      .catch(() => {
        openedWindow.close()
        pdfError.value = '报告下载失败，请重新尝试'
      })
    // #endif
  }

  return { openingPdf, pdfError, openPdf }
}
