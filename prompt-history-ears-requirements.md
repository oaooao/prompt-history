# Prompt History 浏览器扩展 - EARS 需求文档

**版本**: v2.0.0
**创建日期**: 2025-11-20
**文档类型**: 需求规格说明（基于 EARS 语法）

---

## 📋 项目概述

Prompt History 是一个支持多平台的浏览器扩展，用于自动提取和管理 AI 聊天平台上的用户 Prompts。本文档采用 EARS (Easy Approach to Requirements Syntax) 格式,基于已实现功能倒推生成，旨在提供清晰、可测试的需求规格。

### 支持平台
- ChatGPT (chatgpt.com, chat.openai.com)
- Gemini (gemini.google.com)
- Claude (claude.ai)
- DeepSeek (chat.deepseek.com)
- Qwen CN - 通义千问 (tongyi.com)
- Qwen International (chat.qwen.ai)
- Kimi - 月之暗面 (kimi.com, kimi.moonshot.cn)
- Doubao - 豆包 (doubao.com)

### 技术栈
- UI 框架: Svelte 5 with Runes
- 构建工具: Vite 5 + TypeScript 5.9
- 运行时: Chrome Extension Manifest V3
- 包管理器: Bun

---

## 🎯 用户故事与验收标准

### 用户故事 1: 多平台自动检测与支持

**As a** AI 聊天平台用户
**I want to** 扩展能够自动识别我正在使用的平台
**So that** 无需手动配置即可开始使用 Prompt 提取功能

#### 验收标准

##### Ubiquitous 需求（系统基础属性）

1. The **扩展** shall 支持至少 8 个主流 AI 聊天平台（ChatGPT、Gemini、Claude、DeepSeek、Qwen CN、Qwen International、Kimi、Doubao）

2. The **扩展** shall 为每个支持的平台维护独立的配置，包括 URL 模式、DOM 选择器、API 端点（如适用）和 UI 主题颜色

3. The **平台检测模块** shall 使用多种检测策略，包括 URL 模式匹配、DOM 特征检测和混合检测

4. The **平台检测模块** shall 为每个检测结果计算置信度评分（0-1 范围）

##### Event-driven 需求（事件触发的行为）

5. When **用户访问支持的 AI 聊天平台网页**，the **扩展** shall 自动执行平台检测流程

6. When **平台检测成功（置信度 > 0.5）**，the **扩展** shall 创建对应的平台适配器实例

7. When **平台检测失败或置信度过低**，the **扩展** shall 记录警告日志并退出初始化流程

8. When **页面 URL 的 pathname 发生变化**，the **扩展** shall 重新评估当前平台并更新适配器（如需要）

##### State-driven 需求（状态驱动的行为）

9. While **扩展处于已初始化状态且平台已识别**，the **扩展** shall 启用 Prompt 提取功能

10. While **用户浏览器窗口宽度小于 1280px**，the **扩展** shall 隐藏侧边栏 UI 以避免布局冲突

##### Unwanted behavior 需求（错误处理）

11. If **平台检测抛出异常**，then the **扩展** shall 捕获错误、记录到日志系统并返回 UNKNOWN 平台类型

12. If **用户访问不受支持的网站**，then the **扩展** shall 不加载任何 UI 组件或启动提取流程

13. If **多个平台检测策略返回冲突结果**，then the **扩展** shall 选择置信度最高的结果

##### Optional feature 需求（可选功能）

14. Where **Debug 模式已启用（localStorage 'prompt-history:debug' = 'true'）**，the **扩展** shall 在控制台输出详细的平台检测日志，包括所有策略的评分结果

---

### 用户故事 2: 自动提取用户 Prompts

**As a** AI 聊天平台用户
**I want to** 扩展自动提取我发送的所有 Prompt 文本
**So that** 我可以轻松回顾和管理我的提问历史

#### 验收标准

##### Ubiquitous 需求（系统基础属性）

1. The **提取系统** shall 支持三种提取策略：全量提取（FULL）、增量提取（INCREMENTAL）和视口提取（VIEWPORT）

2. The **提取系统** shall 为每个提取的 Prompt 生成唯一标识符，格式为 `{timestamp}-{contentHash}-{domIndex}`

