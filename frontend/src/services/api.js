import axios from 'axios'

/**
 * Base API URL.
 * Later this should come from environment variables.
 */
const API_URL = 'http://localhost:3001'

/**
 * Shared axios instance.
 */
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

/**
 * Automatically attach JWT token to requests.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

/**
 * Auto logout on unauthorized responses.
 */
api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/'
    }

    return Promise.reject(error)
  }
)

/**
 * =========================
 * AUTH APIs
 * =========================
 */

export const login = (email, password) => {
  return api.post('/auth/login', {
    email,
    password
  })
}

/**
 * =========================
 * EMPLOYEE APIs
 * =========================
 */

export const getEmployees = (params = {}) => {
  return api.get('/employees', { params })
}

export const getEmployeeById = (id) => {
  return api.get(`/employees/${id}`)
}

export const createEmployee = (data) => {
  return api.post('/employees', data)
}

export const updateEmployee = (id, data) => {
  return api.put(`/employees/${id}`, data)
}

export const deleteEmployee = (id) => {
  return api.delete(`/employees/${id}`)
}

/**
 * =========================
 * REVIEW APIs
 * =========================
 */

export const getReviews = (params = {}) => {
  return api.get('/reviews', { params })
}

export const createReview = (data) => {
  return api.post('/reviews', data)
}

/**
 * =========================
 * COMPETENCY APIs
 * =========================
 */

export const getCompetencies = () => {
  return api.get('/competencies')
}

export const getSkillGaps = () => {
  return api.get('/competencies/gaps')
}

/**
 * =========================
 * DEVELOPMENT PLAN APIs
 * =========================
 */

export const getPlans = () => {
  return api.get('/plans')
}

export const getPromotionReady = () => {
  return api.get('/plans/promotion-ready')
}

/**
 * =========================
 * TRAINING APIs
 * =========================
 */

export const getTrainingRecords = () => {
  return api.get('/training')
}

/**
 * =========================
 * ATTRITION ANALYTICS
 * =========================
 */

export const getAttritionRisk = (employeeId) => {
  return api.get(`/reviews/trends/${employeeId}`)
}

export default api