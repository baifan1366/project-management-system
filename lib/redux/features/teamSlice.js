import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '@/lib/api'

// Async thunks
export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async () => {
    const res = await api.teams.list()
    return res;
  }
)

export const fetchProjectTeams = createAsyncThunk(
  'teams/fetchProjectTeams',
  async (projectId, { getState }) => {
    const state = getState();
    const lastFetchTime = state.teams.lastFetchTime[`project_${projectId}`];
    const hasEmptyTeams = state.teams.emptyProjects?.includes(projectId);

    // 如果之前已确认是空项目且在缓存时间内，直接返回空数组
    if (hasEmptyTeams && lastFetchTime && Date.now() - lastFetchTime < CACHE_DURATION) {
      return [];
    }

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

export const fetchTeamById = createAsyncThunk(
  'teams/fetchTeamById', 
  async (teamId) => {
    const res = await api.teams.getById(teamId);
    return res;
  }
)

export const fetchTeamUsers = createAsyncThunk(
  'teams/fetchTeamUsers',
  async (teamId, { rejectWithValue }) => {
    try {
      console.log('Redux: 获取团队用户，teamId:', teamId);
      
      if (!teamId) {
        console.error('Redux: teamId 不能为空');
        return rejectWithValue('Team ID is required');
      }

      const res = await api.teams.getTeamUsers(teamId);
      console.log('Redux: 获取团队用户成功:', res);
      
      return { teamId, users: Array.isArray(res) ? res : [] };
    } catch (error) {
      console.error('Redux: 获取团队用户失败:', error);
      return rejectWithValue(error.message || '获取团队用户失败');
    }
  }
);

export const createTeamUser = createAsyncThunk(
  'teams/createTeamUser',
  async (teamUserData, { rejectWithValue }) => {
    try {
      console.log('Redux createTeamUser: 开始执行，数据:', teamUserData);
      
      if (!teamUserData || !teamUserData.team_id || !teamUserData.user_id || !teamUserData.role) {
        console.error('Redux createTeamUser: 无效的输入数据:', teamUserData);
        return rejectWithValue('无效的团队用户数据');
      }

      console.log('Redux createTeamUser: 调用API...');
      const res = await api.teams.createTeamUser(teamUserData);
      
      console.log('Redux createTeamUser: API返回原始数据:', res);
      
      if (!res) {
        console.error('Redux createTeamUser: API返回空数据');
        return rejectWithValue('服务器没有返回响应');
      }

      // 验证返回的数据结构
      if (!res.team_id || !res.user_id || !res.role) {
        console.error('Redux createTeamUser: API返回数据格式不正确:', res);
        return rejectWithValue('服务器返回的数据格式不正确');
      }

      console.log('Redux createTeamUser: 执行成功，返回数据:', res);
      return res;  // 直接返回API响应的数据
    } catch (error) {
      console.error('Redux createTeamUser: 捕获到错误:', error);
      return rejectWithValue(error.message || '创建团队用户失败');
    }
  }
);

export const createTeam = createAsyncThunk(
  'teams/createTeam',
  async (teamData, { getState }) => {
    // 从state中获取用户ID作为备份
    const userId = getState().auth?.user?.id;
    
    // 确保created_by字段存在
    const dataWithUser = {
      ...teamData,
      created_by: teamData.created_by || userId
    };
    
    const res = await api.teams.create(dataWithUser);
    return res;
  }
);

export const updateTeam = createAsyncThunk(
  'teams/updateTeam',
  async ({ teamId, teamData }) => {
    const res = await api.teams.update(teamId, teamData)
    return res;
  }
)

export const deleteTeam = createAsyncThunk(
  'teams/deleteTeam',
  async (teamId) => {
    await api.teams.delete(teamId)
    return teamId;
  }
)

export const updateTeamOrder = createAsyncThunk(
  'teams/updateTeamOrder',
  async (teams) => {
    // 如果只有一个团队，不需要更新顺序
    if (teams.length <= 1) {
      return teams;
    }

    const res = await api.teams.updateOrder(teams.map(team => ({
      id: team.id,
      name: team.name,
      access: team.access,
      order_index: team.order_index,
      project_id: team.project_id,
      created_by: team.created_by,
      description: team.description,
      star: team.star
    })));
    return res;
  }
)

export const initializeTeamOrder = createAsyncThunk(
  'teams/initializeTeamOrder',
  async (projectId, { getState }) => {
    // 获取当前项目的团队
    const state = getState();
    const projectTeams = state.teams.teams.filter(team => String(team.project_id) === String(projectId));
    
    // 如果没有团队或只有一个团队，不需要初始化顺序
    if (projectTeams.length <= 1) {
      return projectTeams;
    }

    const res = await api.teams.initializeOrder(projectId)
    return res;
  }
)

export const updateTeamStar = createAsyncThunk(
  'teams/updateTeamStar',
  async ({ teamId, star }) => {
    const res = await api.teams.update(teamId, { star })
    return { teamId, star };
  }
);

const teamSlice = createSlice({
  name: 'teams',
  initialState: {
    teams: [],
    status: 'idle',
    loadingStates: {},
    error: null,
    lastFetchTime: {},
    pendingRequests: {},
    emptyProjects: [] // 新增：记录空项目
  },
  reducers: {
    clearTeams: (state) => {
      state.teams = [];
      state.status = 'idle';
      state.error = null;
      state.lastFetchTime = {};
    },
    clearTeamUsers: (state, action) => {
      const teamId = action.payload;
      const teamIndex = state.teams.findIndex(t => String(t.id) === String(teamId));
      if (teamIndex !== -1) {
        state.teams[teamIndex].users = [];
      }
      delete state.lastFetchTime[`teamUsers_${teamId}`];
    },
    setLoadingState: (state, action) => {
      const { key, isLoading } = action.payload;
      state.loadingStates[key] = isLoading;
    },
    setPendingRequest: (state, action) => {
      const { key, promise } = action.payload;
      state.pendingRequests[key] = promise;
    },
    clearPendingRequest: (state, action) => {
      const { key } = action.payload;
      delete state.pendingRequests[key];
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch teams
      .addCase(fetchTeams.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.teams = action.payload;
        state.error = null;
        state.lastFetchTime.all = Date.now();
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Fetch project teams
      .addCase(fetchProjectTeams.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProjectTeams.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // 处理空项目的情况
        if (action.payload?.isEmptyProject) {
          if (!state.emptyProjects.includes(action.payload.projectId)) {
            state.emptyProjects.push(action.payload.projectId);
          }
          state.lastFetchTime[`project_${action.payload.projectId}`] = Date.now();
          return;
        }
        // 只有当有新数据时才更新
        if (action.payload !== null) {
          state.teams = action.payload;
          // 更新最后获取时间
          const projectId = action.meta.arg;
          state.lastFetchTime[`project_${projectId}`] = Date.now();
        }
        state.error = null;
      })
      .addCase(fetchProjectTeams.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Fetch teamById
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
          state.lastFetchTime[`team_${team.id}`] = Date.now();
        }
        state.error = null;
      })
      .addCase(fetchTeamById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Fetch team users
      .addCase(fetchTeamUsers.pending, (state, action) => {
        const teamId = action.meta.arg;
        state.status = 'loading';
        state.currentRequest = `teamUsers_${teamId}`;
      })
      .addCase(fetchTeamUsers.fulfilled, (state, action) => {
        if (action.payload) {
          const { teamId, users } = action.payload;
          const teamIndex = state.teams.findIndex(t => String(t.id) === String(teamId));
          if (teamIndex !== -1) {
            state.teams[teamIndex].users = users;
          }
          state.lastFetchTime[`teamUsers_${teamId}`] = Date.now();
        }
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(fetchTeamUsers.rejected, (state, action) => {
        const teamId = action.meta.arg;
        state.status = 'failed';
        if (teamId) {
          // 只有在不是因为条件检查而被拒绝时才清除缓存
          if (action.error.name !== 'ConditionError') {
            delete state.lastFetchTime[`teamUsers_${teamId}`];
          }
        }
        state.currentRequest = null;
        state.error = action.error.name === 'ConditionError' ? null : action.error.message;
      })
      // Create team
      .addCase(createTeam.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(createTeam.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload && action.payload.id) {
          const index = state.teams.findIndex(t => String(t.id) === String(action.payload.id));
          if (index === -1) {
            state.teams.push(action.payload);
          } else {
            state.teams[index] = action.payload;
          }
        }
        state.error = null;
      })
      .addCase(createTeam.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Update team order
      .addCase(updateTeamOrder.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateTeamOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        
        // 处理不同的响应格式
        let teams = [];
        if (action.payload?.data && Array.isArray(action.payload.data)) {
          teams = action.payload.data;
        } else if (Array.isArray(action.payload)) {
          teams = action.payload;
        } else if (action.payload && typeof action.payload === 'object') {
          teams = [action.payload];
        }

        // 只有在有有效数据时才更新
        if (teams.length > 0) {
          const projectId = teams[0]?.project_id;
          if (projectId) {
            // 保留其他项目的团队，更新当前项目的团队
            state.teams = [
              ...state.teams.filter(team => String(team.project_id) !== String(projectId)),
              ...teams
            ];
          }
        }
        
        state.error = null;
      })
      .addCase(updateTeamOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      // Initialize team order
      .addCase(initializeTeamOrder.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(initializeTeamOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const projectId = action.meta.arg;
        // 更新特定项目的团队顺序
        state.teams = state.teams.filter(team => String(team.project_id) !== String(projectId));
        state.teams = [...state.teams, ...action.payload];
        state.error = null;
      })
      .addCase(initializeTeamOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      })
      .addCase(updateTeamStar.fulfilled, (state, action) => {
        const { teamId, star } = action.payload;
        const team = state.teams.find(t => t.id === teamId);
        if (team) {
          team.star = star;
        }
      })
      // Create team user
      .addCase(createTeamUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createTeamUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload && action.payload.team_id) {
          const teamIndex = state.teams.findIndex(t => String(t.id) === String(action.payload.team_id));
          if (teamIndex !== -1) {
            const team = state.teams[teamIndex];
            if (!team.users) {
              team.users = [];
            }
            // 添加新用户到团队
            const userIndex = team.users.findIndex(u => String(u.user_id) === String(action.payload.user_id));
            if (userIndex === -1) {
              team.users.push(action.payload);
            } else {
              team.users[userIndex] = action.payload;
            }
          }
        }
        state.error = null;
      })
      .addCase(createTeamUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
        console.error('Redux: createTeamUser失败:', state.error);
      });
  },
});

export const { clearTeams, clearTeamUsers } = teamSlice.actions;
export default teamSlice.reducer;