3. The **提取系统** shall 提取的 Prompt 数据结构包含以下字段：id、content、timestamp、platformType、element（DOM 引用）

4. The **提取系统** shall 过滤 DOM 中的无效元素，包括 BUTTON、SVG、SCRIPT、STYLE、NOSCRIPT、IMG、VIDEO、AUDIO 标签

5. The **提取系统** shall 对提取的文本内容进行规范化处理，包括去除首尾空白、合并多余空格和去除零宽字符

##### Event-driven 需求（事件触发的行为）

6. When **页面 DOM 发生变化且变化节点不属于扩展自身 UI**，the **提取系统** shall 在 500ms 防抖后触发增量提取流程

7. When **URL 的 pathname 变化（对话切换）**，the **提取系统** shall 清空现有缓存并执行全量提取

8. When **提取流程首次执行且结果为空**，the **提取系统** shall 在 1000ms 后自动重试一次（应对慢加载 DOM）

9. When **提取流程完成且获得新 Prompts**，the **提取系统** shall 触发 `PROMPTS_UPDATED` 事件通知订阅者

##### State-driven 需求（状态驱动的行为）

10. While **提取流程正在执行中（isExtracting = true）**，the **提取系统** shall 拒绝新的提取请求并立即返回当前运行的 Promise（防止重入）

11. While **提取缓存有效期内（5 秒 TTL）且内容未变化**，the **提取系统** shall 直接返回缓存结果而不执行 DOM 扫描

12. While **MutationObserver 已启动**，the **提取系统** shall 持续监听指定容器的子树变化、属性变化和文本内容变化

##### Unwanted behavior 需求（错误处理）

13. If **提取流程执行超过 10 秒**，then the **提取系统** shall 中止操作、记录超时错误并返回空数组

14. If **DOM 选择器未找到有效的容器元素**，then the **提取系统** shall 降级使用 document.body 作为查询根节点

15. If **提取过程中抛出未捕获异常**，then the **提取系统** shall 捕获错误、记录堆栈信息、返回空数组并将状态重置为 IDLE

16. If **检测到 DOM 中存在两个完全相同的 Prompt 内容（60 秒时间窗口内）**，then the **提取系统** shall 仅保留最早的一条，丢弃重复项

##### Optional feature 需求（可选功能）

17. Where **平台支持 API 提取且配置中启用（enableAPIExtraction = true）**，the **提取系统** shall 优先尝试通过 API 获取对话数据

18. Where **Debug 模式已启用**，the **提取系统** shall 在每次提取后输出提取结果统计，包括新增数量、去重数量和总耗时

---

### 用户故事 3: 侧边栏 UI 展示与交互

**As a** AI 聊天平台用户
**I want to** 在页面侧边看到清晰的 Prompt 列表
**So that** 我可以快速浏览和管理所有提取的 Prompts

#### 验收标准

##### Ubiquitous 需求（系统基础属性）

1. The **侧边栏** shall 固定定位在页面右侧，宽度为 240px，高度为视口 100%

2. The **侧边栏** shall 包含以下子组件：SidebarHeader（头部操作栏）、PromptList（列表容器）、CompactCard（折叠状态浮动卡片）

3. The **侧边栏** shall 使用毛玻璃效果（backdrop-filter: blur(10px)）和半透明背景（rgba）

4. The **侧边栏** shall 在首次显示时应用淡入动画（opacity 0 → 1，时长 150ms）

5. The **Prompt 列表项** shall 默认显示前 60 个字符的预览文本，超出部分用省略号（...）表示

##### Event-driven 需求（事件触发的行为）

6. When **用户点击 Prompt 列表项**，the **侧边栏** shall 平滑滚动页面至对应的原始 DOM 元素位置

7. When **用户点击头部的折叠按钮**，the **侧边栏** shall 收起为浮动卡片，并将折叠状态保存到 localStorage

8. When **用户点击浮动卡片**，the **侧边栏** shall 从折叠状态展开为完整列表

9. When **接收到 PROMPTS_UPDATED 事件**，the **侧边栏** shall 更新内部状态并重新渲染 Prompt 列表

10. When **用户悬停在 Prompt 列表项上**，the **侧边栏** shall 显示该项的复制按钮并应用悬停样式（背景色变化）

