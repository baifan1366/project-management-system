import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

//fetch all team agile
export const fetchTeamAgile = createAsyncThunk(
    'agile/fetchTeamAgile',
    async (teamId, { rejectWithValue }) => {
        try {
            const res = await api.teams.agile.getTeamAgileByTeamId(teamId);
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
            const res = await api.teams.agile.getTeamAgileById(agileId);
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
            const res = await api.tags.list();
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
            const res = await api.teams.agile.getAgileRolesByTeamId(teamId);
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
                return existingRole;
            }
            
            const res = await api.teams.agile.getAgileRoleById(roleId);
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
            const res = await api.teams.agile.getAgileMembersByAgileId(agileId);
            
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
            const res = await api.teams.teamSectionTasks.getById(taskId);
            return res;
        } catch (error) {
            console.error('【Redux】fetchTaskById 错误:', error);
            return rejectWithValue(error.message || '获取任务详情失败');
        }
    }
)

// 新增功能: 创建冲刺
export const createSprint = createAsyncThunk(
    'agile/createSprint',
    async (sprintData, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.createSprint(sprintData);
            
            // 创建后重新获取列表
            if (sprintData.team_id) {
                dispatch(fetchTeamAgile(sprintData.team_id));
            }
            
            return res.data;
        } catch (error) {
            console.error('【Redux】createSprint 错误:', error);
            return rejectWithValue(error.message || '创建冲刺失败');
        }
    }
)

// 开始冲刺
export const startSprint = createAsyncThunk(
    'agile/startSprint',
    async ({ sprintId, teamId }, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.startSprint(sprintId);
            
            // 更新后重新获取详情和列表
            dispatch(fetchSelectedTeamAgileById(sprintId));
            if (teamId) {
                dispatch(fetchTeamAgile(teamId));
            }
            
            return res.data;
        } catch (error) {
            console.error('【Redux】startSprint 错误:', error);
            return rejectWithValue(error.message || '开始冲刺失败');
        }
    }
)

// 完成冲刺
export const completeSprint = createAsyncThunk(
    'agile/completeSprint',
    async ({ sprintId, teamId }, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.completeSprint(sprintId);
            
            // 更新后重新获取详情和列表
            dispatch(fetchSelectedTeamAgileById(sprintId));
            if (teamId) {
                dispatch(fetchTeamAgile(teamId));
            }
            
            return res.data;
        } catch (error) {
            console.error('【Redux】completeSprint 错误:', error);
            return rejectWithValue(error.message || '完成冲刺失败');
        }
    }
)

// 更新冲刺
export const updateSprint = createAsyncThunk(
    'agile/updateSprint',
    async ({ sprintId, sprintData, teamId }, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.updateSprint(sprintId, sprintData);
            
            // 更新后重新获取详情和列表
            dispatch(fetchSelectedTeamAgileById(sprintId));
            if (teamId) {
                dispatch(fetchTeamAgile(teamId));
            }
            
            return res.data;
        } catch (error) {
            console.error('【Redux】updateSprint 错误:', error);
            return rejectWithValue(error.message || '更新冲刺失败');
        }
    }
)

// 创建角色
export const createRole = createAsyncThunk(
    'agile/createRole',
    async (roleData, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.createRole(roleData);
            
            // 创建后重新获取角色列表
            if (roleData.team_id) {
                dispatch(fetchAgileRoles(roleData.team_id));
            }
            
            return res.data;
        } catch (error) {
            console.error('【Redux】createRole 错误:', error);
            return rejectWithValue(error.message || '创建角色失败');
        }
    }
)

// 更新角色
export const updateRole = createAsyncThunk(
    'agile/updateRole',
    async ({ roleId, roleData, teamId }, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.updateRole(roleId, roleData);
            
            // 更新后重新获取角色列表
            if (teamId) {
                dispatch(fetchAgileRoles(teamId));
            }
            
            return res.data;
        } catch (error) {
            console.error('【Redux】updateRole 错误:', error);
            return rejectWithValue(error.message || '更新角色失败');
        }
    }
)

// 删除角色
export const deleteRole = createAsyncThunk(
    'agile/deleteRole',
    async ({ roleId, teamId }, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.deleteRole(roleId);
            
            // 删除后重新获取角色列表
            if (teamId) {
                dispatch(fetchAgileRoles(teamId));
            }
            
            return res.data;
        } catch (error) {
            console.error('【Redux】deleteRole 错误:', error);
            return rejectWithValue(error.message || '删除角色失败');
        }
    }
)

