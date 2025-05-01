import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'
import { fetchTeamCustomField } from './teamCFSlice'

// 异步 Thunk Actions
export const fetchProjectTeams = createAsyncThunk(
  'teams/fetchProjectTeams',
  async (projectId) => {
    const res = await api.teams.listByProject(projectId);
    // 如果是空数组，记录到 emptyProjects 中
    if (!res || res.length === 0) {
      return {
        teams: [],
        isEmptyProject: true,
        projectId
      };
    }
    return res;
  }
)

// 新增: 获取用户加入的团队
export const fetchUserTeams = createAsyncThunk(
  'teams/fetchUserTeams',
  async ({ userId, projectId }) => {
    try {
      const teams = await api.teams.listUserTeams(userId, projectId);
      return teams;
    } catch (error) {
      throw new Error('获取用户团队失败: ' + error.message);
    }
  }
)

// 新增: 获取团队的自定义字段
export const fetchTeamCustomFieldForTeam = createAsyncThunk(
  'teams/fetchTeamCustomFieldForTeam',
  async (teamId, { getState, dispatch }) => {
    try {
      const state = getState();
      // 如果没有提供特定的teamId，我们检查是否有userTeams
      if (!teamId) {
        const userTeams = state.teams.userTeams;
        
        if (!userTeams || userTeams.length === 0) {
          return [];
        }
        
        // 获取第一个团队的ID
        teamId = userTeams[0].id;
      }
      
      // 使用已有的fetchTeamCustomField action
      const customFields = await dispatch(fetchTeamCustomField(teamId)).unwrap();
      return {
        teamId,
        customFields
      };
    } catch (error) {
      throw new Error('获取团队自定义字段失败: ' + error.message);
    }
  }
)

export const fetchTeamById = createAsyncThunk(
  'teams/fetchTeamById', 
  async (teamId) => {
    const res = await api.teams.getById(teamId);
    return res;
  }
)

