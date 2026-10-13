export function downloadXls(fileArrayBuffer: Blob, filename: string): void {
  downloadFile(fileArrayBuffer, filename, 'application/vnd.ms-excel,charset=utf-8')
}

export function downloadJson(fileArrayBuffer: Blob, filename: string): void {
  downloadFile(fileArrayBuffer, filename, 'application/json,charset=utf-8')
}

export function downloadFile(fileArrayBuffer: Blob, filename: string, mimeType = 'application/octet-stream'): void {
  const data = new Blob([fileArrayBuffer], { type: mimeType })
  const link = document.createElement('a')
  link.href = window.URL.createObjectURL(data)
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(link.href)
}
