/**
 * 事件总线
 * 提供发布-订阅模式的事件系统，用于组件间通信
 */

import {
  EventType,
  EventDataMap,
  EventCallback,
  EventListenerOptions,
} from '@/types/Events';
import { Logger } from '@/utils/logger';

/**
 * 事件监听器信息
 */
interface EventListener<T extends EventType> {
  callback: EventCallback<T>;
  options: EventListenerOptions;
  id: string;
}

/**
 * EventBus 类（单例）
 */
export class EventBus {
  private static instance: EventBus | null = null;
  private listeners: Map<EventType, EventListener<any>[]> = new Map();
  private eventHistory: Map<EventType, any[]> = new Map();
  private maxHistorySize = 10;

  /**
   * 私有构造函数（单例模式）
   */
  private constructor() {
    Logger.debug('EventBus', 'EventBus instance created');
  }

  /**
   * 获取 EventBus 单例
   */
  static getInstance(): EventBus {
    if (!this.instance) {
      this.instance = new EventBus();
    }
    return this.instance;
  }

  /**
   * 订阅事件
   */
  on<T extends EventType>(
    event: T,
    callback: EventCallback<T>,
    options: EventListenerOptions = {}
  ): string {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const id = this.generateId();
    const listener: EventListener<T> = {
      callback,
      options,
      id,
    };

    const listeners = this.listeners.get(event)!;
    listeners.push(listener);

    // 按优先级排序（优先级高的先执行）
    listeners.sort((a, b) => {
      const priorityA = a.options.priority || 0;
      const priorityB = b.options.priority || 0;
      return priorityB - priorityA;
    });

    Logger.debug('EventBus', `Listener added for event: ${event}`, { id, options });

    return id;
  }

  /**
   * 订阅一次性事件
   */
  once<T extends EventType>(
    event: T,
    callback: EventCallback<T>,
    options: EventListenerOptions = {}
  ): string {
    return this.on(event, callback, { ...options, once: true });
  }

  /**
   * 取消订阅
   */
  off(eventOrId: EventType | string, listenerId?: string): void {
    if (listenerId) {
      // 取消特定事件的特定监听器
      const listeners = this.listeners.get(eventOrId as EventType);
      if (listeners) {
        const index = listeners.findIndex((l) => l.id === listenerId);
        if (index !== -1) {
          listeners.splice(index, 1);
          Logger.debug('EventBus', `Listener removed: ${listenerId}`);
        }
      }
    } else {
      // 取消所有监听器（通过 ID）
      for (const [_event, listeners] of this.listeners.entries()) {
        const index = listeners.findIndex((l) => l.id === eventOrId);
        if (index !== -1) {
          listeners.splice(index, 1);
          Logger.debug('EventBus', `Listener removed: ${eventOrId}`);
          return;
        }
      }
    }
  }

  /**
   * 发布事件
   */
  emit<T extends EventType>(event: T, data: EventDataMap[T]): void {
    Logger.debug('EventBus', `Event emitted: ${event}`, data);

    // 记录事件历史
    this.recordEvent(event, data);

    const listeners = this.listeners.get(event);
    if (!listeners || listeners.length === 0) {
      Logger.debug('EventBus', `No listeners for event: ${event}`);
      return;
    }

    // 执行所有监听器
    const listenersToRemove: string[] = [];

    for (const listener of listeners) {
      try {
        listener.callback(data);

        // 如果是一次性监听器，标记为移除
        if (listener.options.once) {
          listenersToRemove.push(listener.id);
        }
      } catch (error) {
        Logger.error(
          'EventBus',
          `Error in listener for event: ${event}`,
          error as Error,
          { listenerId: listener.id }
        );
      }
    }

    // 移除一次性监听器
    if (listenersToRemove.length > 0) {
      const remainingListeners = listeners.filter(
        (l) => !listenersToRemove.includes(l.id)
      );
      this.listeners.set(event, remainingListeners);
    }
  }

  /**
   * 清除所有监听器
   */
  clear(event?: EventType): void {
    if (event) {
      this.listeners.delete(event);
      Logger.debug('EventBus', `Cleared all listeners for event: ${event}`);
    } else {
      this.listeners.clear();
      Logger.debug('EventBus', 'Cleared all listeners');
    }
  }

  /**
   * 获取事件的监听器数量
   */
  listenerCount(event: EventType): number {
    return this.listeners.get(event)?.length || 0;
  }

  /**
   * 获取所有注册的事件类型
   */
  getEvents(): EventType[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 获取事件历史
   */
  getHistory<T extends EventType>(event: T): EventDataMap[T][] {
    return (this.eventHistory.get(event) || []) as EventDataMap[T][];
  }

  /**
   * 记录事件历史
   */
  private recordEvent<T extends EventType>(
    event: T,
    data: EventDataMap[T]
  ): void {
    if (!this.eventHistory.has(event)) {
      this.eventHistory.set(event, []);
    }

    const history = this.eventHistory.get(event)!;
    history.push(data);

    // 限制历史记录大小
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `listener_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 重置 EventBus（用于测试）
   */
  static reset(): void {
    if (this.instance) {
      this.instance.listeners.clear();
      this.instance.eventHistory.clear();
      Logger.debug('EventBus', 'EventBus reset');
    }
  }

  /**
   * 销毁 EventBus 实例
   */
  static destroy(): void {
    if (this.instance) {
      this.instance.clear();
      this.instance = null;
      Logger.debug('EventBus', 'EventBus destroyed');
    }
  }
}
