/**
 * Gemini 平台适配器（框架实现）
 * TODO: 需要实际调研 Gemini 的 DOM 结构后完善
 */

import { PlatformAdapter } from '@/platforms/base/PlatformAdapter';
import { PlatformType, PlatformConfig } from '@/types/Platform';
import { Prompt, PromptSource } from '@/types/Prompt';
import { GEMINI_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class GeminiAdapter extends PlatformAdapter {
  readonly name = 'Gemini';
  readonly type = PlatformType.GEMINI;
  readonly version = '2.0.0';

  /**
   * 检测是否为 Gemini 页面
   */
  detect(): boolean {
    return window.location.href.includes('gemini.google.com');
  }

  /**
   * 获取平台配置
   */
  getConfig(): PlatformConfig {
    return GEMINI_CONFIG;
  }

  /**
   * 提取 Prompts（基础实现）
   */
  async extractPrompts(): Promise<Prompt[]> {
    this.ensureInitialized();

    Logger.warn(
      'GeminiAdapter',
      'Gemini extraction is not fully implemented yet'
    );

    try {
      const articles = document.querySelectorAll(
        this.getConfig().selectors.articleContainer
      );
      const prompts: Prompt[] = [];

      // 基础提取逻辑（需要完善）
      articles.forEach((article, index) => {
        const text = article.textContent?.trim();
        if (text && text.length > 0) {
          prompts.push({
            id: `gemini_${Date.now()}_${index}`,
            content: text,
            timestamp: Date.now(),
            element: article as HTMLElement,
            source: PromptSource.DOM,
            visible: true,
          });
        }
      });

      return prompts;
    } catch (error) {
      Logger.error('GeminiAdapter', 'Extraction failed', error as Error);
      return [];
    }
  }

  /**
   * 初始化钩子
   */
  protected override onInitialize(): void {
    Logger.info('GeminiAdapter', 'Gemini adapter initialized (basic support)');
  }
}
