export interface FileValidationConfig {
  allowedExtensions: string[]
  maxSize: number
}

export interface ValidatableFile {
  name: string
  size: number
}

export type FileValidationResult
  = | { valid: true }
    | { valid: false, message: string }

/**
 * 校验待上传文件的扩展名与大小，纯函数，不依赖浏览器环境，便于单测。
 * `BaseImportButton` 内部只负责把结果转成 ElMessage 提示与清空文件列表的副作用。
 */
export function validateImportFile(file: ValidatableFile, config: FileValidationConfig): FileValidationResult {
  const fileName = file.name.toLowerCase()
  const isValidExtension = config.allowedExtensions.some(ext => fileName.endsWith(ext.toLowerCase()))
  if (!isValidExtension) {
    return { valid: false, message: `仅支持 ${config.allowedExtensions.join('、')} 格式的文件` }
  }

  if (file.size > config.maxSize) {
    return { valid: false, message: `文件大小不能超过 ${config.maxSize / 1024 / 1024}MB` }
  }

  return { valid: true }
}