// 分配角色给成员
export const assignRole = createAsyncThunk(
    'agile/assignRole',
    async (memberData, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.assignRole(memberData);
            
            // 分配后重新获取成员列表
            if (memberData.agile_id) {
                dispatch(fetchAgileMembers(memberData.agile_id));
            }
            
            return res.data;
        } catch (error) {
            console.error('【Redux】assignRole 错误:', error);
            return rejectWithValue(error.message || '分配角色失败');
        }
    }
)

// 删除成员角色
export const deleteMember = createAsyncThunk(
    'agile/deleteMember',
    async ({ memberId, agileId }, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.deleteMember(memberId);
            
            // 删除后重新获取成员列表
            if (agileId) {
                dispatch(fetchAgileMembers(agileId));
            }
            
            return res.data;
        } catch (error) {
            console.error('【Redux】deleteMember 错误:', error);
            return rejectWithValue(error.message || '删除成员角色失败');
        }
    }
)

// 添加"进展顺利"
export const addWhatWentWell = createAsyncThunk(
    'agile/addWhatWentWell',
    async ({ sprintId, content }, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.addWhatWentWell(sprintId, content);
            
            // 添加后重新获取冲刺详情
            dispatch(fetchSelectedTeamAgileById(sprintId));
            
            return res.data;
        } catch (error) {
            console.error('【Redux】addWhatWentWell 错误:', error);
            return rejectWithValue(error.message || '添加进展顺利失败');
        }
    }
)

// 删除"进展顺利"
export const deleteWhatWentWell = createAsyncThunk(
    'agile/deleteWhatWentWell',
    async ({ sprintId, index }, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.deleteWhatWentWell(sprintId, index);
            
            // 删除后重新获取冲刺详情
            dispatch(fetchSelectedTeamAgileById(sprintId));
            
            return res.data;
        } catch (error) {
            console.error('【Redux】deleteWhatWentWell 错误:', error);
            return rejectWithValue(error.message || '删除进展顺利失败');
        }
    }
)

// 添加"待改进"
export const addToImprove = createAsyncThunk(
    'agile/addToImprove',
    async ({ sprintId, content }, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.addToImprove(sprintId, content);
            
            // 添加后重新获取冲刺详情
            dispatch(fetchSelectedTeamAgileById(sprintId));
            
            return res.data;
        } catch (error) {
            console.error('【Redux】addToImprove 错误:', error);
            return rejectWithValue(error.message || '添加待改进失败');
        }
    }
)