export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async (teamData, { getState, rejectWithValue }) => {
    try {
    const response = await api.teams.create({
      ...teamData
    });
    return {
      ...response,
    };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
)

export const updateTeam = createAsyncThunk(
  'teams/updateTeam',
  async ({ teamId, data, user_id, old_values, updated_at }, { getState, rejectWithValue }) => {
    try {      
      // 确保数据能够被JSON序列化
      let teamData = { 
        ...data,
        updated_at: updated_at || new Date().toISOString() // 确保updated_at字段被包含
      };
      
      const response = await api.teams.update(teamId, teamData);
      // 返回时把 userId 放到 created_by，且将旧值命名为 snake_case old_values
      return {
        ...response,
        created_by: user_id,
        old_values: old_values,
        updated_at: updated_at || response.updated_at
      };
    } catch (error) {
      console.error('Team update error:', error);
      return rejectWithValue(error.message);
    }
  }
)

export const deleteTeam = createAsyncThunk(
  'teams/deleteTeam',
  async ({userId, teamId}, { getState }) => {
    // 在删除前获取团队信息，以便在操作日志中记录
    const state = getState();
    const teamToDelete = state.teams.teams.find(team => team.id === teamId);
    
    const res = await api.teams.delete(teamId);
    
    // 返回完整的团队信息以便记录在操作日志中
    return {
      ...res,
      userId: userId,
      old_values: teamToDelete,
      entityId: teamId // 替换 entity_id 为正确的 teamId 值
    };
  }
)

export const updateTeamOrder = createAsyncThunk(
  'teams/updateOrder',
  async (teams, { getState }) => {
    if (!teams || teams.length <= 1) {
      return teams || [];
    }

    try {
      // 修改：确保发送正确的 order_index
      const simplifiedTeams = teams.map((team, index) => ({
        id: team.id,
        name: team.name,
        access: team.access,
        order_index: index, // 确保从0开始的连续索引
        project_id: team.project_id,
        created_by: team.created_by,
        description: team.description,
        star: team.star
      }));
      
      const res = await api.teams.updateOrder(simplifiedTeams);
      return res;
    } catch (error) {
      console.error('更新团队顺序失败:', error);
      return teams;
    }
  }
)

export const initializeTeamOrder = createAsyncThunk(
  'teams/initializeTeamOrder',
  async (projectId, { getState }) => {
    // 获取当前状态
    const { teams, emptyProjects, lastFetchTime } = getState().teams;
    
    // 严格的防重复调用逻辑
    const lastInitTime = lastFetchTime?.[`init_order_${projectId}`] || 0;
    const now = Date.now();
    if (now - lastInitTime < 30000) { // 30秒内不重复初始化
      // 返回当前状态中的团队，而不是发起新请求
      return teams.filter(team => String(team.project_id) === String(projectId));
    }
    
    // 检查项目是否已知为空项目
    if (emptyProjects.includes(projectId)) {
      return [];
    }
    
    // 检查该项目是否有团队
    const projectTeams = teams.filter(team => String(team.project_id) === String(projectId));
    if (projectTeams.length === 0) {
      return [];
    }
    
    try {
    // 只有当项目有团队时才调用API
      const result = await api.teams.initializeOrder(projectId);
      // 标记该项目已完成初始化
      return result;
    } catch (error) {
      console.error(`初始化项目 ${projectId} 团队顺序失败:`, error);
      // 返回当前状态中的团队，避免错误导致重试
      return projectTeams;
    }
  }
)

export const updateTeamStar = createAsyncThunk(
  'teams/updateTeamStar',
  async ({ teamId, star }) => {
    const res = await api.teams.update(teamId, { star })
    return { teamId, star };
  }
)

// 创建 Slice
const teamSlice = createSlice({
  name: 'teams',
  initialState: {
    teams: [],
    userTeams: [], // 新增: 存储用户的团队
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null,
    emptyProjects: [], // 新增：记录空项目
    lastFetchTime: {}, // 添加缺失的 lastFetchTime 对象
    defaultCFId: 0,
    teamCustomFields: [], // 新增: 存储团队自定义字段
    teamFirstCFIds: {}, // 新增: 存储每个团队的第一个自定义字段ID
    teamDeletedStatus: 'idle', // 新增: 团队删除状态
    teamUpdatedStatus: 'idle' // 新增: 团队更新状态
  },
  reducers: {
    clearTeams: (state) => {
      state.teams = []
      state.userTeams = [] // 新增: 清空用户团队
      state.status = 'idle'
      state.error = null
      state.teamDeletedStatus = 'idle' // 重置团队删除状态
      state.teamUpdatedStatus = 'idle' // 重置团队更新状态
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchProjectTeams
      .addCase(fetchProjectTeams.pending, (state, action) => {
        state.status = 'loading'
        // 添加：记录项目ID，用于防止重复请求
        const projectId = action.meta.arg;
      })
      .addCase(fetchProjectTeams.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const projectId = action.meta.arg;
        
        // 添加：更新最后获取时间
        if (!state.lastFetchTime) {
          state.lastFetchTime = {};
        }
        state.lastFetchTime[`project_${projectId}`] = Date.now();
        
        // 处理空项目的情况
        if (action.payload?.isEmptyProject) {
          if (!state.emptyProjects.includes(action.payload.projectId)) {
            state.emptyProjects.push(action.payload.projectId);
          }
          return;
        }
        // 只有当有新数据时才更新
        if (action.payload !== null) {
          state.teams = action.payload;
        }
        state.error = null;
      })
      .addCase(fetchProjectTeams.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message
      })
      // fetchTeamById
      .addCase(fetchTeamById.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTeamById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const payload = action.payload;
        
        // 处理不同的响应格式
        let team = null;
        if (Array.isArray(payload) && payload.length > 0) {
          team = payload[0];
        } else if (payload && typeof payload === 'object') {
          team = payload;
        }

        if (team && team.id) {
          const index = state.teams.findIndex(t => String(t.id) === String(team.id));
          if (index !== -1) {
            state.teams[index] = team;
          } else {
            state.teams.push(team);
          }
          // 确保 lastFetchTime 存在
          if (!state.lastFetchTime) {
            state.lastFetchTime = {};
          }
          state.lastFetchTime[`team_${team.id}`] = Date.now();
        }
        state.error = null;
      })
      .addCase(fetchTeamById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // createTeam
      .addCase(createTeam.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload && action.payload.id) {
          const index = state.teams.findIndex(t => String(t.id) === String(action.payload.id));
          if (index === -1) {
            state.teams.push(action.payload);
            
            // 如果这个团队属于之前标记为空的项目，需要从emptyProjects中移除该项目
            if (action.payload.project_id && state.emptyProjects.includes(action.payload.project_id)) {
              state.emptyProjects = state.emptyProjects.filter(id => id !== action.payload.project_id);
              
              // 添加：记录最后获取时间，防止重复请求
              if (!state.lastFetchTime) {
                state.lastFetchTime = {};
              }
              state.lastFetchTime[`project_${action.payload.project_id}`] = Date.now();
            }
          } else {
            state.teams[index] = action.payload;
          }
        }
        state.error = null;
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        state.error = action.error.message;
      })
      // updateTeam
      .addCase(updateTeam.pending, (state) => {
        state.teamUpdatedStatus = 'loading'; // 设置更新状态为加载中
      })
      .addCase(updateTeam.fulfilled, (state, action) => {
        const index = state.teams.findIndex(team => team.id === action.payload.id)
        if (index !== -1) {
          state.teams[index] = action.payload
        }
        
        // 更新userTeams中的团队
        const userTeamIndex = state.userTeams.findIndex(team => team.id === action.payload.id);
        if (userTeamIndex !== -1) {
          state.userTeams[userTeamIndex] = action.payload;
        }
        
        state.teamUpdatedStatus = 'succeeded'; // 设置更新状态为成功
      })
      .addCase(updateTeam.rejected, (state, action) => {
        state.teamUpdatedStatus = 'failed'; // 设置更新状态为失败
        state.error = action.error.message;
      })
      // deleteTeam
      .addCase(deleteTeam.pending, (state) => {
        state.teamDeletedStatus = 'loading'; // 设置删除状态为加载中
      })
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.teams = state.teams.filter(team => team.id !== action.payload.id)
        state.userTeams = state.userTeams.filter(team => team.id !== action.payload.id)
        state.status = 'succeeded'
        state.teamDeletedStatus = 'succeeded' // 设置删除状态为成功
      })
      .addCase(deleteTeam.rejected, (state, action) => {
        state.teamDeletedStatus = 'failed'; // 设置删除状态为失败
        state.error = action.error.message;
      })
      // updateTeamOrder
      .addCase(updateTeamOrder.pending, (state, action) => {
        state.status = 'loading';
        // 记录正在更新的团队所属项目
        if (action.meta.arg && action.meta.arg.length > 0) {
          const projectId = action.meta.arg[0]?.project_id;
          if (projectId) {
            if (!state.lastFetchTime) {
              state.lastFetchTime = {};
            }
            // 记录开始更新的时间
            state.lastFetchTime[`order_project_${projectId}`] = Date.now();
            // 设置一个标志，表示正在更新
            state.lastFetchTime[`updating_order_${projectId}`] = true;
          }
        }
      })
      .addCase(updateTeamOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        // 确保 teams 是数组
        let teams = action.payload;
        if (!Array.isArray(teams)) {
          if (action.payload?.data && Array.isArray(action.payload.data)) {
            teams = action.payload.data;
          } else if (action.payload && typeof action.payload === 'object') {
            teams = [action.payload];
          } else {
            teams = [];
          }
        }

        // 只有在有有效数据且每个团队都有 id 时才更新
        if (teams.length > 0 && teams.every(team => team.id)) {
          const projectId = teams[0]?.project_id;
          if (projectId) {
            // 保留其他项目的团队，更新当前项目的团队
            const otherTeams = state.teams.filter(team => String(team.project_id) !== String(projectId));
            state.teams = [...otherTeams, ...teams];
            
            // 更新最后操作时间
            if (!state.lastFetchTime) {
              state.lastFetchTime = {};
            }
            state.lastFetchTime[`project_${projectId}`] = Date.now();
            // 清除正在更新的标志
            state.lastFetchTime[`updating_order_${projectId}`] = false;
          }
        }
        
        state.error = null;
      })
      .addCase(updateTeamOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
        
        // 清除所有正在更新的标志
        if (action.meta.arg && action.meta.arg.length > 0) {
          const projectId = action.meta.arg[0]?.project_id;
          if (projectId && state.lastFetchTime) {
            state.lastFetchTime[`updating_order_${projectId}`] = false;
          }
        }
      })
      // initializeTeamOrder
      .addCase(initializeTeamOrder.pending, (state, action) => {
        state.status = 'loading';
        const projectId = action.meta.arg;
        
        // 记录初始化顺序的时间戳
        if (!state.lastFetchTime) {
          state.lastFetchTime = {};
        }
        state.lastFetchTime[`init_order_${projectId}`] = Date.now();
        // 设置一个标志，表示正在初始化
        state.lastFetchTime[`initializing_${projectId}`] = true;
      })
      .addCase(initializeTeamOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const projectId = action.meta.arg;
        
        // 只有当返回的数据不为空时才更新
        if (Array.isArray(action.payload) && action.payload.length > 0) {
          // 更新特定项目的团队顺序
          const otherTeams = state.teams.filter(team => String(team.project_id) !== String(projectId));
          state.teams = [...otherTeams, ...action.payload];
        }
        
        // 更新项目的最后获取时间
        if (!state.lastFetchTime) {
          state.lastFetchTime = {};
        }
        state.lastFetchTime[`project_${projectId}`] = Date.now();
        // 清除正在初始化的标志
        state.lastFetchTime[`initializing_${projectId}`] = false;
        
        state.error = null;
      })
      .addCase(initializeTeamOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
        
        // 清除正在初始化的标志
        const projectId = action.meta.arg;
        if (projectId && state.lastFetchTime) {
          state.lastFetchTime[`initializing_${projectId}`] = false;
        }
      })
      // updateTeamStar
      .addCase(updateTeamStar.fulfilled, (state, action) => {
        const { teamId, star } = action.payload;
        const team = state.teams.find(t => t.id === teamId);
        if (team) {
          team.star = star;
        }
      })
      // fetchUserTeams
      .addCase(fetchUserTeams.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchUserTeams.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.userTeams = action.payload;
        state.error = null;
      })
      .addCase(fetchUserTeams.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      
      // fetchTeamCustomFieldForTeam
      .addCase(fetchTeamCustomFieldForTeam.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTeamCustomFieldForTeam.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // 现在我们存储的是包含teamId和customFields的对象
        const { teamId, customFields } = action.payload;
        
        // 保留teamCustomFields原有的数据，只更新或添加当前teamId的数据
        if (Array.isArray(customFields) && customFields.length > 0) {
          // 确保customFields是一个有效的数组
          state.teamCustomFields = customFields;
          
          // 更新或添加特定团队的第一个自定义字段ID
          if (!state.teamFirstCFIds) {
            state.teamFirstCFIds = {};
          }
          state.teamFirstCFIds[teamId] = customFields[0].id;
          
          // 如果还没有设置默认自定义字段ID，则使用当前的
          if (!state.defaultCFId && customFields[0]?.id) {
            state.defaultCFId = customFields[0].id;
          }
        }
        
        state.error = null;
      })
      .addCase(fetchTeamCustomFieldForTeam.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
  },
})

export const { clearTeams } = teamSlice.actions
export default teamSlice.reducer