##### State-driven 需求（状态驱动的行为）

11. While **侧边栏处于折叠状态（isCollapsed = true）**，the **侧边栏** shall 仅显示 CompactCard 组件，隐藏完整列表

12. While **某个 Prompt 被标记为激活状态（currentActiveId 匹配）**，the **侧边栏** shall 为该列表项添加左侧蓝色指示条和深色背景高亮

13. While **页面滚动且可滚动容器中的内容位置变化**，the **侧边栏** shall 在 150ms 防抖后自动高亮最接近视口中心的 Prompt 项

14. While **Prompt 数量为 0**，the **侧边栏** shall 不渲染任何 UI 元素（保持隐藏）

##### Unwanted behavior 需求（错误处理）

15. If **点击的 Prompt 对应的 DOM 元素已被移除**，then the **侧边栏** shall 在控制台记录警告并取消滚动操作

16. If **滚动同步检测到目标容器不存在**，then the **侧边栏** shall 降级使用 window 对象作为滚动容器

17. If **组件销毁时滚动监听器未正确清理**，then the **侧边栏** shall 在 $effect cleanup 钩子中强制解绑所有事件监听器

##### Optional feature 需求（可选功能）

18. Where **用户使用键盘导航（Enter 或 Space 键）聚焦到 Prompt 列表项**，the **侧边栏** shall 触发与鼠标点击相同的跳转行为

19. Where **页面主内容容器存在且侧边栏展开**，the **侧边栏** shall 自动调整主内容的右侧 margin 为 240px 以避免遮挡

---

### 用户故事 4: 复制 Prompt 到剪贴板

**As a** AI 聊天平台用户
**I want to** 快速复制单个或多个 Prompts
**So that** 我可以在其他应用中使用或分享这些内容

#### 验收标准

##### Ubiquitous 需求（系统基础属性）

1. The **复制功能** shall 支持两种复制模式：单个 Prompt 复制和批量复制（全部 Prompts）

2. The **复制功能** shall 优先使用现代 Clipboard API（navigator.clipboard.writeText），不支持时降级到 document.execCommand('copy')

3. The **复制按钮** shall 使用 SVG 图标，默认显示复制图标，成功后临时切换为勾选图标（2 秒）

4. The **批量复制** shall 使用 `\n\n---\n\n` 作为多个 Prompts 之间的分隔符

##### Event-driven 需求（事件触发的行为）

5. When **用户点击 Prompt 列表项上的复制按钮**，the **复制功能** shall 将该 Prompt 的完整文本内容复制到系统剪贴板

6. When **用户点击头部的"复制全部"按钮**，the **复制功能** shall 将所有 Prompts 按时间顺序连接后复制到剪贴板

7. When **复制操作成功完成**，the **复制按钮** shall 将图标切换为绿色勾选标记并在 2 秒后自动恢复原状

8. When **复制操作成功完成**，the **复制功能** shall 触发 `COPIED` 事件并传递复制的内容

##### State-driven 需求（状态驱动的行为）

9. While **复制按钮显示反馈状态（图标为勾选）**，the **复制按钮** shall 保持绿色高亮样式

10. While **用户未悬停在 Prompt 列表项上**，the **复制按钮** shall 保持隐藏状态（opacity: 0）

##### Unwanted behavior 需求（错误处理）

11. If **Clipboard API 不可用且 execCommand 也失败**，then the **复制功能** shall 在控制台记录错误并保持按钮原始状态（不显示成功反馈）

12. If **复制的内容为空字符串或 null**，then the **复制功能** shall 拒绝执行并记录警告日志

##### Optional feature 需求（可选功能）

13. Where **复制按钮作为独立组件被复用**，the **组件** shall 支持通过 props 接收自定义的成功/失败回调函数

14. Where **Debug 模式已启用**，the **复制功能** shall 在每次复制后输出复制内容的长度和类型到控制台

---

### 用户故事 5: 状态管理与持久化

**As a** AI 聊天平台用户
**I want to** 扩展记住我的偏好设置（如折叠状态）
**So that** 每次打开页面时保持一致的用户体验

#### 验收标准

##### Ubiquitous 需求（系统基础属性）

1. The **状态管理系统** shall 使用 Svelte 5 Runes（$state、$derived、$effect）实现响应式状态

