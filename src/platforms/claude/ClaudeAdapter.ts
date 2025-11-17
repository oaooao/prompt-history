/**
 * Claude 平台适配器（框架实现）
 * TODO: 需要实际调研 Claude 的 DOM 结构后完善
 */

import { PlatformAdapter } from '@/platforms/base/PlatformAdapter';
import { PlatformType, PlatformConfig } from '@/types/Platform';
import { Prompt, PromptSource } from '@/types/Prompt';
import { CLAUDE_CONFIG } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class ClaudeAdapter extends PlatformAdapter {
  readonly name = 'Claude';
  readonly type = PlatformType.CLAUDE;
  readonly version = '2.0.0';

  detect(): boolean {
    return window.location.href.includes('claude.ai');
  }

  getConfig(): PlatformConfig {
    return CLAUDE_CONFIG;
  }

  async extractPrompts(): Promise<Prompt[]> {
    this.ensureInitialized();
    Logger.warn('ClaudeAdapter', 'Claude extraction is not fully implemented yet');

    try {
      const articles = document.querySelectorAll(
        this.getConfig().selectors.articleContainer
      );
      const prompts: Prompt[] = [];

      articles.forEach((article, index) => {
        const text = article.textContent?.trim();
        if (text && text.length > 0) {
          prompts.push({
            id: `claude_${Date.now()}_${index}`,
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
      Logger.error('ClaudeAdapter', 'Extraction failed', error as Error);
      return [];
    }
  }

  protected override onInitialize(): void {
    Logger.info('ClaudeAdapter', 'Claude adapter initialized (basic support)');
  }
}
