/**
 * DOM 操作工具
 * 提供常用的 DOM 操作辅助函数
 */

/**
 * 从元素中提取文本内容
 * 递归遍历所有文本节点，忽略特定标签
 *
 * @param element 要提取文本的元素
 * @param ignoredTags 要忽略的标签名称数组
 */
export function extractTextContent(
  element: Element,
  ignoredTags: string[] = ['BUTTON', 'SVG', 'SCRIPT', 'STYLE']
): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      // 忽略特定标签
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        ignoredTags.includes((node as Element).tagName)
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let text = '';
  let node: Node | null;

  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      // 在块级元素后添加换行
      if (element.tagName === 'BR') {
        text += '\n';
      } else if (
        ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(
          element.tagName
        )
      ) {
        // 不在这里添加换行，让文本节点自然连接
      }
    }
  }

  return text.trim();
}

/**
 * 查找最近的匹配选择器的祖先元素
 */
export function findClosest(
  element: Element,
  selector: string
): Element | null {
  return element.closest(selector);
}

/**
 * 检查元素是否在视口中
 */
export function isElementInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 检查元素是否部分可见
 */
export function isElementPartiallyVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const windowHeight =
    window.innerHeight || document.documentElement.clientHeight;
  const windowWidth =
    window.innerWidth || document.documentElement.clientWidth;

  const vertInView = rect.top <= windowHeight && rect.top + rect.height >= 0;
  const horInView = rect.left <= windowWidth && rect.left + rect.width >= 0;

  return vertInView && horInView;
}

/**
 * 平滑滚动到元素
 */
export function scrollToElement(
  element: Element,
  options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }
): void {
  try {
    element.scrollIntoView(options);
  } catch {
    // 降级：使用传统滚动
    element.scrollIntoView();
  }
}

/**
 * 等待元素出现
 */
export function waitForElement(
  selector: string,
  timeout = 10000,
  parent: Element | Document = document
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = parent.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = parent.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(parent as Node, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * 创建元素
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    id?: string;
    innerHTML?: string;
    textContent?: string;
    attributes?: Record<string, string>;
    styles?: Partial<CSSStyleDeclaration>;
    children?: HTMLElement[];
  } = {}
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.id) {
    element.id = options.id;
  }

  if (options.innerHTML) {
    element.innerHTML = options.innerHTML;
  }

  if (options.textContent) {
    element.textContent = options.textContent;
  }

  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  if (options.styles) {
    Object.assign(element.style, options.styles);
  }

  if (options.children) {
    options.children.forEach((child) => element.appendChild(child));
  }

  return element;
}

/**
 * 移除元素
 */
export function removeElement(element: Element): void {
  element.remove();
}

/**
 * 切换 class
 */
export function toggleClass(
  element: Element,
  className: string,
  force?: boolean
): boolean {
  return element.classList.toggle(className, force);
}

/**
 * 添加多个 class
 */
export function addClasses(element: Element, ...classNames: string[]): void {
  element.classList.add(...classNames);
}

/**
 * 移除多个 class
 */
export function removeClasses(
  element: Element,
  ...classNames: string[]
): void {
  element.classList.remove(...classNames);
}

/**
 * 查询所有匹配的元素
 */
export function queryAll<E extends Element = Element>(
  selector: string,
  parent: Element | Document = document
): E[] {
  return Array.from(parent.querySelectorAll<E>(selector));
}

/**
 * 查询单个元素
 */
export function query<E extends Element = Element>(
  selector: string,
  parent: Element | Document = document
): E | null {
  return parent.querySelector<E>(selector);
}

/**
 * 生成唯一 ID
 */
export function generateId(prefix = 'element'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