2. The **状态管理系统** shall 通过单例模式（SidebarState 类）提供全局共享的状态实例

3. The **状态管理系统** shall 管理以下核心状态：prompts（Prompt 数组）、isCollapsed（折叠状态）、currentActiveId（当前激活 ID）

4. The **状态管理系统** shall 提供计算属性（$derived）：activePrompt（当前激活的 Prompt 对象）、promptCount（Prompt 总数）

5. The **持久化存储** shall 使用 localStorage 保存折叠状态，键名为 'ph-sidebar-collapsed'

##### Event-driven 需求（事件触发的行为）

6. When **SidebarState 实例化**，the **状态管理系统** shall 从 localStorage 读取折叠状态并初始化 isCollapsed

7. When **用户切换折叠状态**，the **状态管理系统** shall 更新 isCollapsed 并立即将新值同步到 localStorage

8. When **外部调用 updatePrompts 方法**，the **状态管理系统** shall 更新 prompts 数组并自动触发所有依赖该状态的计算属性和副作用

##### State-driven 需求（状态驱动的行为）

9. While **prompts 数组发生变化**，the **状态管理系统** shall 自动重新计算 promptCount 和 activePrompt

10. While **currentActiveId 发生变化**，the **状态管理系统** shall 自动重新计算 activePrompt 为对应的 Prompt 对象或 null

##### Unwanted behavior 需求（错误处理）

11. If **localStorage 读取失败（异常或不支持）**，then the **状态管理系统** shall 使用默认值（isCollapsed = false）并记录警告

12. If **localStorage 写入失败（配额超限或权限不足）**，then the **状态管理系统** shall 捕获错误但不中断正常流程

##### Optional feature 需求（可选功能）

13. Where **Debug 模式已启用**，the **状态管理系统** shall 在状态变化时输出前后对比日志到控制台

---

### 用户故事 6: 对话切换自动更新

**As a** AI 聊天平台用户
**I want to** 切换不同对话时自动更新 Prompt 列表
**So that** 总是看到当前对话的正确 Prompts

#### 验收标准

##### Ubiquitous 需求（系统基础属性）

1. The **URL 监听模块** shall 每 500ms 轮询检测当前页面 URL 的 pathname 变化

2. The **对话切换处理流程** shall 包含以下步骤：清空 Store、清空 Adapter 缓存、清空 Coordinator 缓存、隐藏 UI、等待 500ms、重新提取、根据结果显示 UI

##### Event-driven 需求（事件触发的行为）

3. When **URL 的 pathname 发生变化（hash 和 search 参数变化不触发）**，the **扩展** shall 触发 `URL_CHANGED` 事件

4. When **检测到对话切换（URL_CHANGED 事件）**，the **扩展** shall 清空 PromptStore 中的所有 Prompts

5. When **检测到对话切换（URL_CHANGED 事件）**，the **扩展** shall 清空 Adapter 和 Coordinator 的提取缓存

6. When **对话切换清理完成**，the **扩展** shall 延迟 100ms 后隐藏侧边栏 UI（避免与响应式更新冲突）

7. When **对话切换后等待 500ms（页面稳定期）**，the **扩展** shall 执行全量 Prompt 提取

8. When **对话切换后首次提取结果为空**，the **扩展** shall 延迟 1000ms 后执行第二次重试提取

9. When **对话切换后提取到有效 Prompts**，the **扩展** shall 重新显示侧边栏 UI

##### State-driven 需求（状态驱动的行为）

10. While **对话切换流程正在执行**，the **扩展** shall 暂停 MutationObserver 的回调执行（避免干扰）

##### Unwanted behavior 需求（错误处理）

11. If **对话切换后两次提取仍未获得 Prompts**，then the **扩展** shall 保持 UI 隐藏状态并记录调试日志

12. If **URL 监听轮询过程中抛出异常**，then the **扩展** shall 捕获错误、记录日志并继续下一次轮询（不中断监听）

##### Optional feature 需求（可选功能）

13. Where **Debug 模式已启用**，the **URL 监听模块** shall 在每次 URL 变化时输出旧 URL 和新 URL 的对比日志

---

### 用户故事 7: 数据存储与查询

