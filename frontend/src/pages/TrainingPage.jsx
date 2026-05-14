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
  School,
  CheckCircle,
  Edit,
  Psychology
} from '@mui/icons-material'

import AppLayout from '../components/layout/AppLayout'

export default function TrainingPage() {

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [openDialog, setOpenDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)

  const [selectedTraining, setSelectedTraining] = useState(null)

  const role = localStorage.getItem('role')

  const employeeId =
    localStorage.getItem('employee_id')

  const employeeName =
    localStorage.getItem('employee_first_name') ||
    localStorage.getItem('employee_name') ||
    'Employee'

  const [form, setForm] = useState({
    employee_id: employeeId || '',
    training_name: '',
    provider: '',
    skill_category: '',
    status: 'Planned',
    completed_date: ''
  })

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`
  })

  const completed = data.filter(
    t => t.status === 'Completed'
  ).length

  const inProgress = data.filter(
    t => t.status === 'In Progress'
  ).length

  const planned = data.filter(
    t => t.status === 'Planned'
  ).length

  const completionRate =
    data.length > 0
      ? Math.round((completed / data.length) * 100)
      : 0

  const fetchData = async () => {

    setLoading(true)

    try {

      let url = 'http://localhost:8005/training'

      if (role === 'Employee') {
        url += `?employee_id=${employeeId}`
      }

      const response = await fetch(url, {
        headers: getHeaders()
      })

      const json = await response.json()

      setData(json.training || [])

    } catch {

      setError('Failed to load training data')

    } finally {

      setLoading(false)

    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSave = async () => {

    try {

      await fetch('http://localhost:8005/training', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...form,
          employee_id: parseInt(form.employee_id)
        })
      })

      setOpenDialog(false)

      setForm({
        employee_id: employeeId || '',
        training_name: '',
        provider: '',
        skill_category: '',
        status: 'Planned',
        completed_date: ''
      })

      fetchData()

    } catch {

      setError('Failed to create training')

    }
  }

  const handleUpdate = async () => {

    try {

      await fetch(
        `http://localhost:8005/training/${selectedTraining.id}`,
        {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(selectedTraining)
        }
      )

      setEditDialog(false)

      fetchData()

    } catch {

      setError('Failed to update training')

    }
  }

  const handleDelete = async (id) => {

    if (!window.confirm('Delete this training record?')) return

    try {

      await fetch(
        `http://localhost:8005/training/${id}`,
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
    Completed: 'success',
    'In Progress': 'warning',
    Planned: 'default'
  }

  return (

    <AppLayout>

      <Box mb={3}>

        <Typography variant="h4" fontWeight={800}>
          Training Records
        </Typography>

        <Typography color="text.secondary">

          {
            role === 'Employee'
              ? `Track your learning journey, ${employeeName}`
              : 'Track employee training across the organization'
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
              Total Training
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

            <Stack direction="row" spacing={1} alignItems="center">

              <Typography
                variant="h3"
                fontWeight={800}
                color="success.main"
              >
                {completed}
              </Typography>

              <CheckCircle sx={{ color: '#10b981' }} />

            </Stack>

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
            AI Learning Insights
          </Typography>

        </Stack>

        <Typography color="text.secondary" mb={2}>

          {
            completionRate >= 70
              ? `${employeeName} is consistently completing upskilling programs and showing strong learning growth.`
              : `${employeeName} should prioritize completing active learning programs to improve competency readiness.`
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

      <Stack direction="row" justifyContent="flex-end" mb={2}>

        {
          (role === 'HR' || role === 'Manager') &&

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenDialog(true)}
          >
            Add Training
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

            <School
              sx={{
                fontSize: 60,
                color: '#cbd5e1',
                mb: 2
              }}
            />

            <Typography variant="h6" color="text.secondary">
              No training records found
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
                    Training
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Provider
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Skill Category
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Status
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Completed
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Actions
                  </TableCell>

                </TableRow>

              </TableHead>

              <TableBody>

                {
                  data.map((t) => (

                    <TableRow key={t.id} hover>

                      <TableCell sx={{ fontWeight: 700 }}>

                        {
                          role === 'Employee'
                            ? employeeName
                            : t.employee_name
                        }

                      </TableCell>

                      <TableCell>
                        {t.training_name}
                      </TableCell>

                      <TableCell>
                        {t.provider}
                      </TableCell>

                      <TableCell>

                        <Chip
                          label={t.skill_category}
                          size="small"
                          variant="outlined"
                        />

                      </TableCell>

                      <TableCell>

                        <Chip
                          label={t.status}
                          size="small"
                          color={statusColor[t.status]}
                        />

                      </TableCell>

                      <TableCell>
                        {t.completed_date || '—'}
                      </TableCell>

                      <TableCell>

                        <IconButton
                          color="primary"
                          onClick={() => {
                            setSelectedTraining(t)
                            setEditDialog(true)
                          }}
                        >
                          <Edit />
                        </IconButton>

                        {
                          role === 'HR' &&

                          <IconButton
                            color="error"
                            onClick={() => handleDelete(t.id)}
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
          Add Training Record
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
              label="Training Name"
              value={form.training_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  training_name: e.target.value
                })
              }
            />

            <TextField
              fullWidth
              label="Provider"
              value={form.provider}
              onChange={(e) =>
                setForm({
                  ...form,
                  provider: e.target.value
                })
              }
            />

            <TextField
              fullWidth
              label="Skill Category"
              value={form.skill_category}
              onChange={(e) =>
                setForm({
                  ...form,
                  skill_category: e.target.value
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
          Update Training Progress
        </DialogTitle>

        <DialogContent>

          {
            selectedTraining &&

            <Stack spacing={2} mt={1}>

              <TextField
                fullWidth
                label="Training"
                disabled
                value={selectedTraining.training_name}
              />

              <TextField
                select
                fullWidth
                label="Status"
                value={selectedTraining.status}
                onChange={(e) =>
                  setSelectedTraining({
                    ...selectedTraining,
                    status: e.target.value
                  })
                }
              >

                <MenuItem value="Planned">
                  Planned
                </MenuItem>

                <MenuItem value="In Progress">
                  In Progress
                </MenuItem>

                <MenuItem value="Completed">
                  Completed
                </MenuItem>

              </TextField>

              <TextField
                fullWidth
                type="date"
                label="Completed Date"
                InputLabelProps={{ shrink: true }}
                value={selectedTraining.completed_date || ''}
                onChange={(e) =>
                  setSelectedTraining({
                    ...selectedTraining,
                    completed_date: e.target.value
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