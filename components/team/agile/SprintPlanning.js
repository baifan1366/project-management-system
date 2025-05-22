"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Plus, MoveUp, MoveDown, CheckCircle2, ChevronDown, ChevronUp, PlayCircle, ListStartIcon } from 'lucide-react';
import BodyContent from './BodyContent';
import SprintBoard from './SprintBoard';
import RoleAssignment from './RoleAssignment';
import SprintRetrospective from './SprintRetrospective';

const SprintPlanning = ({ 
  teamId, 
  projectId, 
  sprints, 
  currentSprint, 
  onCreateSprint, 
  onStartSprint,
  onCompleteSprint
}) => {
    const t = useTranslations('Agile');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [backlogTasks, setBacklogTasks] = useState([]);
  const [sprintTasks, setSprintTasks] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [selectedType, setSelectedType] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [isSprintInfoExpanded, setIsSprintInfoExpanded] = useState(false);
  
  // 新冲刺表单状态
  const [newSprint, setNewSprint] = useState({
    name: '',
    startDate: null,
    endDate: null,
    duration: '2', // 默认2周
    goal: ''
  });

  // 根据类型过滤冲刺
  const filteredSprints = sprints.filter(sprint => {
    if (selectedType === 'pending') return sprint.status === 'in_progress';
    if (selectedType === 'planning') return sprint.status === 'planning';
    if (selectedType === 'retrospective') return sprint.status === 'completed';
    return false;
  });

  // 根据当前冲刺状态显示不同的操作按钮
  const renderSprintActionButton = () => {
    if (!currentSprint) {
      return null;
    }

    if (currentSprint.status === 'in_progress') {
      return (
        <Button 
          variant="outline" //themeColor 
          onClick={() => onCompleteSprint(currentSprint.id)}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {t('completeSprint')}
        </Button>
      );
    }

    if (currentSprint.status === 'planning') {
      return (
        <Button 
          variant="default" 
          size="sm" 
          className="mr-2"
          onClick={() => onStartSprint(currentSprint.id)}
        >
          <PlayCircle className="w-4 h-4 mr-1" />
          {t('startSprint')}
        </Button>
      );
    }

    return null;
  };

  // 获取产品待办事项（Backlog）
  useEffect(() => {
    if (teamId && projectId) {
      // 这里应该从数据库获取产品待办事项
      // fetchBacklogTasks(teamId, projectId);
      
      // 模拟数据
      const mockTasks = [
        { 
          id: 1, 
          title: '用户注册功能', 
          priority: 'high', 
          estimate: '8', 
          assignee: null,
          description: '实现新用户的注册流程，包括表单验证和邮件确认'
        },
        { 
          id: 2, 
          title: '首页重设计', 
          priority: 'medium', 
          estimate: '13', 
          assignee: null,
          description: '根据新的设计稿更新首页布局和样式'
        },
        { 
          id: 3, 
          title: '性能优化', 
          priority: 'low', 
          estimate: '5', 
          assignee: null,
          description: '优化页面加载速度和响应时间'
        },
        { 
          id: 4, 
          title: '用户体验改进', 
          priority: 'medium', 
          estimate: '8', 
          assignee: null,
          description: '根据用户反馈改进产品的使用体验'
        }
      ];
      
      setBacklogTasks(mockTasks);
      setLoading(false);
    }
  }, [teamId, projectId]);

  // 选择冲刺时加载该冲刺的任务
  useEffect(() => {
    if (selectedSprint) {
      // 这里应该从数据库获取冲刺任务
      // fetchSprintTasks(selectedSprint.id);
      
      // 模拟数据
      const mockSprintTasks = [
        { 
          id: 5, 
          title: '登录页面开发', 
          priority: 'high', 
          estimate: '8', 
          assignee: '张三',
          status: 'todo',
          description: '开发新的登录页面，包括表单验证和错误处理'
        },
        { 
          id: 6, 
          title: '后端API集成', 
          priority: 'high', 
          estimate: '13', 
          assignee: '李四',
          status: 'in_progress',
          description: '将前端页面与后端API集成'
        }
      ];
      
      setSprintTasks(mockSprintTasks);
    } else {
      setSprintTasks([]);
    }
  }, [selectedSprint]);

  // 自动选中当前类型下的第一个冲刺
  useEffect(() => {
    if (
      filteredSprints.length > 0 &&
      (!selectedSprint || !filteredSprints.some(s => s.id === selectedSprint.id))
    ) {
      setSelectedSprint(filteredSprints[0]);
    } else if (filteredSprints.length === 0) {
      setSelectedSprint(null);
    }
  }, [selectedType, sprints]);

  // 设置默认选择当前冲刺或最新的冲刺
  useEffect(() => {
    if (currentSprint) {
      setSelectedSprint(currentSprint);
    } else if (sprints.length > 0 && !selectedSprint) {
      // 选择最新的计划中冲刺
      const planningSprints = sprints.filter(s => s.status === 'planning');
      if (planningSprints.length > 0) {
        setSelectedSprint(planningSprints[planningSprints.length - 1]);
      } else {
        // 如果没有计划中的冲刺，选择最新的冲刺
        setSelectedSprint(sprints[sprints.length - 1]);
      }
    }
  }, [sprints, currentSprint]);

  // 计算冲刺结束日期
  const calculateEndDate = (startDate, duration) => {
    if (!startDate) return null;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (parseInt(duration) * 7) - 1); // 减1是因为包括开始日期
    return endDate;
  };

  // 处理创建新冲刺
  const handleCreateNewSprint = () => {
    if (!newSprint.name || !newSprint.startDate || !newSprint.duration) {
      return; // 表单验证失败
    }

    const endDate = calculateEndDate(newSprint.startDate, newSprint.duration);
    
    const sprintData = {
      name: newSprint.name,
      startDate: newSprint.startDate,
      endDate: endDate,
      duration: parseInt(newSprint.duration),
      goal: newSprint.goal
    };
    
    const createdSprint = onCreateSprint(sprintData);
    setSelectedSprint(createdSprint);
    setCreateDialogOpen(false);
    
    // 重置表单
    setNewSprint({
      name: '',
      startDate: null,
      endDate: null,
      duration: '2',
      goal: ''
    });
  };

  // 添加任务到冲刺
  const addTaskToSprint = (taskId) => {
    if (!selectedSprint || selectedSprint.status !== 'planning') {
      return; // 只有在计划阶段才能添加任务
    }
    
    const task = backlogTasks.find(t => t.id === taskId);
    if (task) {
      // 从待办事项中移除
      setBacklogTasks(prev => prev.filter(t => t.id !== taskId));
      // 添加到冲刺任务
      setSprintTasks(prev => [...prev, {...task, status: 'todo'}]);
      
      // 在实际应用中，这里应该调用API保存到数据库
    }
  };

  // 从冲刺中移除任务
  const removeTaskFromSprint = (taskId) => {
    if (!selectedSprint || selectedSprint.status !== 'planning') {
      return; // 只有在计划阶段才能移除任务
    }
    
    const task = sprintTasks.find(t => t.id === taskId);
    if (task) {
      // 从冲刺任务中移除
      setSprintTasks(prev => prev.filter(t => t.id !== taskId));
      // 添加回待办事项
      setBacklogTasks(prev => [...prev, {...task, assignee: null}]);
      
      // 在实际应用中，这里应该调用API保存到数据库
    }
  };

  // 更新任务优先级
  const moveTaskPriority = (taskId, direction) => {
    const tasks = [...backlogTasks];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) return; // 任务不存在
    if (
      (direction === 'up' && taskIndex === 0) || 
      (direction === 'down' && taskIndex === tasks.length - 1)
    ) {
      return; // 已经是最高或最低优先级
    }
    
    const newIndex = direction === 'up' ? taskIndex - 1 : taskIndex + 1;
    const task = tasks[taskIndex];
    
    // 移除任务
    tasks.splice(taskIndex, 1);
    // 在新位置插入任务
    tasks.splice(newIndex, 0, task);
    
    setBacklogTasks(tasks);
    
    // 在实际应用中，这里应该调用API保存到数据库
  };

  // 渲染创建冲刺对话框
  const renderCreateSprintDialog = () => (
    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createNewSprint')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="sprintName">{t('sprintName')}</Label>
            <Input 
              id="sprintName" 
              value={newSprint.name} 
              onChange={(e) => setNewSprint({...newSprint, name: e.target.value})}
              placeholder={t('eg')}
            />
          </div>
          
          <div className="space-y-2">
            <Label>{t('startDate')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newSprint.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newSprint.startDate ? format(newSprint.startDate, "yyyy-MM-dd") : t('selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={newSprint.startDate}
                  onSelect={(date) => setNewSprint({
                    ...newSprint, 
                    startDate: date,
                    endDate: calculateEndDate(date, newSprint.duration)
                  })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="duration">{t('duration')}</Label>
            <Select 
              value={newSprint.duration} 
              onValueChange={(value) => setNewSprint({
                ...newSprint, 
                duration: value,
                endDate: calculateEndDate(newSprint.startDate, value)
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectDuration')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">{t('1week')}</SelectItem>
                <SelectItem value="2">{t('2weeks')}</SelectItem>
                <SelectItem value="3">{t('3weeks')}</SelectItem>
                <SelectItem value="4">{t('4weeks')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {newSprint.startDate && newSprint.duration && (
            <div className="space-y-2">
              <Label>{t('endDate')}</Label>
              <Input 
                value={format(calculateEndDate(newSprint.startDate, newSprint.duration), "yyyy-MM-dd")} 
                readOnly 
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="goal">{t('sprintGoal')}</Label>
            <Input 
              id="goal" 
              value={newSprint.goal} 
              onChange={(e) => setNewSprint({...newSprint, goal: e.target.value})}
              placeholder={t('setASprintGoal')}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setCreateDialogOpen(false)}
          >
            {t('cancel')}
          </Button>
          <Button onClick={handleCreateNewSprint}>
            {t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* 冲刺选择和操作区 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Label className="text-sm font-medium">{t('type')}:</Label>
          <Select 
              value={selectedType ? selectedType : 'pending'} 
              onValueChange={(value) => {
                setSelectedType(value)
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="pending" value="pending">
                  {t('pending')}
                </SelectItem>
                <SelectItem key="planning" value="planning">
                  {t('planning')}
                </SelectItem>
                <SelectItem key="retrospective" value="retrospective">
                  {t('retrospective')}
                </SelectItem>
              </SelectContent>
          </Select>
          <Label className="text-sm font-medium">{t('sprintPlan')}:</Label>
          <Select 
          //auto select first sprint else print placeholder
            value={selectedSprint ? selectedSprint.id.toString() : ''} 
            onValueChange={(value) => {
              const sprint = sprints.find(s => s.id.toString() === value); 
              setSelectedSprint(sprint);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('selectSprintPlan')} />
            </SelectTrigger>
            {selectedType === 'pending' && (
              <SelectContent>

                {/* only can display inProgress sprint */}
                {sprints.map(sprint  => (
                  sprint.status === 'in_progress' && (
                    <SelectItem key={sprint.id} value={sprint.id.toString() }>
                      {sprint.name} 
                    </SelectItem>
                  )
                ))}
              
              </SelectContent>
            )}
             {selectedType === 'planning' && (
              <SelectContent>

                {/* only can display planning sprint */}
                {sprints.map(sprint  => (
                  (sprint.status === 'planning') && (
                    <SelectItem key={sprint.id} value={sprint.id.toString() }>
                      {sprint.name} 
                    </SelectItem>
                  )
                ))}
              
              </SelectContent>
            )}
            {selectedType === 'retrospective' && (
              <SelectContent>

                {/* only can display completed sprint */}
                {sprints.map(sprint  => (
                  sprint.status === 'completed' && (
                    <SelectItem key={sprint.id} value={sprint.id.toString() }>
                      {sprint.name} 
                    </SelectItem>
                  )
                ))}
              
              </SelectContent>
            )}
          </Select>
        </div>
        
        <div className="flex space-x-2">
          {selectedType === 'planning' && !selectedSprint && (
            <Button 
              variant="outline" 
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('createSprint')}
            </Button>
          )}
          {selectedSprint && (selectedSprint.status === 'planning') && (
            <>
              <Button 
                variant="outline" 
                onClick={() => onStartSprint(selectedSprint.id)}
              >
                <PlayCircle className="w-4 h-4 mr-1" />
                {t('startSprint')}
              </Button>              
            </>
          )}
        </div>
      </div>
      
      {/* 冲刺信息 */}
      {selectedSprint && (
        <BodyContent>
          <div className="p-0 flex items-center justify-between cursor-pointer" 
               onClick={() => setIsSprintInfoExpanded(!isSprintInfoExpanded)}>
            <div className="flex items-center justify-normal">
              <div className="">
                  {isSprintInfoExpanded ? (
                  <ChevronUp className="h-5 w-5 mr-2" />
                ) : (
                  <ChevronDown className="h-5 w-5 mr-2" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{t('sprintInformation')}</h2>
              </div>
            </div>

            {selectedSprint && (selectedSprint.status === 'in_progress') && (
              <div>
                {renderSprintActionButton()}
              </div>
            )}
                
          </div>
          
          {isSprintInfoExpanded && (
            <div className="grid grid-cols-2 gap-4 border-t pt-4 p-2">
              <div>
                <p className="text-sm font-medium">{t('sprintName')}:</p>
                <p>{selectedSprint.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('status')}:</p>
                <p>
                  {selectedSprint.status === 'planning' && t('planning')}
                  {selectedSprint.status === 'in_progress' && t('inProgress')}
                  {selectedSprint.status === 'completed' && t('completed')}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium">{t('startDate')}:</p>
                <p>{format(new Date(selectedSprint.startDate), "yyyy-MM-dd")}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('endDate')}:</p>
                <p>{format(new Date(selectedSprint.endDate), "yyyy-MM-dd")}</p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('duration')}:</p>
                <p>{selectedSprint.duration} {t('weeks')}</p>
              </div>
              {selectedSprint.goal && (
                <div className="col-span-2">
                  <p className="text-sm font-medium">{t('sprintGoal')}:</p>
                  <p>{selectedSprint.goal}</p>
                </div>
              )}
            </div>
          )}
        </BodyContent>
      )}
      {(selectedType === 'pending' || selectedType === 'planning') && (
        <>
          <RoleAssignment 
            teamId={teamId}
            projectId={projectId}
          />
          {(selectedSprint) && (
            <SprintBoard 
              teamId={teamId}
              projectId={projectId}
              currentSprint={currentSprint}
              sprints={sprints}
            />
          )}
        </>
      )}
      {selectedType === 'retrospective' && (
        <>
          <SprintRetrospective 
            teamId={teamId}
            projectId={projectId}
            sprints={sprints.filter(s => s.status === 'completed')}
          />
        </>
      )}      
      {renderCreateSprintDialog()}
    </div>
  );
};

export default SprintPlanning;