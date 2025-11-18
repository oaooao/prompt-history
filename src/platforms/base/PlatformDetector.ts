/**
 * 平台检测器
 * 自动识别当前页面所属的 AI 聊天平台
 */

import { PlatformType, PlatformDetectionResult } from '@/types/Platform';
import { PLATFORM_FEATURES } from '@/config/platforms';
import { Logger } from '@/utils/logger';

export class PlatformDetector {
  /**
   * 检测当前平台
   */
  static detect(): PlatformDetectionResult {
    Logger.info('PlatformDetector', 'Starting platform detection');

    // 1. 优先通过 URL 检测（最快最准确）
    const urlResult = this.detectByURL();
    if (urlResult.detected && urlResult.confidence >= 0.9) {
      Logger.info(
        'PlatformDetector',
        `Detected platform by URL: ${urlResult.platform}`
      );
      return urlResult;
    }

    // 2. 通过 DOM 特征检测
    const domResult = this.detectByDOM();
    if (domResult.detected && domResult.confidence >= 0.7) {
      Logger.info(
        'PlatformDetector',
        `Detected platform by DOM: ${domResult.platform}`
      );
      return domResult;
    }

    // 3. 混合检测（URL + DOM）
    if (urlResult.detected || domResult.detected) {
      const confidence = (urlResult.confidence + domResult.confidence) / 2;
      const platform = urlResult.detected
        ? urlResult.platform
        : domResult.platform;

      Logger.info(
        'PlatformDetector',
        `Detected platform by hybrid: ${platform}`
      );
      return {
        platform,
        detected: true,
        confidence,
        method: 'hybrid',
      };
    }

    // 4. 未检测到
    Logger.warn('PlatformDetector', 'No platform detected');
    return {
      platform: PlatformType.UNKNOWN,
      detected: false,
      confidence: 0,
      method: 'url',
    };
  }

  /**
   * 通过 URL 检测平台
   */
  private static detectByURL(): PlatformDetectionResult {
    const url = window.location.href;

    for (const [platformKey, features] of Object.entries(PLATFORM_FEATURES)) {
      const platform = platformKey as PlatformType;

      if (features.urlPattern && features.urlPattern.test(url)) {
        return {
          platform,
          detected: true,
          confidence: 1.0,
          method: 'url',
        };
      }
    }

    return {
      platform: PlatformType.UNKNOWN,
      detected: false,
      confidence: 0,
      method: 'url',
    };
  }

  /**
   * 通过 DOM 特征检测平台
   */
  private static detectByDOM(): PlatformDetectionResult {
    const results: Array<{ platform: PlatformType; score: number }> = [];

    for (const [platformKey, features] of Object.entries(PLATFORM_FEATURES)) {
      const platform = platformKey as PlatformType;
      let score = 0;
      let totalFeatures = 0;

      // 检测 DOM 特征
      if (features.domFeatures && features.domFeatures.length > 0) {
        totalFeatures += features.domFeatures.length;
        for (const selector of features.domFeatures) {
          if (document.querySelector(selector)) {
            score++;
          }
        }
      }

      // 检测 window 对象特征
      if (features.windowFeatures && features.windowFeatures.length > 0) {
        totalFeatures += features.windowFeatures.length;
        for (const feature of features.windowFeatures) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
          if ((window as any)[feature]) {
            score++;
          }
        }
      }

      if (totalFeatures > 0) {
        results.push({
          platform,
          score: score / totalFeatures,
        });
      }
    }

    // 找到得分最高的平台
    if (results.length === 0) {
      return {
        platform: PlatformType.UNKNOWN,
        detected: false,
        confidence: 0,
        method: 'dom',
      };
    }

    results.sort((a, b) => b.score - a.score);
    const best = results[0];

    return {
      platform: best.platform,
      detected: best.score > 0.5,
      confidence: best.score,
      method: 'dom',
    };
  }

  /**
   * 检测特定平台
   */
  static detectPlatform(platform: PlatformType): boolean {
    const result = this.detect();
    return result.platform === platform && result.detected;
  }

  /**
   * 获取当前平台类型（不进行检测验证）
   */
  static getCurrentPlatform(): PlatformType {
    const result = this.detect();
    return result.detected ? result.platform : PlatformType.UNKNOWN;
  }
}
