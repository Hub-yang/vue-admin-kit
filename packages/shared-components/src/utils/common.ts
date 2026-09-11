/**
 * 下载excel
 * @param {blob} fileArrayBuffer 文件流
 * @param {string} filename 文件名称
 */
export function downloadXls(fileArrayBuffer: Blob, filename: string): void {
  downloadFile(fileArrayBuffer, filename, 'application/vnd.ms-excel,charset=utf-8')
}

/**
 * 下载json
 * @param {blob} fileArrayBuffer 文件流
 * @param {string} filename 文件名称
 */
export function downloadJson(fileArrayBuffer: Blob, filename: string): void {
  downloadFile(fileArrayBuffer, filename, 'application/json,charset=utf-8')
}

/**
 * 下载文件
 * @param fileArrayBuffer 文件流
 * @param filename 文件名
 * @param mimeType 文件类型
 */
export function downloadFile(fileArrayBuffer: Blob, filename: string, mimeType = 'application/octet-stream'): void {
  const data = new Blob([fileArrayBuffer], { type: mimeType })
  const link = document.createElement('a')
  link.href = window.URL.createObjectURL(data)
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(link.href)
}
