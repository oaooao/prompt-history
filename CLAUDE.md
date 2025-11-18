# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Prompt History 是一个支持多平台的浏览器扩展，用于自动提取和管理 AI 聊天平台上的用户 Prompts（ChatGPT、Gemini、Claude、DeepSeek）。

## 开发命令

### 构建与开发
```bash
# 开发模式（自动监听和重建）
bun run dev

# 生产构建
bun run build

# 类型检查
bun run type-check
```

### 代码质量
```bash
# 运行 ESLint
bun run lint

# 自动修复 lint 问题
bun run lint:fix

# 代码格式化
bun run format

# 检查格式
bun run format:check
```

### 测试
```bash
# 运行测试
bun run test

# 测试 UI 界面
bun run test:ui

# 测试覆盖率
bun run test:coverage
```

### 加载扩展到浏览器
1. 运行 `bun run build` 构建扩展
2. 打开 Chrome/Edge，访问 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"，选择项目的 `dist` 目录

## 核心架构

### 多平台适配器架构

本项目采用 **Platform Adapter Pattern** 实现多平台支持：

```
content.ts (入口)
  ↓
PlatformDetector (检测当前平台)
  ↓
PlatformFactory (创建对应适配器)
  ↓
具体适配器 (ChatGPTAdapter/GeminiAdapter/ClaudeAdapter/DeepSeekAdapter)
  ↓
BaseExtractor (提取用户 Prompts)
  ↓
PromptStore (存储管理)
  ↓
Sidebar (UI 渲染)
```

### 关键模块

1. **平台检测与工厂** (`src/platforms/`)
   - `PlatformDetector.ts`: 通过 URL 和 DOM 特征检测当前平台
   - `factory.ts`: 工厂模式创建对应的平台适配器
   - `base/PlatformAdapter.ts`: 所有适配器的抽象基类

2. **平台适配器** (`src/platforms/{platform}/`)
   - 每个平台有独立目录（chatgpt/gemini/claude/deepseek）
   - `{Platform}Adapter.ts`: 平台特定实现
   - `{Platform}Extractor.ts`: 平台特定 DOM 提取逻辑

3. **数据存储** (`src/core/store/`)
   - `PromptStore.ts`: 管理 Prompt 数据的单例存储

4. **事件总线** (`src/core/events/`)
   - `EventBus.ts`: 全局单例事件总线（目前预留，未完全使用）

5. **UI 组件** (`src/ui/`)
   - `components/Sidebar.ts`: 侧边栏 UI 实现
   - `styles/main.css`: 样式定义

### 构建配置

- **构建工具**: Vite + TypeScript
- **输出格式**: IIFE (Chrome Extension Manifest V3 要求)
- **Path Aliases**: 使用 `@/` 前缀访问 src/ 目录
  ```typescript
  import { Logger } from '@/utils/logger';
  import { PlatformType } from '@/types/Platform';
  ```

### 关键约束

1. **Chrome Extension V3**
   - 必须使用 IIFE 格式（不支持 ES modules）
   - 构建时 `inlineDynamicImports: true` 确保所有代码打包到一个文件

2. **平台检测**
   - URL 模式优先（`src/config/platforms.ts` 中的 `urlPatterns`）
   - DOM 特征作为辅助验证（`PLATFORM_FEATURES` 中的 `domFeatures`）

3. **DOM 提取策略**
   - 使用 MutationObserver 监听 DOM 变化
   - 延迟提取（默认 500ms）以确保内容加载完成
   - 定期提取作为后备机制（每 2 秒）

## 添加新平台支持

添加新平台需要完成以下步骤：

### 1. 创建平台适配器
```typescript
// src/platforms/newplatform/NewPlatformAdapter.ts
export class NewPlatformAdapter extends PlatformAdapter {
  readonly name = 'NewPlatform';
  readonly type = PlatformType.NEW_PLATFORM;
  readonly version = '1.0.0';

  detect(): boolean {
    return window.location.hostname.includes('newplatform.com');
  }

  getConfig(): PlatformConfig {
    return NEW_PLATFORM_CONFIG;
  }

  async extractPrompts(): Promise<Prompt[]> {
    // 实现 DOM 提取逻辑
  }
}
```

### 2. 添加平台配置
在 `src/config/platforms.ts` 中添加配置：
```typescript
export const NEW_PLATFORM_CONFIG: PlatformConfig = {
  name: 'NewPlatform',
  type: PlatformType.NEW_PLATFORM,
  urlPatterns: ['https://newplatform.com/*'],
  hostname: 'newplatform.com',
  selectors: {
    userMessages: ['You', 'User'],
    articleContainer: '.message-container',
    ignoredTags: ['BUTTON', 'SVG', 'SCRIPT', 'STYLE'],
  },
  ui: {
    primaryColor: '#000000',
    activeColor: '#333333',
    supportsDarkMode: true,
    sidebarPosition: 'right',
  },
};
```

