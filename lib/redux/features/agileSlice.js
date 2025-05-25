import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

//fetch all team agile
export const fetchTeamAgile = createAsyncThunk(
    'agile/fetchTeamAgile',
    async (teamId, { rejectWithValue }) => {
        try {
            console.log('【Redux】fetchTeamAgile 开始, teamId:', teamId);
            const res = await api.teams.agile.getTeamAgileByTeamId(teamId);
            console.log('【Redux】fetchTeamAgile 获取结果:', res);
            return res.data;
        } catch (error) {
            console.error('【Redux】fetchTeamAgile 错误:', error);
            return rejectWithValue(error.message || '获取团队敏捷数据失败');
        }
    }
)

//fetch selected team agile by id
export const fetchSelectedTeamAgileById = createAsyncThunk(
    'agile/fetchSelectedTeamAgileById',
    async (agileId, { rejectWithValue }) => {
        try {
            console.log('【Redux】fetchSelectedTeamAgileById 开始, agileId:', agileId);
            const res = await api.teams.agile.getTeamAgileById(agileId);
            console.log('【Redux】fetchSelectedTeamAgileById 获取结果:', res);
            return res.data;
        } catch (error) {
            console.error('【Redux】fetchSelectedTeamAgileById 错误:', error);
            return rejectWithValue(error.message || '获取敏捷详情失败');
        }
    }
)

//fetch all tags
export const fetchAllTags = createAsyncThunk(
    'agile/fetchAllTags',
    async (_, { rejectWithValue }) => {
        try {
            console.log('【Redux】fetchAllTags 开始');
            const res = await api.tags.list();
            console.log('【Redux】fetchAllTags 获取结果:', res);
            return res;
        } catch (error) {
            console.error('【Redux】fetchAllTags 错误:', error);
            return rejectWithValue(error.message || '获取标签数据失败');
        }
    }
)

//fetch agile roles for current team
export const fetchAgileRoles = createAsyncThunk(
    'agile/fetchAgileRoles',
    async (teamId, { rejectWithValue }) => {
        try {
            console.log('【Redux】fetchAgileRoles 开始, teamId:', teamId);
            const res = await api.teams.agile.getAgileRolesByTeamId(teamId);
            console.log('【Redux】fetchAgileRoles 获取结果:', res);
            return res.data;
        } catch (error) {
            console.error('【Redux】fetchAgileRoles 错误:', error);
            return rejectWithValue(error.message || '获取敏捷角色失败');
        }
    }
)

//fetch specific role by id
export const fetchAgileRoleById = createAsyncThunk(
    'agile/fetchAgileRoleById',
    async (roleId, { rejectWithValue, getState }) => {
        try {
            // 检查角色是否已经在Redux store中
            const { agileRoles } = getState().agiles;
            const existingRole = agileRoles.find(role => role && role.id && role.id.toString() === roleId.toString());
            
            if (existingRole) {
                console.log(`【Redux】角色ID ${roleId} 已存在于store中，无需重复获取`);
                return existingRole;
            }
            
            console.log('【Redux】fetchAgileRoleById 开始, roleId:', roleId);
            const res = await api.teams.agile.getAgileRoleById(roleId);
            console.log('【Redux】fetchAgileRoleById 获取结果:', res);
            return res.data;
        } catch (error) {
            console.error('【Redux】fetchAgileRoleById 错误:', error);
            return rejectWithValue(error.message || '获取角色信息失败');
        }
    }
)

//fetch agile members for current agile
export const fetchAgileMembers = createAsyncThunk(
    'agile/fetchAgileMembers',
    async (agileId, { rejectWithValue }) => {
        try {
            console.log('【Redux】fetchAgileMembers 开始, agileId:', agileId);
            const res = await api.teams.agile.getAgileMembersByAgileId(agileId);
            console.log('【Redux】fetchAgileMembers 获取结果:', res);
            
            // 确保返回的是数组
            if (!Array.isArray(res.data)) {
                console.warn('【Redux】API返回的agileMembers不是数组，将转换为数组');
                return res.data ? [res.data] : [];
            }
            
            return res.data;
        } catch (error) {
            console.error('【Redux】fetchAgileMembers 错误:', error);
            return rejectWithValue(error.message || '获取敏捷成员失败');
        }
    }
)

//fetch task by id
export const fetchTaskById = createAsyncThunk(
    'agile/fetchTaskById',
    async (taskId, { rejectWithValue }) => {
        try {
            console.log('【Redux】fetchTaskById 开始, taskId:', taskId);
            const res = await api.teams.teamSectionTasks.getById(taskId);
            console.log('【Redux】fetchTaskById 获取结果:', res);
            return res;
        } catch (error) {
            console.error('【Redux】fetchTaskById 错误:', error);
            return rejectWithValue(error.message || '获取任务详情失败');
        }
    }
)

