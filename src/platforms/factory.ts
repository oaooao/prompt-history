/**
 * 平台适配器工厂
 * 根据检测结果创建对应的平台适配器实例
 */

import { PlatformType, IPlatformAdapter } from '@/types/Platform';
import { PlatformDetector } from './base/PlatformDetector';
import { Logger } from '@/utils/logger';

/**
 * 平台适配器工厂类
 */
export class PlatformFactory {
  private static instance: IPlatformAdapter | null = null;
  private static currentPlatform: PlatformType | null = null;

  /**
   * 创建平台适配器
   */
  static async create(platformType?: PlatformType): Promise<IPlatformAdapter> {
    // 如果已经创建过实例且平台类型相同，直接返回
    if (
      this.instance &&
      this.currentPlatform &&
      (!platformType || platformType === this.currentPlatform)
    ) {
      return this.instance;
    }

    // 检测平台类型
    const detectedType = platformType || PlatformDetector.getCurrentPlatform();

    Logger.info(
      'PlatformFactory',
      `Creating adapter for platform: ${detectedType}`
    );

    // 根据平台类型动态导入对应的适配器
    let adapter: IPlatformAdapter;

    try {
      switch (detectedType) {
        case PlatformType.CHATGPT:
          const { ChatGPTAdapter } = await import('./chatgpt/ChatGPTAdapter');
          adapter = new ChatGPTAdapter();
          break;

        case PlatformType.GEMINI:
          const { GeminiAdapter } = await import('./gemini/GeminiAdapter');
          adapter = new GeminiAdapter();
          break;

        case PlatformType.CLAUDE:
          const { ClaudeAdapter } = await import('./claude/ClaudeAdapter');
          adapter = new ClaudeAdapter();
          break;

        case PlatformType.DEEPSEEK:
          const { DeepSeekAdapter } = await import(
            './deepseek/DeepSeekAdapter'
          );
          adapter = new DeepSeekAdapter();
          break;

        case PlatformType.QWEN_CN:
          const { QwenCNAdapter } = await import('./qwen-cn/QwenCNAdapter');
          adapter = new QwenCNAdapter();
          break;

        case PlatformType.QWEN_INTL:
          const { QwenIntlAdapter } = await import('./qwen-intl/QwenIntlAdapter');
          adapter = new QwenIntlAdapter();
          break;

        case PlatformType.KIMI:
          const { KimiAdapter } = await import('./kimi/KimiAdapter');
          adapter = new KimiAdapter();
          break;

        case PlatformType.DOUBAO:
          const { DoubaoAdapter } = await import('./doubao/DoubaoAdapter');
          adapter = new DoubaoAdapter();
          break;

        case PlatformType.UNKNOWN:
        default:
          throw new Error(`Unsupported platform: ${detectedType}`);
      }

      // 缓存实例
      this.instance = adapter;
      this.currentPlatform = detectedType;

      Logger.info(
        'PlatformFactory',
        `Created ${adapter.name} adapter successfully`
      );
      return adapter;
    } catch (error) {
      Logger.error(
        'PlatformFactory',
        `Failed to create adapter for platform: ${detectedType}`,
        error as Error
      );
      throw error;
    }
  }

  /**
   * 获取当前适配器实例
   */
  static getInstance(): IPlatformAdapter | null {
    return this.instance;
  }

  /**
   * 销毁当前适配器实例
   */
  static destroy(): void {
    if (this.instance) {
      Logger.info('PlatformFactory', 'Destroying current adapter');
      this.instance.destroy();
      this.instance = null;
      this.currentPlatform = null;
    }
  }

  /**
   * 重置工厂（用于测试）
   */
  static reset(): void {
    this.destroy();
  }

  /**
   * 检测并创建适配器（一步完成）
   */
  static async detectAndCreate(): Promise<IPlatformAdapter> {
    Logger.info('PlatformFactory', 'Detecting platform and creating adapter');

    const detection = PlatformDetector.detect();

    if (!detection.detected) {
      throw new Error('No supported platform detected');
    }

    Logger.info(
      'PlatformFactory',
      `Detected platform: ${detection.platform} (confidence: ${detection.confidence})`
    );

    return this.create(detection.platform);
  }
}
