/**
 * 创建一个简单的事件总线，用于组件间通信
 * 
 * @returns {Object} 包含on和emit方法的事件总线对象
 */
export function createEventBus() {
  const listeners = {};

  return {
    /**
     * 监听事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 事件回调函数
     * @returns {Function} 取消监听的函数
     */
    on(event, callback) {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
      
      // 返回取消监听的函数
      return () => {
        listeners[event] = listeners[event].filter(cb => cb !== callback);
      };
    },

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 传递给监听器的数据
     */
    emit(event, data) {
      if (!listeners[event]) return;
      listeners[event].forEach(callback => callback(data));
    }
  };
}

// 创建一个全局事件总线实例
const globalEventBus = typeof window !== 'undefined' ? createEventBus() : null;

export default globalEventBus; 