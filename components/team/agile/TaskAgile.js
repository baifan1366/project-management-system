"use client";

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import SprintPlanning from './SprintPlanning';
import AgileTools from './AgileTools';
import { fetchTeamAgile, fetchAgileRoles, fetchAgileMembers } from '@/lib/redux/features/agileSlice';
import { useDispatch, useSelector } from 'react-redux';

const TaskAgile = ({ teamId }) => {
  const t = useTranslations('Agile');
  const [currentSprint, setCurrentSprint] = useState(null);
  // 添加请求跟踪
  const membersFetchedRef = useRef({});
  
  const dispatch = useDispatch();
  const { 
    teamAgile, 
    agileRoles, 
    agileMembers, 
    teamAgileStatus, 
    agileRolesStatus,
    agileMembersStatus,
    error 
  } = useSelector(state => state.agiles);
  
  // 获取团队的敏捷数据
  useEffect(() => {
    if (teamId) {      
      // 执行并跟踪API调用
      const action1 = dispatch(fetchTeamAgile(teamId));
      const action2 = dispatch(fetchAgileRoles(teamId));
    }
  }, [teamId, dispatch]);

  // 当团队敏捷数据加载后，如果有敏捷项目，加载其成员
  useEffect(() => {
    if (teamAgile && teamAgile.length > 0) {
      // 查找当前正在进行的冲刺
      const current = teamAgile.find(sprint => sprint.status === 'PENDING');
      if (current) {
        setCurrentSprint(current);
        // 如果该sprint的成员尚未获取，才进行请求
        if (!membersFetchedRef.current[current.id]) {
          membersFetchedRef.current[current.id] = true;
          dispatch(fetchAgileMembers(current.id))
        }
      } else {
        // 如果没有正在进行的冲刺，选择第一个计划中的冲刺
        const planningSprint = teamAgile.find(sprint => sprint.status === 'PLANNING');
        if (planningSprint) {
          setCurrentSprint(planningSprint);
          // 如果该sprint的成员尚未获取，才进行请求
          if (!membersFetchedRef.current[planningSprint.id]) {
            membersFetchedRef.current[planningSprint.id] = true;
            dispatch(fetchAgileMembers(planningSprint.id))
          } 
        } else if (teamAgile[0]) {
          // 如果没有计划中的冲刺，选择第一个冲刺
          setCurrentSprint(teamAgile[0]);
          // 如果该sprint的成员尚未获取，才进行请求
          if (!membersFetchedRef.current[teamAgile[0].id]) {
            membersFetchedRef.current[teamAgile[0].id] = true;
            dispatch(fetchAgileMembers(teamAgile[0].id))
          } 
        } 
      }
    }
  }, [teamAgile, dispatch]);

  // 选择敏捷或者sprint时获取相关成员数据
  useEffect(() => {
    const fetchAgileData = async () => {
      if (currentSprint && currentSprint.id) {
        // 检查是否已经请求过该sprint的成员
        if (!membersFetchedRef.current[currentSprint.id]) {
          // 获取该sprint的敏捷成员
          try {
            membersFetchedRef.current[currentSprint.id] = true;
            dispatch(fetchAgileMembers(currentSprint.id));
          } catch (error) {
            console.error('获取敏捷成员失败:', error);
          }
        } 
      }
    };
    
    fetchAgileData();
  }, [currentSprint, dispatch]);

  // 创建新的冲刺
  const handleCreateSprint = async (sprintData) => {
    try {
      // 实际应用中，这里应该调用API保存到数据库
      const response = await fetch('/api/teams/agile/sprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          team_id: teamId,
          name: sprintData.name,
          start_date: sprintData.startDate,
          duration: parseInt(sprintData.duration),
          goal: sprintData.goal,
          status: 'PLANNING',
          task_ids: [],
          created_by: sprintData.created_by || user.id
        }),
      });

      if (!response.ok) {
        console.error('【创建冲刺】请求失败, status:', response.status);
        throw new Error('创建冲刺失败');
      }
      
      const newSprint = await response.json();
      
      // 重新加载团队敏捷数据
      dispatch(fetchTeamAgile(teamId))
      
      toast.success(t('createSprintSuccess'));
      return newSprint;
    } catch (error) {
      console.error('【创建冲刺】发生错误:', error);
      toast.error(t('createSprintError'));
      return null;
    }
  };

  // 开始冲刺
  const handleStartSprint = async (sprintId) => {
    try {
      const response = await fetch(`/api/teams/agile/sprint/${sprintId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'PENDING'
        }),
      });

      if (!response.ok) {
        console.error('【开始冲刺】请求失败, status:', response.status);
        throw new Error('开始冲刺失败');
      }
            
      // 重新加载团队敏捷数据
      dispatch(fetchTeamAgile(teamId))
      
      toast.success(t('startSprintSuccess'));
    } catch (error) {
      console.error('【开始冲刺】发生错误:', error);
      toast.error(t('startSprintError'));
    }
  };

  // 完成冲刺
  const handleCompleteSprint = async (sprintId) => {
    try {
      const response = await fetch(`/api/teams/agile/sprint/${sprintId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'RETROSPECTIVE'
        }),
      });

      if (!response.ok) {
        console.error('【完成冲刺】请求失败, status:', response.status);
        throw new Error('完成冲刺失败');
      }
            
      // 重新加载团队敏捷数据
      dispatch(fetchTeamAgile(teamId))
      
      setCurrentSprint(null);
      
      toast.success(t('sprintCompletedSuccess'));
    } catch (error) {
      console.error('【完成冲刺】发生错误:', error);
      toast.error(t('sprintCompletedError'));
    }
  };

  // 刷新团队成员数据
  const handleUpdateMembers = (sprintId) => {
    if (sprintId) {
      // 重置缓存状态，强制重新获取
      membersFetchedRef.current[sprintId] = false;
      dispatch(fetchAgileMembers(sprintId))
    }
  };

  // 判断整体加载状态
  const isLoading = teamAgileStatus === 'loading' || agileRolesStatus === 'loading';
  const hasFailed = teamAgileStatus === 'failed' || agileRolesStatus === 'failed';

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <AgileTools 
          currentSprint={currentSprint} 
          onStartSprint={handleStartSprint}
          onCompleteSprint={handleCompleteSprint}
        />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <p>{t('loading')}</p>
        </div>
      ) : hasFailed ? (
        <div className="text-red-500 text-center">
          <p>{t('loadError')}: {error}</p>
        </div>
      ) : (
        <SprintPlanning 
          teamId={teamId}
          sprints={teamAgile || []}
          currentSprint={currentSprint}
          agileRoles={agileRoles || []}
          agileMembers={agileMembers || []}
          onCreateSprint={handleCreateSprint}
          onStartSprint={handleStartSprint}
          onCompleteSprint={handleCompleteSprint}
          onUpdateMembers={handleUpdateMembers}
        />
      )}
    </div>
  );
};

export default TaskAgile;
