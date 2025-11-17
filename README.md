# Prompt History - Multi-Platform

一个支持多个 AI 聊天平台的浏览器扩展，用于跟踪和管理您的 AI 对话 Prompts。

## ✨ 功能特性

- 📝 **自动提取** - 自动从对话页面提取用户的 Prompts
- 🎯 **一键定位** - 点击侧边栏中的 Prompt 快速跳转到原始消息位置
- 📋 **快速复制** - 一键复制单个或所有 Prompts 到剪贴板
- 🔍 **搜索过滤** - 快速搜索和过滤 Prompts（待实现）
- 💾 **导出功能** - 支持导出为 JSON/TXT/Markdown 格式（待实现）
- 🌓 **深色模式** - 自动适配页面主题
- 🎨 **美观界面** - 类似 Leo Query 的 TOC 风格设计

## 🌐 平台支持

| 平台 | 状态 | 说明 |
|------|------|------|
| ChatGPT | ✅ 完整支持 | 包含完整的 DOM 提取和增量更新 |
| Gemini | 🔨 基础框架 | 需要实际调研 DOM 结构后完善 |
| Claude | 🔨 基础框架 | 需要实际调研 DOM 结构后完善 |
| DeepSeek | 🔨 基础框架 | 需要实际调研 DOM 结构后完善 |

## 📦 安装

### 开发模式

1. **克隆仓库**
   ```bash
   git clone <repository-url>
   cd prompt-history
   ```

2. **安装依赖**
   ```bash
   bun install
   ```

3. **构建扩展**
   ```bash
   bun run build
   ```

4. **加载到浏览器**
   - 打开 Chrome/Edge，访问 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目的 `dist` 目录

### 生产模式

```bash
bun run build
```

## 🎮 使用说明

1. **访问支持的平台**
   - 打开 ChatGPT (https://chatgpt.com) 或其他支持的 AI 聊天平台

2. **自动显示侧边栏**
   - 扩展会自动检测当前平台并在页面右侧显示侧边栏

3. **查看和管理 Prompts**
   - 侧边栏会实时显示您的所有 Prompts
   - 点击 Prompt 可跳转到原始消息位置
   - 使用复制按钮快速复制 Prompt 内容

## 🛠 技术栈

- **核心**
  - TypeScript - 类型安全
  - Vite - 快速构建
  - Chrome Extension Manifest V3

- **架构模式**
  - Platform Adapter Pattern - 平台抽象
  - Factory Pattern - 动态适配器创建
  - Observer Pattern - 事件驱动
  - Singleton Pattern - 全局事件总线

- **开发工具**
  - ESLint - 代码检查
  - Prettier - 代码格式化
  - Vitest - 单元测试（待实现）

## 📁 项目结构

```
prompt-history/
├── src/
│   ├── config/           # 配置文件
│   │   ├── constants.ts  # 全局常量
│   │   └── platforms.ts  # 平台配置
│   ├── core/             # 核心功能
│   │   ├── events/       # 事件总线
│   │   ├── store/        # 数据存储
│   │   └── extractor/    # 提取器基类
│   ├── platforms/        # 平台适配器
│   │   ├── base/         # 基础抽象
│   │   ├── chatgpt/      # ChatGPT 实现
│   │   ├── gemini/       # Gemini 框架
│   │   ├── claude/       # Claude 框架
│   │   └── deepseek/     # DeepSeek 框架
│   ├── types/            # TypeScript 类型定义
│   ├── ui/               # UI 组件
│   │   ├── components/   # React 组件
│   │   └── styles/       # CSS 样式
│   ├── utils/            # 工具函数
│   └── content.ts        # 主入口
├── public/               # 静态资源
│   ├── manifest.json     # 扩展清单
│   └── icons/            # 图标资源
└── dist/                 # 构建输出
```

## 🔧 开发指南

### 添加新平台支持

1. **创建平台适配器**
   ```typescript
   // src/platforms/newplatform/NewPlatformAdapter.ts
   export class NewPlatformAdapter extends PlatformAdapter {
     detect(): boolean {
       return window.location.href.includes('newplatform.com');
     }

     async extractPrompts(): Promise<Prompt[]> {
       // 实现提取逻辑
     }
   }
   ```

2. **添加平台配置**
   ```typescript
   // src/config/platforms.ts
   export const NEW_PLATFORM_CONFIG: PlatformConfig = {
     name: 'NewPlatform',
     type: PlatformType.NEW_PLATFORM,
     selectors: { /* ... */ },
     // ...
   }
   ```

3. **更新工厂方法**
   ```typescript
   // src/platforms/factory.ts
   case PlatformType.NEW_PLATFORM:
     const { NewPlatformAdapter } = await import('./newplatform');
     return new NewPlatformAdapter();
   ```

### 运行开发模式

```bash
# 监听文件变化并自动重新构建
bun run dev
```

### 运行测试

```bash
bun run test
```

## 📝 待办事项

- [ ] 完善 Gemini 平台支持
- [ ] 完善 Claude 平台支持
- [ ] 完善 DeepSeek 平台支持
- [ ] 实现搜索和过滤功能
- [ ] 实现导出功能（JSON/TXT/Markdown）
- [ ] 添加单元测试
- [ ] 添加 API 提取支持（ChatGPT API）
- [ ] 优化性能和内存使用
- [ ] 添加用户设置面板
- [ ] 支持自定义主题

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 版本历史

### v2.0.0 (2025-01-17)
- 🎉 多平台架构重构
- ✅ ChatGPT 平台完整支持
- 🏗️ Gemini/Claude/DeepSeek 基础框架
- 🎨 全新 UI 设计
- 📦 TypeScript + Vite 构建系统