// 删除"待改进"
export const deleteToImprove = createAsyncThunk(
    'agile/deleteToImprove',
    async ({ sprintId, index }, { rejectWithValue, dispatch }) => {
        try {
            const res = await api.teams.agile.deleteToImprove(sprintId, index);
            
            // 删除后重新获取冲刺详情
            dispatch(fetchSelectedTeamAgileById(sprintId));
            
            return res.data;
        } catch (error) {
            console.error('【Redux】deleteToImprove 错误:', error);
            return rejectWithValue(error.message || '删除待改进失败');
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
    createSprintStatus: 'idle',
    startSprintStatus: 'idle',
    completeSprintStatus: 'idle',
    updateSprintStatus: 'idle',
    createRoleStatus: 'idle',
    updateRoleStatus: 'idle',
    deleteRoleStatus: 'idle',
    assignRoleStatus: 'idle',
    deleteMemberStatus: 'idle',
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
      state.createSprintStatus = 'idle';
      state.startSprintStatus = 'idle';
      state.completeSprintStatus = 'idle';
      state.updateSprintStatus = 'idle';
      state.createRoleStatus = 'idle';
      state.updateRoleStatus = 'idle';
      state.deleteRoleStatus = 'idle';
      state.assignRoleStatus = 'idle';
      state.deleteMemberStatus = 'idle';
      state.error = null;
    },
    // 手动清除成员数据
    clearAgileMembers: (state) => {
      state.agileMembers = [];
      state.agileMembersStatus = 'idle';
    },
    // 添加清除sprint任务的reducer
    clearSprintTasks: (state) => {
      state.sprintTasks = [];
      state.sprintTasksStatus = 'idle';
    }
  },
  extraReducers: (builder) => {
    builder
      // 处理fetchTeamAgile
      .addCase(fetchTeamAgile.pending, (state) => {
        state.teamAgileStatus = 'loading';
        state.error = null; // 清除之前的错误
      })
      .addCase(fetchTeamAgile.fulfilled, (state, action) => {
        state.teamAgileStatus = 'succeeded';
        // 确保返回的数据是数组
        state.teamAgile = Array.isArray(action.payload) ? action.payload : [];
        
        // 自动选择当前sprint
        if(state.teamAgile.length > 0) {
          // 优先选择PENDING状态的sprint
          const pendingSprint = state.teamAgile.find(sprint => sprint.status === 'PENDING');
          if(pendingSprint) {
            state.selectedAgile = pendingSprint;
          } else {
            // 如果没有PENDING状态的sprint，选择PLANNING状态的
            const planningSprint = state.teamAgile.find(sprint => sprint.status === 'PLANNING');
            if(planningSprint) {
              state.selectedAgile = planningSprint;
            } else if(state.teamAgile[0]) {
              // 如果都没有，选择第一个sprint
              state.selectedAgile = state.teamAgile[0];
            }
          }
        } else {
        }
      })
      .addCase(fetchTeamAgile.rejected, (state, action) => {
        state.teamAgileStatus = 'failed';
        state.error = action.payload || '获取团队敏捷数据失败';
      })
      
      // 处理fetchSelectedTeamAgileById
      .addCase(fetchSelectedTeamAgileById.pending, (state) => {
        state.selectedAgileDetailStatus = 'loading';
      })
      .addCase(fetchSelectedTeamAgileById.fulfilled, (state, action) => {
        state.selectedAgileDetailStatus = 'succeeded';
        state.selectedAgileDetail = action.payload;
        // 清空当前的sprint任务列表，准备重新获取
        state.sprintTasks = [];
        state.sprintTasksStatus = 'idle';
      })
      .addCase(fetchSelectedTeamAgileById.rejected, (state, action) => {
        state.selectedAgileDetailStatus = 'failed';
        state.error = action.payload || '获取敏捷详情失败';
      })
      
      // 处理fetchAllTags
      .addCase(fetchAllTags.pending, (state) => {
        state.tagsStatus = 'loading';
      })
      .addCase(fetchAllTags.fulfilled, (state, action) => {
        state.tagsStatus = 'succeeded';
        state.allTags = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchAllTags.rejected, (state, action) => {
        state.tagsStatus = 'failed';
        state.error = action.payload || '获取标签数据失败';
      })
      
      // 处理fetchTaskById
      .addCase(fetchTaskById.pending, (state) => {
        state.sprintTasksStatus = 'loading';
      })
      .addCase(fetchTaskById.fulfilled, (state, action) => {
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
        state.sprintTasksStatus = 'failed';
        state.error = action.payload || '获取任务详情失败';
      })
      
      // 处理fetchAgileRoles
      .addCase(fetchAgileRoles.pending, (state) => {
        state.agileRolesStatus = 'loading';
      })
      .addCase(fetchAgileRoles.fulfilled, (state, action) => {
        state.agileRolesStatus = 'succeeded';
        // 确保返回的数据是数组，并过滤掉null/undefined
        state.agileRoles = Array.isArray(action.payload) ? action.payload.filter(Boolean) : [];
      })
      .addCase(fetchAgileRoles.rejected, (state, action) => {
        state.agileRolesStatus = 'failed';
        state.error = action.payload || '获取敏捷角色失败';
      })
      
      // 处理fetchAgileRoleById
      .addCase(fetchAgileRoleById.pending, (state) => {
        state.currentRoleStatus = 'loading';
      })
      .addCase(fetchAgileRoleById.fulfilled, (state, action) => {
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
          
        }
      })
      .addCase(fetchAgileRoleById.rejected, (state, action) => {
        state.currentRoleStatus = 'failed';
        state.error = action.payload || '获取角色信息失败';
      })
      
      // 处理fetchAgileMembers
      .addCase(fetchAgileMembers.pending, (state) => {
        state.agileMembersStatus = 'loading';
      })
      .addCase(fetchAgileMembers.fulfilled, (state, action) => {
        state.agileMembersStatus = 'succeeded';
        // 确保返回的数据是数组，并过滤掉null/undefined
        state.agileMembers = Array.isArray(action.payload) 
          ? action.payload.filter(member => member && (member.id || member.user_id)) 
          : [];
      })
      .addCase(fetchAgileMembers.rejected, (state, action) => {
        state.agileMembersStatus = 'failed';
        state.error = action.payload || '获取敏捷成员失败';
      })
      
      // 处理新添加的thunk action creators
      // 创建冲刺
      .addCase(createSprint.pending, (state) => {
        state.createSprintStatus = 'loading';
      })
      .addCase(createSprint.fulfilled, (state, action) => {
        state.createSprintStatus = 'succeeded';
        // teamAgile会通过fetchTeamAgile更新
      })
      .addCase(createSprint.rejected, (state, action) => {
        state.createSprintStatus = 'failed';
        state.error = action.payload || '创建冲刺失败';
      })
      
      // 开始冲刺
      .addCase(startSprint.pending, (state) => {
        state.startSprintStatus = 'loading';
      })
      .addCase(startSprint.fulfilled, (state, action) => {
        state.startSprintStatus = 'succeeded';
        // 详情和列表会通过fetchSelectedTeamAgileById和fetchTeamAgile更新
      })
      .addCase(startSprint.rejected, (state, action) => {
        state.startSprintStatus = 'failed';
        state.error = action.payload || '开始冲刺失败';
      })
      
      // 完成冲刺
      .addCase(completeSprint.pending, (state) => {
        state.completeSprintStatus = 'loading';
      })
      .addCase(completeSprint.fulfilled, (state, action) => {
        state.completeSprintStatus = 'succeeded';
        // 详情和列表会通过fetchSelectedTeamAgileById和fetchTeamAgile更新
      })
      .addCase(completeSprint.rejected, (state, action) => {
        state.completeSprintStatus = 'failed';
        state.error = action.payload || '完成冲刺失败';
      })
      
      // 更新冲刺
      .addCase(updateSprint.pending, (state) => {
        state.updateSprintStatus = 'loading';
      })
      .addCase(updateSprint.fulfilled, (state, action) => {
        state.updateSprintStatus = 'succeeded';
        // 详情和列表会通过fetchSelectedTeamAgileById和fetchTeamAgile更新
      })
      .addCase(updateSprint.rejected, (state, action) => {
        state.updateSprintStatus = 'failed';
        state.error = action.payload || '更新冲刺失败';
      })
      
      // 创建角色
      .addCase(createRole.pending, (state) => {
        state.createRoleStatus = 'loading';
      })
      .addCase(createRole.fulfilled, (state, action) => {
        state.createRoleStatus = 'succeeded';
        // 角色列表会通过fetchAgileRoles更新
      })
      .addCase(createRole.rejected, (state, action) => {
        state.createRoleStatus = 'failed';
        state.error = action.payload || '创建角色失败';
      })
      
      // 更新角色
      .addCase(updateRole.pending, (state) => {
        state.updateRoleStatus = 'loading';
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.updateRoleStatus = 'succeeded';
        // 角色列表会通过fetchAgileRoles更新
      })
      .addCase(updateRole.rejected, (state, action) => {
        state.updateRoleStatus = 'failed';
        state.error = action.payload || '更新角色失败';
      })
      
      // 删除角色
      .addCase(deleteRole.pending, (state) => {
        state.deleteRoleStatus = 'loading';
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.deleteRoleStatus = 'succeeded';
        // 角色列表会通过fetchAgileRoles更新
      })
      .addCase(deleteRole.rejected, (state, action) => {
        state.deleteRoleStatus = 'failed';
        state.error = action.payload || '删除角色失败';
      })
      
      // 分配角色
      .addCase(assignRole.pending, (state) => {
        state.assignRoleStatus = 'loading';
      })
      .addCase(assignRole.fulfilled, (state, action) => {
        state.assignRoleStatus = 'succeeded';
        // 成员列表会通过fetchAgileMembers更新
      })
      .addCase(assignRole.rejected, (state, action) => {
        state.assignRoleStatus = 'failed';
        state.error = action.payload || '分配角色失败';
      })
      
      // 删除成员角色
      .addCase(deleteMember.pending, (state) => {
        state.deleteMemberStatus = 'loading';
      })
      .addCase(deleteMember.fulfilled, (state, action) => {
        state.deleteMemberStatus = 'succeeded';
        // 成员列表会通过fetchAgileMembers更新
      })
      .addCase(deleteMember.rejected, (state, action) => {
        state.deleteMemberStatus = 'failed';
        state.error = action.payload || '删除成员角色失败';
      })
    }
})

// 导出action creators
export const { selectAgile, resetAgileState, clearAgileMembers, clearSprintTasks } = agileSlice.actions;

export default agileSlice.reducer;