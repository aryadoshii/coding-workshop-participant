import { useState, useEffect } from 'react'
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Stack, CircularProgress, Alert,
  IconButton, Card, CardContent, Tooltip
} from '@mui/material'
import {
  Add, Delete, Edit, Star, Warning,
  Psychology, AutoAwesome
} from '@mui/icons-material'
import AppLayout from '../components/layout/AppLayout'
import {
  getReviews, createReview, updateReview,
  deleteReview, getAttritionRisk, generateAiSummary
} from '../services/api'

export default function ReviewsPage() {
  const [reviews,       setReviews]       = useState([])
  const [attritionRisk, setAttritionRisk] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')

  const [openDialog,    setOpenDialog]    = useState(false)
  const [editDialog,    setEditDialog]    = useState(false)
  const [selectedReview, setSelectedReview] = useState(null)
  const [aiLoading,     setAiLoading]     = useState(null) // review id being summarised

  const role       = localStorage.getItem('role')
  const employeeId = localStorage.getItem('employee_id')
  const employeeName = localStorage.getItem('employee_first_name') ||
                       localStorage.getItem('employee_name') || 'Employee'

  const [form, setForm] = useState({
    employee_id: employeeId || '',
    reviewer_id: '',
    rating: '',
    review_period: '',
    strengths: '',
    improvements: '',
    comments: '',
    review_date: new Date().toISOString().split('T')[0],
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const revRes = await getReviews()
      setReviews(revRes.data?.reviews || [])

      if (role !== 'Employee') {
        const riskRes = await getAttritionRisk()
        setAttritionRisk(riskRes.data?.attrition_risk || [])
      }
    } catch {
      setError('Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const avg = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : 0

  const handleSave = async () => {
    try {
      await createReview({ ...form, employee_id: parseInt(form.employee_id), rating: parseFloat(form.rating) })
      setOpenDialog(false)
      setForm({ employee_id: employeeId || '', reviewer_id: '', rating: '', review_period: '', strengths: '', improvements: '', comments: '', review_date: new Date().toISOString().split('T')[0] })
      fetchData()
    } catch {
      setError('Failed to save review')
    }
  }

  const handleUpdate = async () => {
    try {
      await updateReview(selectedReview.id, selectedReview)
      setEditDialog(false)
      fetchData()
    } catch {
      setError('Failed to update review')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return
    try {
      await deleteReview(id)
      fetchData()
    } catch {
      setError('Failed to delete review')
    }
  }

  const handleAiSummary = async (review) => {
    setAiLoading(review.id)
    try {
      const res = await generateAiSummary(review.id)
      const summary = res.data?.ai_summary || ''
      setReviews(prev => prev.map(r => r.id === review.id ? { ...r, ai_summary: summary } : r))
    } catch {
      setError('Failed to generate AI summary')
    } finally {
      setAiLoading(null)
    }
  }

  const ratingColor = (r) => {
    if (r >= 4) return 'success'
    if (r >= 3) return 'warning'
    return 'error'
  }

  return (
    <AppLayout>

      <Box mb={3}>
        <Typography variant="h4" fontWeight={800}>Performance Reviews</Typography>
        <Typography color="text.secondary">
          {role === 'Employee'
            ? `Your performance history, ${employeeName}`
            : 'Manage and analyse employee performance reviews'}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* SUMMARY CARDS */}
      <Stack direction="row" spacing={2} mb={3}>
        <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: '1px solid #e5e7eb' }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">Total Reviews</Typography>
            <Typography variant="h3" fontWeight={800}>{reviews.length}</Typography>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: '1px solid #e5e7eb', borderTop: '3px solid #f59e0b' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center">
              <Star sx={{ color: '#f59e0b', fontSize: 20 }} />
              <Typography color="text.secondary" variant="body2">Average Rating</Typography>
            </Stack>
            <Typography variant="h3" fontWeight={800} color="warning.main">{avg}</Typography>
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: '1px solid #e5e7eb', borderTop: '3px solid #10b981' }}>
          <CardContent>
            <Typography color="text.secondary" variant="body2">High Performers (4+)</Typography>
            <Typography variant="h3" fontWeight={800} color="success.main">
              {reviews.filter(r => r.rating >= 4).length}
            </Typography>
          </CardContent>
        </Card>

        {role !== 'Employee' && (
          <Card elevation={0} sx={{ flex: 1, borderRadius: 3, border: '1px solid #e5e7eb', borderTop: '3px solid #ef4444' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <Warning sx={{ color: '#ef4444', fontSize: 20 }} />
                <Typography color="text.secondary" variant="body2">Attrition Risk</Typography>
              </Stack>
              <Typography variant="h3" fontWeight={800} color="error.main">
                {attritionRisk.length}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Stack>

      {/* ATTRITION RISK BANNER */}
      {role !== 'Employee' && attritionRisk.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 3, mb: 3, borderRadius: 4,
            background: 'linear-gradient(135deg,#7f1d1d,#991b1b)',
            color: '#fff',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
            <Warning />
            <Typography fontWeight={700} variant="h6">
              ⚠️ Attrition Risk Alert
            </Typography>
          </Stack>
          <Typography sx={{ opacity: 0.85, mb: 2, fontSize: '0.9rem' }}>
            The following employees have an average rating below 3.0 in their last 2+ reviews and are flagged as attrition risk.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            {attritionRisk.map(emp => (
              <Chip
                key={emp.id}
                label={`${emp.name} · ${emp.recent_avg}★ · ${emp.risk_level} Risk`}
                sx={{
                  bgcolor: emp.risk_level === 'High' ? '#dc2626' : '#f59e0b',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                }}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* ACTIONS */}
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        {role !== 'Employee' && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            Add Review
          </Button>
        )}
      </Stack>

      {/* TABLE */}
      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #e5e7eb' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Reviewer</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Period</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Rating</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Strengths</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>AI Summary</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {role === 'Employee' ? employeeName : review.employee_name}
                  </TableCell>
                  <TableCell>{review.reviewer_name || '—'}</TableCell>
                  <TableCell>{review.review_period}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${review.rating}/5`}
                      size="small"
                      color={ratingColor(review.rating)}
                      icon={<Star sx={{ fontSize: '14px !important' }} />}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {review.strengths || '—'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>
                    {review.ai_summary ? (
                      <Tooltip title={review.ai_summary}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            color: '#6366f1',
                            fontStyle: 'italic',
                            cursor: 'pointer',
                          }}
                        >
                          {review.ai_summary}
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Button
                        size="small"
                        startIcon={aiLoading === review.id
                          ? <CircularProgress size={12} />
                          : <AutoAwesome sx={{ fontSize: 14 }} />
                        }
                        onClick={() => handleAiSummary(review)}
                        disabled={aiLoading === review.id}
                        sx={{ fontSize: '0.72rem', textTransform: 'none' }}
                      >
                        Generate
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row">
                      {role !== 'Employee' && (
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => { setSelectedReview(review); setEditDialog(true) }}
                        >
                          <Edit />
                        </IconButton>
                      )}
                      {role === 'HR' && (
                        <IconButton color="error" size="small" onClick={() => handleDelete(review.id)}>
                          <Delete />
                        </IconButton>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ADD DIALOG */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Add Performance Review</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="Employee ID" type="number" value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
            <TextField fullWidth label="Reviewer ID" type="number" value={form.reviewer_id}
              onChange={(e) => setForm({ ...form, reviewer_id: e.target.value })} />
            <TextField select fullWidth label="Rating" value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              {[1, 2, 3, 4, 5].map(n => (
                <MenuItem key={n} value={n}>{n} — {['Poor', 'Below Average', 'Average', 'Good', 'Excellent'][n - 1]}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth label="Review Period (e.g. Q1 2025)" value={form.review_period}
              onChange={(e) => setForm({ ...form, review_period: e.target.value })} />
            <TextField fullWidth multiline rows={2} label="Strengths" value={form.strengths}
              onChange={(e) => setForm({ ...form, strengths: e.target.value })} />
            <TextField fullWidth multiline rows={2} label="Areas for Improvement" value={form.improvements}
              onChange={(e) => setForm({ ...form, improvements: e.target.value })} />
            <TextField fullWidth multiline rows={2} label="Comments" value={form.comments}
              onChange={(e) => setForm({ ...form, comments: e.target.value })} />
            <TextField fullWidth type="date" label="Review Date" InputLabelProps={{ shrink: true }}
              value={form.review_date}
              onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save Review</Button>
        </DialogActions>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Edit Review</DialogTitle>
        <DialogContent>
          {selectedReview && (
            <Stack spacing={2} mt={1}>
              <TextField select fullWidth label="Rating" value={selectedReview.rating}
                onChange={(e) => setSelectedReview({ ...selectedReview, rating: e.target.value })}>
                {[1, 2, 3, 4, 5].map(n => (
                  <MenuItem key={n} value={n}>{n} — {['Poor', 'Below Average', 'Average', 'Good', 'Excellent'][n - 1]}</MenuItem>
                ))}
              </TextField>
              <TextField fullWidth multiline rows={2} label="Strengths" value={selectedReview.strengths || ''}
                onChange={(e) => setSelectedReview({ ...selectedReview, strengths: e.target.value })} />
              <TextField fullWidth multiline rows={2} label="Improvements" value={selectedReview.improvements || ''}
                onChange={(e) => setSelectedReview({ ...selectedReview, improvements: e.target.value })} />
              <TextField fullWidth multiline rows={2} label="Comments" value={selectedReview.comments || ''}
                onChange={(e) => setSelectedReview({ ...selectedReview, comments: e.target.value })} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdate}>Update</Button>
        </DialogActions>
      </Dialog>

    </AppLayout>
  )
}
