import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { createNotification } from './notificationSlice'

// Async thunks
export const fetchTasksBySectionId = createAsyncThunk(
  'tasks/fetchTasksBySectionId',
  async (sectionId) => {
    const res = await api.teams.teamSectionTasks.listBySectionId(sectionId)
    return res;
  }
)

// New thunk to fetch tasks by their IDs from section's task_ids
// export const fetchTasksByIds = createAsyncThunk(
//   'tasks/fetchTasksByIds',
//   async (taskIds, { rejectWithValue }) => {
//     try {
//       if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
//         return rejectWithValue('需要提供有效的任务ID数组');
//       }
      
//       // Fetch tasks one by one and collect them
//       const tasks = await Promise.all(
//         taskIds.map(taskId => api.teams.teamSectionTasks.getById(taskId))
//       );
      
//       return tasks;
//     } catch (error) {
//       return rejectWithValue(error.message);
//     }
//   }
// )

export const fetchAllTasks = createAsyncThunk(
  'tasks/fetchAllTasks',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.teams.teamSectionTasks.listAllTasks()
      return res;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const fetchTaskById = createAsyncThunk(
  'tasks/fetchTaskById',
  async (taskId, { rejectWithValue }) => {
    try {
      const res = await api.teams.teamSectionTasks.getById(taskId);
      return res;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const fetchTasksByUserId = createAsyncThunk(
  'tasks/fetchTasksByUserId',
  async (userId, { rejectWithValue }) => {
    try {
      // 确保userId不是'current'，我们现在需要明确的用户ID
      if (!userId || userId === 'current') {
        return rejectWithValue('需要提供有效的用户ID');
      }
      
      const res = await api.teams.teamSectionTasks.listByUserId(userId)
      return res;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const createTask = createAsyncThunk(
  'tasks/createTasks',
  async (taskData) => {
    const res = await api.teams.teamSectionTasks.create(taskData)
    return res;
  }
)

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ taskId, taskData, oldTask }, { dispatch }) => {
    
    // 确保包含 updated_at
    const updatedTaskData = {
      ...taskData,
      updated_at: new Date().toISOString()
    };
    
    // 检查是否更改了任务的分配者（tag_values中的key 2）
    const newAssignees = taskData?.tag_values?.["2"];
    const oldAssignees = oldTask?.tag_values?.["2"];
    
    // 处理分配信息
    try {
      // 处理单个分配者或分配者数组
      const assigneeIds = Array.isArray(newAssignees) ? newAssignees : (newAssignees ? [newAssignees] : []);
      const oldAssigneeIds = Array.isArray(oldAssignees) ? oldAssignees : (oldAssignees ? [oldAssignees] : []);
      
      // 找出被移除的分配者
      const removedAssigneeIds = oldAssigneeIds.filter(id => !assigneeIds.includes(id));
      
      // 删除被移除分配者的mytasks记录
      for (const assigneeId of removedAssigneeIds) {
        if (assigneeId && typeof assigneeId === 'string') {
          // 删除对应的mytasks记录
          const { error: deleteError } = await supabase
            .from('mytasks')
            .delete()
            .eq('task_id', taskId)
            .eq('user_id', assigneeId);
            
          if (deleteError) {
            console.error('Error deleting mytasks record:', deleteError);
          }
          
          // 可以考虑发送通知告知用户任务已被取消分配
          dispatch(createNotification({
            user_id: assigneeId,
            type: 'TASK_UNASSIGNED',
            title: 'Task Unassigned',
            content: `A task has been unassigned from you`,
            data: {
              task_id: taskId
            },
            is_read: false
          }));
        }
      }
      
      // 处理新分配的或继续分配的用户
      if (newAssignees && taskId) {
        for (const assigneeId of assigneeIds) {
          if (assigneeId && typeof assigneeId === 'string') {
            // 查询是否已存在该任务的mytasks记录
            const { data: existingTasks } = await supabase
              .from('mytasks')
              .select('*')
              .eq('task_id', taskId)
              .eq('user_id', assigneeId);
              
            // 如果不存在，创建新记录
            if (!existingTasks || existingTasks.length === 0) {
              // 获取任务标题和描述
              const title = taskData?.tag_values?.["1"] || '';
              const description = taskData?.tag_values?.["5"] || '';
              const status = taskData?.tag_values?.["3"] || 'TODO';
              const dueDate = taskData?.tag_values?.["6"] || null;
              
              await supabase.from('mytasks').insert({
                task_id: taskId,
                user_id: assigneeId,
                title: title,
                description: description,
                status: 'TODO',
                expected_completion_date: dueDate
              });
              
              // 检查是否是新分配的用户（不在旧的分配列表中）
              if (!oldAssigneeIds.includes(assigneeId)) {
                // 发送任务分配通知
                dispatch(createNotification({
                  user_id: assigneeId,
                  type: 'TASK_ASSIGNED',
                  title: 'Task Assignment',
                  content: `You have been assigned a new task: ${title}`,
                  data: {
                    task_id: taskId,
                    task_title: title
                  },
                  is_read: false
                }));
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating mytasks:', error);
    }
    
    const res = await api.teams.teamSectionTasks.updateDirectly(taskId, updatedTaskData);
    return {
      ...res,
      old_values: oldTask || {}
    }
  }
)

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async ({ sectionId, userId, oldValues, taskId, teamId }, { dispatch, rejectWithValue }) => {
    try {
      // 序列化 oldValues 中的 Date 对象
      const serializedOldValues = oldValues ? JSON.parse(JSON.stringify(oldValues)) : {};
      
      // 参数验证
      if (!taskId) {
        return rejectWithValue('Task ID is required');
      }
      
      if (!teamId) {
        return rejectWithValue('Team ID is required');
      }

      //only if found the task in the mytasks table, then proceed to below steps
      const { data: mytaskData, error: mytaskError } = await supabase
        .from('mytasks')
        .select('user_id, title')
        .eq('task_id', taskId)
      
      if (mytaskError) {
        console.error('获取任务分配信息失败:', mytaskError);
      }
      
      // 检查是否找到任务分配记录
      if (mytaskData && mytaskData.length > 0) {
        const assigneeIds = mytaskData.map(item => item.user_id);
        const taskName = mytaskData[0].title;
        
        //创建通知给所有相关的分配者
        for (const assigneeId of assigneeIds) {
          await dispatch(createNotification({
            user_id: assigneeId,
            type: 'TASK_DELETED',
            title: 'Task Deleted',
            content: `Task ${taskName} has been deleted`,
            data: {
              task_id: taskId
            },
            is_read: false
          }));
        }

        // 删除所有与该任务相关的mytasks记录
        try {
          const { error: deleteMyTasksError } = await supabase
            .from('mytasks')
            .delete()
            .eq('task_id', taskId);

          if (deleteMyTasksError) {
            console.error('删除关联的mytasks记录失败:', deleteMyTasksError);
          }
          
        } catch (mytasksError) {
          console.error('删除关联的mytasks失败:', mytasksError);
        }
      } else {
        console.log('没有找到与此任务关联的分配记录');
      }
      
      // 无论任务是否有分配记录，都尝试删除主任务
      // 传递teamId到API
      const res = await api.teams.teamSectionTasks.delete(sectionId, taskId, teamId);
      return {
        ...res,
        old_values: serializedOldValues,
        userId: userId,
        entityId: taskId,
        teamId: teamId
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete task');
    }
  }
)

const taskSlice = createSlice({
  name: 'tasks',
  initialState: {
    tasks: [],
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    selectedTask: null, // 添加存储当前选中任务的状态
  },
  reducers: {
    resetTasksState: (state) => {
      state.tasks = [];
      state.status = 'idle';
      state.error = null;
      state.selectedTask = null;
    },
    // 添加设置当前选中任务的action
    setSelectedTask: (state, action) => {
      state.selectedTask = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasksBySectionId.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchTasksBySectionId.fulfilled, (state, action) => {
        state.tasks = action.payload
        state.status = 'succeeded'
      })
      .addCase(fetchTasksBySectionId.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(fetchAllTasks.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchAllTasks.fulfilled, (state, action) => {
        state.tasks = action.payload
        state.status = 'succeeded'
      })
      .addCase(fetchAllTasks.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(fetchTaskById.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        // 检查获取的任务是否有效
        if (action.payload && action.payload.id) {
          // 查找是否已经存在该任务
          const existingTaskIndex = Array.isArray(state.tasks) 
            ? state.tasks.findIndex(task => task.id === action.payload.id)
            : -1;
          
          if (existingTaskIndex !== -1) {
            // 更新已存在的任务
            state.tasks[existingTaskIndex] = action.payload;
          } else {
            // 如果tasks不是数组，初始化为数组
            if (!Array.isArray(state.tasks)) {
              state.tasks = [];
            }
            // 添加新任务
            state.tasks.push(action.payload);
          }
        }
        state.status = 'succeeded';
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(fetchTasksByUserId.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchTasksByUserId.fulfilled, (state, action) => {
        state.tasks = action.payload
        state.status = 'succeeded'
      })
      .addCase(fetchTasksByUserId.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(createTask.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.tasks.push(action.payload)
      })
      .addCase(createTask.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(updateTask.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const updatedTask = action.payload;
        if (updatedTask && updatedTask.id) {
          // 确保state.tasks是数组类型
          if (Array.isArray(state.tasks)) {
            const index = state.tasks.findIndex(task => task.id === updatedTask.id);
            if (index !== -1) {
              state.tasks[index] = updatedTask;
            } else {
              // 如果在现有任务中找不到，将其添加到任务列表中
              state.tasks.push(updatedTask);
            }
          } else {
            // 如果tasks不是数组，初始化为包含新任务的数组
            state.tasks = [updatedTask];
          }
        }
        state.status = 'succeeded';
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      .addCase(deleteTask.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        // 从payload中提取entityId(taskId)并过滤任务列表
        const taskId = action.payload?.entityId;
        if (taskId) {
          state.tasks = state.tasks.filter(task => task.id !== taskId);
        }
        state.status = 'succeeded';
      })
      .addCase(deleteTask.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      // .addCase(fetchTasksByIds.pending, (state) => {
      //   state.status = 'loading'
      // })
      // .addCase(fetchTasksByIds.fulfilled, (state, action) => {
      //   // Merge the fetched tasks with existing tasks, avoiding duplicates
      //   const existingIds = new Set(state.tasks.map(task => task.id));
      //   const newTasks = action.payload.filter(task => !existingIds.has(task.id));
        
      //   state.tasks = [...state.tasks, ...newTasks];
      //   state.status = 'succeeded';
      // })
      // .addCase(fetchTasksByIds.rejected, (state, action) => {
      //   state.status = 'failed';
      //   state.error = action.payload || action.error.message;
      // })
  },
})

export const { resetTasksState, setSelectedTask } = taskSlice.actions;
export default taskSlice.reducer
