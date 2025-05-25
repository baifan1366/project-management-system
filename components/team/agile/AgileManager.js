import React, { useState, useEffect } from 'react';
import { Card, Typography } from 'antd';
import { useDispatch } from 'react-redux';
import { resetAgileState } from '../../../lib/redux/features/agileSlice';
import SprintList from './SprintList';
import SprintDetail from './SprintDetail';

const { Title } = Typography;

/**
 * 敏捷管理主组件
 * 整合所有敏捷相关功能
 * 使用Redux管理状态
 */
const AgileManager = ({ teamId }) => {
  const dispatch = useDispatch();
  const [currentView, setCurrentView] = useState('list');
  const [currentSprintId, setCurrentSprintId] = useState(null);
  
  // 组件卸载时重置状态
  useEffect(() => {
    return () => {
      dispatch(resetAgileState());
    };
  }, [dispatch]);
  
  // 查看冲刺详情
  const handleViewSprintDetails = (sprintId) => {
    setCurrentSprintId(sprintId);
    setCurrentView('detail');
  };
  
  // 返回列表
  const handleBackToList = () => {
    setCurrentView('list');
    setCurrentSprintId(null);
  };
  
  return (
    <Card>
      <Title level={3}>敏捷管理</Title>
      
      {currentView === 'list' ? (
        <SprintList 
          teamId={teamId} 
          onViewDetails={handleViewSprintDetails} 
        />
      ) : (
        <SprintDetail 
          sprintId={currentSprintId} 
          teamId={teamId} 
          onBack={handleBackToList} 
        />
      )}
    </Card>
  );
};

export default AgileManager; 