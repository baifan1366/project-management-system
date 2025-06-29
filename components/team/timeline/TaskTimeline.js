'use client'

import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import './Timeline.css';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/button';
import { ChevronDown } from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux';
import { useTranslations } from 'next-intl';
import AddTaskDialog from './AddTaskDialog';
import EditTaskDialog from './EditTaskDialog';
import { Plus } from 'lucide-react';
import { initZoom, setZoom as applyZoom, handleZoomChange as changeZoom } from './TimelineTools';
import { useConfirm } from '@/hooks/use-confirm';
import { useTimelineData, formatDateForGantt } from './BodyContent';
import { updateTask, fetchTaskById, deleteTask } from '@/lib/redux/features/taskSlice';
import { getTagByName } from '@/lib/redux/features/tagSlice';
import { createTaskLink, deleteTaskLink } from '@/lib/redux/features/taskLinksSlice';
import { useGetUser } from '@/lib/hooks/useGetUser';
import { getSectionByTeamId, getSectionById, updateTaskIds } from '@/lib/redux/features/sectionSlice';

/**
 * 格式化日期为Gantt图所需的标准格式
 * 
 * @param {string|Date} date - 日期字符串或Date对象
 * @returns {string} - 格式化后的日期字符串，格式为 "YYYY-MM-DD HH:MM"
 */
