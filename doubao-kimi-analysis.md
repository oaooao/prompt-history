# 豆包（Doubao）和 Kimi 平台 DOM 分析报告

## 一、豆包（Doubao）平台分析

### 1.1 基本信息
- **URL 模式**: `https://www.doubao.com/chat/*`
- **提取难度**: ⭐⭐⭐ (3/5) - 中等难度
- **DOM 结构**: 清晰，使用 Tailwind CSS 类名

### 1.2 DOM 结构详解

#### 消息容器识别
```html
<!-- 用户消息 -->
<div data-message-id="29830059977464834" class="flex-row flex w-full justify-end">
  <!-- 消息内容 -->
</div>

<!-- AI 回复 -->
<div data-message-id="29830059977465346" class="flex-row flex w-full">
  <!-- 消息内容 -->
</div>
```

#### 关键选择器
- **所有消息**: `[data-message-id]`
- **用户消息识别**: 包含 `justify-end` 类（右对齐）
- **AI 消息识别**: 不包含 `justify-end` 类（左对齐）
- **消息唯一 ID**: `data-message-id` 属性

#### 提取示例
```javascript
// 用户消息
document.querySelectorAll('[data-message-id].justify-end')

// AI 消息
document.querySelectorAll('[data-message-id]:not(.justify-end)')
```

### 1.3 实际消息示例
```javascript
{
  "userMessages": [
    { "messageId": "29830059977464834", "text": "hi" },
    { "messageId": "29837274705105154", "text": "你几岁啦？" },
    { "messageId": "29859795451467266", "text": "继续" }
  ],
  "aiMessages": [
    { "messageId": "29830059977465346", "text": "Hey there! What's up? 😊..." },
    { "messageId": "29837274705105410", "text": "哈哈，我没有实际的年龄哦..." },
    { "messageId": "29859795451468034", "text": "来啦来啦！这就奉上..." }
  ]
}
```

### 1.4 推荐配置代码

```typescript
// src/config/platforms.ts
export const DOUBAO_CONFIG: PlatformConfig = {
  name: 'Doubao',
  type: PlatformType.DOUBAO,
  urlPatterns: ['https://www.doubao.com/chat/*'],
  hostname: 'www.doubao.com',
  
  selectors: {
    // 主要消息容器选择器
    articleContainer: '[data-message-id]',
    
    // 用户消息特征：包含 justify-end 类
    userBubble: '[data-message-id].justify-end',
    
    // 文本内容容器（直接提取）
    textContent: '[data-message-id]',
    
    // 忽略的标签
    ignoredTags: ['BUTTON', 'SVG', 'SCRIPT', 'STYLE'],
    
    // 用户消息标识（已废弃，使用 CSS 类判断）
    userMessages: []
  },
  
  ui: {
    primaryColor: '#1d39c4',  // 豆包蓝色
    activeColor: '#597ef7',
    supportsDarkMode: true,
    sidebarPosition: 'right'
  }
};
```

### 1.5 提取器核心逻辑

```typescript
// src/platforms/doubao/DoubaoExtractor.ts
export class DoubaoExtractor {
  extractPrompts(): Prompt[] {
    const prompts: Prompt[] = [];
    
    // 获取所有用户消息（包含 justify-end 类）
    const userMessages = document.querySelectorAll(
      '[data-message-id].justify-end'
    );
    
    userMessages.forEach((msgEl, index) => {
      const messageId = msgEl.getAttribute('data-message-id');
      const text = msgEl.textContent?.trim();
      
      if (text && messageId) {
        prompts.push({
          id: messageId,
          text: text,
          timestamp: Date.now() - (userMessages.length - index) * 1000,
          order: index
        });
      }
    });
    
    return prompts;
  }
}
```

### 1.6 特殊处理要点

1. **消息识别策略**: 使用 `justify-end` 类判断用户消息（比语义化更稳定）
2. **唯一标识**: `data-message-id` 属性作为 Prompt ID
3. **时间戳**: 豆包没有显式时间戳，需根据顺序推算
4. **Markdown 处理**: AI 消息包含 markdown 渲染，用户消息通常是纯文本

