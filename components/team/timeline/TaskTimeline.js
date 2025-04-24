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

export default function TaskTimeline({ projectId, teamId, teamCFId }) {
  const ganttContainer = useRef(null);
  const t = useTranslations('CreateTask');
  const { confirm } = useConfirm();
  const project = useSelector(state => 
    state.projects.projects.find(p => p.id.toString() === projectId.toString())
  );
  
  const zoom = 'Days';
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [newTask, setNewTask] = useState({
    text: '',
    start_date: new Date().toISOString().split('T')[0] + ' 00:00',
    duration: 1
  });
  const [editTask, setEditTask] = useState({
    id: null,
    text: '',
    start_date: new Date().toISOString().split('T')[0] + ' 00:00',
    duration: 1,
    progress: 0
  });
  const taskColor = project?.theme_color;
  
  // 初始化gantt对象，避免循环依赖
  const [ganttObj, setGanttObj] = useState(null);
  
  // 使用BodyContent中的自定义hook获取数据
  const { sections, allTasks, ganttTasks, tags } = useTimelineData(teamId, teamCFId, ganttObj);

  // Apply zoom level
  const setZoom = (value) => {
    applyZoom(value, setCurrentZoom);
  }

  // Handle toolbar actions
  const handleZoomChange = (level) => {
    changeZoom(level, setZoom, setCurrentZoom);
  }

  const handleAddTask = () => {
    if (newTask.text.trim() === '') return;

    try {
      // 使用BodyContent中的格式化函数
      const dateObj = formatDateForGantt(newTask.start_date);
      
      const taskToAdd = {
        text: newTask.text,
        start_date: dateObj,
        duration: parseInt(newTask.duration) || 1,
        progress: 0
      };
      
      // 使用calculateEndDate自动计算结束日期
      taskToAdd.end_date = gantt.calculateEndDate(taskToAdd);
      
      const taskId = gantt.addTask(taskToAdd);
      setShowTaskForm(false);
      setNewTask({
        text: '',
        start_date: new Date().toISOString().split('T')[0] + ' 00:00',
        duration: 1
      });
    } catch (error) {
      console.error("Error adding task:", error);
      alert("添加任务时出错，请检查日期格式");
    }
  }

  const handleUpdateTask = () => {
    if (editTask.text.trim() === '') return;

    try {
      // 使用BodyContent中的格式化函数
      const dateObj = formatDateForGantt(editTask.start_date);
      
      const taskToUpdate = {
        id: editTask.id,
        text: editTask.text,
        start_date: dateObj,
        duration: parseInt(editTask.duration) || 1,
        progress: editTask.progress
      };
  
      // 使用calculateEndDate自动计算结束日期
      taskToUpdate.end_date = gantt.calculateEndDate(taskToUpdate);
      
      gantt.updateTask(editTask.id, taskToUpdate);
      setShowEditForm(false);
    } catch (error) {
      console.error("Error updating task:", error);
      alert("更新任务时出错，请检查日期格式");
    }
  }

  const handleDeleteTask = () => {
    confirm({
      title: '确认删除',
      description: `Task "${editTask.text}" will be deleted`,
      variant: 'error',
      onConfirm: () => {
        gantt.deleteTask(editTask.id);
        gantt.refreshData();
        setShowEditForm(false);
      }
    });
  }

  // Toolbar component
  const Toolbar = () => {
    return (
      <div className="flex justify-between pl-1">
        <div className='flex justify-start items-center'>
          <h2 className="font-bold">2025</h2>
          <Button 
            variant="outline"
            onClick={() => setShowTaskForm(true)}
            className="border-none ml-1 p-0"
          >
            <Plus size={16} />
          </Button>
          <Button 
            variant="outline"
            className="border-none p-0"
          >
            <ChevronDown className='h-4 w-4'/>
          </Button>
        </div>
        <div className="flex justify-end gap-1 items-end py-1 pr-1">
          <Button 
            variant={currentZoom === 'Hours' ? taskColor : 'outline'}
            onClick={() => handleZoomChange('Hours')}
          >
            {t('Hours')}
          </Button>
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
    
    // Customize task color
    gantt.templates.task_class = () => `custom-task-color`;
    
    // Set task color CSS variable
    document.documentElement.style.setProperty('--task-color', taskColor);
    
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

    // Add link deletion confirmation
    const linkClickHandler = (id) => {
      const link = gantt.getLink(id);
      const sourceTask = gantt.getTask(link.source);
      const targetTask = gantt.getTask(link.target);
      
      confirm({
        title: t('confirmDeleteLink'),
        description: `${t('link')} ${sourceTask.text} – ${targetTask.text} ${t('willBeDeleted')}`,
        variant: 'error',
        onConfirm: () => {
          gantt.deleteLink(id);
          gantt.refreshData();
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
    
    // 当任务数据或缩放级别更新时，更新Gantt图表
    if (ganttTasks.length > 0) {
      ganttObj.clearAll();
      ganttObj.parse({
        data: ganttTasks,
        links: []
      });
      setZoom(currentZoom);
    } else if (ganttObj && currentZoom) {
      // 如果没有任务数据但有缩放级别更新，只更新缩放
      setZoom(currentZoom);
    }
  }, [ganttObj, ganttTasks, currentZoom]);

  return (
    <div className={`w-full h-full overflow-hidden`}>
      <style jsx>{`
        :root {
          --task-color: ${taskColor};
        }
      `}</style>
      <Toolbar />
      <AddTaskDialog
        taskColor={taskColor}
        showTaskForm={showTaskForm}
        setShowTaskForm={setShowTaskForm}
        newTask={newTask}
        setNewTask={setNewTask}
        handleAddTask={handleAddTask}
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
