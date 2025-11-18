# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## 项目概述

Prompt History 是一个支持多平台的浏览器扩展，用于自动提取和管理 AI 聊天平台上的用户 Prompts（ChatGPT、Gemini、Claude、DeepSeek）。

## 技术栈

- **UI 框架**: Svelte 5 with Runes
- **状态管理**: Svelte 5 Runes (`$state`, `$derived`, `$effect`)
- **构建工具**: Vite 5 + @sveltejs/vite-plugin-svelte 4.x
- **类型系统**: TypeScript 5.9 + TypeScript Go (tsgo)
- **代码质量**: oxlint (linting) + oxfmt (formatting)
- **运行时**: Chrome Extension Manifest V3
- **包管理器**: Bun
- **设计模式**: Platform Adapter、Factory、Observer、Singleton、Component

## 快速开始

### 安装依赖
```bash
bun install
```

### 开发构建
```bash
bun run dev
```

### 生产构建
```bash
bun run build
```

### 加载扩展到浏览器
1. 运行 `bun run build` 构建扩展
2. 打开 Chrome/Edge，访问 `chrome://extensions/`
3. 启用"开发者模式"
4. 点击"加载已解压的扩展程序"，选择项目的 `dist` 目录

## 开发命令

### 构建与开发
```bash
# 开发模式（自动监听和重建）
bun run dev

# 生产构建
bun run build

# 预览构建产物
bun run preview
```

### 类型检查
```bash
# 完整检查（Svelte + TypeScript）
bun run check

# Svelte 组件检查
bun run check:svelte

# TypeScript 类型检查（tsgo - 推荐）
bun run check:types

# TypeScript 类型检查（tsc - fallback）
bun run check:legacy
```

### 代码质量
```bash
# 运行 oxlint（Rust 驱动，50-100x 速度）
bun run lint

# 代码格式化（oxfmt，45x 速度）
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

## Svelte 5 组件架构

### 组件树结构

```
Sidebar.svelte (根组件)
  ├─ sidebarState (Runes 状态单例)
  ├─ SidebarHeader.svelte
  │   ├─ 复制全部按钮
  │   └─ 折叠/展开按钮
  ├─ PromptList.svelte
  │   └─ PromptItem.svelte × N
  │       └─ CopyButton.svelte
  └─ CompactCard.svelte (折叠状态指示器)
```

### 核心文件

- **组件** (`src/ui/components/`)
  - `Sidebar.svelte` - 主容器组件，集成所有子组件
  - `SidebarHeader.svelte` - 头部操作栏（复制全部、折叠）
  - `PromptList.svelte` - 列表容器，遍历 prompts
  - `PromptItem.svelte` - 单个 Prompt 展示和交互
  - `CopyButton.svelte` - 可复用的复制按钮组件
  - `CompactCard.svelte` - 折叠状态的浮动卡片

- **状态管理** (`src/ui/stores/`)
  - `sidebar.svelte.ts` - Runes 状态管理单例

### Runes 状态管理

#### 状态单例定义

```typescript
// src/ui/stores/sidebar.svelte.ts
class SidebarState {
  // 响应式状态
  prompts = $state<Prompt[]>([]);
  isCollapsed = $state(false);
  currentActiveId = $state<string | null>(null);

  // 计算属性
  activePrompt = $derived(
    this.prompts.find((p) => p.id === this.currentActiveId) || null
  );

  promptCount = $derived(this.prompts.length);

  // 构造函数
  constructor() {
    const collapsed = localStorage.getItem('ph-sidebar-collapsed');
    if (collapsed === 'true') {
      this.isCollapsed = true;
    }
  }

  // 方法
  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('ph-sidebar-collapsed', String(this.isCollapsed));
  }

  setActive(id: string | null) {
    this.currentActiveId = id;
  }

  updatePrompts(newPrompts: Prompt[]) {
    this.prompts = newPrompts;
  }
}

// 导出单例
export const sidebarState = new SidebarState();
```

#### 使用模式

**读取状态：**
```svelte
<script lang="ts">
  import { sidebarState } from '@/ui/stores/sidebar.svelte';
</script>

<div>Prompt count: {sidebarState.promptCount}</div>
```

**响应状态变化：**
```svelte
<script lang="ts">
  import { sidebarState } from '@/ui/stores/sidebar.svelte';

  $effect(() => {
    // 当 isCollapsed 变化时自动执行
    sidebarState.isCollapsed;
    updateMainMargin();
  });
</script>
```

**更新状态：**
```svelte
<script lang="ts">
  import { sidebarState } from '@/ui/stores/sidebar.svelte';

  function handleToggle() {
    sidebarState.toggleCollapse();
  }
</script>
```

### 组件开发规范

#### 标准组件模板

```svelte
<script lang="ts">
  import type { ComponentProps } from '@/types';

  // Props 声明（父组件传入）
  const { data, onEvent } = $props<ComponentProps>();

  // 本地响应式状态
  let localState = $state(false);

  // 计算属性
  const computed = $derived(localState ? 'Active' : 'Inactive');

  // 副作用
  $effect(() => {
    console.log('State changed:', localState);
  });

  // 事件处理器
  function handleClick() {
    localState = !localState;
    onEvent?.();
  }
