'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * 将UTC格式的时区转换为IANA标准时区名称
 * @param {string} utcOffset - 格式如 "UTC+8" 的时区
 * @returns {string} IANA标准时区名称，转换失败则返回系统默认时区
 */
const convertToIANATimezone = (utcOffset) => {
  if (!utcOffset || typeof utcOffset !== 'string') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  
  try {
    // 匹配UTC+/-格式的时区字符串
    const match = utcOffset.match(/^UTC([+-])(\d+)$/);
    if (!match) {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    
    const sign = match[1]; // + 或 -
    const hours = parseInt(match[2], 10);
    
    // 常用时区映射
    const timezoneMap = {
      'UTC+8': 'Asia/Shanghai',    // 中国标准时间
      'UTC+0': 'Europe/London',    // 格林威治标准时间
      'UTC-8': 'America/Los_Angeles', // 太平洋标准时间
      'UTC-5': 'America/New_York',  // 东部标准时间
      'UTC+1': 'Europe/Paris',      // 中欧标准时间
      'UTC+9': 'Asia/Tokyo',        // 日本标准时间
      'UTC+10': 'Australia/Sydney', // 澳大利亚东部标准时间
      'UTC+5.5': 'Asia/Kolkata',    // 印度标准时间
      'UTC+7': 'Asia/Bangkok',      // 东南亚标准时间
      'UTC+3': 'Europe/Moscow'      // 莫斯科标准时间
    };
    
    // 尝试从映射中获取时区
    if (timezoneMap[utcOffset]) {
      return timezoneMap[utcOffset];
    }
    
    // 如果没有精确匹配，尝试根据偏移量猜测一个合理的时区
    if (sign === '+') {
      if (hours >= 8 && hours <= 9) return 'Asia/Shanghai';
      if (hours >= 0 && hours <= 1) return 'Europe/London';
      if (hours >= 5 && hours <= 6) return 'Asia/Dhaka';
      if (hours >= 2 && hours <= 3) return 'Europe/Istanbul';
    } else {
      if (hours >= 7 && hours <= 8) return 'America/Los_Angeles';
      if (hours >= 4 && hours <= 5) return 'America/New_York';
    }
    
    // 默认返回系统时区
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('时区转换错误:', error);
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
};

/**
 * 获取UTC偏移量的小时数
 * @param {string} utcOffset - 格式如 "UTC+8" 的时区
 * @returns {number} 小时偏移量，如 +8 或 -5
 */
const getHourOffset = (utcOffset) => {
  if (!utcOffset || typeof utcOffset !== 'string') {
    return 0;
  }
  
  const match = utcOffset.match(/^UTC([+-])(\d+)$/);
  if (!match) return 0;
  
  const sign = match[1] === '+' ? 1 : -1;
  return sign * parseInt(match[2], 10);
};

/**
 * 获取用户的时区设置
 * @returns {Object} 包含用户时区和相关函数的对象
 */
export function useUserTimezone() {
  const [userTimezone, setUserTimezone] = useState(null);
  const [utcOffset, setUtcOffset] = useState("");
  const [hourFormat, setHourFormat] = useState('24h'); // 默认24小时制
  const [loading, setLoading] = useState(true);

  // 从用户 metadata 获取时区设置
  useEffect(() => {
    const fetchUserTimezone = async () => {
      try {
        setLoading(true);
        // 直接从auth获取用户信息，包含metadata
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('获取用户信息失败:', userError);
          // 使用系统默认时区作为回退
          setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
          setUtcOffset("");
          return;
        }
        
        // 从用户metadata中获取时区设置
        if (user.user_metadata?.timezone) {
          // 保存原始UTC偏移量
          setUtcOffset(user.user_metadata.timezone);
          
          // 设置时间格式（12/24小时制）
          if (user.user_metadata?.hourFormat) {
            setHourFormat(user.user_metadata.hourFormat);
          }
          
          // 将UTC格式的时区转换为IANA标准时区名称
          const ianaTimezone = convertToIANATimezone(user.user_metadata.timezone);
          setUserTimezone(ianaTimezone);
        } else {
          // 如果用户没有设置时区，使用系统默认时区
          setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
          setUtcOffset("");
        }
      } catch (error) {
        console.error('获取时区时出错:', error);
        setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        setUtcOffset("");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserTimezone();
  }, []);
  
  /**
   * 直接使用UTC偏移量手动调整时间，而不依赖于timeZone参数
   * @param {Date|string} dateInput - 日期对象或日期字符串
   * @returns {Date} 调整后的日期对象
   */
  const adjustTimeByOffset = (dateInput) => {
    if (!dateInput) return new Date();
    
    const date = new Date(dateInput);
    
    // 如果没有指定UTC偏移量，则返回原始日期
    if (!utcOffset) return date;
    
    try {
      // 获取UTC偏移量的小时数
      const offsetHours = getHourOffset(utcOffset);
      
      // 创建一个新的UTC日期
      const utcDate = new Date(date.toUTCString());
      
      // 根据偏移量调整小时
      utcDate.setUTCHours(utcDate.getUTCHours() + offsetHours);
      
      return utcDate;
    } catch (error) {
      console.error('时间调整错误:', error);
      return date;
    }
  };
  
  // 格式化时间为用户时区的本地时间字符串
  const formatToUserTimezone = (timestamp, options = {}) => {
    if (!timestamp) return '';
    
    try {
      // 手动根据UTC偏移量调整时间
      const adjustedDate = adjustTimeByOffset(timestamp);
      
      // 默认显示时间选项
      const defaultOptions = { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: hourFormat === '12h' // 根据用户偏好设置12/24小时制
      };
      
      // 不使用timeZone参数，因为我们已经手动调整了时间
      return adjustedDate.toLocaleTimeString(undefined, { ...defaultOptions, ...options });
    } catch (error) {
      console.error('格式化时间错误:', error);
      return new Date(timestamp).toLocaleTimeString();
    }
  };
  
  // 格式化完整日期和时间
  const formatDateToUserTimezone = (timestamp, options = {}) => {
    if (!timestamp) return '';
    
    try {
      // 手动根据UTC偏移量调整时间
      const adjustedDate = adjustTimeByOffset(timestamp);
      
      // 默认显示日期和时间选项
      const defaultOptions = { 
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit',
        hour12: hourFormat === '12h' // 根据用户偏好设置12/24小时制
      };
      
      // 不使用timeZone参数，因为我们已经手动调整了时间
      return adjustedDate.toLocaleString(undefined, { ...defaultOptions, ...options });
    } catch (error) {
      console.error('格式化日期时间错误:', error);
      return new Date(timestamp).toLocaleString();
    }
  };

  return {
    userTimezone,
    utcOffset,
    hourFormat,
    loading,
    formatToUserTimezone,
    formatDateToUserTimezone,
    adjustTimeByOffset
  };
} 