**As a** 开发者（扩展内部模块）
**I want to** 统一的数据存储接口来管理 Prompts
**So that** 各模块可以一致地读写和查询 Prompt 数据

#### 验收标准

##### Ubiquitous 需求（系统基础属性）

1. The **PromptStore** shall 使用单例模式提供全局唯一的存储实例

2. The **PromptStore** shall 提供以下核心方法：setPrompts（全量设置）、addPrompts（追加）、mergePrompts（智能合并）、getPrompts（查询）、clear（清空）

3. The **PromptStore** shall 支持以下查询条件：搜索关键词（search）、时间范围（startTime/endTime）、内容长度范围（minLength/maxLength）

4. The **PromptStore** shall 提供统计方法，返回总数、平均长度、最小长度、最大长度

5. The **PromptStore** shall 支持按时间戳升序或降序排序

##### Event-driven 需求（事件触发的行为）

6. When **调用 setPrompts 方法**，the **PromptStore** shall 替换现有 Prompts 并触发内部观察者通知

7. When **调用 mergePrompts 方法**，the **PromptStore** shall 基于内容指纹去重并保留原有顺序

8. When **调用 search 方法**，the **PromptStore** shall 返回内容包含搜索关键词的所有 Prompts（不区分大小写）

##### State-driven 需求（状态驱动的行为）

9. While **Store 中存在 Prompts**，the **PromptStore** shall 维护内容指纹索引用于快速去重判断

##### Unwanted behavior 需求（错误处理）

10. If **mergePrompts 接收到空数组**，then the **PromptStore** shall 保持现有数据不变（不清空）

11. If **查询条件无效（如 startTime > endTime）**，then the **PromptStore** shall 返回空数组并记录警告

##### Optional feature 需求（可选功能）

12. Where **启用自动去重（autoDeduplicate = true）**，the **PromptStore** shall 在 mergePrompts 时应用 60 秒时间窗口去重规则

13. Where **提供时间窗口参数**，the **PromptStore** shall 在去重时仅比较指定时间窗口内的 Prompts

---

### 用户故事 8: 错误处理与恢复

**As a** AI 聊天平台用户
**I want to** 扩展在遇到错误时能够优雅降级
**So that** 即使部分功能失败也不影响我继续使用浏览器

#### 验收标准

##### Ubiquitous 需求（系统基础属性）

1. The **错误处理系统** shall 捕获全局 JavaScript 错误（window.onerror）和未处理的 Promise 拒绝（unhandledrejection）

2. The **错误处理系统** shall 使用 Logger 模块记录所有错误，包括错误类型、堆栈信息和上下文

3. The **扩展的所有异步操作** shall 使用 try-catch 包裹并在 catch 块中记录详细错误信息

##### Event-driven 需求（事件触发的行为）

4. When **捕获到未处理的 Promise 拒绝**，the **错误处理系统** shall 记录错误并触发 `ERROR_OCCURRED` 事件

5. When **提取流程抛出异常**，the **提取系统** shall 返回空数组并将状态重置为 IDLE

6. When **复制操作失败（Clipboard API 不可用）**，the **复制功能** shall 自动降级到 execCommand 方式重试

##### State-driven 需求（状态驱动的行为）

7. While **提取流程处于超时状态（执行时间 > 10 秒）**，the **提取系统** shall 中止当前操作并重置为可重试状态

##### Unwanted behavior 需求（错误处理）

8. If **DOM 选择器查询失败（返回 null）**，then the **扩展** shall 使用降级选择器或默认容器（document.body）继续执行

9. If **平台适配器初始化失败**，then the **扩展** shall 记录错误并退出，不加载 UI 或启动监听

10. If **localStorage 操作失败**，then the **扩展** shall 使用内存变量作为降级存储并继续运行

11. If **EventBus 的某个监听器抛出异常**，then the **EventBus** shall 捕获错误、记录日志并继续通知其他监听器（错误隔离）

12. If **滚动目标元素已从 DOM 中移除**，then the **侧边栏** shall 取消滚动操作并记录警告

##### Optional feature 需求（可选功能）

13. Where **Debug 模式已启用**，the **错误处理系统** shall 在控制台输出完整的错误堆栈和上下文变量

---