</script>

<div class="component-class" onclick={handleClick}>
  {computed}
</div>

<style>
  /* Scoped styles */
  .component-class {
    padding: 8px;
    cursor: pointer;
  }

  /* 全局样式需要 :global() */
  :global(.ph-global-class) {
    color: red;
  }
</style>
```

#### 组件通信模式

- **父→子**：通过 props 传递数据和回调
  ```svelte
  <ChildComponent data={value} onEvent={handleEvent} />
  ```

- **子→父**：通过回调函数
  ```svelte
  const { onActivate } = $props<{ onActivate: () => void }>();
  ```

- **全局状态**：通过 `sidebarState` 单例
  ```typescript
  import { sidebarState } from '@/ui/stores/sidebar.svelte';
  sidebarState.toggleCollapse();
  ```

#### 样式规范

- 每个组件包含 scoped `<style>` 标签
- 使用 `SELECTORS` 常量保持类名一致性
- 避免内联样式，优先使用 CSS 类
- 使用 `:global()` 修饰符访问全局样式

## 平台适配器架构

### 核心流程

```
content.ts (入口)
  ↓
PlatformDetector.detect() (检测当前平台)
  ↓
PlatformFactory.create() (创建对应适配器)
  ↓
ChatGPTAdapter / GeminiAdapter / ClaudeAdapter / DeepSeekAdapter
  ↓
extractPrompts() (提取用户 Prompts)
  ↓
PromptStore.setPrompts() (存储管理)
  ↓
EventBus.emit(PROMPTS_UPDATED) (触发事件)
  ↓
Sidebar.svelte (UI 更新)
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
   - `EventBus.ts`: 全局单例事件总线，用于跨组件通信

### 添加新平台支持

添加新平台需要完成以下步骤：

#### 步骤 1：创建平台适配器

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

#### 步骤 2：添加平台配置

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

#### 步骤 3：更新类型定义

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

#### 步骤 4：注册到工厂

在 `src/platforms/factory.ts` 的 `create()` 方法中添加：

```typescript
case PlatformType.NEW_PLATFORM:
  const { NewPlatformAdapter } = await import('./newplatform/NewPlatformAdapter');
  adapter = new NewPlatformAdapter();
  break;
```

#### 步骤 5：更新 manifest.json

在 `public/manifest.json` 中添加权限：

```json
{
  "host_permissions": [
    "https://newplatform.com/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://newplatform.com/*"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ]
}
```

## 现代工具链

### oxc (Rust 驱动的快速工具链)

#### oxlint - 超快速 Linting

```bash
bun run lint           # 检查所有代码
```

**特点：**
- 速度：比 ESLint 快 **50-100 倍**
- Rust 实现：内存安全，性能优异
- 零配置：开箱即用

**配置文件：** `.oxlintrc.json`

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "rules": {
    "typescript/no-explicit-any": "warn",
    "import/no-duplicates": "error",
    "no-unused-vars": "error"
  },
  "env": {
    "browser": true,
    "es2022": true,
    "webextensions": true
  }
}
```

#### oxfmt - 超快速格式化

```bash
bun run format         # 格式化所有代码
bun run format:check   # 检查格式
```

**特点：**
- 速度：比 Prettier 快 **45 倍**
- 一致性：遵循 Prettier 标准
- 配置文件：`.oxfmtrc.jsonc`

### TypeScript Go (tsgo)

**快速类型检查：**

```bash
bun run check:types    # tsgo (推荐)
bun run check:legacy   # tsc (fallback)
```

**特点：**
- Go 实现的 TypeScript 类型检查器
- 速度显著快于 tsc
- 完全兼容 TypeScript 类型系统
- 版本：`@typescript/native-preview@7.0.0-dev`

**注意事项：**
- tsgo 不支持 `baseUrl`，使用相对路径映射
- 与 Vite bundler 解析兼容

### Vite + Svelte 配置

#### vite.config.ts 核心配置

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        runes: true,  // 启用 Svelte 5 Runes
      },
    }),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/core': resolve(__dirname, './src/core'),
      '@/ui': resolve(__dirname, './src/ui'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/config': resolve(__dirname, './src/config'),
      '@/types': resolve(__dirname, './src/types'),
    },
  },

  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        format: 'iife',  // Chrome Extension V3 必需
        entryFileNames: '[name].js',
        inlineDynamicImports: true,
      },
    },
  },

  publicDir: 'public',
});
```

#### svelte.config.js

```javascript
export default {
  compilerOptions: {
    runes: true,  // 启用 Svelte 5 Runes
  },
};
```

