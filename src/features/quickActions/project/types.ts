export interface Project {
  id: string | number
  name: string
  date: string
  img?: string
}

export interface ProjectFilters {
  name?: string
  id?: string | number
}

export interface SaveProjectResult {
  success: boolean
  data?: any
  error?: string
}

export interface LoadProjectsResult {
  items: Project[]
  total?: number
  page?: number
}

export type ProjectTab = 'my' | 'ready' 