### 用户故事 9: 性能优化与资源管理

**As a** AI 聊天平台用户
**I want to** 扩展高效运行且不影响页面性能
**So that** 我的浏览体验流畅且无延迟

#### 验收标准

##### Ubiquitous 需求（系统基础属性）

1. The **提取系统** shall 使用 5 秒 TTL 缓存机制避免重复 DOM 扫描

2. The **提取系统** shall 使用 Promise Queue 模式防止并发提取导致的资源竞争

3. The **UI 组件** shall 在滚动监听中应用 150ms 防抖减少计算频率

4. The **MutationObserver** shall 在回调中应用 500ms 防抖减少触发频率

5. The **Svelte 组件** shall 在销毁时清理所有事件监听器、Observer 和定时器

##### Event-driven 需求（事件触发的行为）

6. When **组件销毁（$effect cleanup）**，the **Svelte 组件** shall 取消所有防抖函数的待执行回调

7. When **缓存命中（提取缓存有效期内）**，the **提取系统** shall 直接返回缓存结果并跳过 DOM 查询

##### State-driven 需求（状态驱动的行为）

8. While **提取流程正在执行**，the **提取系统** shall 拒绝新请求并返回当前 Promise（避免并发）

9. While **用户快速滚动页面**，the **滚动同步** shall 仅在停止滚动后 150ms 执行高亮计算

##### Unwanted behavior 需求（错误处理）

10. If **提取流程执行时间超过 10 秒**，then the **提取系统** shall 强制中止并释放资源

11. If **MutationObserver 检测到超过 1000 次 DOM 变化/秒**，then the **扩展** shall 暂停监听 5 秒以避免性能崩溃

##### Optional feature 需求（可选功能）

12. Where **Prompt 列表项数量超过 100**，the **UI** shall 启用虚拟滚动（计划中功能，未实现）

13. Where **Debug 模式已启用**，the **提取系统** shall 在每次提取后输出性能指标，包括执行时间、缓存命中率和内存使用

---

### 用户故事 10: 事件通信系统

**As a** 开发者（扩展内部模块）
**I want to** 解耦的事件通信机制
**So that** 模块间可以灵活协作而不产生强依赖

#### 验收标准

##### Ubiquitous 需求（系统基础属性）

1. The **EventBus** shall 使用单例模式提供全局唯一的事件总线实例

2. The **EventBus** shall 支持以下事件类型：PROMPTS_UPDATED、PROMPT_SELECTED、COPIED、URL_CHANGED、SEARCH_QUERY_CHANGED、EXPORT_REQUESTED、ERROR_OCCURRED

3. The **EventBus** shall 支持监听器优先级排序（priority 参数，默认 0）

4. The **EventBus** shall 支持一次性监听器（once 参数）

5. The **EventBus** shall 维护最近 10 条事件历史记录

##### Event-driven 需求（事件触发的行为）

6. When **调用 emit 方法发布事件**，the **EventBus** shall 按优先级顺序通知所有订阅该事件类型的监听器

7. When **一次性监听器被触发**，the **EventBus** shall 在执行回调后自动解绑该监听器

8. When **监听器抛出异常**，the **EventBus** shall 捕获错误并继续通知其他监听器（不中断事件传播）

##### State-driven 需求（状态驱动的行为）

9. While **事件正在传播**，the **EventBus** shall 将事件数据添加到历史记录队列

##### Unwanted behavior 需求（错误处理）

10. If **监听器回调函数为 null 或非函数**，then the **EventBus** shall 拒绝订阅并抛出 TypeError

11. If **emit 调用时无任何监听器订阅该事件**，then the **EventBus** shall 仅记录到历史但不执行任何回调

##### Optional feature 需求（可选功能）

12. Where **Debug 模式已启用**，the **EventBus** shall 在每次事件发布时输出事件类型、数据和监听器数量到控制台

13. Where **调用 getHistory 方法**，the **EventBus** shall 返回最近 10 条事件的类型、时间戳和数据摘要

---

### 用户故事 11: 滚动同步与自动高亮

**As a** AI 聊天平台用户
**I want to** 侧边栏自动高亮当前可见的 Prompt
**So that** 我可以直观知道正在查看哪条对话

#### 验收标准