#### tsconfig.json 要点

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "preserve",          // Vite 处理模块
    "moduleResolution": "bundler", // 现代打包器解析
    "isolatedModules": true,       // Vite 快速编译要求
    "paths": {
      "@/*": ["./src/*"],          // 使用相对路径（tsgo 兼容）
      "@/core/*": ["./src/core/*"],
      "@/ui/*": ["./src/ui/*"]
    }
  }
}
```

## 调试技巧

### 启用 Debug 模式

```typescript
// src/config/constants.ts
export const DEBUG = true;
```

开启后：
- 控制台输出详细日志
- `window.__promptHistoryApp` 全局可访问

### 访问应用实例

在浏览器控制台：

```javascript
// 查看应用实例
window.__promptHistoryApp

// 查看 Svelte 根组件
window.__promptHistoryApp.sidebar

// 查看 Store 数据
window.__promptHistoryApp.store.getPrompts()
```

### 调试 Runes 状态

```javascript
// 需手动导入（开发模式）
import { sidebarState } from './src/ui/stores/sidebar.svelte.ts';

console.log(sidebarState.prompts);      // 查看所有 prompts
console.log(sidebarState.promptCount);  // 查看计算属性
console.log(sidebarState.activePrompt); // 查看当前选中
```

### 在组件中调试

```svelte
<script lang="ts">
  import { sidebarState } from '@/ui/stores/sidebar.svelte';

  // 使用 $effect 调试响应式逻辑
  $effect(() => {
    console.log('Prompts changed:', sidebarState.prompts);
    console.log('Count:', sidebarState.promptCount);
  });
</script>
```

## 常见问题

### Svelte 组件不更新？

✅ 确认使用 `$state` 而非普通变量
✅ 检查 `$derived` 的依赖是否正确
✅ 验证 `$effect` 是否正确触发（添加 console.log）

**示例：**
```svelte
<script lang="ts">
  // ❌ 错误：不会触发响应式更新
  let count = 0;

  // ✅ 正确：使用 $state
  let count = $state(0);
</script>
```

### 样式不生效？

✅ 检查是否需要 `:global()` 修饰器
✅ 确认 CSS 类名与 `SELECTORS` 常量匹配
✅ 使用开发工具检查样式优先级

**示例：**
```svelte
<style>
  /* ✅ Scoped styles */
  .component-class {
    color: blue;
  }

  /* ✅ Global styles */
  :global(.ph-global-class) {
    color: red;
  }
</style>
```

### 构建失败？

✅ 运行 `bun run check` 全面检查
✅ 确认 Svelte 插件版本 4.x（与 Vite 5 兼容）
✅ 检查 `svelte.config.js` 中 `runes: true`

**常见错误：**
```bash
# 错误：Svelte 插件版本不兼容
# 解决：bun add -D @sveltejs/vite-plugin-svelte@^4.0.4

# 错误：tsgo 路径映射问题
# 解决：确保 tsconfig.json 中使用相对路径 "./src/*"
```

### Prompts 未提取？

✅ 检查平台 URL 匹配（`src/config/platforms.ts`）
✅ 确认窗口宽度 ≥ 1280px（`src/config/constants.ts`）
✅ 查看控制台日志（启用 DEBUG 模式）

**调试步骤：**
1. 打开浏览器控制台
2. 检查是否有错误日志
3. 运行 `window.__promptHistoryApp.adapter` 查看适配器
4. 运行 `window.__promptHistoryApp.store.getPrompts()` 查看提取结果

## 性能优化

### 组件优化

- 使用 `$derived` 避免重复计算
- 合理使用 `$effect`（避免无限循环）
- 拆分大组件为小组件

**示例：**
```svelte
<script lang="ts">
  let items = $state([1, 2, 3, 4, 5]);

  // ✅ 使用 $derived 缓存计算结果
  const total = $derived(items.reduce((a, b) => a + b, 0));

  // ❌ 避免在 $effect 中修改依赖的状态（会导致无限循环）
  $effect(() => {
    items = [...items, 6]; // ❌ 错误：会无限触发
  });
</script>
```

### 构建优化

- `inlineDynamicImports: true` - 单文件打包
- `target: 'es2022'` - 现代浏览器优化
- 生产构建自动 minify

### DOM 提取优化

- 使用防抖 (debounce) 减少提取频率
- MutationObserver 监听关键节点
- 定期提取作为后备机制

## 项目状态

### 已支持平台

- ✅ **ChatGPT** (chatgpt.com) - 完整支持
- 🔨 **Gemini** (gemini.google.com) - 基础框架
- 🔨 **Claude** (claude.ai) - 基础框架
- 🔨 **DeepSeek** (chat.deepseek.com) - 基础框架

### 路线图

- [ ] 完善 Gemini/Claude/DeepSeek 提取逻辑
- [ ] 添加搜索/过滤功能
- [ ] 支持导出历史记录
- [ ] 多语言支持

## Path Aliases

使用 `@/` 前缀访问 src/ 目录：

```typescript
import { Logger } from '@/utils/logger';
import { PlatformType } from '@/types/Platform';
import { sidebarState } from '@/ui/stores/sidebar.svelte';
```

配置位置：
- Vite: `vite.config.ts` 中的 `resolve.alias`
- TypeScript: `tsconfig.json` 中的 `paths`
