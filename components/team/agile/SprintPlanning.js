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
import { CalendarIcon, Plus, MoveUp, MoveDown, CheckCircle2, ChevronDown, ChevronUp, PlayCircle, ListStartIcon, Trash2 } from 'lucide-react';
import BodyContent from './BodyContent';
import SprintBoard from './SprintBoard';
import RoleAssignment from './RoleAssignment';
import SprintRetrospective from './SprintRetrospective';
import { Card } from '@/components/ui/card';
import { useDispatch } from 'react-redux';
import { fetchAgileRoleById, fetchAgileMembers } from '@/lib/redux/features/agileSlice';

const SprintPlanning = ({ 
  teamId, 
  projectId, 
  sprints, 
  currentSprint, 
  agileRoles = [],
  agileMembers = [],
  onCreateSprint, 
  onStartSprint,
  onCompleteSprint,
  onUpdateMembers
}) => {
    const t = useTranslations('Agile');
    const dispatch = useDispatch();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [backlogTasks, setBacklogTasks] = useState([]);
  const [sprintTasks, setSprintTasks] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [selectedType, setSelectedType] = useState('PENDING');
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
    console.log("过滤sprint:", sprint, "selectedType:", selectedType);
    if (selectedType === 'PENDING') return sprint.status === 'PENDING';
    if (selectedType === 'PLANNING') return sprint.status === 'PLANNING';
    if (selectedType === 'RETROSPECTIVE') return sprint.status === 'RETROSPECTIVE';
    return false;
  });

  // 根据当前冲刺状态显示不同的操作按钮
  const renderSprintActionButton = () => {
    if (!currentSprint) {
      return null;
    }

    if (currentSprint.status === 'PENDING') {
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

    if (currentSprint.status === 'PLANNING') {
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

  // 选择冲刺时加载该冲刺的任务和成员
  useEffect(() => {
    if (selectedSprint && selectedSprint.id) {
      // 获取冲刺任务
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
      
      // 获取该冲刺的成员数据
      console.log(`选中冲刺 ${selectedSprint.id}，获取成员数据`);
      dispatch(fetchAgileMembers(selectedSprint.id));
    } else {
      setSprintTasks([]);
    }
  }, [selectedSprint, dispatch]);

  // 自动选中当前类型下的第一个冲刺
  useEffect(() => {
    console.log('筛选后的sprints变化:', filteredSprints);
    if (
      filteredSprints.length > 0 &&
      (!selectedSprint || !filteredSprints.some(s => s.id === selectedSprint?.id))
    ) {
      console.log('自动选择第一个冲刺:', filteredSprints[0]);
      setSelectedSprint(filteredSprints[0]);
    } else if (filteredSprints.length === 0) {
      console.log('没有筛选后的sprints，设置selectedSprint为null');
      setSelectedSprint(null);
    }
  }, [selectedType, filteredSprints]);

  // 设置默认选择当前冲刺或最新的冲刺
  useEffect(() => {
    console.log('sprints或currentSprint变化:', sprints, currentSprint);
    
    if (currentSprint) {
      // 总是优先选择当前冲刺
      console.log('选择currentSprint:', currentSprint);
      setSelectedSprint(currentSprint);
      setSelectedType(currentSprint.status); // 自动切换到对应的类型标签
    } else if (sprints.length > 0 && !selectedSprint) {
      // 如果没有当前冲刺，选择合适的冲刺
      
      // 首先尝试选择PENDING状态的冲刺
      const pendingSprints = sprints.filter(s => s.status === 'PENDING');
      if (pendingSprints.length > 0) {
        console.log('选择PENDING状态冲刺:', pendingSprints[0]);
        setSelectedSprint(pendingSprints[0]);
        setSelectedType('PENDING');
        return;
      }
      
      // 其次尝试选择PLANNING状态的冲刺
      const planningSprints = sprints.filter(s => s.status === 'PLANNING');
      if (planningSprints.length > 0) {
        console.log('选择PLANNING状态冲刺:', planningSprints[0]);
        setSelectedSprint(planningSprints[0]);
        setSelectedType('PLANNING');
        return;
      }
      
      // 最后选择任意可用的冲刺
      console.log('选择第一个可用冲刺:', sprints[0]);
      setSelectedSprint(sprints[0]);
      setSelectedType(sprints[0].status);
    }
  }, [sprints, currentSprint]);

  // 计算冲刺结束日期
  const calculateEndDate = (startDate, duration) => {
    if (!startDate) return null;
    const start = new Date(startDate);
    const durationInDays = parseInt(duration) * 7; // 将周转换为天数
    const end = new Date(start);
    end.setDate(end.getDate() + durationInDays);
    return end;
  };

  // 处理创建新冲刺
  const handleCreateNewSprint = () => {
    if (!newSprint.name || !newSprint.startDate || !newSprint.duration) {
      return;
    }
    
    const sprintData = {
      ...newSprint,
      endDate: calculateEndDate(newSprint.startDate, newSprint.duration)
    };
    
    const createdSprint = onCreateSprint(sprintData);
    if (createdSprint) {
      setCreateDialogOpen(false);
      // 重置表单
      setNewSprint({
        name: '',
        startDate: null,
        endDate: null,
        duration: '2',
        goal: ''
      });
    }
  };

  // 添加任务到冲刺
  const addTaskToSprint = async (taskId) => {
    if (!selectedSprint) return;
    
    try {
      // 将任务添加到冲刺
      const taskIds = selectedSprint.task_ids || [];
      if (taskIds.includes(taskId)) return; // 避免重复添加
      
      const updatedTaskIds = [...taskIds, taskId];
      
      const response = await fetch(`/api/teams/agile/sprint/${selectedSprint.id}/tasks`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskIds: updatedTaskIds }),
      });
      
      if (!response.ok) throw new Error('添加任务到冲刺失败');
      
      // 更新本地状态
      const updatedSprint = await response.json();
      setSelectedSprint(updatedSprint);
      
      // 添加到当前显示的冲刺任务中
      const taskDetails = backlogTasks.find(task => task.id === taskId);
      if (taskDetails) {
        setSprintTasks([...sprintTasks, taskDetails]);
      }
    } catch (error) {
      console.error('添加任务到冲刺失败:', error);
    }
  };

  // 从冲刺中移除任务
  const removeTaskFromSprint = async (taskId) => {
    if (!selectedSprint) return;
    
    try {
      // 从冲刺中移除任务
      const taskIds = selectedSprint.task_ids || [];
      const updatedTaskIds = taskIds.filter(id => id !== taskId);
      
      const response = await fetch(`/api/teams/agile/sprint/${selectedSprint.id}/tasks`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskIds: updatedTaskIds }),
      });
      
      if (!response.ok) throw new Error('从冲刺中移除任务失败');
      
      // 更新本地状态
      const updatedSprint = await response.json();
      setSelectedSprint(updatedSprint);
      
      // 从当前显示的冲刺任务中移除
      setSprintTasks(sprintTasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('从冲刺中移除任务失败:', error);
    }
  };

  // 更新任务优先级
  const moveTaskPriority = async (taskId, direction) => {
    if (!selectedSprint) return;

    try {
      // 获取当前任务顺序
      const taskIds = [...(selectedSprint.task_ids || [])];
      const currentIndex = taskIds.indexOf(taskId);
      
      if (currentIndex === -1) return; // 任务不在冲刺中
      
      let newIndex;
      if (direction === 'up' && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (direction === 'down' && currentIndex < taskIds.length - 1) {
        newIndex = currentIndex + 1;
      } else {
        return; // 无法移动
      }
      
      // 更改顺序
      taskIds.splice(currentIndex, 1);
      taskIds.splice(newIndex, 0, taskId);
      
      const response = await fetch(`/api/teams/agile/sprint/${selectedSprint.id}/tasks`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskIds }),
      });
      
      if (!response.ok) throw new Error('调整任务优先级失败');
      
      // 更新本地状态
      const updatedSprint = await response.json();
      setSelectedSprint(updatedSprint);
      
      // 重新排序当前显示的任务
      const orderedTasks = [];
      for (const id of taskIds) {
        const task = sprintTasks.find(t => t.id === id);
        if (task) orderedTasks.push(task);
      }
      setSprintTasks(orderedTasks);
    } catch (error) {
      console.error('调整任务优先级失败:', error);
      toast.error(t('moveTaskError'));
    }
  };

  // 检查agileMembers中的角色ID并获取详细信息
  useEffect(() => {
    if (agileMembers.length > 0 && agileRoles.length > 0) {
      // 收集所有角色ID
      const roleIds = [...new Set(agileMembers.map(member => member.role_id).filter(Boolean))];
      
      // 检查哪些角色ID在agileRoles中找不到对应信息
      const missingRoleIds = roleIds.filter(roleId => 
        !agileRoles.some(role => role && role.id && roleId && role.id.toString() === roleId.toString())
      );
      
      console.log('需要获取详情的角色IDs:', missingRoleIds);
      
      // 为缺失的角色ID获取详细信息
      missingRoleIds.forEach(roleId => {
        if (roleId) {
          dispatch(fetchAgileRoleById(roleId));
        }
      });
    }
  }, [agileMembers, agileRoles, dispatch]);

  // 自定义成员更新处理函数
  const handleUpdateMembers = () => {
    console.log('【SprintPlanning】刷新成员信息');
    if (selectedSprint && selectedSprint.id && typeof onUpdateMembers === 'function') {
      onUpdateMembers(selectedSprint.id);
    }
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
                  {newSprint.startDate ? 
                    (() => {
                      try {
                        return format(newSprint.startDate, "yyyy-MM-dd")
                      } catch(e) {
                        console.error("Invalid startDate format:", e);
                        return t('selectDate');
                      }
                    })() 
                    : t('selectDate')}
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
                value={(() => {
                  try {
                    const endDate = calculateEndDate(newSprint.startDate, newSprint.duration);
                    return endDate ? format(endDate, "yyyy-MM-dd") : "";
                  } catch(e) {
                    console.error("Error calculating end date:", e);
                    return "";
                  }
                })()} 
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

  // 渲染基于当前选择和状态的内容
  const renderContent = () => {
    console.log('renderContent - selectedSprint:', selectedSprint, 'sprints:', sprints, 'filteredSprints:', filteredSprints);
    
    // 处理没有选中sprint的情况
    if (!selectedSprint) {
      console.log('没有选中的Sprint，sprints长度:', sprints.length);
      return (
        <div className="text-center p-8">
          {loading ? (
            <div>{t('loading')}</div>
          ) : sprints.length === 0 ? (
            // 如果没有任何Sprint，显示创建Sprint按钮
            <div>
              <p className="mb-4">{t('noSprintsFound')}</p>
              <Button 
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('createFirstSprint')}
              </Button>
            </div>
          ) : (
            // 如果有Sprint但没有选中，可能是因为筛选条件
            <div>
              <p className="mb-4">{t('noSprintsMatchFilter')}</p>
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('createSprint')}
              </Button>
            </div>
          )}
        </div>
      );
    }

    // 根据所选冲刺状态和类型显示不同组件
    if (selectedType === 'RETROSPECTIVE') {
      return (
        <SprintRetrospective 
          sprint={selectedSprint} 
          agileMembers={agileMembers}
        />
      );
    } else if (selectedType === 'PENDING' || selectedType === 'PLANNING') {
      return (
        <>
          <RoleAssignment 
            teamId={teamId}
            agileId={selectedSprint.id}
            agileRoles={Array.isArray(agileRoles) ? agileRoles : []}
            agileMembers={Array.isArray(agileMembers) ? agileMembers : []}
            onUpdateMembers={handleUpdateMembers}
          />
          <SprintBoard 
            sprint={selectedSprint} 
            tasks={sprintTasks}
            agileMembers={Array.isArray(agileMembers) ? agileMembers : []}
          />
        </>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      {/* 冲刺选择和操作区 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Label className="text-sm font-medium">{t('type')}:</Label>
          <Select 
              value={selectedType ? selectedType : 'PENDING'} 
              onValueChange={(value) => {
                setSelectedType(value)
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="PENDING" value="PENDING">
                  {t('pending')}
                </SelectItem>
                <SelectItem key="PLANNING" value="PLANNING">
                  {t('planning')}
                </SelectItem>
                <SelectItem key="RETROSPECTIVE" value="RETROSPECTIVE">
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
            {selectedType === 'PENDING' && (
              <SelectContent>
                {/* only can display inProgress sprint */}
                {sprints.map(sprint  => (
                  sprint.status === 'PENDING' && (
                    <SelectItem key={sprint.id} value={sprint.id.toString() }>
                      {sprint.name} 
                    </SelectItem>
                  )
                ))}
              </SelectContent>
            )}
             {selectedType === 'PLANNING' && (
              <SelectContent>
                {/* only can display planning sprint */}
                {sprints.map(sprint  => (
                  (sprint.status === 'PLANNING') && (
                    <SelectItem key={sprint.id} value={sprint.id.toString() }>
                      {sprint.name} 
                    </SelectItem>
                  )
                ))}
              </SelectContent>
            )}
            {selectedType === 'RETROSPECTIVE' && (
              <SelectContent>
                {/* only can display completed sprint */}
                {sprints.map(sprint  => (
                  sprint.status === 'RETROSPECTIVE' && (
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
          {selectedType === 'PLANNING' && !selectedSprint && (
            <Button 
              variant="outline" 
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('createSprint')}
            </Button>
          )}
          {selectedSprint && (selectedSprint.status === 'PLANNING') && (
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

            {selectedSprint && (selectedSprint.status === 'PENDING') && (
              <div>
                <Button 
                  variant="outline" //themeColor 
                  onClick={() => onCompleteSprint(selectedSprint.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {t('completeSprint')}
                </Button>
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
                  {selectedSprint.status === 'PLANNING' && t('planning')}
                  {selectedSprint.status === 'PENDING' && t('inProgress')}
                  {selectedSprint.status === 'RETROSPECTIVE' && t('completed')}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium">{t('startDate')}:</p>
                <p>
                  {selectedSprint.startDate ? 
                    (() => {
                      try {
                        return format(new Date(selectedSprint.startDate), "yyyy-MM-dd")
                      } catch(e) {
                        console.error("Invalid startDate format:", selectedSprint.startDate)
                        return selectedSprint.startDate || "-"
                      }
                    })() 
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('endDate')}:</p>
                <p>
                  {selectedSprint.endDate ? 
                    (() => {
                      try {
                        return format(new Date(selectedSprint.endDate), "yyyy-MM-dd")
                      } catch(e) {
                        console.error("Invalid endDate format:", selectedSprint.endDate)
                        return selectedSprint.endDate || "-"
                      }
                    })() 
                    : "-"}
                </p>
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
      
      {/* 主要内容区域 */}
      {renderContent()}
      
      {renderCreateSprintDialog()}
    </div>
  );
};

export default SprintPlanning;