### 3. 更新类型定义
在 `src/types/Platform.ts` 中添加平台类型：
```typescript
export enum PlatformType {
  CHATGPT = 'chatgpt',
  GEMINI = 'gemini',
  CLAUDE = 'claude',
  DEEPSEEK = 'deepseek',
  NEW_PLATFORM = 'newplatform', // 新增
  UNKNOWN = 'unknown',
}
```

### 4. 注册到工厂
在 `src/platforms/factory.ts` 的 `create()` 方法中添加：
```typescript
case PlatformType.NEW_PLATFORM:
  const { NewPlatformAdapter } = await import('./newplatform/NewPlatformAdapter');
  adapter = new NewPlatformAdapter();
  break;
```

### 5. 更新 manifest.json
在 `public/manifest.json` 中添加权限：
```json
{
  "host_permissions": [
    "https://newplatform.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://newplatform.com/*"]
    }
  ]
}
```

## 调试技巧

### 启用调试日志
修改 `src/config/constants.ts`:
```typescript
export const DEBUG = true;
```

### 访问调试接口
在浏览器控制台中：
```javascript
// 查看应用实例（DEBUG 模式下可用）
window.__promptHistoryApp

// 查看 Store 数据
window.__promptHistoryApp.store.getPrompts()
```

### 常见问题

1. **提取不到 Prompts**
   - 检查 `src/config/platforms.ts` 中的 `selectors` 配置
   - 使用浏览器开发工具检查目标平台的 DOM 结构
   - 查看控制台日志（确保 DEBUG 模式开启）

2. **构建失败**
   - 运行 `bun run type-check` 检查类型错误
   - 确保所有依赖已安装：`bun install`

3. **扩展无法加载**
   - 检查 `dist/manifest.json` 格式是否正确
   - 确保构建输出格式为 IIFE（查看 `vite.config.ts`）

## 项目状态

- ✅ **ChatGPT**: 完整支持（包含完整 DOM 提取和增量更新）
- 🔨 **Gemini/Claude/DeepSeek**: 基础框架已完成，需调研实际 DOM 结构后完善

## 技术栈

- TypeScript + Vite
- Chrome Extension Manifest V3
- 设计模式：Platform Adapter、Factory、Observer、Singleton

## Svelte 5 官方文档参考

> Svelte is a UI framework that uses a compiler to let you write breathtakingly concise components that do minimal work in the browser, using languages you already know — HTML, CSS and JavaScript.

在重构为 Svelte 5 时，请参考以下官方文档以确保代码符合最佳实践：

### 文档集合

- **精简版文档** (推荐优先使用): https://svelte.dev/llms-medium.txt
  - Svelte 和 SvelteKit 文档的精简版本，移除了示例和非必要内容

- **压缩版文档**: https://svelte.dev/llms-small.txt
  - 最小化版本，移除了大部分示例和非必要内容

- **完整文档**: https://svelte.dev/llms-full.txt
  - 完整的 Svelte 和 SvelteKit 文档，包含所有示例和附加内容

### 独立包文档

- **Svelte 核心文档**: https://svelte.dev/docs/svelte/llms.txt
  - Svelte 框架的开发者文档

- **SvelteKit 文档**: https://svelte.dev/docs/kit/llms.txt
  - SvelteKit 框架的开发者文档

- **Svelte CLI 文档**: https://svelte.dev/docs/cli/llms.txt
  - Svelte CLI 工具的开发者文档

- **Svelte MCP 文档**: https://svelte.dev/docs/mcp/llms.txt
  - Svelte MCP 的开发者文档

### 使用说明

- 精简版和压缩版文档排除了旧版兼容性说明、详细示例和补充信息
- 完整文档包含官方文档的所有内容
- 包特定文档仅包含与该包相关的内容
- 所有内容均从官方文档的同一源自动生成

### 重构指引

在进行 Svelte 5 重构时，请遵循以下原则：

1. **优先使用 Svelte 5 的新特性**
   - Runes（响应式状态管理的新方式）
   - Snippets（代替 slots 的新语法）
   - 改进的类型推导

2. **组件重构优先级**
   - UI 组件（Sidebar、按钮等）：优先使用 Svelte 组件
   - 数据管理：可以保留现有 Store 或迁移到 Svelte Store
   - 事件处理：使用 Svelte 的事件系统

3. **保持向后兼容**
   - Chrome Extension V3 的 IIFE 格式要求不变
   - 现有的平台适配器架构保持稳定
   - 确保 DOM 提取逻辑不受影响
