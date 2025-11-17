/**
 * 剪贴板工具
 * 提供跨浏览器的剪贴板复制功能
 */

import { Logger } from './logger';

/**
 * 复制文本到剪贴板
 * 优先使用 Clipboard API，降级到 execCommand
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) {
    Logger.warn('clipboard', 'Attempted to copy empty text');
    return false;
  }

  try {
    // 优先使用现代 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      Logger.info('clipboard', 'Text copied using Clipboard API');
      return true;
    }

    // 降级：使用 execCommand（已废弃但兼容性好）
    return copyUsingExecCommand(text);
  } catch (error) {
    Logger.error('clipboard', 'Failed to copy text', error as Error);
    // 尝试降级方案
    return copyUsingExecCommand(text);
  }
}

/**
 * 使用 execCommand 复制文本
 */
function copyUsingExecCommand(text: string): boolean {
  try {
    // 创建临时 textarea 元素
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);

    // 选择并复制
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');

    // 清理
    document.body.removeChild(textarea);

    if (success) {
      Logger.info('clipboard', 'Text copied using execCommand');
    } else {
      Logger.error('clipboard', 'execCommand copy failed');
    }

    return success;
  } catch (error) {
    Logger.error('clipboard', 'execCommand failed', error as Error);
    return false;
  }
}

/**
 * 批量复制多个文本（用换行符连接）
 */
export async function copyMultiple(texts: string[]): Promise<boolean> {
  if (!texts || texts.length === 0) {
    Logger.warn('clipboard', 'Attempted to copy empty array');
    return false;
  }

  const combined = texts.join('\n\n---\n\n');
  return copyToClipboard(combined);
}

/**
 * 检查剪贴板 API 是否可用
 */
export function isClipboardAPIAvailable(): boolean {
  return !!(navigator.clipboard && navigator.clipboard.writeText);
}

/**
 * 获取剪贴板支持信息
 */
export function getClipboardSupport(): {
  api: boolean;
  execCommand: boolean;
  method: 'clipboard-api' | 'exec-command' | 'none';
} {
  const api = isClipboardAPIAvailable();
  const execCommand = document.queryCommandSupported('copy');

  let method: 'clipboard-api' | 'exec-command' | 'none' = 'none';
  if (api) {
    method = 'clipboard-api';
  } else if (execCommand) {
    method = 'exec-command';
  }

  return { api, execCommand, method };
}
