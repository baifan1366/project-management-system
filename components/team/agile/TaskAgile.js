"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import SprintPlanning from './SprintPlanning';
import SprintRetrospective from './SprintRetrospective';
import SprintBoard from './SprintBoard';
import AgileTools from './AgileTools';
import RoleAssignment from './RoleAssignment';

const TaskAgile = ({ teamId, projectId }) => {
  const t = useTranslations('Agile');
  const [activeTab, setActiveTab] = useState('planning');
  const [currentSprint, setCurrentSprint] = useState(null);
  const [sprints, setSprints] = useState([]);
  
  // 获取团队的冲刺数据
  useEffect(() => {
    if (teamId && projectId) {
      // 这里应该从数据库获取冲刺数据
      // fetchSprintData(teamId, projectId);
      
      // 模拟数据
      const mockSprints = [
        { 
          id: 1, 
          name: '冲刺1', 
          startDate: new Date(2023, 5, 1), 
          endDate: new Date(2023, 5, 14),
          duration: 2, // 2周
          status: 'completed',
          tasks: []
        },
        { 
          id: 2, 
          name: '冲刺2', 
          startDate: new Date(2023, 5, 15), 
          endDate: new Date(2023, 5, 28),
          duration: 2,
          status: 'in_progress',
          tasks: []
        },
        { 
          id: 3, 
          name: '冲刺3', 
          startDate: new Date(2023, 5, 15), 
          endDate: new Date(2023, 5, 28),
          duration: 2,
          status: 'planning',
          tasks: []
        },
        { 
          id: 4, 
          name: '冲刺4', 
          startDate: new Date(2023, 5, 15), 
          endDate: new Date(2023, 5, 28),
          duration: 2,
          status: 'in_progress',
          tasks: []
        }
      ];
      
      setSprints(mockSprints);
      // 设置当前冲刺（如果有正在进行的）
      const current = mockSprints.find(s => s.status === 'in_progress');
      //how about completed mokesprints
      setCurrentSprint(current || null);
    }
  }, [teamId, projectId]);

  // 创建新的冲刺
  const handleCreateSprint = (sprintData) => {
    // 在实际应用中，这里应该调用API保存到数据库
    const newSprint = {
      id: Date.now(),
      ...sprintData,
      status: 'planning',
      tasks: []
    };
    
    setSprints([...sprints, newSprint]);
    toast.success(t('createSprintSuccess'));
    return newSprint;
  };

  // 开始冲刺
  const handleStartSprint = (sprintId) => {
    const updatedSprints = sprints.map(sprint => {
      if (sprint.id === sprintId) {
        return { ...sprint, status: 'in_progress' };
      }
      return sprint;
    });
    
    setSprints(updatedSprints);
    const current = updatedSprints.find(s => s.id === sprintId);
    setCurrentSprint(current);
    toast.success(t('startSprintSuccess'));
  };

  // 完成冲刺
  const handleCompleteSprint = (sprintId) => {
    const updatedSprints = sprints.map(sprint => {
      if (sprint.id === sprintId) {
        return { ...sprint, status: 'completed' };
      }
      return sprint;
    });
    
    setSprints(updatedSprints);
    setCurrentSprint(null);
    toast.success(t('sprintCompletedSuccess'));
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <AgileTools 
          currentSprint={currentSprint} 
          onStartSprint={handleStartSprint}
          onCompleteSprint={handleCompleteSprint}
        />
      </div>

      {/* <Card className="w-full p-4"> */}
        {/* <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="planning">{t('sprintPlanning')}</TabsTrigger> */}
            {/* <TabsTrigger value="board">{t('agileBoard')}</TabsTrigger> */}
            {/* <TabsTrigger value="roles">{t('roleAssignment')}</TabsTrigger> */}
            {/* <TabsTrigger value="retrospective">{t('sprintRetrospective')}</TabsTrigger>
          </TabsList> */}
          
          {/* <TabsContent value="planning"> */}
            <SprintPlanning 
              teamId={teamId}
              projectId={projectId}
              sprints={sprints}
              currentSprint={currentSprint}
              onCreateSprint={handleCreateSprint}
              onStartSprint={handleStartSprint}
              onCompleteSprint={handleCompleteSprint}
            />
          {/* </TabsContent> */}
          
          {/* <TabsContent value="board">
            <SprintBoard 
              teamId={teamId}
              projectId={projectId}
              currentSprint={currentSprint}
              sprints={sprints}
            />
          </TabsContent> */}
          
          {/* <TabsContent value="roles">
            <RoleAssignment 
              teamId={teamId}
              projectId={projectId}
            />
          </TabsContent> */}
          
          {/* <TabsContent value="retrospective">
            <SprintRetrospective 
              teamId={teamId}
              projectId={projectId}
              sprints={sprints.filter(s => s.status === 'completed')}
            />
          </TabsContent> */}
        {/* </Tabs> */}
      {/* </Card> */}
    </div>
  );
};

export default TaskAgile;
