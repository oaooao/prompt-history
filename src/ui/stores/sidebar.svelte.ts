/**
 * Svelte 5 Runes 状态管理
 * 管理侧边栏的状态和交互逻辑
 */

import { type Prompt } from '@/types/Prompt';

class SidebarState {
  prompts = $state<Prompt[]>([]);
  isCollapsed = $state(false);
  currentActiveId = $state<string | null>(null);

  // 计算属性：当前激活的 Prompt
  activePrompt = $derived(
    this.prompts.find((p) => p.id === this.currentActiveId) || null
  );

  // 计算属性：Prompt 数量
  promptCount = $derived(this.prompts.length);

  constructor() {
    // 从 localStorage 恢复折叠状态
    const collapsed = localStorage.getItem('ph-sidebar-collapsed');
    if (collapsed === 'true') {
      this.isCollapsed = true;
    }
  }

  /**
   * 切换侧边栏折叠状态
   */
  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    localStorage.setItem('ph-sidebar-collapsed', String(this.isCollapsed));
  }

  /**
   * 设置当前激活的 Prompt
   */
  setActive(id: string | null) {
    this.currentActiveId = id;
  }

  /**
   * 更新 Prompts 数据
   */
  updatePrompts(newPrompts: Prompt[]) {
    this.prompts = newPrompts;
  }
}

// 导出单例实例
export const sidebarState = new SidebarState();
