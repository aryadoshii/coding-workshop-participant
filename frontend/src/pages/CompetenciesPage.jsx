import { useState, useEffect } from 'react'
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, LinearProgress,
  Grid, Chip, Stack, CircularProgress, Alert, Card,
  CardContent, Tooltip
} from '@mui/material'
import { Warning, Psychology, BarChart } from '@mui/icons-material'
import AppLayout from '../components/layout/AppLayout'
import {
  getCompetencies,
  getSkillDistribution,
  getCriticalGaps
} from '../services/api'

// ── Gap severity helpers ──────────────────────────────────────────────────────
function gapColor(current, target) {
  const gap = target - current
  if (gap >= 3) return 'error'
  if (gap === 2) return 'warning'
  return 'success'
}

function progressColor(current, target) {
  const gap = target - current
  if (gap >= 3) return '#ef4444'   // red — critical
  if (gap === 2) return '#f59e0b'  // amber — moderate
  return '#10b981'                  // green — good
}

export default function CompetenciesPage() {
  const [competencies,    setCompetencies]    = useState([])
  const [distribution,    setDistribution]    = useState([])
  const [criticalGaps,    setCriticalGaps]    = useState([])
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState('')

  const role         = localStorage.getItem('role')
  const employeeName = localStorage.getItem('employee_first_name') ||
                       localStorage.getItem('employee_name') || 'Employee'

  useEffect(() => {
    const load = async () => {
      try {
        const [compRes, distRes] = await Promise.all([
          getCompetencies(),
          getSkillDistribution(),
        ])
        setCompetencies(compRes.data?.competencies || [])
        setDistribution(distRes.data?.skill_distribution || [])

        if (role !== 'Employee') {
          const gapsRes = await getCriticalGaps()
          setCriticalGaps(gapsRes.data?.critical_gaps || [])
        }
      } catch {
        setError('Failed to load competencies')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalSkills   = competencies.length
  const criticalCount = competencies.filter(c => (c.target_level - c.current_level) >= 3).length
  const onTrackCount  = competencies.filter(c => (c.target_level - c.current_level) <= 1).length

  return (
    <AppLayout>

      <Box mb={3}>
        <Typography variant="h4" fontWeight={800}>
          Competencies & Skills
        </Typography>
        <Typography color="text.secondary">
          {role === 'Employee'
            ? `Track your skills and growth, ${employeeName}`
            : 'Monitor skill gaps and capabilities across the organization'}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* SUMMARY CARDS */}
      <Stack direction="row" spacing={2} mb={3}>
        <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: '1px solid #e5e7eb' }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">Total Skills Tracked</Typography>
            <Typography variant="h3" fontWeight={800}>{totalSkills}</Typography>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: '1px solid #e5e7eb', borderTop: '3px solid #ef4444' }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">Critical Gaps</Typography>
            <Typography variant="h3" fontWeight={800} color="error.main">{criticalCount}</Typography>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: '1px solid #e5e7eb', borderTop: '3px solid #10b981' }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">On Track</Typography>
            <Typography variant="h3" fontWeight={800} color="success.main">{onTrackCount}</Typography>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: '1px solid #e5e7eb', borderTop: '3px solid #6366f1' }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">Skill Categories</Typography>
            <Typography variant="h3" fontWeight={800} color="primary.main">
              {[...new Set(competencies.map(c => c.category))].length}
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* CRITICAL GAPS ALERT — HR / Manager only */}
      {role !== 'Employee' && criticalGaps.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3, mb: 3, borderRadius: 4,
            background: 'linear-gradient(135deg,#7f1d1d,#991b1b)',
            color: '#fff',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
            <Warning />
            <Typography variant="h6" fontWeight={700}>
              Critical Skill Gaps Detected
            </Typography>
            <Chip
              label={`${criticalGaps.length} gaps`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700 }}
            />
          </Stack>
          <Stack spacing={1}>
            {criticalGaps.slice(0, 5).map((g, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5, borderRadius: 2,
                  background: 'rgba(255,255,255,0.08)',
                }}
              >
                <Box>
                  <Typography fontWeight={700} sx={{ fontSize: '0.9rem' }}>
                    {g.employee_name} — {g.skill_name}
                  </Typography>
                  <Typography sx={{ opacity: 0.65, fontSize: '0.78rem' }}>
                    {g.department} · {g.category}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ opacity: 0.8, fontSize: '0.8rem' }}>
                    {g.current_level}/5 → {g.target_level}/5
                  </Typography>
                  <Chip
                    label={`Gap: ${g.gap}`}
                    size="small"
                    sx={{ bgcolor: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.7rem' }}
                  />
                </Stack>
              </Box>
            ))}
            {criticalGaps.length > 5 && (
              <Typography sx={{ opacity: 0.6, fontSize: '0.8rem', mt: 0.5 }}>
                + {criticalGaps.length - 5} more critical gaps. See table below.
              </Typography>
            )}
          </Stack>
        </Paper>
      )}

      {/* ORG-WIDE SKILL DISTRIBUTION — HR / Manager */}
      {role !== 'Employee' && distribution.length > 0 && (
        <Paper
          elevation={0}
          sx={{ p: 3, mb: 3, borderRadius: 4, border: '1px solid #e5e7eb' }}
        >
          <Stack direction="row" spacing={1} alignItems="center" mb={2.5}>
            <BarChart color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Org-Wide Skill Distribution
            </Typography>
          </Stack>
          <Stack spacing={2}>
            {distribution.map((skill, i) => (
              <Box key={i}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={600} fontSize="0.9rem">{skill.skill_name}</Typography>
                    <Chip label={skill.category} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                    <Typography fontSize="0.75rem" color="text.secondary">
                      {skill.employee_count} employees
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography fontSize="0.8rem" color="text.secondary">
                      Avg: {skill.avg_current}/5
                    </Typography>
                    <Chip
                      label={`Gap: ${skill.avg_gap}`}
                      size="small"
                      color={parseFloat(skill.avg_gap) >= 2 ? 'error' : parseFloat(skill.avg_gap) >= 1 ? 'warning' : 'success'}
                    />
                  </Stack>
                </Stack>
                <Tooltip title={`Avg Current: ${skill.avg_current} | Avg Target: ${skill.avg_target}`}>
                  <Box sx={{ position: 'relative', height: 10, borderRadius: 5, bgcolor: '#f1f5f9', overflow: 'hidden' }}>
                    {/* target bar (background) */}
                    <Box sx={{
                      position: 'absolute', top: 0, left: 0, height: '100%',
                      width: `${(skill.avg_target / 5) * 100}%`,
                      bgcolor: '#e2e8f0', borderRadius: 5,
                    }} />
                    {/* current bar (foreground) */}
                    <Box sx={{
                      position: 'absolute', top: 0, left: 0, height: '100%',
                      width: `${(skill.avg_current / 5) * 100}%`,
                      bgcolor: parseFloat(skill.avg_gap) >= 2 ? '#ef4444' : parseFloat(skill.avg_gap) >= 1 ? '#f59e0b' : '#10b981',
                      borderRadius: 5,
                      transition: 'width 0.6s ease',
                    }} />
                  </Box>
                </Tooltip>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* INDIVIDUAL SKILLS TABLE */}
      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ borderRadius: 4, border: '1px solid #e5e7eb' }}
        >
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Skill</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Current</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Target</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Gap</TableCell>
                <TableCell sx={{ fontWeight: 700 }} width="25%">Progress</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {competencies.map((skill, i) => {
                const gap      = skill.target_level - skill.current_level
                const pct      = (skill.current_level / skill.target_level) * 100
                const color    = progressColor(skill.current_level, skill.target_level)
                const chipColor = gapColor(skill.current_level, skill.target_level)
                return (
                  <TableRow key={i} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {role === 'Employee' ? employeeName : skill.employee_name}
                    </TableCell>
                    <TableCell>{skill.skill_name}</TableCell>
                    <TableCell>
                      <Chip label={skill.category} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{skill.current_level}/5</TableCell>
                    <TableCell>{skill.target_level}/5</TableCell>
                    <TableCell>
                      <Chip
                        label={gap === 0 ? '✓' : `-${gap}`}
                        size="small"
                        color={chipColor}
                      />
                    </TableCell>
                    <TableCell>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(pct, 100)}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: '#f1f5f9',
                          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 5 },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </AppLayout>
  )
}