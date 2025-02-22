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
    list: async () => {
      const res = await fetch(`${API_BASE}/teams`)
      if (!res.ok) throw new Error('Failed to fetch teams')
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
    update: async (teamId, teamData) => {
      const res = await fetch(`${API_BASE}/teams?id=${teamId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(teamData),
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
    }
  },
}
