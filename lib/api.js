// API helper functions
const API_BASE = '/api'

export const api = {
  // Projects
  projects: {
    list: async () => {
      const res = await fetch(`${API_BASE}/projects`)
      if (!res.ok) throw new Error('Failed to fetch projects')
      return res.json()
    },
    listByUser: async (userId) => {
      const res = await fetch(`${API_BASE}/projects/user/${userId}`)
      if (!res.ok) throw new Error('Failed to fetch user projects')
      return res.json()
    },
    create: async (projectData) => {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      })
      if (!res.ok) throw new Error('Failed to create project')
      return res.json()
    },
    getById: async (projectId) => {
      const res = await fetch(`${API_BASE}/projects?id=${projectId}`)
      if (!res.ok) throw new Error('Failed to fetch project')
      return res.json()
    },
    update: async (projectId, projectData) => {
      const res = await fetch(`${API_BASE}/projects?id=${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      })
      if (!res.ok) throw new Error('Failed to update project')
      return res.json()
    },
    delete: async (projectId) => {
      const res = await fetch(`${API_BASE}/projects?id=${projectId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete project')
      return res.json()
    }
  },

  // Tasks
  tasks: {
    list: async (projectId = null) => {
      const url = new URL(`${window.location.origin}${API_BASE}/tasks`)
      if (projectId) url.searchParams.set('projectId', projectId)
      
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      return res.json()
    },
    create: async (taskData) => {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })
      if (!res.ok) throw new Error('Failed to create task')
      return res.json()
    },
    update: async (taskId, taskData) => {
      const res = await fetch(`${API_BASE}/tasks?id=${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })
      if (!res.ok) throw new Error('Failed to update task')
      return res.json()
    },
    delete: async (taskId) => {
      const res = await fetch(`${API_BASE}/tasks?id=${taskId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete task')
      return res.json()
    }
  },

  // Teams
  teams: {
    listByProject: async (projectId) => {
      const res = await fetch(`${API_BASE}/teams?projectId=${projectId}`)
      if (!res.ok) throw new Error('Failed to fetch project teams')
      return res.json()
    },
    listUserTeams: async (userId, projectId) => {
      const res = await fetch(`${API_BASE}/teams/teamUsers?userId=${userId}&projectId=${projectId}`)
      if (!res.ok) throw new Error('Failed to fetch user teams')
      return res.json()
    },
    create: async (teamData) => {
      const res = await fetch(`${API_BASE}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
      })
      if (!res.ok) throw new Error('Failed to create team')
      return res.json()
    },
    getById: async (teamId) => {
      const res = await fetch(`${API_BASE}/teams?id=${teamId}`)
      if (!res.ok) throw new Error('Failed to fetch team')
      return res.json()
    },
    getTeamUsers: async (teamId) => {
      if (!teamId) {
        console.error('API: teamId 不能为空');
        throw new Error('Team ID is required');
      }
      
      console.log('API: 获取团队用户，teamId:', teamId);
      const res = await fetch(`${API_BASE}/teams/teamUsers?id=${teamId}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('API: 获取团队用户失败:', errorData);
        throw new Error(errorData.error || 'Failed to fetch team users');
      }
      
      const data = await res.json();
      console.log('API: 获取团队用户成功:', data);
      return data;
    },
    createTeamUser: async (teamUserData) => {
      console.log('API Client: 开始创建团队用户关系，数据:', teamUserData);

      try {
        // 验证数据
        if (!teamUserData?.team_id || !teamUserData?.user_id || !teamUserData?.role) {
          const error = new Error('缺少必需的参数');
          console.error('API Client: 数据验证失败:', error);
          throw error;
        }

        // 确保数字类型
        const data = {
          ...teamUserData,
          team_id: Number(teamUserData.team_id)
        };

        console.log('API Client: 发送请求到服务器...');
        const response = await fetch(`${API_BASE}/teams/teamUsers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data)
        });

        console.log('API Client: 服务器响应状态:', response.status);

        const responseData = await response.json();
        console.log('API Client: 服务器响应数据:', responseData);

        if (!response.ok) {
          throw new Error(responseData.error || `请求失败 (${response.status})`);
        }

        if (!responseData?.id) {
          throw new Error('服务器返回的数据无效');
        }

        console.log('API Client: 创建团队用户成功');
        return responseData;
      } catch (error) {
        console.error('API Client: 创建团队用户失败:', error);
        throw error;
      }
    },
    update: async (teamId, teamData) => {
      const res = await fetch(`${API_BASE}/teams?id=${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: teamId, ...teamData }),
      })
      if (!res.ok) throw new Error('Failed to update team')
      return res.json()
    },
    delete: async (teamId) => {
      const res = await fetch(`${API_BASE}/teams?id=${teamId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete team')
      return res.json()
    },
    updateOrder: async (teams) => {
      const res = await fetch('/api/teams', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          teams: teams // 直接传递处理好的teams数组
        }),
      })
      if (!res.ok) throw new Error('Failed to update team order')
      return res.json()
    },
    initializeOrder: async (projectId) => {
      const res = await fetch('/api/teams', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teams: [],
          initializeOrder: true,
          projectId
        }),
      })
      if (!res.ok) throw new Error('Failed to initialize team order')
      return res.json()
    },
    teamInvitations: {
      list: async (teamId) => {
        if (!teamId) {
          console.error('API: teamId 不能为空');
          throw new Error('Team ID is required');
        }

        console.log('API: 获取团队邀请列表，teamId:', teamId);
        const res = await fetch(`${API_BASE}/teams/teamUsersInv?teamId=${teamId}`);

        if (!res.ok) {
          const errorData = await res.json();
          console.error('API: 获取团队邀请列表失败:', errorData);
          throw new Error(errorData.error || 'Failed to fetch team invitations');
        }

        const data = await res.json();
        console.log('API: 获取团队邀请列表成功:', data);
        return data;
      },
      create: async (invitationData) => {
        console.log('API: 创建团队邀请，数据:', invitationData);

        if (!invitationData?.teamId || !invitationData?.userEmail || !invitationData?.role) {
          const error = new Error('缺少必需的参数');
          console.error('API: 数据验证失败:', error);
          throw error;
        }

        const res = await fetch(`${API_BASE}/teams/teamUsersInv`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invitationData),
        });

        if (!res.ok) {
          const errorData = await res.json();
          console.error('API: 创建团队邀请失败:', errorData);
          throw new Error(errorData.error || 'Failed to create team invitation');
        }

        const data = await res.json();
        console.log('API: 创建团队邀请成功:', data);
        return data;
      },
      updateStatus: async (invitationId, status) => {
        console.log('API: 更新邀请状态，invitationId:', invitationId, 'status:', status);

        if (!invitationId || !status) {
          const error = new Error('缺少必需的参数');
          console.error('API: 数据验证失败:', error);
          throw error;
        }

        const res = await fetch(`${API_BASE}/teams/teamUsersInv`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invitationId, status }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          console.error('API: 更新邀请状态失败:', errorData);
          throw new Error(errorData.error || 'Failed to update invitation status');
        }

        const data = await res.json();
        console.log('API: 更新邀请状态成功:', data);
        return data;
      },
      delete: async (invitationId) => {
        console.log('API: 删除邀请，invitationId:', invitationId);

        if (!invitationId) {
          const error = new Error('缺少邀请ID');
          console.error('API: 数据验证失败:', error);
          throw error;
        }

        const res = await fetch(`${API_BASE}/teams/teamUsersInv?invitationId=${invitationId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          const errorData = await res.json();
          console.error('API: 删除邀请失败:', errorData);
          throw new Error(errorData.error || 'Failed to delete invitation');
        }

        const data = await res.json();
        console.log('API: 删除邀请成功:', data);
        return data;
      },
    },
  },

  // Users
  users: {
    updateProfile: async (userId, userData) => {
      const res = await fetch(`${API_BASE}/users/${userId}/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      return res.json()
    },

    updateSettings: async (userId, settings) => {
      const res = await fetch(`${API_BASE}/users/${userId}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('Failed to update settings')
      return res.json()
    },

    updatePassword: async (userId, passwords) => {
      const res = await fetch(`${API_BASE}/users/${userId}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(passwords),
      })
      if (!res.ok) throw new Error('Failed to update password')
      return res.json()
    },

    updateNotifications: async (userId, notifications) => {
      const res = await fetch(`${API_BASE}/users/${userId}/notifications`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notifications),
      })
      if (!res.ok) throw new Error('Failed to update notifications')
      return res.json()
    },
  },
}
