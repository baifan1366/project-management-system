// API helper functions
const API_BASE = '/api'

import { supabase } from './supabase';

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
      const res = await fetch(`${API_BASE}/projects?projectId=${projectId}`)
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
      getById: async (teamId, teamCFId) => {
        const res = await fetch(`${API_BASE}/teams/teamCF?teamId=${teamId}&teamCFId=${teamCFId}`)
        if (!res.ok) throw new Error('Failed to fetch team custom field details')
        return res.json()
      },
      updateTagIds: async (teamId, teamCFId, tagIds) => {
        const res = await fetch(`${API_BASE}/teams/teamCF/tags?teamId=${teamId}&teamCFId=${teamCFId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tagIds }),
        })
        if (!res.ok) throw new Error('更新标签关联失败')
        return res.json()
      },
      getTags: async (teamId, teamCFId) => {
        const res = await fetch(`${API_BASE}/teams/teamCF/tags?teamId=${teamId}&teamCFId=${teamCFId}`);
        if (!res.ok) throw new Error('获取标签失败');
        return res.json();
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
    teamSection: {
      getSectionByTeamId: async (teamId) => {
        const res = await fetch(`${API_BASE}/teams/section?teamId=${teamId}`)
        if (!res.ok) throw new Error('Failed to fetch team sections')
        return res.json()
      },
      getSectionById: async (teamId, sectionId) => {
        const res = await fetch(`${API_BASE}/teams/section?teamId=${teamId}&sectionId=${sectionId}`)
        if (!res.ok) throw new Error('Failed to fetch team section details')
        return res.json()
      },
      create: async (teamId, sectionData) => {
        const res = await fetch(`${API_BASE}/teams/section?teamId=${teamId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sectionData),
        })
        if (!res.ok) throw new Error('Failed to create team section')
        return res.json()
      },
      update: async (teamId, sectionId, sectionData) => {
        const res = await fetch(`${API_BASE}/teams/section?teamId=${teamId}&sectionId=${sectionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },  
          body: JSON.stringify(sectionData),  
        })
        if (!res.ok) throw new Error('Failed to update team section')
        return res.json()
      },
      // 更新任务ID
      updateTaskIds: async (sectionId, teamId, task_ids) => {
        const res = await fetch(`${API_BASE}/teams/section?teamId=${teamId}&sectionId=${sectionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sectionId: sectionId,
            teamId: teamId,
            newTaskIds: task_ids
          }),
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to update task');
        }
        
        return res.json();
      },
      delete: async (teamId, sectionId) => {
        const res = await fetch(`${API_BASE}/teams/section?teamId=${teamId}&sectionId=${sectionId}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Failed to delete team section')
        return res.json()
      },
    },
    teamSectionTasks: {
      // 获取所有任务
      async listAllTasks() {
        try {
          const res = await fetch(`${API_BASE}/teams/section/tasks?fetchAll=true`);
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch all tasks');
          }
          return res.json();
        } catch (error) {
          console.error('Error fetching all tasks:', error);
          throw error;
        }
      },

      // 根据分区ID获取任务
      async listBySectionId(sectionId) {
        try {
          if (!sectionId) {
            throw new Error('Section ID is required');
          }
          
          const res = await fetch(`${API_BASE}/teams/section/tasks?sectionId=${sectionId}`);
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch tasks by section ID');
          }
          
          return res.json();
        } catch (error) {
          console.error('Error fetching tasks by section ID:', error);
          throw error;
        }
      },

      // 根据用户ID获取任务
      async listByUserId(userId) {
        try {
          if (!userId) {
            throw new Error('User ID is required');
          }
          
          const res = await fetch(`${API_BASE}/teams/section/tasks?userId=${userId}`);
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch tasks by user ID');
          }
          
          return res.json();
        } catch (error) {
          console.error('Error fetching tasks by user ID:', error);
          throw error;
        }
      },

      // 获取单个任务
      async getById(taskId) {
        try {
          if (!taskId) {
            throw new Error('Task ID is required');
          }
          
          const res = await fetch(`${API_BASE}/teams/section/tasks?taskId=${taskId}`);
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch task by ID');
          }
          
          const data = await res.json();
          return data.length > 0 ? data[0] : null;
        } catch (error) {
          console.error('Error fetching task by ID:', error);
          throw error;
        }
      },

      // 创建任务
      async create(taskData) {
        try {
          if (!taskData) {
            throw new Error('Task data is required');
          }
          
          const res = await fetch(`${API_BASE}/teams/section/tasks`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskData),
          });
          
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create task');
          }
          
          return res.json();
        } catch (error) {
          console.error('Error creating task:', error);
          throw error;
        }
      },

      // 直接通过任务ID更新任务（不需要分区ID）
      async updateDirectly(taskId, taskData) {
        try {
          if (!taskId) {
            throw new Error('Task ID is required');
          }
          
          const res = await fetch(`${API_BASE}/teams/section/tasks`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: taskId,
              ...taskData
            }),
          });
          
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update task directly');
          }
          
          return res.json();
        } catch (error) {
          console.error('Error updating task directly:', error);
          throw error;
        }
      },

      // 删除任务
      async delete(sectionId, taskId) {
        try {
          if (!taskId) {
            throw new Error('Task ID is required');
          }
          
          // 如果提供了 sectionId，需要先更新 section 的 task_ids
          if (sectionId) {
            // 先从分区中获取当前的 task_ids
            const res = await fetch(`${API_BASE}/teams/section?sectionId=${sectionId}`);
            if (!res.ok) {
              const error = await res.json();
              throw new Error(error.error || 'Failed to fetch section');
            }
            
            const section = await res.json();
            
            if (section && section.task_ids && section.task_ids.length > 0) {
              // 从 task_ids 中移除要删除的任务ID
              const updatedTaskIds = section.task_ids.filter(id => id !== parseInt(taskId));
              
              // 更新分区的 task_ids
              const updateRes = await fetch(`${API_BASE}/teams/section`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  sectionId: sectionId,
                  teamId: section.team_id,
                  newTaskIds: updatedTaskIds
                }),
              });
              
              if (!updateRes.ok) {
                const error = await updateRes.json();
                throw new Error(error.error || 'Failed to update section task_ids');
              }
            }
          }
          
          // 删除任务
          const deleteRes = await fetch(`${API_BASE}/teams/section/tasks?id=${taskId}`, {
            method: 'DELETE',
          });
          
          if (!deleteRes.ok) {
            const error = await deleteRes.json();
            throw new Error(error.error || 'Failed to delete task');
          }
          
          return true;
        } catch (error) {
          console.error('Error deleting task:', error);
          throw error;
        }
      }
    }
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

      // return subscription plan data
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
  },

  // Tags
  tags: {
    list: async () => {
      const res = await fetch(`${API_BASE}/tags`)
      if (!res.ok) throw new Error('获取tag失败')
      return res.json()
    },
    create: async (data) => {
      const res = await fetch(`${API_BASE}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if(!res.ok) throw new Error('创建tag失败')
      return res.json()
    },
    getById: async (tagId) => {
      const res = await fetch(`${API_BASE}/tags?id=${tagId}`)
      if (!res.ok) throw new Error('获取单个标签失败')
      return res.json()
    }
  },

  // Notifications
  notifications: {
    // 获取用户的通知列表
    list: async (userId) => {
      if (!userId) {
        throw new Error('用户ID不能为空');
      }
      
      const res = await fetch(`${API_BASE}/notification?userId=${userId}`);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '获取通知失败');
      }
      
      return res.json();
    },
    
    // 标记单个通知为已读
    markAsRead: async (notificationId, userId) => {
      if (!notificationId || !userId) {
        throw new Error('通知ID和用户ID不能为空');
      }
      
      const res = await fetch(`${API_BASE}/notification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          notificationId, 
          userId,
          markAll: false
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '标记通知已读失败');
      }
      
      return res.json();
    },
    
    // 标记所有通知为已读
    markAllAsRead: async (userId) => {
      if (!userId) {
        throw new Error('用户ID不能为空');
      }
      
      const res = await fetch(`${API_BASE}/notification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId,
          markAll: true
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '标记所有通知已读失败');
      }
      
      return res.json();
    },
    
    // 删除通知
    delete: async (notificationId, userId) => {
      if (!notificationId || !userId) {
        throw new Error('通知ID和用户ID不能为空');
      }
      
      const res = await fetch(`${API_BASE}/notification?notificationId=${notificationId}&userId=${userId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '删除通知失败');
      }
      
      return res.json();
    },
    
    // 创建通知
    create: async (notificationData) => {
      if (!notificationData.user_id) {
        throw new Error('用户ID不能为空');
      }
      
      const res = await fetch(`${API_BASE}/notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '创建通知失败');
      }
      
      return res.json();
    }
  }
}