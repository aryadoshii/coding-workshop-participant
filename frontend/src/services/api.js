/**
 * api.js — centralised API client
 * All backend microservice calls go through here.
 */

const BASE = {
  auth:         'http://localhost:8001',
  employees:    'http://localhost:8002',
  reviews:      'http://localhost:8003',
  competencies: 'http://localhost:8004',
  training:     'http://localhost:8005',
  plans:        'http://localhost:8006',
}

function headers() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request(url, options = {}) {
  const res = await fetch(url, { headers: headers(), ...options })
  const json = await res.json()
  return { data: json, status: res.status, ok: res.ok }
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const login  = (email, password) =>
  request(`${BASE.auth}/login`,  { method: 'POST', body: JSON.stringify({ email, password }) })

export const getMe  = () =>
  request(`${BASE.auth}/me`)

// ── Employees ───────────────────────────────────────────────────────────────
export const getEmployees      = (params = '') =>
  request(`${BASE.employees}/employees${params}`)

export const getEmployee       = (id) =>
  request(`${BASE.employees}/employees/${id}`)

export const createEmployee    = (data) =>
  request(`${BASE.employees}/employees`, { method: 'POST', body: JSON.stringify(data) })

export const updateEmployee    = (id, data) =>
  request(`${BASE.employees}/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteEmployee    = (id) =>
  request(`${BASE.employees}/employees/${id}`, { method: 'DELETE' })

// ── Reviews ─────────────────────────────────────────────────────────────────
export const getReviews        = () =>
  request(`${BASE.reviews}/reviews`)

export const createReview      = (data) =>
  request(`${BASE.reviews}/reviews`, { method: 'POST', body: JSON.stringify(data) })

export const updateReview      = (id, data) =>
  request(`${BASE.reviews}/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteReview      = (id) =>
  request(`${BASE.reviews}/reviews/${id}`, { method: 'DELETE' })

export const getAttritionRisk  = () =>
  request(`${BASE.reviews}/reviews/attrition-risk`)

export const generateAiSummary = (id) =>
  request(`${BASE.reviews}/reviews/${id}/ai-summary`, { method: 'POST' })

// ── Competencies ─────────────────────────────────────────────────────────────
export const getCompetencies      = () =>
  request(`${BASE.competencies}/competencies`)

export const createCompetency     = (data) =>
  request(`${BASE.competencies}/competencies`, { method: 'POST', body: JSON.stringify(data) })

export const updateCompetency     = (id, data) =>
  request(`${BASE.competencies}/competencies/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteCompetency     = (id) =>
  request(`${BASE.competencies}/competencies/${id}`, { method: 'DELETE' })

export const getSkillDistribution = () =>
  request(`${BASE.competencies}/competencies/skill-distribution`)

export const getCriticalGaps      = () =>
  request(`${BASE.competencies}/competencies/critical-gaps`)

// ── Training ─────────────────────────────────────────────────────────────────
export const getTrainingRecords = () =>
  request(`${BASE.training}/training`)

export const createTraining     = (data) =>
  request(`${BASE.training}/training`, { method: 'POST', body: JSON.stringify(data) })

export const updateTraining     = (id, data) =>
  request(`${BASE.training}/training/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteTraining     = (id) =>
  request(`${BASE.training}/training/${id}`, { method: 'DELETE' })

// ── Plans ────────────────────────────────────────────────────────────────────
export const getPlans           = () =>
  request(`${BASE.plans}/plans`)

export const createPlan         = (data) =>
  request(`${BASE.plans}/plans`, { method: 'POST', body: JSON.stringify(data) })

export const updatePlan         = (id, data) =>
  request(`${BASE.plans}/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deletePlan         = (id) =>
  request(`${BASE.plans}/plans/${id}`, { method: 'DELETE' })

export const getPromotionReady  = () =>
  request(`${BASE.plans}/plans/promotion-ready`)