##### Ubiquitous 需求（系统基础属性）

1. The **滚动同步模块** shall 监听可滚动容器的 scroll 事件（优先级：平台特定容器 > .overflow-y-auto > main > window）

2. The **滚动同步模块** shall 使用 150ms 防抖减少高亮计算频率

3. The **滚动同步模块** shall 基于"最接近视口中心"算法选择激活的 Prompt

##### Event-driven 需求（事件触发的行为）

4. When **可滚动容器发生滚动**，the **滚动同步模块** shall 在 150ms 防抖后计算并更新当前激活的 Prompt ID

5. When **计算出新的激活 Prompt ID**，the **滚动同步模块** shall 调用 SidebarState.setActive 更新状态

6. When **组件销毁**，the **滚动同步模块** shall 移除滚动监听器并取消待执行的防抖回调

##### State-driven 需求（状态驱动的行为）

7. While **页面未滚动（静止状态）**，the **滚动同步模块** shall 不执行任何高亮计算

8. While **视口中没有任何 Prompt 元素可见**，the **滚动同步模块** shall 将激活 ID 设置为 null

##### Unwanted behavior 需求（错误处理）

9. If **检测到的可滚动容器为 null**，then the **滚动同步模块** shall 降级使用 window 对象

10. If **某个 Prompt 的 DOM 元素引用已失效**，then the **滚动同步模块** shall 跳过该 Prompt 并继续计算其他候选

##### Optional feature 需求（可选功能）

11. Where **ChatGPT 平台**，the **滚动同步模块** shall 使用平台特定容器选择器 `div.flex.flex-col.overflow-y-auto`

---

### 用户故事 12: 平台特定适配

**As a** 扩展开发者
**I want to** 每个平台有独立的适配器和提取逻辑
**So that** 可以应对不同平台的 DOM 结构差异

#### 验收标准

##### Ubiquitous 需求（系统基础属性）

1. The **每个平台适配器** shall 实现 IPlatformAdapter 接口，包含 detect、extractPrompts、getConfig、initialize、destroy、observeChanges、stopObserving 方法

2. The **ChatGPT 适配器** shall 使用 `data-message-author-role="user"` 作为用户消息选择器

3. The **Gemini 适配器** shall 使用 `user-query` 自定义元素作为用户消息选择器

4. The **Claude 适配器** shall 使用 `data-testid="user-message"` 作为用户消息选择器

5. The **DeepSeek 适配器** shall 使用 `data-um-id` 属性作为用户消息选择器

6. The **Qwen CN 适配器** shall 识别 CSS Modules 哈希类名（如 `UserMessage--userMessageWrapper--*`）

7. The **Qwen International 适配器** shall 使用语义化类名 `.user-message`

8. The **Kimi 适配器** shall 使用 `.segment-user` 作为用户消息选择器

9. The **Doubao 适配器** shall 使用 `data-message-id` 属性作为用户消息选择器

##### Event-driven 需求（事件触发的行为）

10. When **ChatGPT 平台检测到对话容器切换**，the **ChatGPT 适配器** shall 从初始容器（.react-scroll-to-bottom--css-*）切换到精确容器（div.flex.flex-col.overflow-y-auto）

11. When **平台适配器的 observeChanges 被调用**，the **适配器** shall 启动 MutationObserver 监听 DOM 变化并触发回调

##### State-driven 需求（状态驱动的行为）

12. While **ChatGPT 适配器已检测到精确容器**，the **适配器** shall 使用精确容器进行后续提取和监听

##### Unwanted behavior 需求（错误处理）

13. If **平台特定选择器未匹配到任何元素**，then the **适配器** shall 降级使用通用选择器或返回空数组

##### Optional feature 需求（可选功能）

14. Where **ChatGPT 平台且启用 API 提取**，the **ChatGPT 适配器** shall 尝试从 `/backend-api/conversation/{id}` 获取对话数据

---

## 🔧 技术约束需求

### 浏览器兼容性

**Ubiquitous 需求**

1. The **扩展** shall 兼容 Chrome 88+ 和所有基于 Chromium 的浏览器（Edge、Brave、Opera）

2. The **扩展** shall 使用 Chrome Extension Manifest V3 规范

3. The **扩展** shall 使用 ES2022 语法和 API

