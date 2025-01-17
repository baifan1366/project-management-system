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
  },
}