function formatGanttDate(date) {
  try {
    // 检查输入值是否为有效日期
    if (!date) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      return `${year}-${month}-${day} 00:00`;
    }
    
    // 处理Date对象
    if (date instanceof Date) {
      if (isNaN(date.getTime())) {
        throw new Error("无效的日期对象");
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day} 00:00`;
    }
    
    // 处理字符串
    if (typeof date === 'string') {
      // 已经是Gantt格式 (YYYY-MM-DD HH:MM)
      if (date.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)) {
        return date;
      }
      
      // ISO日期格式 (YYYY-MM-DDThh:mm:ss.sssZ)
      if (date.includes('T')) {
        const datePart = date.split('T')[0];
        return `${datePart} 00:00`;
      }
      
      // 只有日期部分 (YYYY-MM-DD)
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return `${date} 00:00`;
      }
      
      // 尝试解析其他日期格式
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error(`无法解析日期字符串: ${date}`);
      }
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day} 00:00`;
    }
    
    throw new Error("无效的日期输入类型");
  } catch (error) {
    console.error("日期格式化错误:", error);
    // 返回当前日期作为后备选项
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} 00:00`;
  }
}

export default function TaskTimeline({ projectId, teamId, teamCFId, refreshKey, addTask }) {
  const ganttContainer = useRef(null);
  const t = useTranslations('CreateTask');
  const tConfirm = useTranslations('confirmation')
  const { confirm } = useConfirm();
  const project = useSelector(state => 
    state.projects.projects.find(p => p.id.toString() === projectId.toString())
  );
  const { user } = useGetUser();
  const currentDate = new Date().toISOString().split('T')[0];
  const zoom = 'Days';
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [editTask, setEditTask] = useState({
    id: null,
    text: '',
    start_date: new Date().toISOString().split('T')[0] + ' 00:00',
    duration: 1,
    progress: 0
  });
  
  // 添加对addTask属性的监听
  useEffect(() => {
    if (addTask) {
      setShowTaskForm(true);
    }
  }, [addTask]);
  
  // 当外部传入的refreshKey变化时，强制更新内部的refreshFlag
  useEffect(() => {
    setRefreshFlag(prev => prev + 1);
  }, [refreshKey]);
  
  // 颜色名称到颜色代码的映射，与button.jsx中的颜色一致
  const colorMap = {
    red: '#c72c41',
    orange: '#d76d2b',
    green: '#008000',
    blue: '#3b6dbf',
    purple: '#5c4b8a',
    pink: '#d83c5e',
    black: '#000000',
    white: '#ffffff',
    lightGreen: '#bbf7d0',
    lightYellow: '#fefcbf',
    lightCoral: '#f08080',
    lightOrange: '#ffedd5',
    peach: '#ffcccb',
    lightCyan: '#e0ffff',
  };
  
  // 获取颜色代码，如果是已知的颜色名称则使用映射，否则直接返回原值
  const getColorCode = (colorName) => {
    return colorMap[colorName] || colorName;
  };
  
  const taskColor = project?.theme_color;
  const taskColorCode = getColorCode(taskColor);
  
  // 初始化gantt对象，避免循环依赖
  const [ganttObj, setGanttObj] = useState(null);
  
  // 使用BodyContent中的自定义hook获取数据
  const { sections, allTasks, ganttTasks, links, tags } = useTimelineData(teamId, teamCFId, ganttObj, refreshFlag, refreshKey);

  const dispatch = useDispatch();

  // Apply zoom level
  const setZoom = (value) => {
    applyZoom(value, setCurrentZoom);
  }

  // Handle toolbar actions
  const handleZoomChange = (level) => {
    changeZoom(level, setZoom, setCurrentZoom);
  }

  // 任务链接相关函数 - 创建任务链接
  const handleCreateTaskLink = async (link) => {
    try {
      if (!link || !link.source || !link.target) {
        console.error("创建链接时缺少必要参数");
        return false;
      }
      
      // 验证链接类型，确保是有效值
      let linkType = parseInt(link.type);
      if (isNaN(linkType) || linkType < 0 || linkType > 3) {
        console.error("链接类型无效:", link.type);
        linkType = 0; // 默认使用 finish_to_start (0)
      }

      // 使用Redux dispatch创建链接
      const resultAction = await dispatch(createTaskLink({
        source_task_id: link.source,
        target_task_id: link.target,
        link_type: linkType, // 使用数字类型存储
        user_id: user?.id
      }));

      // 检查action状态
      if (createTaskLink.fulfilled.match(resultAction)) {        
        // 刷新甘特图数据
        setRefreshFlag(prev => prev + 1);
        
        return true;
      } else {
        console.error("创建任务链接失败:", resultAction.error);
        return false;
      }
    } catch (error) {
      console.error("创建任务链接失败:", error);
      return false;
    }
  };

  // 删除任务链接
  const handleDeleteTaskLink = async (linkId) => {
    try {
      if (!linkId) {
        console.error("删除链接时缺少必要参数");
        return false;
      }
      
      // 使用Redux dispatch删除链接
      const user_id = user?.id;
      const resultAction = await dispatch(deleteTaskLink({ user_id, linkId }));
      
      // 检查action状态
      if (deleteTaskLink.fulfilled.match(resultAction)) {        
        // 刷新甘特图数据
        setRefreshFlag(prev => prev + 1);
        
        return true;
      } else {
        console.error("删除任务链接失败:", resultAction.error);
        return false;
      }
    } catch (error) {
      console.error("删除任务链接失败:", error);
      return false;
    }
  };

  // 新的回调函数，将在AddTaskDialog中被调用
  const handleTaskAdd = (taskData) => {
    try {
      const taskToAdd = {
        text: taskData.taskName,
        start_date: taskData.startDate,
        duration: parseInt(taskData.duration) || 1,
        progress: 0
      };
      
      // 使用calculateEndDate自动计算结束日期
      // taskToAdd.end_date = gantt.calculateEndDate(taskToAdd);
      const taskId = gantt.addTask(taskToAdd);
      //make sure the task is added to the gantt
      const task = gantt.getTask(taskId);
      if (!task) {
        throw new Error('Task not found');
      }
      //refresh the gantt
      gantt.refreshData();
      
      // 触发数据刷新
      setRefreshFlag(prev => prev + 1);
      
    } catch (error) {
      console.error("Error adding task:", error);
      alert("添加任务时出错，请检查日期格式");
    }
  }

  const handleUpdateTask = () => {
    try {      
      const taskToUpdate = {
        id: editTask.id,
        text: editTask.text,
        start_date: editTask.start_date,
        duration: editTask.duration,
        progress: editTask.progress
      };
  
      // 使用calculateEndDate自动计算结束日期
      taskToUpdate.end_date = gantt.calculateEndDate(taskToUpdate);
      
      gantt.updateTask(editTask.id, taskToUpdate);
      
      // 触发数据刷新
      setRefreshFlag(prev => prev + 1);
      
      setShowEditForm(false);
    } catch (error) {
      console.error("Error updating task:", error);
      alert("更新任务时出错，请检查日期格式");
    }
  }

  const handleDeleteTask = async () => {
    confirm({
      title: tConfirm('confirmDeleteTask'),
      description: `${tConfirm('task')} "${editTask.text}" ${tConfirm('willBeDeleted')}`,
      variant: 'error',
      onConfirm: async () => {
        try {
          // 获取所有部分
          const sectionsResult = await dispatch(getSectionByTeamId(teamId)).unwrap();
          
          // 检查每个部分是否包含要删除的任务ID
          for (const section of sectionsResult) {
            if (section.task_ids && section.task_ids.includes(parseInt(editTask.id))) {
              // 从task_ids数组中移除该任务ID
              const updatedTaskIds = section.task_ids.filter(id => id !== parseInt(editTask.id));
              
              // 更新部分的task_ids
              await dispatch(updateTaskIds({
                sectionId: section.id,
                teamId: teamId,
                newTaskIds: updatedTaskIds
              }));
            }
          }
          
          // 删除任务
          gantt.deleteTask(editTask.id);
          const deleteResult = await dispatch(deleteTask({
            sectionId: null, // API会处理从部分中删除任务ID
            userId: user?.id,
            oldValues: editTask,
            taskId: editTask.id,
            teamId: teamId
          })).unwrap();
          
          gantt.refreshData();
          setRefreshFlag(prev => prev + 1);
          setShowEditForm(false);
        } catch (error) {
          console.error("删除任务时出错:", error);
        }
      }
    });
  };

  // Toolbar component
  const Toolbar = () => {
    return (
      <div className="flex justify-between pl-1">
        <div className='flex justify-start items-center'>
          <h2 className="font-medium">{currentDate}</h2>
          <Button 
            variant="outline"
            onClick={() => setShowTaskForm(true)}
            className="border-none ml-2 p-1"
          >
            <Plus size={16} />
          </Button>
        </div>
        <div className="flex justify-end gap-1 items-end py-1 pr-1">
          <Button 
            variant={currentZoom === 'Days' ? taskColor : 'outline'}
            onClick={() => handleZoomChange('Days')}
          >
            {t('Days')}
          </Button>
          <Button 
            variant={currentZoom === 'Weeks' ? taskColor : 'outline'}
            onClick={() => handleZoomChange('Weeks')}
          >
            {t('Weeks')}
          </Button>
          <Button 
            variant={currentZoom === 'Months' ? taskColor : 'outline'}
            onClick={() => handleZoomChange('Months')}
          >
            {t('Months')}
          </Button>
          <Button 
            variant={currentZoom === 'Years' ? taskColor : 'outline'}
            onClick={() => handleZoomChange('Years')}
          >
            {t('Years')}
          </Button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!ganttContainer.current) return;
    
    // Initialize gantt
    gantt.init(ganttContainer.current);
    setGanttObj(gantt);
    
    // Configure gantt
    gantt.config.date_format = "%Y-%m-%d %H:%i";
    gantt.config.xml_date = "%Y-%m-%d %H:%i";
    gantt.config.show_grid = false;
    
    // 配置甘特图主题适配
    gantt.config.scale_height = 60; // 适当调整高度，使周和日期显示更清晰
    
    // 自定义周和日期的背景和前景色
    gantt.templates.scale_cell_class = function(date) {
      return "custom-scale-cell";
    };
    
    gantt.templates.timeline_cell_class = function(item, date) {
      return "timeline-cell";
    };
    
    // 配置链接类型 - 链接类型配置
    gantt.config.links = {
      "finish_to_start": "0", // 类型 0
      "start_to_start": "1",   // 类型 1
      "finish_to_finish": "2", // 类型 2
      "start_to_finish": "3"   // 类型 3
    };

    // 设置默认链接类型为 "finish_to_start"(结束到开始) 
    gantt.config.default_link_type = "0";
    
    // 配置链接验证
    gantt.attachEvent("onLinkValidation", function(link) {
      // 确保链接类型是有效的字符串("0"到"3")
      const validTypes = ["0", "1", "2", "3"];
      if (!validTypes.includes(link.type)) {
        console.warn("链接类型无效，修正为默认类型:", link.type);
        link.type = "0"; // 设为默认类型
      }
      return true;
    });
    
    // Customize task color
    gantt.templates.task_class = () => `custom-task-color`;
    
    // 使用颜色代码而非颜色名称
    gantt.templates.task_color = () => taskColorCode;
    gantt.templates.progress_color = () => taskColorCode;
    
    // 设置链接颜色
    gantt.templates.link_color = () => taskColorCode;
    gantt.templates.link_arrow_color = () => taskColorCode;
    
    // Disable default lightbox
    gantt.config.lightbox.sections = [];
    gantt.config.lightbox.width = 0;
    gantt.config.lightbox.height = 0;

    // Disable default delete functionality
    gantt.config.cascade_delete = false;
    gantt.attachEvent("onBeforeLinkDelete", () => false);
    gantt.attachEvent("onBeforeTaskDelete", () => false);
    
    // Override the default task addition
    gantt.attachEvent("onTaskCreated", function(task) {
      setShowTaskForm(true);
      return false; // Prevent default behavior
    });

    // Add double-click event for task editing
    gantt.attachEvent("onTaskDblClick", function(id, e) {
      const task = gantt.getTask(id);
      setEditTask({
        id: task.id,
        text: task.text,
        start_date: task.start_date,
        duration: task.duration,
        progress: task.progress || 0
      });
      setShowEditForm(true);
      return false; // Prevent default behavior
    });

    // 为链接添加创建事件处理函数
    gantt.attachEvent("onAfterLinkAdd", async function(id, link) {
      // 确保链接类型是有效的数字（0-3）
      const validLinkType = parseInt(link.type);
      if (isNaN(validLinkType) || validLinkType < 0 || validLinkType > 3) {
        console.error("无效的链接类型:", link.type);
        gantt.deleteLink(id);
        return false;
      }
      
      // 创建链接到后端数据库
      const result = await handleCreateTaskLink({...link, type: validLinkType.toString()});
      if (!result) {
        // 如果创建失败，则从前端移除链接
        gantt.deleteLink(id);
      }
      return true;
    });

    // Add link deletion confirmation
    const linkClickHandler = (id) => {
      const link = gantt.getLink(id);
      const sourceTask = gantt.getTask(link.source);
      const targetTask = gantt.getTask(link.target);
      
      confirm({
        title: t('confirmDeleteLink'),
        description: `${t('link')} ${sourceTask.text} – ${targetTask.text} ${t('willBeDeleted')}`,
        variant: 'error',
        onConfirm: async () => {
          // 删除数据库中的链接
          const success = await handleDeleteTaskLink(id);
          if (success) {
            // 删除甘特图中的链接
            gantt.deleteLink(id);
            gantt.refreshData();
          }
        }
      });
      return false;
    };

    const linkClickEventId = gantt.attachEvent("onLinkClick", linkClickHandler);
    
    // Add toolbar functionality
    gantt.config.columns = [
      {name: "text", label: "Task name", width: "*", tree: true},
      {name: "start_date", label: "Start time", align: "center"},
      {name: "duration", label: "Duration", align: "center"},
      {name: "add", label: "", width: 44}
    ];
    
    // 默认数据 - 仅在没有任务数据时使用
    const defaultData = {
      data: [
        { id: 1, text: 'Task #1', start_date: '2025-04-15 00:00', duration: 3, progress: 0.6 },
        { id: 2, text: 'Task #2', start_date: '2025-04-18 00:00', duration: 3, progress: 0.4 }
      ],
      links: [
        { id: 1, source: 1, target: 2, type: '0' }
      ]
    };
    
    // 初始缩放设置
    initZoom();
    setZoom(currentZoom);
    
    // 启用拖拽调整任务持续时间
    gantt.config.drag_resize = true;

    // 启用任务拖动（改变开始日期）
    gantt.config.drag_move = true;

    // 启用进度拖拽
    gantt.config.drag_progress = true;
    
    // 任务更新前事件
    gantt.attachEvent("onBeforeTaskUpdate", function(id, task){
      // 验证任务数据，如有需要可以在此进行
      return true; // 返回 false 会阻止更新
    });

    // 任务更新后事件
    gantt.attachEvent("onAfterTaskUpdate", function(id, task){
      // 此处可执行后续操作，例如数据同步或界面更新
      setRefreshFlag(prev => prev + 1);
    });

    // 进度拖拽完成事件
    gantt.attachEvent("onAfterTaskDrag", async function(id, mode, task) {
      // 根据拖拽模式更新相应的任务数据
      const updatedTask = gantt.getTask(id);
      
      if (mode == gantt.config.drag_mode.resize) {
        // 调整了任务持续时间
      } 
      else if (mode == gantt.config.drag_mode.move) {
        // 移动了任务（更改了开始日期）
      }
      else if (mode == gantt.config.drag_mode.progress) {
        // 调整了任务进度
      }
      
      // 创建与 EditTaskDialog 相同格式的任务数据
      const taskToUpdate = {
        id: updatedTask.id,
        text: updatedTask.text,
        start_date: updatedTask.start_date,
        duration: updatedTask.duration,
        progress: updatedTask.progress || 0
      };

      // 使用 calculateEndDate 自动计算结束日期
      taskToUpdate.end_date = gantt.calculateEndDate(taskToUpdate);
      
      // 等待数据库更新完成
      await updateTaskInDatabase(taskToUpdate);      
      // 刷新数据
      setRefreshFlag(prev => prev + 1);
    });
    
    return () => {
      // 在组件卸载时正确清理所有事件监听器
      if (gantt) {
        gantt.detachEvent(linkClickEventId);
        // 清理所有其他可能附加的事件
        gantt.detachAllEvents();
        gantt.clearAll();
      }
    };
  }, []);  // 仅在组件挂载时运行一次

  // 单独处理数据更新的effect，避免与初始化混在一起
  useEffect(() => {
    if (!ganttObj) return;
    
    // 确保设置正确的任务颜色
    ganttObj.templates.task_color = () => taskColorCode;
    ganttObj.templates.progress_color = () => taskColorCode;
    ganttObj.templates.link_color = () => taskColorCode;
    ganttObj.templates.link_arrow_color = () => taskColorCode;
    
    // 当任务数据或缩放级别更新时，更新Gantt图表
    if (ganttTasks.length > 0) {
      ganttObj.clearAll();
      ganttObj.parse({
        data: ganttTasks,
        links: links || []
      });
      setZoom(currentZoom);
    } else {
      // 当没有任务数据时，清空甘特图并更新缩放
      ganttObj.clearAll();
      ganttObj.parse({
        data: [],
        links: []
      });
      setZoom(currentZoom);
    }
  }, [ganttObj, ganttTasks, links, currentZoom, refreshKey, taskColorCode]); 

  // 添加一个新函数用于更新数据库
  const updateTaskInDatabase = async (taskData) => {
    try {
      // 准备数据格式以匹配 EditTaskDialog 中的更新逻辑
      const formattedStartDate = formatGanttDate(taskData.start_date);
      
      // 获取必要的标签ID
      const tagIdName = await dispatch(getTagByName("Name")).unwrap();
      const tagIdStartDate = await dispatch(getTagByName("Start Date")).unwrap();
      const tagIdDuration = await dispatch(getTagByName("Duration")).unwrap();
      const tagIdProgress = await dispatch(getTagByName("Progress")).unwrap();

      const updatedTaskData = {
        [tagIdName]: taskData.text,
        [tagIdStartDate]: formattedStartDate,
        [tagIdDuration]: parseInt(taskData.duration),
        [tagIdProgress]: taskData.progress
      };

      const previousTaskData = await dispatch(fetchTaskById(taskData.id)).unwrap();

      // 调用Redux action更新数据库
      await dispatch(updateTask({ 
        taskId: taskData.id,
        taskData: {
          tag_values: updatedTaskData
        },
        oldTask: {
          previousTaskData
        }
      })).unwrap();
      
      // 确保数据库更新后刷新甘特图
      gantt.refreshData();
      // 再次触发刷新标志，确保组件重新渲染
      setRefreshFlag(prev => prev + 1);
    } catch (error) {
      console.error("更新任务到数据库时出错:", error);
    }
  };

  return (
    <div className={`w-full h-full overflow-hidden`}>
      <style dangerouslySetInnerHTML={{
        __html: `
          .gantt_task_line {
            background-color: ${taskColorCode} !important;
            border-color: ${taskColorCode} !important;
          }
          .gantt_task_progress {
            background-color: ${taskColorCode} !important;
          }
          .gantt_link_arrow {
            border-color: ${taskColorCode} !important;
          }
          .gantt_task_link .gantt_line_wrapper div {
            background-color: ${taskColorCode} !important;
          }
          
          /* 确保周和日期区域背景色与主题一致 */
          .gantt_task_scale, 
          .gantt_task_scale .gantt_scale_cell,
          .gantt_scale_line {
            background-color: hsl(var(--background)) !important;
            color: hsl(var(--foreground)) !important;
            border-color: hsl(var(--border)) !important;
          }
          
          /* 确保日期单元格边框是透明的以避免出现白线 */
          .gantt_scale_cell {
            border-right: none !important;
          }
          
          /* 周号单元格样式 */
          .gantt_scale_cell:first-child {
            font-weight: 600;
          }
        `
      }} />
      <Toolbar />
      <AddTaskDialog
        teamId={teamId}
        taskColor={taskColor}
        showTaskForm={showTaskForm}
        setShowTaskForm={setShowTaskForm}
        onTaskAdd={handleTaskAdd}
      />
      <EditTaskDialog
        taskColor={taskColor}
        showEditForm={showEditForm}
        setShowEditForm={setShowEditForm}
        editTask={editTask}
        setEditTask={setEditTask}
        handleUpdateTask={handleUpdateTask}
        handleDeleteTask={handleDeleteTask}
      />
      <div 
        ref={ganttContainer}
        className="gantt-container overflow-auto" 
      />
    </div>
  );
}