**Unwanted behavior 需求**

4. If **浏览器不支持 MutationObserver**，then the **扩展** shall 降级到定时轮询（每 3 秒）检测 DOM 变化

5. If **浏览器不支持 Clipboard API**，then the **复制功能** shall 降级到 document.execCommand('copy')

---

### 构建与部署

**Ubiquitous 需求**

1. The **构建系统** shall 使用 Vite 5 作为打包工具

2. The **构建系统** shall 生成 IIFE 格式的单文件输出（content.js）

3. The **构建系统** shall 支持 TypeScript 路径别名（@/ 映射到 src/）

4. The **构建系统** shall 在生产构建时启用代码压缩和 Tree-shaking

**Event-driven 需求**

5. When **执行 `bun run build`**，the **构建系统** shall 生成 dist/ 目录，包含 content.js、manifest.json 和 icons/

---

### 安全与隐私

**Ubiquitous 需求**

1. The **扩展** shall 仅请求必要的权限：storage、activeTab 和 8 个支持平台的 host_permissions

2. The **扩展** shall 不收集或上传任何用户数据到外部服务器

3. The **扩展** shall 不注入任何追踪脚本或广告代码

4. The **扩展** shall 所有数据处理在本地浏览器环境中完成

**Unwanted behavior 需求**

5. If **检测到跨域请求或数据泄露风险**，then the **扩展** shall 拒绝操作并记录安全警告

---

## 📊 质量属性需求

### 性能

**Ubiquitous 需求**

1. The **提取流程** shall 在 95% 的情况下在 2 秒内完成（正常对话长度 < 50 条）

2. The **UI 渲染** shall 在 100ms 内完成（Prompt 数量 < 100）

3. The **内存占用** shall 不超过 50MB（Prompt 数量 < 500）

**State-driven 需求**

4. While **Prompt 数量 > 100**，the **UI** shall 启用虚拟滚动以保持流畅性（计划中功能）

---

### 可维护性

**Ubiquitous 需求**

1. The **代码库** shall 遵循 TypeScript 严格模式（strict: true）

2. The **代码库** shall 使用 oxlint 进行代码质量检查

3. The **代码库** shall 使用 oxfmt 保持代码格式一致性

4. The **代码库** shall 每个模块包含 JSDoc 注释和类型定义

---

### 可扩展性

**Ubiquitous 需求**

1. The **平台适配架构** shall 支持通过添加新适配器类和配置轻松扩展新平台

2. The **事件系统** shall 支持动态注册新事件类型

**Optional feature 需求**

3. Where **添加新平台支持**，the **开发者** shall 仅需创建适配器类、配置对象并注册到工厂，无需修改核心逻辑

---

### 可测试性

**Ubiquitous 需求**

1. The **核心模块** shall 与 DOM 解耦，支持单元测试

2. The **EventBus** shall 支持重置状态以便测试环境隔离

**Optional feature 需求**

3. Where **运行测试套件**，the **扩展** shall 提供 mock 平台适配器和测试工具函数

---

## 📝 附录

### EARS 模式总结

本文档共包含：

- **Ubiquitous 需求**: 68 条（系统基础属性和约束）
- **Event-driven 需求**: 62 条（事件触发的行为）
- **State-driven 需求**: 29 条（特定状态下的行为）
- **Unwanted behavior 需求**: 44 条（错误处理和异常情况）
- **Optional feature 需求**: 22 条（可选功能和增强特性）

**总计**: 225 条需求

---

### 术语表

| 术语 | 定义 |
|------|------|
| **Prompt** | 用户在 AI 聊天平台上发送的文本输入 |
| **平台适配器** | 针对特定 AI 平台的提取逻辑实现 |
| **提取策略** | FULL（全量）、INCREMENTAL（增量）、VIEWPORT（视口） |
| **Runes** | Svelte 5 的响应式原语（$state、$derived、$effect） |
| **EventBus** | 全局单例事件总线，用于模块间通信 |
| **PromptStore** | 全局单例数据存储，管理所有 Prompt 数据 |
| **TTL** | Time To Live，缓存有效期 |
| **IIFE** | Immediately Invoked Function Expression，立即执行函数表达式 |

---

**文档结束**
