'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

/**
 * 用于动态修改页面标题和favicon的hook
 * 可以显示未读消息数和当前会话信息
 * 
 * @param {object} options - 钩子配置选项
 * @param {number} options.unreadCount - 未读消息数量
 * @param {object} options.currentSession - 当前选中的会话
 * @returns {void} - 这个钩子不返回任何值，直接修改document
 */
export function useDynamicMetadata({ unreadCount, currentSession }) {
  const t = useTranslations('Chat');
  // 记录上一次的未读计数，用于检测新消息
  const [prevUnreadCount, setPrevUnreadCount] = useState(unreadCount);
  const [notificationPermission, setNotificationPermission] = useState('default');
  
  // 请求通知权限
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        // 等待用户交互后请求权限
        const handleUserInteraction = () => {
          Notification.requestPermission().then(permission => {
            setNotificationPermission(permission);
            // 获得权限后移除事件监听器
            document.removeEventListener('click', handleUserInteraction);
          });
        };
        
        document.addEventListener('click', handleUserInteraction);
        return () => {
          document.removeEventListener('click', handleUserInteraction);
        };
      }
    }
  }, []);
  
  // 监测未读消息变化
  useEffect(() => {
    if (unreadCount > prevUnreadCount) {
      // 有新消息，尝试发送通知
      if (notificationPermission === 'granted' && document.visibilityState !== 'visible') {
        try {
          const notification = new Notification('Team Sync', {
            body: t('newMessage', { count: unreadCount }),
            icon: '/logo.png'
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
          
          // 5秒后自动关闭通知
          setTimeout(() => notification.close(), 5000);
        } catch (e) {
          console.error('无法发送通知:', e);
        }
      }
    }
    
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, prevUnreadCount, notificationPermission, t]);
  
  // 修改标题和favicon
  useEffect(() => {
    // 只在client端执行
    if (typeof window !== 'undefined') {
      const originalTitle = "Team Sync";
      let newTitle = originalTitle;
      
      // 如果有当前会话，显示会话名称
      const sessionName = currentSession ? (
        currentSession.type === 'AI' 
          ? t('aiAssistant')
          : currentSession.type === 'PRIVATE'
            ? (currentSession.participants && currentSession.participants[0]?.name || t('privateChat'))
            : (currentSession.name || t('groupChat'))
      ) : null;
      
      if (sessionName) {
        newTitle = `${sessionName} | ${originalTitle}`;
      }
      
      // 如果有未读消息，在标题前显示未读数
      if (unreadCount > 0) {
        document.title = `(${unreadCount}) ${newTitle}`;
        
        // 寻找现有的favicon链接
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          // 如果不存在，创建一个新的
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        
        // 保存原始favicon以便清理
        const originalFavicon = link.href;
        
        // 创建带有未读数的favicon
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // 加载原始favicon
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // 绘制原始图标
          ctx.drawImage(img, 0, 0, 32, 32);
          
          // 添加红色圆形背景
          ctx.beginPath();
          ctx.arc(24, 8, 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#FF4D4F';
          ctx.fill();
          
          // 添加未读计数
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(unreadCount > 99 ? '99+' : unreadCount.toString(), 24, 8);
          
          // 设置为新的favicon
          link.href = canvas.toDataURL('image/png');
        };
        
        // 设置图像源，尝试加载原始favicon
        try {
          img.src = originalFavicon || '/logo.png';
        } catch (e) {
          // 如果无法加载原始favicon，使用一个空白背景
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, 32, 32);
          
          // 添加红色圆形背景
          ctx.beginPath();
          ctx.arc(24, 8, 8, 0, 2 * Math.PI);
          ctx.fillStyle = '#FF4D4F';
          ctx.fill();
          
          // 添加未读计数
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(unreadCount > 99 ? '99+' : unreadCount.toString(), 24, 8);
          
          // 设置为新的favicon
          link.href = canvas.toDataURL('image/png');
        }
        
        // 清理函数
        return () => {
          document.title = originalTitle;
          if (originalFavicon) {
            link.href = originalFavicon;
          }
        };
      } else {
        // 无未读消息时显示会话标题
        document.title = newTitle;
      }
      
      return () => {
        document.title = originalTitle;
      };
    }
  }, [unreadCount, currentSession, t]);
} 