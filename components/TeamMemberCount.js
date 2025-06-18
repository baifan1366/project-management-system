'use client';

import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { fetchTeamUsers } from '@/lib/redux/features/teamUserSlice';

// 静态缓存存储所有团队的成员计数
const teamMemberCache = {};
// 已请求过的团队ID集合
const requestedTeamIds = new Set();

export default function TeamMemberCount({ teamId }) {
  const [count, setCount] = useState("...");
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);
  const dispatch = useDispatch();
  
  // 确保teamId是单个有效整数
  const singleTeamId = useSingleId(teamId);
  
  // 只在组件挂载时获取一次数据
  useEffect(() => {
    // 组件卸载时更新引用
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // 独立的数据获取effect
  useEffect(() => {
    // 如果ID无效，不执行任何操作
    if (!singleTeamId) {
      console.log(`无效的团队ID: ${teamId}`);
      setCount(0);
      setLoading(false);
      return;
    }
    
    console.log(`组件渲染 - teamId: ${singleTeamId}`);
    
    // 如果已有缓存数据，直接使用
    if (teamMemberCache[singleTeamId] !== undefined) {
      console.log(`使用缓存 - teamId: ${singleTeamId}, 值: ${teamMemberCache[singleTeamId]}`);
      setCount(teamMemberCache[singleTeamId]);
      setLoading(false);
      return;
    }
    
    // 防止重复请求
    if (requestedTeamIds.has(singleTeamId)) {
      console.log(`请求中 - teamId: ${singleTeamId}`);
      return;
    }
    
    // 标记该团队ID已被请求
    requestedTeamIds.add(singleTeamId);
    console.log(`开始请求 - teamId: ${singleTeamId}`);
    
    const fetchData = async () => {
      try {
        console.log(`调用API - teamId: ${singleTeamId}`);
        // 确保传递有效的单个整数ID
        const result = await dispatch(fetchTeamUsers(parseInt(singleTeamId))).unwrap();
        
        // 输出完整响应以检查结构
        console.log(`API返回数据 (teamId: ${singleTeamId}):`, result);
        
        // 非常简单的方法: 如果有users数组属性，使用其长度
        let memberCount = 0;
        
        if (result && result.users && Array.isArray(result.users)) {
          memberCount = result.users.length;
          console.log(`成功获取users数组长度 (teamId: ${singleTeamId}): ${memberCount}`);
        } else if (Array.isArray(result)) {
          memberCount = result.length;
          console.log(`响应是数组 (teamId: ${singleTeamId}), 长度: ${memberCount}`);
        } else {
          console.log(`未找到users数组 (teamId: ${singleTeamId}), 完整数据:`, result);
        }
        
        console.log(`存储结果 - teamId: ${singleTeamId}, count: ${memberCount}`);
        teamMemberCache[singleTeamId] = memberCount;
        setCount(memberCount);
        setLoading(false);
      } catch (error) {
        console.error(`获取失败 - teamId: ${singleTeamId}`, error);
        if (isMounted.current) {
          teamMemberCache[singleTeamId] = 0;
          setCount(0);
          setLoading(false);
        }
      }
    };
    
    fetchData();
  }, [singleTeamId, dispatch]);
  
  return <p className="font-medium">{count}</p>;
}

// 辅助函数：确保获取单个有效的团队ID
function useSingleId(id) {
  const [validId, setValidId] = useState(null);
  
  useEffect(() => {
    if (!id) return;
    
    // 处理可能的逗号分隔列表
    if (typeof id === 'string' && id.includes(',')) {
      // 如果是逗号分隔的列表，取第一个ID
      const firstId = id.split(',')[0].trim();
      console.log(`从列表中提取第一个ID: ${firstId}`);
      setValidId(firstId);
    } else if (typeof id === 'number' || !isNaN(parseInt(id))) {
      // 如果是数字或可解析为数字的字符串
      const numericId = typeof id === 'number' ? id : parseInt(id);
      setValidId(numericId);
    } else {
      console.error(`无效的团队ID格式: ${id}`);
      setValidId(null);
    }
  }, [id]);
  
  return validId;
} 