const agileSlice = createSlice({
  name: 'agile',
  initialState: {
    teamAgile: [],
    agileRoles: [],
    agileMembers: [],
    selectedAgile: null,
    currentRole: null,
    selectedAgileDetail: null,
    sprintTasks: [],
    allTags: [],
    teamAgileStatus: 'idle', // 分离不同请求的状态
    agileRolesStatus: 'idle',
    agileMembersStatus: 'idle',
    currentRoleStatus: 'idle',
    selectedAgileDetailStatus: 'idle',
    sprintTasksStatus: 'idle',
    tagsStatus: 'idle',
    error: null,
  },
  reducers: {
    // 添加选择sprint的reducer
    selectAgile: (state, action) => {
      state.selectedAgile = action.payload;
    },
    // 添加重置状态的reducer
    resetAgileState: (state) => {
      state.teamAgile = [];
      state.agileRoles = [];
      state.agileMembers = [];
      state.selectedAgile = null;
      state.currentRole = null;
      state.selectedAgileDetail = null;
      state.sprintTasks = [];
      state.allTags = [];
      state.teamAgileStatus = 'idle';
      state.agileRolesStatus = 'idle';
      state.agileMembersStatus = 'idle';
      state.currentRoleStatus = 'idle';
      state.selectedAgileDetailStatus = 'idle';
      state.sprintTasksStatus = 'idle';
      state.tagsStatus = 'idle';
      state.error = null;
    },
    // 手动清除成员数据
    clearAgileMembers: (state) => {
      state.agileMembers = [];
      state.agileMembersStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // 处理fetchTeamAgile
      .addCase(fetchTeamAgile.pending, (state) => {
        console.log('【Redux】fetchTeamAgile.pending');
        state.teamAgileStatus = 'loading';
        state.error = null; // 清除之前的错误
      })
      .addCase(fetchTeamAgile.fulfilled, (state, action) => {
        console.log('【Redux】fetchTeamAgile.fulfilled, payload:', action.payload);
        state.teamAgileStatus = 'succeeded';
        // 确保返回的数据是数组
        state.teamAgile = Array.isArray(action.payload) ? action.payload : [];
        console.log('【Redux】teamAgile 状态更新为:', state.teamAgile);
        
        // 自动选择当前sprint
        if(state.teamAgile.length > 0) {
          // 优先选择PENDING状态的sprint
          const pendingSprint = state.teamAgile.find(sprint => sprint.status === 'PENDING');
          if(pendingSprint) {
            console.log('【Redux】自动选择PENDING冲刺:', pendingSprint);
            state.selectedAgile = pendingSprint;
          } else {
            // 如果没有PENDING状态的sprint，选择PLANNING状态的
            const planningSprint = state.teamAgile.find(sprint => sprint.status === 'PLANNING');
            if(planningSprint) {
              console.log('【Redux】自动选择PLANNING冲刺:', planningSprint);
              state.selectedAgile = planningSprint;
            } else if(state.teamAgile[0]) {
              // 如果都没有，选择第一个sprint
              console.log('【Redux】自动选择第一个冲刺:', state.teamAgile[0]);
              state.selectedAgile = state.teamAgile[0];
            }
          }
        } else {
          console.log('【Redux】没有冲刺可选择');
        }
      })
      .addCase(fetchTeamAgile.rejected, (state, action) => {
        console.log('【Redux】fetchTeamAgile.rejected, payload:', action.payload);
        state.teamAgileStatus = 'failed';
        state.error = action.payload || '获取团队敏捷数据失败';
      })
      
      // 处理fetchSelectedTeamAgileById
      .addCase(fetchSelectedTeamAgileById.pending, (state) => {
        console.log('【Redux】fetchSelectedTeamAgileById.pending');
        state.selectedAgileDetailStatus = 'loading';
      })
      .addCase(fetchSelectedTeamAgileById.fulfilled, (state, action) => {
        console.log('【Redux】fetchSelectedTeamAgileById.fulfilled, payload:', action.payload);
        state.selectedAgileDetailStatus = 'succeeded';
        state.selectedAgileDetail = action.payload;
        // 清空当前的sprint任务列表，准备重新获取
        state.sprintTasks = [];
        state.sprintTasksStatus = 'idle';
      })
      .addCase(fetchSelectedTeamAgileById.rejected, (state, action) => {
        console.log('【Redux】fetchSelectedTeamAgileById.rejected, payload:', action.payload);
        state.selectedAgileDetailStatus = 'failed';
        state.error = action.payload || '获取敏捷详情失败';
      })
      
      // 处理fetchAllTags
      .addCase(fetchAllTags.pending, (state) => {
        console.log('【Redux】fetchAllTags.pending');
        state.tagsStatus = 'loading';
      })
      .addCase(fetchAllTags.fulfilled, (state, action) => {
        console.log('【Redux】fetchAllTags.fulfilled, payload:', action.payload);
        state.tagsStatus = 'succeeded';
        state.allTags = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAllTags.rejected, (state, action) => {
        console.log('【Redux】fetchAllTags.rejected, payload:', action.payload);
        state.tagsStatus = 'failed';
        state.error = action.payload || '获取标签数据失败';
      })
      
      // 处理fetchTaskById
      .addCase(fetchTaskById.pending, (state) => {
        console.log('【Redux】fetchTaskById.pending');
        state.sprintTasksStatus = 'loading';
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
        console.log('【Redux】fetchTaskById.fulfilled, payload:', action.payload);
        if (action.payload) {
          // 避免重复添加任务
          const taskExists = state.sprintTasks.some(task => task.id === action.payload.id);
          if (!taskExists) {
            state.sprintTasks.push(action.payload);
          }
        }
        state.sprintTasksStatus = 'succeeded';
      })
      .addCase(fetchTaskById.rejected, (state, action) => {
        console.log('【Redux】fetchTaskById.rejected, payload:', action.payload);
        state.sprintTasksStatus = 'failed';
        state.error = action.payload || '获取任务详情失败';
      })
      
      // 处理fetchAgileRoles
      .addCase(fetchAgileRoles.pending, (state) => {
        console.log('【Redux】fetchAgileRoles.pending');
        state.agileRolesStatus = 'loading';
      })
      .addCase(fetchAgileRoles.fulfilled, (state, action) => {
        console.log('【Redux】fetchAgileRoles.fulfilled, payload:', action.payload);
        state.agileRolesStatus = 'succeeded';
        // 确保返回的数据是数组，并过滤掉null/undefined
        state.agileRoles = Array.isArray(action.payload) ? action.payload.filter(Boolean) : [];
        console.log('【Redux】agileRoles 状态更新为:', state.agileRoles);
      })
      .addCase(fetchAgileRoles.rejected, (state, action) => {
        console.log('【Redux】fetchAgileRoles.rejected, payload:', action.payload);
        state.agileRolesStatus = 'failed';
        state.error = action.payload || '获取敏捷角色失败';
      })
      
      // 处理fetchAgileRoleById
      .addCase(fetchAgileRoleById.pending, (state) => {
        console.log('【Redux】fetchAgileRoleById.pending');
        state.currentRoleStatus = 'loading';
      })
      .addCase(fetchAgileRoleById.fulfilled, (state, action) => {
        console.log('【Redux】fetchAgileRoleById.fulfilled, payload:', action.payload);
        state.currentRoleStatus = 'succeeded';
        state.currentRole = action.payload;
        
        // 更新agileRoles中的角色信息
        if (action.payload && action.payload.id) {
          // 查找是否已存在
          const roleIndex = state.agileRoles.findIndex(
            role => role && role.id && action.payload.id && 
            role.id.toString() === action.payload.id.toString()
          );
          
          if (roleIndex !== -1) {
            // 更新已存在的角色
            state.agileRoles[roleIndex] = action.payload;
          } else {
            // 添加新角色
            state.agileRoles.push(action.payload);
          }
          
          console.log('【Redux】更新后的agileRoles:', state.agileRoles);
        }
      })
      .addCase(fetchAgileRoleById.rejected, (state, action) => {
        console.log('【Redux】fetchAgileRoleById.rejected, payload:', action.payload);
        state.currentRoleStatus = 'failed';
        state.error = action.payload || '获取角色信息失败';
      })
      
      // 处理fetchAgileMembers
      .addCase(fetchAgileMembers.pending, (state) => {
        console.log('【Redux】fetchAgileMembers.pending');
        state.agileMembersStatus = 'loading';
      })
      .addCase(fetchAgileMembers.fulfilled, (state, action) => {
        console.log('【Redux】fetchAgileMembers.fulfilled, payload:', action.payload);
        state.agileMembersStatus = 'succeeded';
        // 确保返回的数据是数组，并过滤掉null/undefined
        state.agileMembers = Array.isArray(action.payload) 
          ? action.payload.filter(member => member && (member.id || member.user_id)) 
          : [];
        console.log('【Redux】agileMembers 状态更新为:', state.agileMembers);
        
        // 如果成员有角色ID但角色信息不完整，收集需要获取详情的角色ID
        if (state.agileMembers.length > 0 && state.agileRoles.length > 0) {
          console.log('【Redux】检查是否需要获取角色详情');
          // 这里不执行请求，只在组件中通过useEffect监听agileMembers变化并执行请求
        }
      })
      .addCase(fetchAgileMembers.rejected, (state, action) => {
        console.log('【Redux】fetchAgileMembers.rejected, payload:', action.payload);
        state.agileMembersStatus = 'failed';
        state.error = action.payload || '获取敏捷成员失败';
        // 即使失败，也保留之前的成员数据，避免UI闪烁
      })
    }
})

// 导出action creators
export const { selectAgile, resetAgileState, clearAgileMembers } = agileSlice.actions;

export default agileSlice.reducer;