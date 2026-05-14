import { useState, useEffect } from 'react'

import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  CircularProgress,
  Alert,
  IconButton,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material'

import {
  Add,
  Delete,
  EmojiEvents,
  TrendingUp,
  Edit,
  Psychology,
  CheckCircle
} from '@mui/icons-material'

import AppLayout from '../components/layout/AppLayout'

export default function PlansPage() {

  const [data, setData] = useState([])
  const [promotionReady, setPromotionReady] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [openDialog, setOpenDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)

  const [selectedPlan, setSelectedPlan] = useState(null)

  const role = localStorage.getItem('role')

  const employeeId =
    localStorage.getItem('employee_id')

  const employeeName =
    localStorage.getItem('employee_first_name') ||
    localStorage.getItem('employee_name') ||
    'Employee'

  const [form, setForm] = useState({
    employee_id: employeeId || '',
    goal: '',
    description: '',
    status: 'In Progress',
    target_date: ''
  })

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  })

  const completed = data.filter(
    p => p.status === 'Completed'
  ).length

  const inProgress = data.filter(
    p => p.status === 'In Progress'
  ).length

  const overdue = data.filter(
    p => p.status === 'Overdue'
  ).length

  const completionRate =
    data.length > 0
      ? Math.round((completed / data.length) * 100)
      : 0

  const fetchData = async () => {

    setLoading(true)

    try {

      let url = 'http://localhost:8006/plans'

      if (role === 'Employee') {
        url += `?employee_id=${employeeId}`
      }

      const requests = [
        fetch(url, {
          headers: getHeaders()
        })
      ]

      if (role !== 'Employee') {

        requests.push(
          fetch(
            'http://localhost:8006/plans/promotion-ready',
            {
              headers: getHeaders()
            }
          )
        )
      }

      const responses = await Promise.all(requests)

      const plansJson = await responses[0].json()

      setData(plansJson.plans || [])

      if (responses[1]) {

        const promoJson = await responses[1].json()

        setPromotionReady(
          promoJson.promotion_ready || []
        )
      }

    } catch {

      setError('Failed to load plans')

    } finally {

      setLoading(false)

    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSave = async () => {

    try {

      await fetch(
        'http://localhost:8006/plans',
        {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            ...form,
            employee_id: parseInt(form.employee_id)
          })
        }
      )

      setOpenDialog(false)

      setForm({
        employee_id: employeeId || '',
        goal: '',
        description: '',
        status: 'In Progress',
        target_date: ''
      })

      fetchData()

    } catch {

      setError('Failed to save plan')

    }
  }

  const handleUpdate = async () => {

    try {

      await fetch(
        `http://localhost:8006/plans/${selectedPlan.id}`,
        {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(selectedPlan)
        }
      )

      setEditDialog(false)

      fetchData()

    } catch {

      setError('Failed to update plan')

    }
  }

  const handleDelete = async (id) => {

    if (!window.confirm('Delete this plan?')) return

    try {

      await fetch(
        `http://localhost:8006/plans/${id}`,
        {
          method: 'DELETE',
          headers: getHeaders()
        }
      )

      fetchData()

    } catch {

      setError('Failed to delete')

    }
  }

  const statusColor = {
    'In Progress': 'warning',
    Completed: 'success',
    Overdue: 'error'
  }

  return (

    <AppLayout>

      <Box mb={3}>

        <Typography variant="h4" fontWeight={800}>
          Development Plans
        </Typography>

        <Typography color="text.secondary">

          {
            role === 'Employee'
              ? `Track your career growth, ${employeeName}`
              : 'Track employee goals and promotion readiness'
          }

        </Typography>

      </Box>

      {
        error &&
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      }

      <Stack direction="row" spacing={2} mb={3}>

        <Card elevation={0}
          sx={{
            flex: 1,
            borderRadius: 4,
            border: '1px solid #e5e7eb'
          }}
        >
          <CardContent>

            <Typography variant="body2" color="text.secondary">
              Total Plans
            </Typography>

            <Typography variant="h3" fontWeight={800}>
              {data.length}
            </Typography>

          </CardContent>
        </Card>

        <Card elevation={0}
          sx={{
            flex: 1,
            borderRadius: 4,
            border: '1px solid #e5e7eb',
            borderTop: '4px solid #10b981'
          }}
        >
          <CardContent>

            <Typography variant="body2" color="text.secondary">
              Completed
            </Typography>

            <Typography
              variant="h3"
              fontWeight={800}
              color="success.main"
            >
              {completed}
            </Typography>

          </CardContent>
        </Card>

        <Card elevation={0}
          sx={{
            flex: 1,
            borderRadius: 4,
            border: '1px solid #e5e7eb',
            borderTop: '4px solid #f59e0b'
          }}
        >
          <CardContent>

            <Typography variant="body2" color="text.secondary">
              In Progress
            </Typography>

            <Typography
              variant="h3"
              fontWeight={800}
              color="warning.main"
            >
              {inProgress}
            </Typography>

          </CardContent>
        </Card>

        <Card elevation={0}
          sx={{
            flex: 1,
            borderRadius: 4,
            border: '1px solid #e5e7eb',
            borderTop: '4px solid #6366f1'
          }}
        >
          <CardContent>

            <Typography variant="body2" color="text.secondary">
              Completion Rate
            </Typography>

            <Typography
              variant="h3"
              fontWeight={800}
              color="primary"
            >
              {completionRate}%
            </Typography>

          </CardContent>
        </Card>

      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 4,
          border: '1px solid #e5e7eb'
        }}
      >

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          mb={2}
        >

          <Psychology color="primary" />

          <Typography variant="h6" fontWeight={700}>
            AI Career Insights
          </Typography>

        </Stack>

        <Typography color="text.secondary" mb={2}>

          {
            completionRate >= 70
              ? `${employeeName} is showing strong career progression and consistently tracking development goals.`
              : `${employeeName} should focus on completing active growth plans to improve promotion readiness.`
          }

        </Typography>

        <LinearProgress
          variant="determinate"
          value={completionRate}
          sx={{
            height: 10,
            borderRadius: 10
          }}
        />

      </Paper>

      {
        promotionReady.length > 0 &&
        role !== 'Employee' &&

        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 4,
            background:
              'linear-gradient(135deg,#166534,#15803d)',
            color: '#fff'
          }}
        >

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            mb={2}
          >

            <EmojiEvents />

            <Typography variant="h6" fontWeight={700}>
              Promotion Ready Employees
            </Typography>

          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap">

            {
              promotionReady.map((e) => (

                <Chip
                  key={e.id}
                  label={`${e.name} • ${e.avg_rating}★`}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontWeight: 700
                  }}
                />

              ))
            }

          </Stack>

        </Paper>
      }

      <Stack direction="row" justifyContent="flex-end" mb={2}>

        {
          (role === 'HR' || role === 'Manager') &&

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            Add Plan
          </Button>
        }

      </Stack>

      {
        loading ? (

          <Box display="flex" justifyContent="center" mt={5}>
            <CircularProgress />
          </Box>

        ) : data.length === 0 ? (

          <Paper
            elevation={0}
            sx={{
              p: 8,
              textAlign: 'center',
              borderRadius: 4,
              border: '1px solid #e5e7eb'
            }}
          >

            <TrendingUp
              sx={{
                fontSize: 60,
                color: '#cbd5e1',
                mb: 2
              }}
            />

            <Typography variant="h6" color="text.secondary">
              No development plans found
            </Typography>

          </Paper>

        ) : (

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 4,
              border: '1px solid #e5e7eb'
            }}
          >

            <Table>

              <TableHead sx={{ bgcolor: '#f8fafc' }}>

                <TableRow>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Employee
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Goal
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Department
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Status
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Target Date
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Actions
                  </TableCell>

                </TableRow>

              </TableHead>

              <TableBody>

                {
                  data.map((p) => (

                    <TableRow key={p.id} hover>

                      <TableCell sx={{ fontWeight: 700 }}>

                        {
                          role === 'Employee'
                            ? employeeName
                            : p.employee_name
                        }

                      </TableCell>

                      <TableCell>
                        {p.goal}
                      </TableCell>

                      <TableCell>
                        {p.department}
                      </TableCell>

                      <TableCell>

                        <Chip
                          label={p.status}
                          size="small"
                          color={statusColor[p.status]}
                        />

                      </TableCell>

                      <TableCell>
                        {p.target_date || '—'}
                      </TableCell>

                      <TableCell>

                        <IconButton
                          color="primary"
                          onClick={() => {
                            setSelectedPlan(p)
                            setEditDialog(true)
                          }}
                        >
                          <Edit />
                        </IconButton>

                        {
                          role === 'HR' &&

                          <IconButton
                            color="error"
                            onClick={() => handleDelete(p.id)}
                          >
                            <Delete />
                          </IconButton>
                        }

                      </TableCell>

                    </TableRow>

                  ))
                }

              </TableBody>

            </Table>

          </TableContainer>

        )
      }

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >

        <DialogTitle fontWeight={700}>
          Add Development Plan
        </DialogTitle>

        <DialogContent>

          <Stack spacing={2} mt={1}>

            <TextField
              fullWidth
              label="Employee ID"
              type="number"
              value={form.employee_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  employee_id: e.target.value
                })
              }
            />

            <TextField
              fullWidth
              label="Goal"
              value={form.goal}
              onChange={(e) =>
                setForm({
                  ...form,
                  goal: e.target.value
                })
              }
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value
                })
              }
            />

            <TextField
              fullWidth
              type="date"
              label="Target Date"
              InputLabelProps={{ shrink: true }}
              value={form.target_date}
              onChange={(e) =>
                setForm({
                  ...form,
                  target_date: e.target.value
                })
              }
            />

          </Stack>

        </DialogContent>

        <DialogActions sx={{ p: 3 }}>

          <Button onClick={() => setOpenDialog(false)}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleSave}
          >
            Save
          </Button>

        </DialogActions>

      </Dialog>

      <Dialog
        open={editDialog}
        onClose={() => setEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >

        <DialogTitle fontWeight={700}>
          Update Development Plan
        </DialogTitle>

        <DialogContent>

          {
            selectedPlan &&

            <Stack spacing={2} mt={1}>

              <TextField
                fullWidth
                label="Goal"
                disabled
                value={selectedPlan.goal}
              />

              <TextField
                select
                fullWidth
                label="Status"
                value={selectedPlan.status}
                onChange={(e) =>
                  setSelectedPlan({
                    ...selectedPlan,
                    status: e.target.value
                  })
                }
              >

                <MenuItem value="In Progress">
                  In Progress
                </MenuItem>

                <MenuItem value="Completed">
                  Completed
                </MenuItem>

                <MenuItem value="Overdue">
                  Overdue
                </MenuItem>

              </TextField>

              <TextField
                fullWidth
                type="date"
                label="Target Date"
                InputLabelProps={{ shrink: true }}
                value={selectedPlan.target_date || ''}
                onChange={(e) =>
                  setSelectedPlan({
                    ...selectedPlan,
                    target_date: e.target.value
                  })
                }
              />

            </Stack>
          }

        </DialogContent>

        <DialogActions sx={{ p: 3 }}>

          <Button onClick={() => setEditDialog(false)}>
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleUpdate}
          >
            Update
          </Button>

        </DialogActions>

      </Dialog>

    </AppLayout>
  )
}