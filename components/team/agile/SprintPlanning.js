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
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Plus, MoveUp, MoveDown, CheckCircle2, ChevronDown, ChevronUp, PlayCircle, ListStartIcon, Trash2, AlertCircle, Pen } from 'lucide-react';
import BodyContent from './BodyContent';
import SprintBoard from './SprintBoard';
import RoleAssignment from './RoleAssignment';
import SprintRetrospective from './SprintRetrospective';
import { Card } from '@/components/ui/card';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { fetchAgileRoleById, fetchAgileMembers } from '@/lib/redux/features/agileSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { toast } from 'sonner';

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
    const team = useSelector(state => state.teams.teams.find(t => t.id.toString() === teamId?.toString()));
    const {user} = useGetUser();
    const isTeamCreator = user?.id && team?.created_by && user.id.toString() === team.created_by.toString();
    const project = useSelector(state => 
      state.projects.projects.find(p => String(p.id) === String(projectId))
    );
    const [themeColor, setThemeColor] = useState('');
    useEffect(() => {
      if (project?.theme_color) {
        setThemeColor(project.theme_color);
      }
    }, [project]);
  
  // 检查Sprint是否已过期
  const isSprintOverdue = (sprint) => {
    if (!sprint) return false;
    
    try {
      // 尝试从多种可能的属性中获取结束日期
      const endDateValue = sprint.endDate || sprint.end_date;
      
      // 如果没有结束日期，则尝试从开始日期和持续时间计算
      if (!endDateValue) {
        const startDate = sprint.startDate || sprint.start_date;
        const duration = sprint.duration;
        
        if (startDate && duration) {
          // 计算结束日期
          return calculateEndDate(startDate, duration) < new Date();
        }
        return false;
      }
      
      // 解析结束日期
      let endDate;
      if (typeof endDateValue === 'string') {
        if (endDateValue.includes(' ')) {
          endDate = new Date(endDateValue.split(' ')[0]);
        } else if (endDateValue.includes('T')) {
          endDate = new Date(endDateValue.split('T')[0]);
        } else {
          endDate = new Date(endDateValue);
        }
      } else if (endDateValue instanceof Date) {
        endDate = new Date(endDateValue);
      } else {
        return false;
      }
      
      // 检查日期是否有效
      if (isNaN(endDate.getTime())) return false;
      
      // 获取当前日期（只保留年月日）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
            
      // 如果结束日期在今天之前，则已过期
      return endDate < today;
    } catch (e) {
      console.error('检查Sprint过期时出错:', e, sprint);
      return false;
    }
  };
  
  // 辅助函数 - 解析日期
  const parseDateSafely = (dateString) => {
    if (!dateString) return null;
    
    try {
      // 尝试将其解析为ISO格式
      if (typeof dateString === 'string' && dateString.includes('T')) {
        return parseISO(dateString);
      }
      
      // 尝试处理 "2025-05-24 14:55:10" 这种格式
      if (typeof dateString === 'string' && dateString.includes(' ')) {
        // 替换空格为T以便parseISO正确处理
        return parseISO(dateString.replace(' ', 'T'));
      }
      
      // 处理其他情况
      return new Date(dateString);
    } catch (e) {
      console.error('日期解析错误:', dateString, e);
      return null;
    }
  };
  
  // 辅助函数 - 格式化日期
  const formatDateSafely = (dateValue, formatStr = 'yyyy-MM-dd') => {
    if (!dateValue) return '-';
    
    try {
      const dateObj = parseDateSafely(dateValue);
      if (!dateObj || isNaN(dateObj.getTime())) {
        throw new Error('无效日期');
      }
      return format(dateObj, formatStr);
    } catch (e) {
      console.error('日期格式化错误:', dateValue, e);
      return typeof dateValue === 'string' ? dateValue : '-';
    }
  };

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [backlogTasks, setBacklogTasks] = useState([]);
  const [sprintTasks, setSprintTasks] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [selectedType, setSelectedType] = useState('PLANNING');
  const [loading, setLoading] = useState(true);
  const [isSprintInfoExpanded, setIsSprintInfoExpanded] = useState(false);

  // 添加编辑冲刺对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSprint, setEditSprint] = useState(null);
  const [editFormErrors, setEditFormErrors] = useState({});

  // 新冲刺表单状态
  const [newSprint, setNewSprint] = useState({
    name: '',
    startDate: null,
    endDate: null,
    duration: '2', // 默认2周
    goal: '',
    created_by: user?.id
  });

  // 表单验证状态
  const [formErrors, setFormErrors] = useState({
    name: '',
    goal: ''
  });

  // 重置表单数据
  const resetForm = () => {
    setNewSprint({
      name: '',
      startDate: null,
      endDate: null,
      duration: '2', // 默认2周
      goal: '',
      created_by: user?.id
    });
    setFormErrors({});
  };

  // 处理对话框状态变化
  const handleDialogChange = (open) => {
    setCreateDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  // 处理编辑对话框状态变化
  const handleEditDialogChange = (open) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditSprint(null);
      setEditFormErrors({});
    }
  };

  // 打开编辑对话框
  const openEditSprintDialog = () => {
    if (!selectedSprint) return;
    
    // 复制当前选中的冲刺数据用于编辑
    setEditSprint({
      id: selectedSprint.id,
      name: selectedSprint.name,
      startDate: selectedSprint.startDate || selectedSprint.start_date,
      duration: selectedSprint.duration?.toString() || '2',
      goal: selectedSprint.goal || ''
    });
    
    setEditDialogOpen(true);
  };

  // 处理编辑表单变化
  const handleEditFormChange = (field, value) => {
    setEditSprint(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除该字段的错误信息
    if (editFormErrors[field]) {
      setEditFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // 验证编辑表单
  const validateEditForm = () => {
    const errors = {};
    
    // 验证冲刺名称
    if (!editSprint.name) {
      errors.name = t('sprintNameRequired');
    } else if (editSprint.name.length < 2) {
      errors.name = t('sprintNameTooShort');
    } else if (editSprint.name.length > 50) {
      errors.name = t('sprintNameTooLong');
    }
    
    // 验证冲刺目标
    if (editSprint.goal && (editSprint.goal.length < 10 || editSprint.goal.length > 1000)) {
      if (editSprint.goal.length < 10) {
        errors.goal = t('sprintGoalTooShort');
      } else {
        errors.goal = t('sprintGoalTooLong');
      }
    }
    
    // 验证开始日期
    if (!editSprint.startDate) {
      errors.startDate = t('startDateRequired');
    }
    
    // 验证持续时间
    if (!editSprint.duration) {
      errors.duration = t('durationRequired');
    }
    
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理保存编辑的冲刺
  const handleSaveEditSprint = async () => {
    // 验证表单
    if (!validateEditForm()) return;
    
    try {
      // 显示加载状态
      const loadingToastId = toast.loading(t('updatingSprint'));
      
      // 准备要更新的数据
      const sprintData = {
        name: editSprint.name,
        start_date: editSprint.startDate,
        duration: parseInt(editSprint.duration),
        goal: editSprint.goal
      };
      
      // 计算结束日期
      const endDate = calculateEndDate(editSprint.startDate, editSprint.duration);
      
      // 发送更新请求
      const response = await fetch(`/api/teams/agile/sprint/${editSprint.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sprintData),
      });
      
      // 清除加载状态
      toast.dismiss(loadingToastId);
      
      if (!response.ok) {
        throw new Error('更新冲刺失败');
      }
      
      // 获取更新后的冲刺数据
      const updatedSprint = await response.json();
      
      // 更新本地状态
      // 在sprints数组中找到并更新该冲刺
      const updatedSprints = sprints.map(sprint => 
        sprint.id === updatedSprint.id ? updatedSprint : sprint
      );
      
      // 如果当前选中的冲刺就是被编辑的冲刺，更新选中的冲刺
      if (selectedSprint && selectedSprint.id === updatedSprint.id) {
        setSelectedSprint(updatedSprint);
      }
      
      // 关闭编辑对话框
      setEditDialogOpen(false);
      
      // 显示成功消息
      toast.success(t('sprintUpdatedSuccess'));
      
      // 通知父组件更新数据
      if (typeof onUpdateMembers === 'function') {
        onUpdateMembers();
      }
    } catch (error) {
      console.error('更新冲刺失败:', error);
      toast.error(t('sprintUpdateError'));
    }
  };

  // 根据类型过滤冲刺
  const filteredSprints = sprints.filter(sprint => {
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
          variant={themeColor} //themeColor 
          onClick={() => onCompleteSprint(currentSprint.id)}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {t('completeSprint')}
        </Button>
      );
    }

    if (currentSprint.status === 'PLANNING') {
      // 检查start_date是否已过
      const startDateValue = currentSprint.startDate || currentSprint.start_date;
      let isStartDatePassed = false;
      let daysPassed = 0;
      
      if (startDateValue) {
        // 解析开始日期
        let startDate;
        try {
          if (typeof startDateValue === 'string') {
            if (startDateValue.includes(' ')) {
              startDate = new Date(startDateValue.split(' ')[0]);
            } else if (startDateValue.includes('T')) {
              startDate = new Date(startDateValue.split('T')[0]);
            } else {
              startDate = new Date(startDateValue);
            }
          } else if (startDateValue instanceof Date) {
            startDate = new Date(startDateValue);
          }
          
          // 清除时间部分，只保留日期
          startDate.setHours(0, 0, 0, 0);
          
          // 获取当前日期（只保留年月日）
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // 检查开始日期是否已过
          isStartDatePassed = startDate < today;
          
          // 计算过去的天数
          if (isStartDatePassed) {
            const timeDiff = today.getTime() - startDate.getTime();
            daysPassed = Math.floor(timeDiff / (1000 * 3600 * 24));
          }
        } catch (e) {
          console.error('解析开始日期出错:', e);
        }
      }
      
      return (
        <div className="flex items-center">
          {isStartDatePassed && (
            <div className="text-amber-500 mr-3 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">
                {t('startDatePassedDays', { days: daysPassed })}
              </span>
            </div>
          )}
          <Button 
            variant={themeColor} 
            size="sm" 
            className="mr-2"
            onClick={() => onStartSprint(currentSprint.id)}
          >
            <PlayCircle className="w-4 h-4 mr-1" />
            {t('startSprint')}
          </Button>
        </div>
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
      dispatch(fetchAgileMembers(selectedSprint.id));
    } else {
      setSprintTasks([]);
    }
  }, [selectedSprint, dispatch]);

  // 自动选中当前类型下的第一个冲刺
  useEffect(() => {
    if (
      filteredSprints.length > 0 &&
      (!selectedSprint || !filteredSprints.some(s => s.id === selectedSprint?.id))
    ) {
      setSelectedSprint(filteredSprints[0]);
    } else if (filteredSprints.length === 0) {
      setSelectedSprint(null);
    }
  }, [selectedType, filteredSprints]);

  // 设置默认选择当前冲刺或最新的冲刺
  useEffect(() => {
    
    if (currentSprint) {
      // 总是优先选择当前冲刺
      setSelectedSprint(currentSprint);
      setSelectedType(currentSprint.status); // 自动切换到对应的类型标签
    } else if (sprints.length > 0 && !selectedSprint) {
      // 如果没有当前冲刺，选择合适的冲刺
      
      // 首先尝试选择PENDING状态的冲刺
      const pendingSprints = sprints.filter(s => s.status === 'PENDING');
      if (pendingSprints.length > 0) {
        setSelectedSprint(pendingSprints[0]);
        setSelectedType('PENDING');
        return;
      }
      
      // 其次尝试选择PLANNING状态的冲刺
      const planningSprints = sprints.filter(s => s.status === 'PLANNING');
      if (planningSprints.length > 0) {
        setSelectedSprint(planningSprints[0]);
        setSelectedType('PLANNING');
        return;
      }
      
      // 最后选择任意可用的冲刺
      setSelectedSprint(sprints[0]);
      setSelectedType(sprints[0].status);
    }
  }, [sprints, currentSprint]);

  // 计算冲刺结束日期
  const calculateEndDate = (startDate, duration) => {
    if (!startDate) return null;
    
    try {
      let dateObj;
      
      // 如果是字符串类型的日期
      if (typeof startDate === 'string') {
        // 处理 "2025-05-24 14:55:10" 格式
        if (startDate.includes(' ')) {
          const datePart = startDate.split(' ')[0];
          dateObj = new Date(datePart);
        } 
        // 处理 "2025-05-05T16:00:00" 格式
        else if (startDate.includes('T')) {
          dateObj = new Date(startDate);
        } 
        // 处理其他字符串格式
        else {
          dateObj = new Date(startDate);
        }
      } 
      // 如果是日期对象
      else if (startDate instanceof Date) {
        dateObj = new Date(startDate);
      } 
      // 其他情况
      else {
        console.error('无效的日期格式:', startDate);
        return null;
      }
      
      // 检查日期是否有效
      if (isNaN(dateObj.getTime())) {
        console.error('无效的日期:', startDate);
        return null;
      }
      
      // 将周转换为天数
      const durationInDays = parseInt(duration) * 7;
      
      // 复制日期对象以避免修改原始对象
      const endDate = new Date(dateObj.getTime());
      endDate.setDate(endDate.getDate() + durationInDays - 1); // 减1是因为开始日期算作第一天
            
      return endDate;
    } catch (e) {
      console.error('计算结束日期时出错:', e, startDate, duration);
      return null;
    }
  };

  // 处理创建新冲刺
  const handleCreateNewSprint = async () => {
    // 验证表单
    const errors = {};
    
    // 验证冲刺名称
    if (!newSprint.name) {
      errors.name = t('sprintNameRequired');
    } else if (newSprint.name.length < 2) {
      errors.name = t('sprintNameTooShort');
    } else if (newSprint.name.length > 50) {
      errors.name = t('sprintNameTooLong');
    }
    
    // 验证冲刺目标
    if (newSprint.goal && (newSprint.goal.length < 10 || newSprint.goal.length > 1000)) {
      if (newSprint.goal.length < 10) {
        errors.goal = t('sprintGoalTooShort');
      } else {
        errors.goal = t('sprintGoalTooLong');
      }
    }
    
    // 验证开始日期
    if (!newSprint.startDate) {
      errors.startDate = t('startDateRequired');
    }
    
    // 验证持续时间
    if (!newSprint.duration) {
      errors.duration = t('durationRequired');
    }
    
    // 如果有错误，更新错误状态并返回
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    // 重置错误状态
    setFormErrors({});
    
    // 确保获取到所有必要参数
    if (!user?.id) {
      console.error('创建冲刺失败: 无法获取用户ID');
      return;
    }
    
    if (!teamId) {
      console.error('创建冲刺失败: 无法获取团队ID');
      return;
    }
    
    const sprintData = {
      ...newSprint,
      team_id: teamId,
      project_id: projectId,
      created_by: user.id, // 确保始终传递用户ID
      endDate: calculateEndDate(newSprint.startDate, newSprint.duration),
      status: 'PLANNING', // 设置初始状态
      task_ids: [] // 初始没有任务
    };
    
    
    try {
      // 显示加载状态，使用唯一ID便于后续引用
      const loadingToastId = toast.loading(t('creatingNewSprint'));
      
      // 等待创建冲刺的处理
      const createdSprint = await onCreateSprint(sprintData);
      
      // 清除加载状态
      toast.dismiss(loadingToastId);
      
      if (createdSprint) {
        setCreateDialogOpen(false);
        // 重置表单
        resetForm();
        
        // 显示成功消息
        toast.success(t('createSprintSuccess'));
        
        // 通知父组件 TaskAgile 更新数据
        if (typeof onUpdateMembers === 'function') {
          onUpdateMembers();
          
          // 如果创建的冲刺有返回ID，则设置为当前选中的冲刺
          if (createdSprint.id) {
            // 立即选择新创建的冲刺并设置其类型为 PLANNING
            setSelectedType('PLANNING');
            setSelectedSprint({
              ...createdSprint,
              status: 'PLANNING' // 确保状态被强制设置为 PLANNING
            });
          }
        }
      } else {
        // 创建失败但没有抛出异常的情况
        toast.error(t('createSprintError'));
      }
    } catch (error) {
      console.error('创建冲刺失败:', error);
      // 确保清除加载状态
      toast.dismiss();
      // 显示错误消息
      toast.error(t('createSprintError'));
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
    if (selectedSprint && selectedSprint.id && typeof onUpdateMembers === 'function') {
      onUpdateMembers(selectedSprint.id);
    }
  };

  // 渲染创建冲刺对话框
  const renderCreateSprintDialog = () => {
    // 检查是否已经存在处于PLANNING状态的冲刺
    const hasPlanningSprint = sprints.some(sprint => sprint.status === 'PLANNING');
    
    return (
      <Dialog open={createDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createNewSprint')}</DialogTitle>
            <DialogDescription>{t('fillSprintDetails')}</DialogDescription>
          </DialogHeader>
          
          {/* 如果已经存在处于PLANNING状态的冲刺，显示警告 */}
          {hasPlanningSprint && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md flex items-start mb-4">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{t('planningSprintExists')}</p>
                <p className="text-sm">{t('planningSprintExistsDesc')}</p>
              </div>
            </div>
          )}
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sprintName">{t('sprintName')} <span className="text-red-500">*</span></Label>
              <Input 
                id="sprintName" 
                value={newSprint.name} 
                onChange={(e) => {
                  setNewSprint({...newSprint, name: e.target.value});
                  // 清除错误提示
                  if (formErrors.name) {
                    setFormErrors({...formErrors, name: ''});
                  }
                }}
                placeholder={t('eg')}
                className={formErrors.name ? "border-red-500" : ""}
                maxLength={50}
              />
              <div className="flex justify-between">
                {formErrors.name && <p className="text-red-500 text-xs">{formErrors.name}</p>}
                <p/>
                <p className="text-xs text-muted-foreground">{newSprint.name ? newSprint.name.trim().length : 0}/50</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{t('startDate')} <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newSprint.startDate && "text-muted-foreground",
                      formErrors.startDate && "border-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newSprint.startDate ? 
                      (() => {
                        const dateValue = newSprint.startDate;
                        if (typeof dateValue === 'string') {
                          if (dateValue.includes(' ')) {
                            return dateValue.split(' ')[0];
                          } else if (dateValue.includes('T')) {
                            return dateValue.split('T')[0];
                          }
                          return dateValue;
                        }
                        // 如果是Date对象，格式化为字符串
                        if (dateValue instanceof Date) {
                          return format(dateValue, 'yyyy-MM-dd');
                        }
                        // 默认情况下返回空字符串
                        return '';
                      })()
                      : t('selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={typeof newSprint.startDate === 'string' ? parseDateSafely(newSprint.startDate) : newSprint.startDate}
                    onSelect={(date) => setNewSprint({
                      ...newSprint, 
                      startDate: date,
                      endDate: calculateEndDate(date, newSprint.duration)
                    })}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">{t('duration')} <span className="text-red-500">*</span></Label>
              <Select 
                value={newSprint.duration} 
                onValueChange={(value) => {
                  setNewSprint({
                    ...newSprint, 
                    duration: value,
                    endDate: calculateEndDate(newSprint.startDate, value)
                  });
                  // 清除错误提示
                  if (formErrors.duration) {
                    setFormErrors({...formErrors, duration: ''});
                  }
                }}
              >
                <SelectTrigger className={formErrors.duration ? "border-red-500" : ""}>
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
                  value={newSprint.startDate && newSprint.duration ? 
                    (() => {
                      const endDate = calculateEndDate(newSprint.startDate, newSprint.duration);
                      if (endDate instanceof Date) {
                        return format(endDate, 'yyyy-MM-dd');
                      } else if (typeof endDate === 'string') {
                        // 如果包含空格，取前面部分
                        if (endDate.includes(' ')) {
                          return endDate.split(' ')[0];
                        }
                        // 如果包含T，取前面部分
                        if (endDate.includes('T')) {
                          return endDate.split('T')[0];
                        }
                        return endDate;
                      }
                      return '';
                    })() : ""} 
                  readOnly 
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="goal">{t('sprintGoal')}</Label>
              <Input 
                id="goal" 
                value={newSprint.goal} 
                onChange={(e) => {
                  setNewSprint({...newSprint, goal: e.target.value});
                  // 清除错误提示
                  if (formErrors.goal) {
                    setFormErrors({...formErrors, goal: ''});
                  }
                }}
                placeholder={t('setASprintGoal')}
                className={formErrors.goal ? "border-red-500" : ""}
                maxLength={1000}
              />
              <div className="flex justify-between">
                {formErrors.goal && <p className="text-red-500 text-xs">{formErrors.goal}</p>}
                <p/>
                <p className="text-xs text-muted-foreground">{newSprint.goal ? newSprint.goal.trim().length : 0}/1000</p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCreateDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleCreateNewSprint} 
              variant={themeColor}
              disabled={hasPlanningSprint} // 如果已经存在处于PLANNING状态的冲刺，禁用创建按钮
            >
              {t('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // 渲染编辑冲刺对话框
  const renderEditSprintDialog = () => {
    if (!editSprint) return null;
    
    // 检查开始日期是否已过
    const startDateValue = editSprint.startDate;
    let isStartDatePassed = false;
    
    if (startDateValue) {
      try {
        // 解析开始日期
        let startDate;
        if (typeof startDateValue === 'string') {
          if (startDateValue.includes(' ')) {
            startDate = new Date(startDateValue.split(' ')[0]);
          } else if (startDateValue.includes('T')) {
            startDate = new Date(startDateValue.split('T')[0]);
          } else {
            startDate = new Date(startDateValue);
          }
        } else if (startDateValue instanceof Date) {
          startDate = startDateValue;
        }
        
        // 清除时间部分，只保留日期
        startDate.setHours(0, 0, 0, 0);
        
        // 获取当前日期（只保留年月日）
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // 检查开始日期是否已过
        isStartDatePassed = startDate < today;
      } catch (e) {
        console.error('解析开始日期出错:', e);
      }
    }
    
    return (
      <Dialog open={editDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editSprint')}</DialogTitle>
            <DialogDescription>{t('editSprintDescription')}</DialogDescription>
          </DialogHeader>
          
          {/* 如果开始日期已过，显示警告 */}
          {isStartDatePassed && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md flex items-start mb-4">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{t('startDatePassed')}</p>
                <p className="text-sm">{t('rememberToStartSprint')}</p>
              </div>
            </div>
          )}
          
          <div className="space-y-2 py-4">
            <div className="space-y-2">
              <Label htmlFor="editSprintName">{t('sprintName')} <span className="text-red-500">*</span></Label>
              <Input 
                id="editSprintName" 
                value={editSprint.name} 
                onChange={(e) => handleEditFormChange('name', e.target.value)}
                placeholder={t('eg')}
                className={editFormErrors.name ? "border-red-500" : ""}
                maxLength={50}
              />
              <div className="flex justify-between">
                {editFormErrors.name && <p className="text-red-500 text-xs">{editFormErrors.name}</p>}
                <p></p>
                <p className="text-xs text-muted-foreground">{editSprint.name ? editSprint.name.trim().length : 0}/50</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{t('startDate')} <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editSprint.startDate && "text-muted-foreground",
                      editFormErrors.startDate && "border-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editSprint.startDate ? 
                      formatDateSafely(editSprint.startDate)
                      : t('selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={typeof editSprint.startDate === 'string' ? parseDateSafely(editSprint.startDate) : editSprint.startDate}
                    onSelect={(date) => handleEditFormChange('startDate', date)}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
              {editFormErrors.startDate && <p className="text-red-500 text-xs">{editFormErrors.startDate}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editDuration">{t('duration')} <span className="text-red-500">*</span></Label>
              <Select 
                value={editSprint.duration} 
                onValueChange={(value) => handleEditFormChange('duration', value)}
              >
                <SelectTrigger className={editFormErrors.duration ? "border-red-500" : ""}>
                  <SelectValue placeholder={t('selectDuration')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('1week')}</SelectItem>
                  <SelectItem value="2">{t('2weeks')}</SelectItem>
                  <SelectItem value="3">{t('3weeks')}</SelectItem>
                  <SelectItem value="4">{t('4weeks')}</SelectItem>
                </SelectContent>
              </Select>
              {editFormErrors.duration && <p className="text-red-500 text-xs">{editFormErrors.duration}</p>}
            </div>
            
            {editSprint.startDate && editSprint.duration && (
              <div className="space-y-2">
                <Label>{t('endDate')}</Label>
                <Input 
                  value={
                    editSprint.startDate && editSprint.duration ? 
                    formatDateSafely(calculateEndDate(editSprint.startDate, editSprint.duration))
                    : ""
                  } 
                  readOnly 
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="editGoal">{t('sprintGoal')}</Label>
              <Input 
                id="editGoal" 
                value={editSprint.goal} 
                onChange={(e) => handleEditFormChange('goal', e.target.value)}
                placeholder={t('setASprintGoal')}
                className={editFormErrors.goal ? "border-red-500" : ""}
                maxLength={1000}
              />
              <div className="flex justify-between">
                {editFormErrors.goal && <p className="text-red-500 text-xs">{editFormErrors.goal}</p>}
                <p></p>
                <p className="text-xs text-muted-foreground">{editSprint.goal ? editSprint.goal.trim().length : 0}/1000</p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleSaveEditSprint}
              variant={themeColor}
            >
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // 渲染基于当前选择和状态的内容
  const renderContent = () => {
    // 处理没有选中sprint的情况
    if (!selectedSprint) {
      return (
        <div className="text-center p-8">
          {sprints.length === 0 ? (
            // 如果没有任何Sprint，显示创建Sprint按钮
            <div>
              <p className="mb-4">{t('noSprintsFound')}</p>
            </div>
          ) : (
            // 如果有Sprint但没有选中，可能是因为筛选条件
            <div>
              <p className="mb-4">{t('noSprintsFound')}</p>
            </div>
          )}
        </div>
      );
    }

    // 调试日期格式
    if (selectedSprint.startDate) {
      
      // 检查开始日期格式
      let formattedStartDate = selectedSprint.startDate;
      if (typeof selectedSprint.startDate === 'string') {
        if (selectedSprint.startDate.includes(' ')) {
          formattedStartDate = selectedSprint.startDate.split(' ')[0];
        } 
        if (selectedSprint.startDate.includes('T')) {
          formattedStartDate = selectedSprint.startDate.split('T')[0];
        }
      }
      
      // 打印结束日期信息
      if (selectedSprint.endDate) {
        
        let formattedEndDate = selectedSprint.endDate;
        if (typeof selectedSprint.endDate === 'string') {
          if (selectedSprint.endDate.includes(' ')) {
            formattedEndDate = selectedSprint.endDate.split(' ')[0];
          } 
          if (selectedSprint.endDate.includes('T')) {
            formattedEndDate = selectedSprint.endDate.split('T')[0];
          } 
        }
        
      }
      
    }

    // 根据所选冲刺状态和类型显示不同组件
    if (selectedType === 'RETROSPECTIVE') {
      return (
        <SprintRetrospective 
          sprint={selectedSprint} 
          agileMembers={agileMembers}
          themeColor={themeColor}
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
            themeColor={themeColor}
          />
          
          <SprintBoard 
            sprint={selectedSprint} 
            tasks={sprintTasks}
            teamId={teamId}
            themeColor={themeColor}
            agileMembers={Array.isArray(agileMembers) ? agileMembers : []}
            selectedType={selectedType}
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
          {selectedType === 'PLANNING' && !selectedSprint && isTeamCreator && (
            <Button 
              variant={themeColor} 
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              {t('createSprint')}
            </Button>
          )}
          {selectedSprint && (selectedSprint.status === 'PLANNING') && isTeamCreator && (
            <>
              <Button 
                variant={themeColor} 
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

            <div className="flex items-center">
              {/* 对于PLANNING状态的冲刺，显示编辑按钮 */}
              {isTeamCreator && selectedSprint.status === 'PLANNING' && 
                (new Date(selectedSprint.start_date || selectedSprint.startDate) < new Date()) && (
                <Button 
                  variant={themeColor}
                  size="sm" 
                  className="mr-3"
                  onClick={(e) => {
                    e.stopPropagation(); // 防止触发展开/折叠
                    openEditSprintDialog();
                  }}
                >
                  <Pen className="w-4 h-4 mr-1" />
                  {t('edit')}
                </Button>
              )}
              
              {selectedSprint && (selectedSprint.status === 'PENDING') && (
                <>
                  {isSprintOverdue(selectedSprint) && (
                    <div className="flex items-center text-red-500 mr-3" title={t('sprintOverdue')}>
                      <AlertCircle className="w-5 h-5 mr-1" />
                      <span className="text-sm">{t('overdue')}</span>
                    </div>
                  )}
                  {isTeamCreator && (
                  <Button 
                    variant={themeColor} 
                    onClick={(e) => {
                      e.stopPropagation(); // 防止触发展开/折叠
                      onCompleteSprint(selectedSprint.id);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {t('completeSprint')}
                  </Button>
                  )}
                </>
              )}
            </div>
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
                  {(() => {
                    // 获取日期字段，兼容start_date和startDate两种命名
                    const dateValue = selectedSprint.startDate || selectedSprint.start_date;
                    
                    if (!dateValue) return "-";
                    
                    let formattedDate = dateValue;
                    
                    // 处理不同格式的日期字符串
                    if (typeof dateValue === 'string') {
                      // 如果包含空格，取前面部分
                      if (dateValue.includes(' ')) {
                        formattedDate = dateValue.split(' ')[0];
                      }
                      // 如果包含T，取前面部分
                      if (dateValue.includes('T')) {
                        formattedDate = dateValue.split('T')[0];
                      }
                    }
                    
                    return formattedDate;
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">{t('endDate')}:</p>
                <p>
                  {(() => {
                    // 获取开始日期和持续时间
                    const startDateValue = selectedSprint.startDate || selectedSprint.start_date;
                    const duration = selectedSprint.duration;
                    
                    // 如果没有开始日期或持续时间，显示默认值
                    if (!startDateValue || !duration) return "-";
                    
                    // 计算结束日期
                    const endDate = calculateEndDate(startDateValue, duration);
                    if (!endDate) return "-";
                    
                    // 格式化日期显示
                    if (endDate instanceof Date) {
                      return endDate.toISOString().split('T')[0];
                    } else if (typeof endDate === 'string') {
                      if (endDate.includes(' ')) {
                        return endDate.split(' ')[0];
                      } else if (endDate.includes('T')) {
                        return endDate.split('T')[0];
                      }
                      return endDate;
                    }
                    return "-";
                  })()}
                </p>
              </div>
              
              {/* 添加实际开始时间 */}
              {(selectedSprint.status === 'RETROSPECTIVE' || selectedSprint.status === 'PENDING') && (
                <div>
                  <p className="text-sm font-medium">{t('actualStartDate')}:</p>
                  <p>
                    {formatDateSafely(selectedSprint.start_on)}
                  </p>
                </div>
              )}
              
              {/* 添加完成时间，仅在RETROSPECTIVE状态下显示 */}
              {selectedSprint.status === 'RETROSPECTIVE' && (
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium">{t('completedOn')}:</p>
                    <p className="flex items-center">
                      {selectedSprint.completed_on ? formatDateSafely(selectedSprint.completed_on) : '-'}
                      
                      {/* 如果完成日期超过了计划结束日期，显示逾期标签 */}
                      {selectedSprint.completed_on && 
                        new Date(selectedSprint.completed_on) > new Date(selectedSprint.end_date || calculateEndDate(selectedSprint.startDate || selectedSprint.start_date, selectedSprint.duration)) && (
                        <span className="ml-2 text-xs text-red-500 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {t('overdue')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              
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
      {renderEditSprintDialog()}
    </div>
  );
};

export default SprintPlanning;