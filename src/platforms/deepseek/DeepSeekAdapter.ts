/**
 * DeepSeek 平台适配器（框架实现）
 * TODO: 需要实际调研 DeepSeek 的 DOM 结构后完善
 */

import { PlatformAdapter } from '@/platforms/base/PlatformAdapter';
import { PlatformType, PlatformConfig } from '@/types/Platform';
import { Prompt, PromptSource } from '@/types/Prompt';
import { DEEPSEEK_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class DeepSeekAdapter extends PlatformAdapter {
  readonly name = 'DeepSeek';
  readonly type = PlatformType.DEEPSEEK;
  readonly version = '2.0.0';

  detect(): boolean {
    return window.location.href.includes('chat.deepseek.com');
  }

  getConfig(): PlatformConfig {
    return DEEPSEEK_CONFIG;
  }

  async extractPrompts(): Promise<Prompt[]> {
    this.ensureInitialized();
    Logger.warn('DeepSeekAdapter', 'DeepSeek extraction is not fully implemented yet');

    try {
      const articles = document.querySelectorAll(
        this.getConfig().selectors.articleContainer
      );
      const prompts: Prompt[] = [];

      articles.forEach((article, index) => {
        const text = article.textContent?.trim();
        if (text && text.length > 0) {
          prompts.push({
            id: `deepseek_${Date.now()}_${index}`,
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
      Logger.error('DeepSeekAdapter', 'Extraction failed', error as Error);
      return [];
    }
  }

  protected override onInitialize(): void {
    Logger.info('DeepSeekAdapter', 'DeepSeek adapter initialized (basic support)');
  }
}