---

## 二、Kimi 平台分析

### 2.1 基本信息
- **URL 模式**: `https://www.kimi.com/chat/*`
- **提取难度**: ⭐⭐ (2/5) - 简单
- **DOM 结构**: 非常清晰，使用语义化类名

### 2.2 DOM 结构详解

#### 消息容器识别
```html
<!-- 消息列表容器 -->
<div class="chat-content-container">
  <div class="chat-content-list">
    
    <!-- 用户消息 -->
    <div class="chat-content-item chat-content-item-user">
      <div class="segment segment-user">
        <div class="segment-container">
          <div class="segment-content">
            <div class="segment-content-box">hi</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- AI 回复 -->
    <div class="chat-content-item chat-content-item-assistant">
      <div class="segment segment-assistant">
        <div class="segment-container">
          <div class="segment-content">
            <div class="segment-content-box">Hi there!</div>
          </div>
        </div>
      </div>
    </div>
    
  </div>
</div>
```

#### 关键选择器
- **消息容器**: `.chat-content-container`
- **所有消息**: `.segment-container`
- **用户消息**: `.segment-user`
- **AI 消息**: `.segment-assistant`
- **文本内容**: `.segment-content-box`

#### 提取示例
```javascript
// 用户消息
document.querySelectorAll('.segment-user .segment-content-box')

// AI 消息
document.querySelectorAll('.segment-assistant .segment-content-box')
```

### 2.3 实际消息示例
```javascript
{
  "userMessages": [
    { "text": "hi" },
    { "text": "你是谁？" },
    { "text": "继续" }
  ],
  "aiMessages": [
    { "text": "Hi there! How can I help you today?" },
    { "text": "我是 kimi，你的智能伙伴和好朋友。有什么可以帮你的吗？" },
    { "text": "当然，我在这儿呢。😊 你想聊些什么？或者有什么我可以帮你的吗？" }
  ]
}
```

### 2.4 推荐配置代码

```typescript
// src/config/platforms.ts
export const KIMI_CONFIG: PlatformConfig = {
  name: 'Kimi',
  type: PlatformType.KIMI,
  urlPatterns: ['https://www.kimi.com/chat/*', 'https://kimi.moonshot.cn/chat/*'],
  hostname: 'www.kimi.com',
  
  selectors: {
    // 消息列表容器
    articleContainer: '.chat-content-container',
    
    // 用户消息段
    userBubble: '.segment-user',
    
    // 文本内容容器
    textContent: '.segment-content-box',
    
    // 忽略的标签
    ignoredTags: ['BUTTON', 'SVG', 'SCRIPT', 'STYLE'],
    
    // 用户消息标识（已废弃，使用 CSS 类判断）
    userMessages: []
  },
  
  ui: {
    primaryColor: '#0066ff',  // Kimi 蓝色
    activeColor: '#3385ff',
    supportsDarkMode: true,
    sidebarPosition: 'right'
  }
};
```

### 2.5 提取器核心逻辑

```typescript
// src/platforms/kimi/KimiExtractor.ts
export class KimiExtractor {
  extractPrompts(): Prompt[] {
    const prompts: Prompt[] = [];
    
    // 获取所有用户消息段
    const userSegments = document.querySelectorAll('.segment-user');
    
    userSegments.forEach((segment, index) => {
      // 提取文本内容
      const contentBox = segment.querySelector('.segment-content-box');
      const text = contentBox?.textContent?.trim();
      
      if (text) {
        // 使用内容哈希作为 ID（Kimi 没有显式消息 ID）
        const id = this.generateIdFromText(text, index);
        
        prompts.push({
          id: id,
          text: text,
          timestamp: Date.now() - (userSegments.length - index) * 1000,
          order: index
        });
      }
    });
    
    return prompts;
  }
  
  private generateIdFromText(text: string, index: number): string {
    // 简单哈希函数
    const hash = text.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    return `kimi-${Math.abs(hash)}-${index}`;
  }
}
```

