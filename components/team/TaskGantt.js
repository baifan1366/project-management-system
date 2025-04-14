'use client'

import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import './Gantt.css';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { ChevronDown } from 'lucide-react'
import { useSelector } from 'react-redux';
import { useTranslations } from 'next-intl';
import AddTaskDialog from './AddTaskDialog';
import EditTaskDialog from './EditTaskDialog';
import { Plus } from 'lucide-react';
import { initZoom, setZoom as applyZoom, handleZoomChange as changeZoom } from './GanttTools';
import { useConfirm } from '@/hooks/use-confirm';

export default function TaskGantt({ projectId, teamId, teamCFId }) {
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
    start_date: new Date(),
    duration: 1
  });
  const [editTask, setEditTask] = useState({
    id: null,
    text: '',
    start_date: new Date(),
    duration: 1,
    progress: 0
  });
  const taskColor = project?.theme_color;

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

    const formattedDate = gantt.date.format(newTask.start_date, "%Y-%m-%d %H:%i");
    const taskToAdd = {
      text: newTask.text,
      start_date: formattedDate,
      duration: parseInt(newTask.duration) || 1,
      progress: 0
    };
    
    const taskId = gantt.addTask(taskToAdd);
    setShowTaskForm(false);
    setNewTask({
      text: '',
      start_date: new Date(),
      duration: 1
    });
  }

  const handleUpdateTask = () => {
    if (editTask.text.trim() === '') return;

    let formattedDate;
    if (editTask.start_date instanceof Date) {
      formattedDate = gantt.date.format(editTask.start_date, "%Y-%m-%d %H:%i");
    } else {
      // 如果已经是字符串格式但需要确保时间部分
      formattedDate = editTask.start_date.includes(' ') 
        ? editTask.start_date 
        : `${editTask.start_date} 00:00`;
    }

    const taskToUpdate = {
      id: editTask.id,
      text: editTask.text,
      start_date: formattedDate,
      duration: parseInt(editTask.duration) || 1,
      progress: editTask.progress
    };
    
    gantt.updateTask(editTask.id, taskToUpdate);
    setShowEditForm(false);
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
            Hour
          </Button>
          <Button 
            variant={currentZoom === 'Days' ? taskColor : 'outline'}
            onClick={() => handleZoomChange('Days')}
          >
            Day
          </Button>
          <Button 
            variant={currentZoom === 'Weeks' ? taskColor : 'outline'}
            onClick={() => handleZoomChange('Weeks')}
          >
            Week
          </Button>
          <Button 
            variant={currentZoom === 'Months' ? taskColor : 'outline'}
            onClick={() => handleZoomChange('Months')}
          >
            Month
          </Button>
          <Button 
            variant={currentZoom === 'Years' ? taskColor : 'outline'}
            onClick={() => handleZoomChange('Years')}
          >
            Year
          </Button>
        </div>
      </div>
    );
  };

  useEffect(() => {
    // Configure gantt
    gantt.config.date_format = "%Y-%m-%d %H:%i";  
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
        title: '确认删除',
        description: `Link ${sourceTask.text} – ${targetTask.text} will be deleted`,
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
    
    const data = {
      data: [
        { id: 1, text: 'Task #1', start_date: '2025-04-15', duration: 3, progress: 0.6 },
        { id: 2, text: 'Task #2', start_date: '2025-04-18', duration: 3, progress: 0.4 },
        { id: 3, text: 'Task #3', start_date: '2025-04-15', duration: 1, progress: 0.4 },
        { id: 4, text: 'Task #4', start_date: '2025-04-15', duration: 2, progress: 0.4 },
        { id: 5, text: 'Task #5', start_date: '2025-04-15', duration: 3, progress: 0.4 },
        { id: 6, text: 'Task #6', start_date: '2025-04-15', duration: 3, progress: 0.4 },
        { id: 7, text: 'Task #7', start_date: '2025-04-15', duration: 3, progress: 0.4 },
        { id: 8, text: 'Task #8', start_date: '2025-04-15', duration: 3, progress: 0.4 },
        { id: 9, text: 'Task #9', start_date: '2025-04-15', duration: 3, progress: 0.4 },
        { id: 10, text: 'Task #10', start_date: '2025-04-15', duration: 3, progress: 0.4 },
        { id: 11, text: 'Task #11', start_date: '2025-04-15', duration: 3, progress: 0.4 },
        { id: 12, text: 'Task #12', start_date: '2025-04-15', duration: 3, progress: 0.4 },
        { id: 13, text: 'Task #13', start_date: '2025-04-15', duration: 3, progress: 0.4 },
        { id: 14, text: 'Task #14', start_date: '2025-04-15', duration: 3, progress: 0.4 }
      ],
      links: [
        { id: 1, source: 1, target: 2, type: '0' }
      ]
    };
    
    gantt.init(ganttContainer.current);
    gantt.parse(data);
    
    // Initialize with default zoom level
    initZoom();
    setZoom(currentZoom);
    
    return () => {
      // Clean up event listeners
      gantt.detachEvent(linkClickEventId);
      gantt.clearAll();
    };
  }, []);

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
