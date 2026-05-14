import { useEffect, useState } from 'react'
import {
  Box, Typography, Paper, CircularProgress,
  Chip, Stack, Alert
} from '@mui/material'
import Grid from '@mui/material/Grid'
import {
  Star, School, Assignment, TrendingUp,
  Warning, CheckCircle, EmojiEvents
} from '@mui/icons-material'
import AppLayout from '../components/layout/AppLayout'
import {
  getReviews, getTrainingRecords, getPlans,
  getAttritionRisk, getPromotionReady
} from '../services/api'

export default function Dashboard() {
  const [reviews,        setReviews]        = useState([])
  const [training,       setTraining]       = useState([])
  const [plans,          setPlans]          = useState([])
  const [attritionRisk,  setAttritionRisk]  = useState([])
  const [promotionReady, setPromotionReady] = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')

  const role         = localStorage.getItem('role')
  const employeeName = localStorage.getItem('employee_first_name') ||
                       localStorage.getItem('employee_name') || 'there'

  useEffect(() => {
    const load = async () => {
      try {
        const [revRes, trainRes, planRes] = await Promise.all([
          getReviews(),
          getTrainingRecords(),
          getPlans(),
        ])
        setReviews(revRes.data?.reviews    || [])
        setTraining(trainRes.data?.training || [])
        setPlans(planRes.data?.plans        || [])

        if (role !== 'Employee') {
          const [riskRes, promoRes] = await Promise.all([
            getAttritionRisk(),
            getPromotionReady(),
          ])
          setAttritionRisk(riskRes.data?.attrition_risk    || [])
          setPromotionReady(promoRes.data?.promotion_ready  || [])
        }
      } catch {
        setError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '—'

  const completedTraining = training.filter(t => t.status === 'Completed').length
  const completedPlans    = plans.filter(p => p.status === 'Completed').length

  const statCards = [
    {
      label:  'Avg Performance Rating',
      value:  avgRating,
      sub:    `${reviews.length} review cycles`,
      accent: '#f59e0b',
      icon:   <Star sx={{ fontSize: 34, color: '#f59e0b' }} />,
    },
    {
      label:  'Training Completed',
      value:  completedTraining,
      sub:    `${training.length} total enrolled`,
      accent: '#10b981',
      icon:   <School sx={{ fontSize: 34, color: '#10b981' }} />,
    },
    {
      label:  'Goals Completed',
      value:  completedPlans,
      sub:    `${plans.length} total goals`,
      accent: '#818cf8',
      icon:   <Assignment sx={{ fontSize: 34, color: '#818cf8' }} />,
    },
    {
      label:  role !== 'Employee' ? 'At-Risk Employees' : 'Review Cycles',
      value:  role !== 'Employee' ? attritionRisk.length : reviews.length,
      sub:    role !== 'Employee' ? 'Need immediate attention' : 'Total reviews logged',
      accent: '#f87171',
      icon:   <TrendingUp sx={{ fontSize: 34, color: '#f87171' }} />,
    },
  ]

  return (
    <AppLayout>
      <Box>

        {/* PAGE HEADER */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Welcome back, {employeeName} 👋
          </Typography>
          <Typography color="text.secondary">
            Here's your workforce intelligence snapshot for today.
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* GLASSMORPHISM STAT CARDS inside dark gradient container */}
        <Box
          sx={{
            borderRadius: 4,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            p: 3,
            mb: 3,
          }}
        >
          <Grid container spacing={2.5}>
            {statCards.map((card) => (
              <Grid item xs={12} sm={6} lg={3} key={card.label}>
                <Box
                  sx={{
                    background: 'rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.13)',
                    borderRadius: 3,
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    minHeight: 160,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Typography
                      sx={{
                        color: 'rgba(255,255,255,0.55)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        maxWidth: '70%',
                      }}
                    >
                      {card.label}
                    </Typography>
                    {card.icon}
                  </Stack>

                  <Typography variant="h3" fontWeight={800} sx={{ color: '#fff', lineHeight: 1 }}>
                    {card.value}
                  </Typography>

                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>
                    {card.sub}
                  </Typography>

                  <Box
                    sx={{
                      height: 3,
                      borderRadius: 2,
                      mt: 'auto',
                      background: `linear-gradient(90deg, ${card.accent}, transparent)`,
                    }}
                  />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* BOTTOM ROW */}
        <Grid container spacing={3}>

          {/* ATTRITION RISK */}
          {role !== 'Employee' && (
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e5e7eb', height: '100%' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                  <Warning sx={{ color: '#ef4444' }} />
                  <Typography fontWeight={700} variant="h6">Attrition Risk</Typography>
                  <Chip
                    label={loading ? '…' : attritionRisk.length}
                    size="small"
                    sx={{
                      bgcolor: attritionRisk.length > 0 ? '#ef4444' : '#10b981',
                      color: '#fff',
                      fontWeight: 700,
                    }}
                  />
                </Stack>

                {loading ? (
                  <CircularProgress size={22} />
                ) : attritionRisk.length === 0 ? (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
                    <Typography color="text.secondary" fontSize="0.9rem">
                      No employees flagged — retention is healthy!
                    </Typography>
                  </Stack>
                ) : (
                  <Stack spacing={1.5}>
                    {attritionRisk.map((emp) => (
                      <Box
                        key={emp.id}
                        sx={{
                          p: 1.5, borderRadius: 2,
                          bgcolor: '#fef2f2', border: '1px solid #fecaca',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                      >
                        <Box>
                          <Typography fontWeight={700} fontSize="0.88rem">{emp.name}</Typography>
                          <Typography color="text.secondary" fontSize="0.75rem">
                            {emp.department} · {emp.designation}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography color="error" fontWeight={700} fontSize="0.85rem">
                            {emp.recent_avg}★
                          </Typography>
                          <Chip
                            label={emp.risk_level}
                            size="small"
                            sx={{
                              bgcolor: emp.risk_level === 'High' ? '#dc2626' : '#f59e0b',
                              color: '#fff', fontWeight: 700, fontSize: '0.7rem',
                            }}
                          />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
          )}

          {/* PROMOTION READY */}
          {role !== 'Employee' && (
            <Grid item xs={12} md={6}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid #e5e7eb', height: '100%' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                  <EmojiEvents sx={{ color: '#f59e0b' }} />
                  <Typography fontWeight={700} variant="h6">Promotion Ready</Typography>
                  <Chip
                    label={loading ? '…' : promotionReady.length}
                    size="small"
                    sx={{ bgcolor: '#10b981', color: '#fff', fontWeight: 700 }}
                  />
                </Stack>

                {loading ? (
                  <CircularProgress size={22} />
                ) : promotionReady.length === 0 ? (
                  <Typography color="text.secondary" fontSize="0.9rem">
                    No employees meet promotion criteria yet.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {promotionReady.map((emp) => (
                      <Box
                        key={emp.id}
                        sx={{
                          p: 1.5, borderRadius: 2,
                          bgcolor: '#f0fdf4', border: '1px solid #bbf7d0',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}
                      >
                        <Box>
                          <Typography fontWeight={700} fontSize="0.88rem">{emp.name}</Typography>
                          <Typography color="text.secondary" fontSize="0.75rem">{emp.department}</Typography>
                        </Box>
                        <Typography sx={{ color: '#10b981', fontWeight: 700, fontSize: '0.88rem' }}>
                          {emp.avg_rating}★
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
          )}

          {/* AI INSIGHTS */}
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3, borderRadius: 4,
                background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                color: '#fff',
              }}
            >
              <Typography fontWeight={700} variant="h6" sx={{ color: '#a5b4fc', mb: 1.5 }}>
                🤖 AI Workforce Insights
              </Typography>

              {loading ? (
                <Stack direction="row" spacing={2} alignItems="center">
                  <CircularProgress size={18} sx={{ color: '#a5b4fc' }} />
                  <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>
                    Generating insights...
                  </Typography>
                </Stack>
              ) : (
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.85, fontSize: '0.92rem' }}>
                  {reviews.length > 0
                    ? `The organization currently has ${reviews.length} performance reviews logged with an average rating of ${avgRating}/5. ${
                        attritionRisk.length > 0
                          ? `⚠️ ${attritionRisk.length} employee${attritionRisk.length > 1 ? 's are' : ' is'} flagged as attrition risk and require immediate manager attention.`
                          : '✅ No employees are currently flagged as attrition risk — retention is healthy.'
                      } ${
                        promotionReady.length > 0
                          ? `🚀 ${promotionReady.length} employee${promotionReady.length > 1 ? 's are' : ' is'} promotion-ready based on performance and goal completion.`
                          : ''
                      } Training completion stands at ${completedTraining} of ${training.length} enrolled programs.`
                    : 'No performance data available yet. Start by adding employee reviews and development plans.'
                  }
                </Typography>
              )}
            </Paper>
          </Grid>

        </Grid>
      </Box>
    </AppLayout>
  )
}