### 2.6 特殊处理要点

1. **消息识别策略**: 使用 `.segment-user` 类直接定位用户消息（非常可靠）
2. **唯一标识**: Kimi 没有 `data-message-id`，需要根据文本内容 + 索引生成 ID
3. **时间戳**: 没有显式时间戳，需根据顺序推算
4. **文本提取**: 使用 `.segment-content-box` 精确提取纯文本内容

---

## 三、对比总结

| 特性 | 豆包（Doubao） | Kimi |
|------|----------------|------|
| **URL 模式** | `www.doubao.com/chat/*` | `www.kimi.com/chat/*` |
| **消息容器** | `[data-message-id]` | `.segment-container` |
| **用户消息识别** | `.justify-end` 类 | `.segment-user` 类 |
| **AI 消息识别** | 无 `.justify-end` | `.segment-assistant` 类 |
| **唯一标识** | `data-message-id` 属性 | 无（需生成） |
| **文本提取** | 直接从容器 | `.segment-content-box` |
| **时间戳** | 无（需推算） | 无（需推算） |
| **提取难度** | ⭐⭐⭐ (中等) | ⭐⭐ (简单) |
| **CSS 策略** | Tailwind 实用类 | 语义化类名 |

---

## 四、实施建议

### 4.1 优先级

1. **高优先级**: Kimi（结构简单，测试容易）
2. **中优先级**: 豆包（结构清晰，但需要处理 Tailwind 类）

### 4.2 实施步骤

#### Step 1: 添加平台类型
```typescript
// src/types/Platform.ts
export enum PlatformType {
  CHATGPT = 'chatgpt',
  GEMINI = 'gemini',
  CLAUDE = 'claude',
  DEEPSEEK = 'deepseek',
  QWEN_CN = 'qwen-cn',
  QWEN_INTL = 'qwen-intl',
  DOUBAO = 'doubao',     // 新增
  KIMI = 'kimi',         // 新增
  UNKNOWN = 'unknown'
}
```

#### Step 2: 创建平台配置
- 在 `src/config/platforms.ts` 添加 `DOUBAO_CONFIG` 和 `KIMI_CONFIG`

#### Step 3: 创建适配器和提取器
```bash
# 豆包
mkdir -p src/platforms/doubao
touch src/platforms/doubao/DoubaoAdapter.ts
touch src/platforms/doubao/DoubaoExtractor.ts

# Kimi
mkdir -p src/platforms/kimi
touch src/platforms/kimi/KimiAdapter.ts
touch src/platforms/kimi/KimiExtractor.ts
```

#### Step 4: 注册到工厂
在 `src/platforms/factory.ts` 添加对应的 case 分支

#### Step 5: 更新 manifest.json
```json
{
  "host_permissions": [
    "https://www.doubao.com/*",
    "https://www.kimi.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://www.doubao.com/*"],
      "js": ["content.js"],
      "run_at": "document_end"
    },
    {
      "matches": ["https://www.kimi.com/*"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ]
}
```

### 4.3 测试要点

#### 豆包测试
1. ✅ 验证 `[data-message-id]` 选择器有效性
2. ✅ 确认 `justify-end` 类稳定性（不同主题/布局）
3. ✅ 测试长消息提取完整性
4. ✅ 验证 messageId 唯一性

#### Kimi 测试
1. ✅ 验证 `.segment-user` 选择器有效性
2. ✅ 确认 `.segment-content-box` 文本提取准确性
3. ✅ 测试生成的 ID 唯一性
4. ✅ 验证多轮对话提取顺序

---

## 五、潜在问题与解决方案

### 5.1 豆包

**问题 1**: Tailwind 类名可能在构建后变化
- **解决**: 优先使用 `data-message-id` 属性，CSS 类作为辅助

**问题 2**: 时间戳缺失
- **解决**: 使用 `messageId` 的数字部分推算相对时间

**问题 3**: Markdown 内容混杂
- **解决**: 在 AI 消息中过滤 Markdown 语法标记

### 5.2 Kimi

