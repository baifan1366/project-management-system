'use client'

import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTasksBySectionId } from '@/lib/redux/features/taskSlice';
import { getSectionByTeamId } from '@/lib/redux/features/sectionSlice';
import { fetchAllTags } from '@/lib/redux/features/tagSlice';
import { getTags } from '@/lib/redux/features/teamCFSlice';
import { fetchTaskLink } from '@/lib/redux/features/taskLinksSlice';

// 使用唯一键记录全局请求状态，避免重复请求
const requestCache = {
  allTags: false,
  teamTags: {},
  sections: {},
  taskLinks: false // 添加任务链接的缓存标志
};

export const useTimelineData = (teamId, teamCFId, gantt, refreshFlag = 0, refreshKey) => {
  const dispatch = useDispatch();
  const allTags = useSelector(state => state.tags.tags);
  const teamCFTags = useSelector(state => state.teamCF.tags);
  const tagsStatus = useSelector(state => state.teamCF.tagsStatus);
  const taskLinks = useSelector(state => state.taskLinks.links); // 从Redux获取任务链接
  
  const [sections, setSections] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [ganttTasks, setGanttTasks] = useState([]);
  const [tags, setTags] = useState([]);
  const [links, setLinks] = useState([]); // 添加links状态存储任务链接
  
  // 本地跟踪当前组件实例的已请求状态
  const localRequestTracker = useRef({
    allTagsFetched: false,
    teamTagsFetched: false,
    sectionsFetched: false,
    taskLinksFetched: false // 添加任务链接的本地跟踪标志
  });

  // 获取所有通用标签 - 全局只请求一次
  useEffect(() => {
    if (!requestCache.allTags && !localRequestTracker.current.allTagsFetched) {
      dispatch(fetchAllTags());
      requestCache.allTags = true;
      localRequestTracker.current.allTagsFetched = true;
    }
  }, [dispatch]);

  // 获取特定团队字段的标签 - 每个teamId+teamCFId组合只请求一次
  useEffect(() => {
    if (teamId && teamCFId) {
      const cacheKey = `${teamId}_${teamCFId}`;
      
      if (!requestCache.teamTags[cacheKey] && !localRequestTracker.current.teamTagsFetched) {
        dispatch(getTags({ teamId, teamCFId }));
        requestCache.teamTags[cacheKey] = true;
        localRequestTracker.current.teamTagsFetched = true;
      }
    }
  }, [dispatch, teamId, teamCFId]);

  // 当标签数据可用时更新本地标签状态
  useEffect(() => {
    // 优先使用特定字段的标签
    if (teamCFTags && teamCFTags.length > 0) {
      setTags(teamCFTags);
    } else if (allTags && allTags.length > 0) {
      setTags(allTags);
    }
  }, [allTags, teamCFTags]);

  // 获取任务链接数据
  useEffect(() => {
    let isMounted = true;
    
    async function fetchLinks() {
      try {
        // 当收到刷新标志时重置缓存状态
        if (refreshFlag > 0) {
          requestCache.taskLinks = false;
          localRequestTracker.current.taskLinksFetched = false;
        }
        
        if (!requestCache.taskLinks && !localRequestTracker.current.taskLinksFetched) {
          await dispatch(fetchTaskLink());
          
          if (!isMounted) return;
          
          requestCache.taskLinks = true;
          localRequestTracker.current.taskLinksFetched = true;
        }
      } catch (error) {
        console.error("获取任务链接失败:", error);
      }
    }
    
    fetchLinks();
    
    return () => {
      isMounted = false;
    };
  }, [dispatch, refreshFlag]);

  // 当Redux中的taskLinks更新时，更新本地links状态
  useEffect(() => {
    if (taskLinks && taskLinks.length > 0) {
      // 处理链接数据，转换为gantt需要的格式
      const formattedLinks = taskLinks.map(link => {
        // 确保链接类型是有效的值（0-3）并转换为字符串
        let linkType = link.link_type;
        if (linkType === null || linkType === undefined) {
          linkType = 0; // 默认使用 finish_to_start
        }
        
        // 确保链接类型在有效范围内
        if (linkType < 0 || linkType > 3) {
          linkType = 0;
        }
        
        return {
          id: link.id,
          source: link.source_task_id,
          target: link.target_task_id,
          type: linkType.toString() // gantt需要字符串类型
        };
      });
      
      setLinks(formattedLinks);
    } else {
      setLinks([]);
    }
  }, [taskLinks]);

  // 获取部分和任务数据 - 当添加新任务时重新加载
  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      try {
        // 当收到刷新标志或初始加载时重置缓存状态
        if (refreshFlag > 0) {
          requestCache.sections[teamId] = false;
          localRequestTracker.current.sectionsFetched = false;
        }
        
        if (!requestCache.sections[teamId] && !localRequestTracker.current.sectionsFetched) {
          // 获取部分数据
          const sectionsData = await dispatch(getSectionByTeamId(teamId)).unwrap();
          if (!isMounted) return;
          
          requestCache.sections[teamId] = true;
          localRequestTracker.current.sectionsFetched = true;
          setSections(sectionsData || []);
          
          // 为每个部分获取任务
          const tasksPromises = sectionsData.map(section => 
            dispatch(fetchTasksBySectionId(section.id)).unwrap()
          );
          const tasksResults = await Promise.all(tasksPromises);
          if (!isMounted) return;
          
          // 合并所有任务
          const allTasksData = tasksResults.flat();
          setAllTasks(allTasksData);
        }
      } catch (error) {
        console.error("Error fetching data for Gantt chart:", error);
      }
    }
    
    if (teamId) {
      fetchData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [teamId, dispatch, refreshFlag]);

  // 当任务或标签数据更新时，重新映射并更新Gantt
  useEffect(() => {
    // 只有当gantt已初始化且有任务和标签数据时
    if (gantt && allTasks.length > 0 && tags.length > 0) {
      const updatedGanttTasks = mapTasksToGantt(allTasks, tags, gantt);
      setGanttTasks(updatedGanttTasks);
    }
  }, [allTasks, tags, gantt]);

  return { sections, allTasks, ganttTasks, links, tags, refreshKey };
};

