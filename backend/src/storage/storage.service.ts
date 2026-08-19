import { Injectable } from '@nestjs/common'
import { join, resolve } from 'node:path'

/**
 * 存储服务
 *
 * 统一管理文件存储路径，将相对存储 Key 转换为绝对路径
 *
 * 存储结构：
 * - STORAGE_LOCAL_ROOT/
 *   - uploads/{fileId}/
 *     - original.zip
 *   - extracted/{fileId}/
 *     - start_with_pages.html
 *     - resources/
 *     - images/
 *     - scripts/
 */
@Injectable()
export class StorageService {
  private readonly storageRoot: string

  constructor() {
    this.storageRoot = resolve(process.env.STORAGE_LOCAL_ROOT ?? './storage')
  }

  /**
   * 获取存储根目录的绝对路径
   */
  getStorageRoot(): string {
    return this.storageRoot
  }

  /**
   * 根据 fileId 生成存储 Key
   * @param fileId 文件 ID
   * @returns 存储 Key，格式: uploads/{fileId}
   */
  generateStorageKey(fileId: string): string {
    return `uploads/${fileId}`
  }

  /**
   * 获取原始 ZIP 文件的绝对路径
   * @param storageKey 存储 Key
   * @returns ZIP 文件的绝对路径
   */
  getOriginalZipPath(storageKey: string): string {
    // storageKey 格式: uploads/{fileId}
    return join(this.storageRoot, storageKey, 'original.zip')
  }

  /**
   * 获取解压目录的绝对路径
   * @param storageKey 存储 Key
   * @returns 解压目录的绝对路径
   */
  getExtractedPath(storageKey: string): string {
    // storageKey 格式: uploads/{fileId}
    const fileId = storageKey.replace('uploads/', '')
    return join(this.storageRoot, 'extracted', fileId)
  }

  /**
   * 获取上传目录的绝对路径（用于保存 ZIP 文件）
   * @param fileId 文件 ID
   * @returns 上传目录的绝对路径
   */
  getUploadDirectory(fileId: string): string {
    return join(this.storageRoot, 'uploads', fileId)
  }

  /**
   * 获取解压目录的绝对路径（用于保存解压后的文件）
   * @param fileId 文件 ID
   * @returns 解压目录的绝对路径
   */
  getExtractDirectory(fileId: string): string {
    return join(this.storageRoot, 'extracted', fileId)
  }
}