**问题 1**: 无唯一消息 ID
- **解决**: 使用文本哈希 + 索引生成稳定 ID

**问题 2**: 消息顺序可能变化
- **解决**: 使用 `.chat-content-list` 的子元素顺序作为基准

**问题 3**: 动态加载历史消息
- **解决**: 使用 MutationObserver 监听 `.chat-content-container` 变化

---

## 六、完整示例代码

### 6.1 豆包完整提取器

```typescript
// src/platforms/doubao/DoubaoExtractor.ts
import type { Prompt } from '@/types/Platform';

export class DoubaoExtractor {
  /**
   * 从豆包页面提取用户 Prompts
   */
  extractPrompts(): Prompt[] {
    const prompts: Prompt[] = [];
    
    // 获取所有带 messageId 的元素
    const allMessages = document.querySelectorAll('[data-message-id]');
    
    allMessages.forEach((msgEl, index) => {
      // 只提取用户消息（包含 justify-end 类）
      if (!msgEl.classList.contains('justify-end')) {
        return;
      }
      
      const messageId = msgEl.getAttribute('data-message-id');
      const text = this.extractText(msgEl as HTMLElement);
      
      if (text && messageId) {
        prompts.push({
          id: messageId,
          text: text,
          timestamp: this.estimateTimestamp(messageId),
          order: index,
          platform: 'doubao'
        });
      }
    });
    
    return prompts;
  }
  
  /**
   * 提取纯文本内容（过滤按钮等）
   */
  private extractText(element: HTMLElement): string {
    const clone = element.cloneNode(true) as HTMLElement;
    
    // 移除按钮、SVG 等
    const ignoredSelectors = ['button', 'svg', 'script', 'style'];
    ignoredSelectors.forEach(sel => {
      clone.querySelectorAll(sel).forEach(el => el.remove());
    });
    
    return clone.textContent?.trim() || '';
  }
  
  /**
   * 从 messageId 估算时间戳
   */
  private estimateTimestamp(messageId: string): number {
    // messageId 是递增的数字，可以用来推算时间
    const idNum = parseInt(messageId, 10);
    // 假设每个 ID 代表约 1 秒（需根据实际调整）
    return Date.now() - (idNum % 1000000) * 1000;
  }
}
```

### 6.2 Kimi 完整提取器

```typescript
// src/platforms/kimi/KimiExtractor.ts
import type { Prompt } from '@/types/Platform';

export class KimiExtractor {
  /**
   * 从 Kimi 页面提取用户 Prompts
   */
  extractPrompts(): Prompt[] {
    const prompts: Prompt[] = [];
    
    // 获取所有用户消息段
    const userSegments = document.querySelectorAll('.segment-user');
    
    userSegments.forEach((segment, index) => {
      const contentBox = segment.querySelector('.segment-content-box');
      const text = contentBox?.textContent?.trim();
      
      if (text) {
        prompts.push({
          id: this.generateId(text, index),
          text: text,
          timestamp: Date.now() - (userSegments.length - index) * 1000,
          order: index,
          platform: 'kimi'
        });
      }
    });
    
    return prompts;
  }
  
  /**
   * 生成唯一 ID（基于文本哈希 + 索引）
   */
  private generateId(text: string, index: number): string {
    // 简单哈希
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为 32 位整数
    }
    return `kimi-${Math.abs(hash)}-${index}`;
  }
}
```

---

## 七、验证清单

### 豆包验证
- [ ] `data-message-id` 属性存在且唯一
- [ ] `justify-end` 类准确识别用户消息
- [ ] 文本提取完整（无按钮文字）
- [ ] ID 生成稳定
- [ ] 多轮对话顺序正确

### Kimi 验证
- [ ] `.segment-user` 选择器有效
- [ ] `.segment-content-box` 提取准确
- [ ] 生成的 ID 唯一且稳定
- [ ] 多轮对话顺序正确
- [ ] 历史消息加载后能正确提取

---

**分析完成时间**: 2025-01-18
**分析人员**: Claude Code Agent
**状态**: ✅ 已完成深度分析
