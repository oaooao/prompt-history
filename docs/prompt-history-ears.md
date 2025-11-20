# Prompt History 扩展 EARS 需求

本文基于现有实现倒推主要功能的用户故事与验收标准，采用 EARS 语法。

## User Story 1：平台自动检测与适配
As a 使用多个 AI 平台的用户, I want to 扩展能自动识别当前平台并加载对应适配器, so that 无需手动切换就能提取我的 Prompts。

- Ubiquitous：The extension shall auto-detect the current chat platform using configured URL 和 DOM 特征规则 before initialization completes.
- Event-driven：When platform detection fails, the extension shall skip adapter creation, log a warning, and stop initialization without rendering the sidebar.
- State-driven：While a supported platform is already detected and an adapter instance exists, the system shall reuse the cached adapter instead of creating a new one.
- Unwanted behavior：If the detected platform is UNKNOWN or unsupported, then the system shall keep the adapter null and avoid prompt extraction attempts.
- Optional：Where a platform type is explicitly provided to the factory, the system shall prefer that type over auto-detection.

## User Story 2：Prompt 提取与协调
As a 聊天中需要回顾输入的用户, I want to 扩展稳定提取我的 Prompts 并在内容变化时自动刷新, so that 我总能看到最新的输入历史。

- Ubiquitous：The system shall route all prompt extraction through ExtractionCoordinator to enforce single in-flight extraction and 5s cache reuse for FULL strategy.
- Event-driven：When DOM MutationObserver callbacks fire, the system shall trigger a force extraction and conditionally render or hide the sidebar based on prompt count and viewport width.
- Event-driven：When the URL pathname changes, the system shall clear store and caches, hide the UI, wait for configured delays, then perform forced extraction (with a scheduled second attempt if still empty).
- State-driven：While an extraction is already running, the system shall return the existing extraction Promise to any new requests instead of starting another.
- Unwanted behavior：If an extraction returns zero prompts on first attempt, then the system shall schedule a second extraction after `secondExtractDelay` milliseconds to mitigate slow DOM loads.
- Optional：Where strategies INCREMENTAL or VIEWPORT are requested, the system shall currently fall back to FULL extraction until specialized logic exists.

## User Story 3：数据存储、去重与事件
As a 想保持历史完整性的用户, I want to 数据存储能智能去重合并并对外发布更新事件, so that 不会丢数据或产生重复。

- Ubiquitous：The system shall manage prompts through PromptStore with content-based deduplication and time-window-aware merge that preserves existing data when new input is empty.
- Event-driven：When setPrompts, addPrompts, or mergePrompts updates data, the system shall apply current filters and emit EventType.PROMPTS_UPDATED with the filtered list.
- State-driven：While autoDeduplicate is enabled, the system shall drop duplicate prompts whose trimmed content matches existing entries (or within the configured time window when merging).
- Unwanted behavior：If a merge request arrives with only duplicates within the time window, then the system shall keep the existing ordered list unchanged.
- Optional：Where filter options include search keywords, time range, or length bounds, the system shall apply them before exposing `getFiltered()` results and emitting events.

## User Story 4：侧边栏 UI 展示与交互
As a 在聊天界面旁快速浏览的用户, I want to 通过侧边栏查看、跳转和复制 Prompts 并控制显示形态, so that 不打断当前对话也能复用输入。

- Ubiquitous：The UI shall mount a Svelte sidebar containing header actions, prompt list with previews, copy controls, and a compact card anchor when applicable.
- State-driven：While prompt count is zero or the viewport width is below `minScreenWidth`, the system shall withhold rendering the sidebar and remove any existing sidebar DOM.
- Event-driven：When a prompt item is clicked or activated via Enter/Space, the system shall scroll to its DOM element, set it active in sidebarState, and emit EventType.PROMPT_SELECTED.
- Unwanted behavior：If the target prompt element is missing during activation, then the system shall log a warning and still update the active state without throwing.
- Optional：Where the user toggles collapse, the system shall persist the collapsed flag to localStorage, adjust main content margin, and show the delayed compact card while collapsed.

## User Story 5：复制操作与反馈
As a 需要复用输入的用户, I want to 一键复制单条或全部 Prompts 并获得可见反馈, so that 可以快速粘贴到其他上下文。

- Ubiquitous：The system shall support copying prompt text via the modern Clipboard API and fall back to `execCommand('copy')` when needed.
- Event-driven：When the user clicks a single-copy or copy-all button, the system shall copy the associated content, flip the isCopied state, and auto-reset it after `copyFeedbackDuration` milliseconds.
- State-driven：While a copy button is in the copied state, the UI shall display the check icon instead of the copy icon.
- Unwanted behavior：If the copy payload is empty or undefined, then the system shall log a warning and return false without altering UI state.
- Optional：Where the Clipboard API is available, the system shall prefer it over the execCommand fallback.
