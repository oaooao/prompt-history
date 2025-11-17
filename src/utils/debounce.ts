/**
 * 防抖和节流工具
 */

/**
 * 防抖函数
 * 在事件被触发 n 毫秒后再执行回调，如果在这 n 毫秒内又被触发，则重新计时
 *
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 * @param immediate 是否立即执行
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;

    const later = (): void => {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };

    const callNow = immediate && !timeout;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);

    if (callNow) {
      func.apply(context, args);
    }
  };
}

/**
 * 节流函数
 * 规定在一个单位时间内，只能触发一次函数。如果这个单位时间内触发多次函数，只有一次生效
 *
 * @param func 要节流的函数
 * @param wait 等待时间（毫秒）
 * @param options 配置选项
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: {
    leading?: boolean; // 是否在开始时执行
    trailing?: boolean; // 是否在结束时执行
  } = {}
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0;

  const { leading = true, trailing = true } = options;

  return function (this: any, ...args: Parameters<T>) {
    const context = this;
    const now = Date.now();

    if (!previous && !leading) {
      previous = now;
    }

    const remaining = wait - (now - previous);

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(context, args);
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        previous = leading ? Date.now() : 0;
        timeout = null;
        func.apply(context, args);
      }, remaining);
    }
  };
}

/**
 * 创建可取消的防抖函数
 */
export function cancelableDebounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): {
  debounced: (...args: Parameters<T>) => void;
  cancel: () => void;
  flush: () => void;
} {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastContext: any = null;

  const debounced = function (this: any, ...args: Parameters<T>): void {
    lastArgs = args;
    lastContext = this;

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      if (lastArgs) {
        func.apply(lastContext, lastArgs);
      }
      timeout = null;
      lastArgs = null;
      lastContext = null;
    }, wait);
  };

  const cancel = (): void => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      lastArgs = null;
      lastContext = null;
    }
  };

  const flush = (): void => {
    if (timeout && lastArgs) {
      clearTimeout(timeout);
      func.apply(lastContext, lastArgs);
      timeout = null;
      lastArgs = null;
      lastContext = null;
    }
  };

  return { debounced, cancel, flush };
}
