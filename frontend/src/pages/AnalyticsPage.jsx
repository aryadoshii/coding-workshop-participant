import { useState, useEffect } from 'react'
import {
  Box, Typography, Paper, Grid, Stack, Chip,
  CircularProgress, Alert, Card, CardContent,
  LinearProgress, Divider, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow
} from '@mui/material'
import {
  TrendingUp, Warning, EmojiEvents, School,
  BarChart, Psychology, Groups
} from '@mui/icons-material'
import AppLayout from '../components/layout/AppLayout'
import {
  getReviews, getAttritionRisk, getPromotionReady,
  getSkillDistribution, getCriticalGaps,
  getTrainingRecords, getPlans
} from '../services/api'

// ── small reusable stat card ──────────────────────────────────────────────────
function StatCard({ label, value, sub, color = '#6366f1', icon }) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb', borderTop: `3px solid ${color}`, height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>{label}</Typography>
            <Typography variant="h3" fontWeight={800} sx={{ color }}>{value}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>
          {icon}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const [reviews,      setReviews]      = useState([])
  const [attrition,    setAttrition]    = useState([])
  const [promotion,    setPromotion]    = useState([])
  const [skills,       setSkills]       = useState([])
  const [critGaps,     setCritGaps]     = useState([])
  const [training,     setTraining]     = useState([])
  const [plans,        setPlans]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')

  const role = localStorage.getItem('role')

  useEffect(() => {
    if (role === 'Employee') return  // employees don't see analytics
    const load = async () => {
      try {
        const [revR, attrR, promoR, skillR, gapR, trainR, planR] = await Promise.all([
          getReviews(),
          getAttritionRisk(),
          getPromotionReady(),
          getSkillDistribution(),
          getCriticalGaps(),
          getTrainingRecords(),
          getPlans(),
        ])
        setReviews(revR.data?.reviews         || [])
        setAttrition(attrR.data?.attrition_risk || [])
        setPromotion(promoR.data?.promotion_ready || [])
        setSkills(skillR.data?.skill_distribution || [])
        setCritGaps(gapR.data?.critical_gaps   || [])
        setTraining(trainR.data?.training       || [])
        setPlans(planR.data?.plans             || [])
      } catch {
        setError('Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (role === 'Employee') {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" alignItems="center" height="60vh">
          <Typography color="text.secondary">Analytics is available to HR and Managers only.</Typography>
        </Box>
      </AppLayout>
    )
  }

  // ── derived metrics ──────────────────────────────────────────────────────────
  const avgRating        = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0
  const highPerformers   = reviews.filter(r => r.rating >= 4).length
  const trainCompleted   = training.filter(t => t.status === 'Completed').length
  const trainRate        = training.length ? Math.round((trainCompleted / training.length) * 100) : 0
  const plansCompleted   = plans.filter(p => p.status === 'Completed').length
  const plansRate        = plans.length ? Math.round((plansCompleted / plans.length) * 100) : 0

  // dept performance
  const deptMap = {}
  reviews.forEach(r => {
    if (!r.department && !r.employee_name) return
    const dept = r.department || 'Unknown'
    if (!deptMap[dept]) deptMap[dept] = { total: 0, count: 0 }
    deptMap[dept].total += r.rating || 0
    deptMap[dept].count += 1
  })
  const deptStats = Object.entries(deptMap).map(([dept, v]) => ({
    dept,
    avg: (v.total / v.count).toFixed(1),
    count: v.count,
  })).sort((a, b) => b.avg - a.avg)

  return (
    <AppLayout>

      <Box mb={3}>
        <Typography variant="h4" fontWeight={800}>
          Workforce Analytics
        </Typography>
        <Typography color="text.secondary">
          Answers to all 7 business intelligence questions in one view
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>
      ) : (
        <Stack spacing={4}>

          {/* ── Q1: Performance Ratings ──────────────────────────────────────── */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <TrendingUp color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Q1 — Performance Ratings &amp; Review History
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <StatCard label="Total Reviews" value={reviews.length} color="#6366f1" icon={<Groups sx={{ color: '#6366f1', fontSize: 32 }} />} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard label="Average Rating" value={`${avgRating}/5`} color="#f59e0b" sub="Across all employees" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard label="High Performers" value={highPerformers} color="#10b981" sub="Rating ≥ 4/5" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard label="Needs Attention" value={reviews.filter(r => r.rating <= 2).length} color="#ef4444" sub="Rating ≤ 2/5" />
              </Grid>
            </Grid>

            {/* dept breakdown */}
            {deptStats.length > 0 && (
              <Paper elevation={0} sx={{ mt: 2, p: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
                <Typography fontWeight={700} mb={2} fontSize="0.9rem">Performance by Department</Typography>
                <Stack spacing={1.5}>
                  {deptStats.map(d => (
                    <Box key={d.dept}>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography fontSize="0.85rem" fontWeight={600}>{d.dept}</Typography>
                        <Typography fontSize="0.85rem" color="text.secondary">{d.avg}/5 · {d.count} reviews</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(parseFloat(d.avg) / 5) * 100}
                        sx={{
                          height: 8, borderRadius: 4, bgcolor: '#f1f5f9',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: parseFloat(d.avg) >= 4 ? '#10b981' : parseFloat(d.avg) >= 3 ? '#f59e0b' : '#ef4444',
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}
          </Box>

          <Divider />

          {/* ── Q2: Skill Gaps ───────────────────────────────────────────────── */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <BarChart color="warning" />
              <Typography variant="h6" fontWeight={700}>
                Q2 — Critical Skill Gaps in Key Competencies
              </Typography>
              <Chip label={`${critGaps.length} critical`} size="small" color="error" />
            </Stack>

            {critGaps.length === 0 ? (
              <Alert severity="success">No critical skill gaps detected across the organization.</Alert>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#fef2f2' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Skill</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Current</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Target</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Gap</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {critGaps.map((g, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{g.employee_name}</TableCell>
                        <TableCell>{g.skill_name}</TableCell>
                        <TableCell><Chip label={g.department} size="small" variant="outlined" /></TableCell>
                        <TableCell>{g.current_level}/5</TableCell>
                        <TableCell>{g.target_level}/5</TableCell>
                        <TableCell>
                          <Chip label={`-${g.gap}`} size="small" color="error" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          <Divider />

          {/* ── Q3: Promotion Ready ──────────────────────────────────────────── */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <EmojiEvents sx={{ color: '#f59e0b' }} />
              <Typography variant="h6" fontWeight={700}>
                Q3 — High-Potential Employees Ready for Promotion
              </Typography>
              <Chip label={`${promotion.length} ready`} size="small" color="success" />
            </Stack>

            {promotion.length === 0 ? (
              <Alert severity="info">No employees currently meet the promotion criteria (high rating + completed goals).</Alert>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: 3, borderRadius: 3,
                  background: 'linear-gradient(135deg,#166534,#15803d)',
                  color: '#fff',
                }}
              >
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  {promotion.map(e => (
                    <Chip
                      key={e.id}
                      label={`${e.name} · ${e.avg_rating}★ · ${e.department}`}
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }}
                    />
                  ))}
                </Stack>
              </Paper>
            )}
          </Box>

          <Divider />

          {/* ── Q4: Training ─────────────────────────────────────────────────── */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <School color="success" />
              <Typography variant="h6" fontWeight={700}>
                Q4 — Training &amp; Development Activities
              </Typography>
            </Stack>
            <Grid container spacing={2} mb={2}>
              <Grid item xs={6} sm={3}>
                <StatCard label="Total Enrolled" value={training.length} color="#6366f1" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard label="Completed" value={trainCompleted} color="#10b981" sub={`${trainRate}% completion rate`} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard label="In Progress" value={training.filter(t => t.status === 'In Progress').length} color="#f59e0b" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard label="Planned" value={training.filter(t => t.status === 'Planned').length} color="#94a3b8" />
              </Grid>
            </Grid>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #e5e7eb' }}>
              <Typography fontSize="0.85rem" fontWeight={600} mb={1}>Overall Training Completion</Typography>
              <LinearProgress
                variant="determinate"
                value={trainRate}
                sx={{ height: 12, borderRadius: 6, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#10b981', borderRadius: 6 } }}
              />
              <Typography fontSize="0.78rem" color="text.secondary" mt={0.5}>{trainRate}% of all training programs completed</Typography>
            </Paper>
          </Box>

          <Divider />

          {/* ── Q5: Attrition Risk ───────────────────────────────────────────── */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <Warning color="error" />
              <Typography variant="h6" fontWeight={700}>
                Q5 — Employees at Risk of Attrition
              </Typography>
              <Chip
                label={attrition.length === 0 ? 'All Clear' : `${attrition.length} at risk`}
                size="small"
                color={attrition.length === 0 ? 'success' : 'error'}
              />
            </Stack>

            {attrition.length === 0 ? (
              <Alert severity="success">No attrition risk detected. All employee performance trends are healthy.</Alert>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #fecaca' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#fef2f2' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Department</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Avg Rating (Last 3)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Reviews Analysed</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Risk Level</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attrition.map(emp => (
                      <TableRow key={emp.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{emp.name}</TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>
                          <Chip label={`${emp.recent_avg}★`} size="small" color="error" />
                        </TableCell>
                        <TableCell>{emp.review_count}</TableCell>
                        <TableCell>
                          <Chip
                            label={emp.risk_level}
                            size="small"
                            sx={{
                              bgcolor: emp.risk_level === 'High' ? '#dc2626' : '#f59e0b',
                              color: '#fff', fontWeight: 700,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          <Divider />

          {/* ── Q6: Performance vs Goal Correlation ─────────────────────────── */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <Psychology color="secondary" />
              <Typography variant="h6" fontWeight={700}>
                Q6 — Performance Correlation with Development Goals
              </Typography>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <StatCard label="Total Goals" value={plans.length} color="#6366f1" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard label="Completed Goals" value={plansCompleted} color="#10b981" sub={`${plansRate}% completion`} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard label="Overdue Goals" value={plans.filter(p => p.status === 'Overdue').length} color="#ef4444" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard label="In Progress" value={plans.filter(p => p.status === 'In Progress').length} color="#f59e0b" />
              </Grid>
            </Grid>
            <Paper elevation={0} sx={{ mt: 2, p: 3, borderRadius: 3, border: '1px solid #e5e7eb', bgcolor: '#f8fafc' }}>
              <Typography fontSize="0.9rem" color="text.secondary" lineHeight={1.8}>
                Employees with a goal completion rate ≥ 70% are flagged as promotion-ready (see Q3).
                Currently <strong>{promotion.length}</strong> employee(s) meet this threshold.
                Goal completion rate organization-wide: <strong>{plansRate}%</strong>.
                Employees with overdue goals and low review ratings are cross-referenced for attrition risk.
              </Typography>
            </Paper>
          </Box>

          <Divider />

          {/* ── Q7: Skill Distribution ──────────────────────────────────────── */}
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={2}>
              <BarChart color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Q7 — Skill Distribution Across the Organization
              </Typography>
            </Stack>

            {skills.length === 0 ? (
              <Alert severity="info">No competency data available yet.</Alert>
            ) : (
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #e5e7eb' }}>
                <Stack spacing={2}>
                  {skills.map((skill, i) => (
                    <Box key={i}>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={600} fontSize="0.9rem">{skill.skill_name}</Typography>
                          <Chip label={skill.category} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                          <Typography fontSize="0.75rem" color="text.secondary">{skill.employee_count} employees</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Typography fontSize="0.8rem" color="text.secondary">
                            Avg {skill.avg_current}/5
                          </Typography>
                          <Chip
                            label={`Gap: ${skill.avg_gap}`}
                            size="small"
                            color={parseFloat(skill.avg_gap) >= 2 ? 'error' : parseFloat(skill.avg_gap) >= 1 ? 'warning' : 'success'}
                          />
                        </Stack>
                      </Stack>
                      <Box sx={{ position: 'relative', height: 10, borderRadius: 5, bgcolor: '#e2e8f0', overflow: 'hidden' }}>
                        <Box sx={{
                          position: 'absolute', top: 0, left: 0, height: '100%',
                          width: `${(skill.avg_current / 5) * 100}%`,
                          bgcolor: parseFloat(skill.avg_gap) >= 2 ? '#ef4444' : parseFloat(skill.avg_gap) >= 1 ? '#f59e0b' : '#10b981',
                          borderRadius: 5, transition: 'width 0.6s ease',
                        }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            )}
          </Box>

        </Stack>
      )}
    </AppLayout>
  )
}