// 将任务映射到Gantt格式
export const mapTasksToGantt = (tasks, tags, gantt) => {
  if (!tasks || tasks.length === 0) {
    return [];
  }
  
  return tasks.map(task => {
    const tagValues = task.tag_values || {};
    
    let taskName = '';
    let startDate = task.created_at || new Date().toISOString().split('T')[0] + ' 00:00';
    let taskDuration = 1;
    let taskProgress = 0;
    
    Object.entries(tagValues).forEach(([tagId, value]) => {
      const tag = findTagById(tagId, tags);
      if (tag) {
        switch (tag.name) {
          case 'Name':
            taskName = String(value || '');
            break;
          case 'Start Date':
            if (value) {
              startDate = value;
            }
            break;
          case 'Duration':
            const duration = parseInt(value);
            taskDuration = !isNaN(duration) && duration > 0 ? duration : 1;
            break;
          case 'Progress':
            const progress = parseFloat(value);
            if (!isNaN(progress)) {
              taskProgress = progress > 1 ? progress / 100 : progress;
            }
            break;
        }
      }
    });
    
    if (!taskName) {
      taskName = `Task #${task.id}`;
    }
    
    taskProgress = Math.max(0, Math.min(1, taskProgress));
    
    // 确保日期格式正确
    try {            
      // 处理特殊格式的日期字符串
      if (typeof startDate === 'string') {
        // 处理带T分隔符的ISO格式日期
        if (startDate.includes('T')) {
          // 如果日期格式为: 2025-04-15T03:07:30.71888 00:00 这种混合格式
          if (startDate.includes(' ') && startDate.split(' ').length > 1) {
            // 提取日期部分，忽略后面的时间部分
            startDate = startDate.split('T')[0] + ' 00:00';
          } else {
            // 标准ISO格式转换为gantt期望的格式
            const isoDate = new Date(startDate);
            startDate = isoDate.toISOString().split('T')[0] + ' 00:00';
          }
        }
        // 确保startDate包含时间部分
        else if (!startDate.includes(' ')) {
          startDate = startDate + ' 00:00';
        }
      }
      
      // 创建日期对象
      const dateObj = new Date(startDate);
      
      // 检查日期对象是否有效
      if (isNaN(dateObj.getTime())) {
        throw new Error(`Invalid date: ${startDate}`);
      }
      
      
      // 创建一个任务对象
      const ganttTask = {
        id: task.id,
        text: taskName,
        start_date: dateObj,
        duration: taskDuration,
        progress: taskProgress
      };
      
      
      // 使用gantt的日期计算函数来确保日期格式正确
      if (gantt && gantt.calculateEndDate) {
        ganttTask.end_date = gantt.calculateEndDate(ganttTask);
      } else {
        ganttTask.end_date = new Date(dateObj.getTime() + taskDuration * 24 * 60 * 60 * 1000);
      }
      
      return ganttTask;
    } catch (error) {
      console.error(`Error formatting task ${task.id}:`, error, startDate);
      // 返回带有当前日期的任务，以防日期解析失败
      return {
        id: task.id,
        text: taskName,
        start_date: new Date(),
        duration: taskDuration,
        progress: taskProgress
      };
    }
  });
};

// 根据ID查找标签
export const findTagById = (tagId, tags) => {
  // 尝试在已加载的标签中查找
  return tags.find(tag => tag.id === parseInt(tagId) || tag.id === tagId || tag.id.toString() === tagId);
};

// 处理添加任务的日期格式化
export const formatDateForGantt = (dateValue) => {
  try {
    let dateStr = '';
    
    // 处理日期格式
    if (dateValue instanceof Date) {
      dateStr = dateValue.toISOString().split('T')[0] + ' 00:00';
    } else if (typeof dateValue === 'string') {
      dateStr = dateValue;
      // 处理带T分隔符的ISO格式日期
      if (dateStr.includes('T')) {
        if (dateStr.includes(' ') && dateStr.split(' ').length > 1) {
          // 处理混合格式
          dateStr = dateStr.split('T')[0] + ' 00:00';
        } else {
          // 标准ISO格式
          const isoDate = new Date(dateStr);
          dateStr = isoDate.toISOString().split('T')[0] + ' 00:00';
        }
      } 
      // 确保包含时间部分
      else if (!dateStr.includes(' ')) {
        dateStr = dateStr + ' 00:00';
      }
    }
    
    // 创建日期对象
    const dateObj = new Date(dateStr);
    
    // 检查日期对象是否有效
    if (isNaN(dateObj.getTime())) {
      throw new Error(`Invalid date: ${dateStr}`);
    }
    
    return dateObj;
  } catch (error) {
    console.error("Error formatting date:", error);
    throw error;
  }
};
