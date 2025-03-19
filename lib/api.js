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
      
      const res = await fetch(`${API_BASE}/teams/teamUsers?id=${teamId}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('API: 获取团队用户失败:', errorData);
        throw new Error(errorData.error || 'Failed to fetch team users');
      }
      
      const data = await res.json();
      return data;
    },
    createTeamUser: async (teamUserData) => {
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

        const response = await fetch(`${API_BASE}/teams/teamUsers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data)
        });
        const responseData = await response.json();

        if (!response.ok) {
          throw new Error(responseData.error || `请求失败 (${response.status})`);
        }

        if (!responseData?.id) {
          throw new Error('服务器返回的数据无效');
        }
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
        const res = await fetch(`${API_BASE}/teams/teamUsersInv?teamId=${teamId}`);

        if (!res.ok) {
          const errorData = await res.json();
          console.error('API: 获取团队邀请列表失败:', errorData);
          throw new Error(errorData.error || 'Failed to fetch team invitations');
        }

        const data = await res.json();
        return data;
      },
      create: async (invitationData) => {

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
        return data;
      },
      updateStatus: async (invitationId, status) => {

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
        return data;
      },
      delete: async (invitationId) => {

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
        return data;
      },
    },
    teamCustomFields: {
      list: async (teamId) => {
        const res = await fetch(`${API_BASE}/teams/teamCF?teamId=${teamId}`)
        if (!res.ok) throw new Error('Failed to fetch team custom fields')
        return res.json()
      },
      create: async (teamId, customFieldData) => {
        
        const res = await fetch(`${API_BASE}/teams/teamCF?teamId=${teamId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(customFieldData),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error('API 错误:', errorData);
          throw new Error(errorData.error || '创建团队自定义字段失败');
        }
        
        return res.json();
      },
      updateOrder: async (teamId, orderedFields) => {
        const res = await fetch(`${API_BASE}/teams/teamCF?teamId=${teamId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ orderedFields }),
        })
        if (!res.ok) throw new Error('Failed to update team custom field order')
        return res.json()
      },
      delete: async (teamId, customFieldId) => {
        const res = await fetch(`${API_BASE}/teams/teamCF?teamId=${teamId}&customFieldId=${customFieldId}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Failed to delete team custom field')
        return res.json()
      },
    }, 
    teamCustomFieldValues: {
      list: async (teamId, customFieldId) => {
        const res = await fetch(`${API_BASE}/teams/teamCFValue?teamId=${teamId}&customFieldId=${customFieldId}`)
        if (!res.ok) throw new Error('Failed to fetch team custom field values')
        return res.json()
      },
      create: async (teamId, customFieldId, customFieldValueData) => {
        const res = await fetch(`${API_BASE}/teams/teamCFValue?teamId=${teamId}&customFieldId=${customFieldId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(customFieldValueData),
        })
        if (!res.ok) throw new Error('Failed to create team custom field value')
        return res.json()
      },
      update: async (teamId, customFieldId, customFieldValueId, customFieldValueData) => {
        const res = await fetch(`${API_BASE}/teams/teamCFValue?teamId=${teamId}&customFieldId=${customFieldId}&customFieldValueId=${customFieldValueId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(customFieldValueData),
        })
        if (!res.ok) throw new Error('Failed to update team custom field value')
        return res.json()
      },
      delete: async (teamId, customFieldId, customFieldValueId) => {
        const res = await fetch(`${API_BASE}/teams/teamCFValue?teamId=${teamId}&customFieldId=${customFieldId}&customFieldValueId=${customFieldValueId}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Failed to delete team custom field value')
        return res.json()
      },
    },
  },

  // Users
  users: {
    updateProfile: async (userId, data) => {
      const response = await fetch(`/api/users/${userId}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    updatePreference: async (userId, data) => {
      const response = await fetch(`/api/users/${userId}/preference`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    connectProvider: async (userId, { provider, providerId }) => {
      const response = await fetch(`/api/users/${userId}/provider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider, providerId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect provider');
      }

      return response.json();
    },

    disconnectProvider: async (userId, { provider }) => {
      const response = await fetch(`/api/users/${userId}/provider?provider=${provider}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect provider');
      }

      return response.json();
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
  
  // Subscription
  subscriptions: {
    getCurrentPlan: async (userId) => {
      const res = await fetch(`${API_BASE}/subscriptions/current?userId=${userId}`);

      // 错误处理
      if(!res.ok){
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch subscription plan');
      }

      // 返回订阅计划数据
      return res.json();
    },
    // Usage Stats
    getUsageStats: async (userId) =>{
      const res = await fetch(`${API_BASE}/subscriptions/usage?userId=${userId}`);

      if(!res.ok){
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch usage stats');
      }

      return res.json();
    },
    checkLimit: async (userId, limitType) =>{
      const res = await fetch(`${API_BASE}/subscriptions/check-limit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, limitType }),
      });

      if(!res.ok){
        const error = await res.json();
        throw new Error(error.message || 'Failed to check limit');
      }

      return res.json();
    },
  },

  // Custom Fields
  customFields: {
    list: async () => {
      const res = await fetch(`${API_BASE}/customField`)
      if (!res.ok) throw new Error('获取自定义字段失败')
      return res.json()
    },
    create: async (fieldData) => {
      const res = await fetch(`${API_BASE}/customField`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fieldData),
      })
      if (!res.ok) throw new Error('创建自定义字段失败')
      return res.json()
    },
    update: async (fieldId, fieldData) => {
      const res = await fetch(`${API_BASE}/customField?id=${fieldId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fieldData),
      })
      if (!res.ok) throw new Error('更新自定义字段失败')
      return res.json()
    },
    delete: async (fieldId) => {
      const res = await fetch(`${API_BASE}/customField?id=${fieldId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('删除自定义字段失败')
      return res.json()
    }
  },

  // Defaults
  defaults: {
    list: async () => {
      const res = await fetch(`${API_BASE}/default`)
      if (!res.ok) throw new Error('获取默认数据失败')
      return res.json()
    },
    getByName: async (name) => {
      const res = await fetch(`${API_BASE}/default?table=${name}`)
      if (!res.ok) throw new Error('获取默认数据失败')
      return res.json()
    },
    update: async (name, defaultData) => {
      const res = await fetch(`${API_BASE}/default?table=${name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(defaultData),
      })
      if (!res.ok) throw new Error('更新默认数据失败')
      return res.json()
    }
  }
}