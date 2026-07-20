export interface UserData {
  avatar: string | null
  name: string
  status: 'online' | 'offline' | 'busy'
  id: string | number
}

export interface LoginData {
  login: string
  password: string
}

export interface ApiResponse {
  DATA: {
    type: 'success' | 'error'
    data: {
      id?: string
      MESSAGE?: string
    }
  }
}