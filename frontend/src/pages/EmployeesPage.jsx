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
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Card,
  CardContent,
  Avatar,
  Divider
} from '@mui/material'

import {
  Search,
  Add,
  Edit,
  Delete,
  Groups,
  Badge,
  BusinessCenter,
  Person
} from '@mui/icons-material'

import AppLayout from '../components/layout/AppLayout'

export default function EmployeesPage() {

  const role = localStorage.getItem('role')
  const token = localStorage.getItem('token')
  const employeeId = localStorage.getItem('employee_id')
  const employeeName = localStorage.getItem('employee_name')

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }

  const [employees, setEmployees] = useState([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [search, setSearch] = useState('')

  const [openDialog, setOpenDialog] = useState(false)

  const [editEmployee, setEditEmployee] = useState(null)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    designation: '',
    status: 'Active'
  })

  /*
    ANALYTICS
  */

  const activeEmployees = employees.filter(
    e => e.status === 'Active'
  ).length

  const departments = [
    ...new Set(
      employees.map(e => e.department)
    )
  ].length

  /*
    FETCH EMPLOYEES
  */

  const fetchEmployees = async () => {

    setLoading(true)

    try {

      let url = 'http://localhost:8002/employees'

      /*
        MANAGER -> TEAM ONLY
      */

      if (role === 'Manager') {
        url += `?manager_id=${employeeId}`
      }

      /*
        EMPLOYEE -> SELF ONLY
      */

      if (role === 'Employee') {
        url += `/${employeeId}`
      }

      /*
        SEARCH
      */

      if (
        search &&
        role !== 'Employee'
      ) {

        url += url.includes('?')
          ? `&search=${search}`
          : `?search=${search}`
      }

      const response = await fetch(url, {
        headers
      })

      const json = await response.json()

      /*
        SINGLE EMPLOYEE RESPONSE
      */

      if (role === 'Employee') {

        setEmployees(
          json.employee
            ? [json.employee]
            : []
        )

      } else {

        setEmployees(json.employees || [])
      }

    } catch {

      setError('Failed to load employees')

    } finally {

      setLoading(false)

    }
  }

  useEffect(() => {

    fetchEmployees()

  }, [search])

  /*
    SAVE
  */

  const handleSave = async () => {

    try {

      if (editEmployee) {

        await fetch(
          `http://localhost:8002/employees/${editEmployee.id}`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify(form)
          }
        )

      } else {

        await fetch(
          'http://localhost:8002/employees',
          {
            method: 'POST',
            headers,
            body: JSON.stringify(form)
          }
        )
      }

      setOpenDialog(false)

      setEditEmployee(null)

      setForm({
        first_name: '',
        last_name: '',
        email: '',
        department: '',
        designation: '',
        status: 'Active'
      })

      fetchEmployees()

    } catch {

      setError('Failed to save employee')

    }
  }

  /*
    EDIT
  */

  const handleEdit = (emp) => {

    setEditEmployee(emp)

    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      department: emp.department || '',
      designation: emp.designation || '',
      status: emp.status || 'Active'
    })

    setOpenDialog(true)
  }

  /*
    DELETE
  */

  const handleDelete = async (id) => {

    if (!window.confirm('Delete employee?')) return

    try {

      await fetch(
        `http://localhost:8002/employees/${id}`,
        {
          method: 'DELETE',
          headers
        }
      )

      fetchEmployees()

    } catch {

      setError('Failed to delete employee')

    }
  }

  return (

    <AppLayout>

      {/* HEADER */}

      <Box mb={3}>

        <Typography variant="h4" fontWeight={800}>
          {
            role === 'Employee'
              ? 'My Profile'
              : 'Employees'
          }
        </Typography>

        <Typography color="text.secondary">

          {
            role === 'Employee'
              ? `Manage your employee profile, ${employeeName}`
              : 'Manage workforce records and organizational employees'
          }

        </Typography>

      </Box>

      {/* ERROR */}

      {
        error &&
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      }

      {/* ANALYTICS */}

      {
        role !== 'Employee' &&

        <Stack direction="row" spacing={2} mb={3}>

          <Card
            elevation={0}
            sx={{
              flex: 1,
              borderRadius: 3,
              border: '1px solid #e5e7eb'
            }}
          >

            <CardContent>

              <Typography color="text.secondary">
                Total Employees
              </Typography>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
              >

                <Typography
                  variant="h4"
                  fontWeight={800}
                >
                  {employees.length}
                </Typography>

                <Groups color="primary" />

              </Stack>

            </CardContent>

          </Card>

          <Card
            elevation={0}
            sx={{
              flex: 1,
              borderRadius: 3,
              border: '1px solid #e5e7eb',
              borderTop: '3px solid #10b981'
            }}
          >

            <CardContent>

              <Typography color="text.secondary">
                Active Employees
              </Typography>

              <Typography
                variant="h4"
                fontWeight={800}
                color="success.main"
              >
                {activeEmployees}
              </Typography>

            </CardContent>

          </Card>

          <Card
            elevation={0}
            sx={{
              flex: 1,
              borderRadius: 3,
              border: '1px solid #e5e7eb',
              borderTop: '3px solid #6366f1'
            }}
          >

            <CardContent>

              <Typography color="text.secondary">
                Departments
              </Typography>

              <Typography
                variant="h4"
                fontWeight={800}
                color="primary.main"
              >
                {departments}
              </Typography>

            </CardContent>

          </Card>

        </Stack>
      }

      {/* ACTIONS */}

      <Stack
        direction="row"
        justifyContent="space-between"
        mb={2}
      >

        {
          role !== 'Employee' &&

          <TextField
            placeholder="Search employees..."
            size="small"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
            sx={{ width: 320 }}
          />
        }

        {
          role === 'HR' &&

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditEmployee(null)
              setOpenDialog(true)
            }}
          >
            Add Employee
          </Button>
        }

      </Stack>

      {/* LOADING */}

      {
        loading ? (

          <Box
            display="flex"
            justifyContent="center"
            mt={4}
          >
            <CircularProgress />
          </Box>

        ) : (

          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              borderRadius: 3,
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
                    Email
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Department
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Designation
                  </TableCell>

                  <TableCell sx={{ fontWeight: 700 }}>
                    Status
                  </TableCell>

                  {
                    (role === 'HR' || role === 'Manager') &&

                    <TableCell sx={{ fontWeight: 700 }}>
                      Actions
                    </TableCell>
                  }

                </TableRow>

              </TableHead>

              <TableBody>

                {
                  employees.map((emp) => (

                    <TableRow key={emp.id} hover>

                      <TableCell>

                        <Stack
                          direction="row"
                          spacing={2}
                          alignItems="center"
                        >

                          <Avatar
                            sx={{
                              bgcolor: '#6366f1'
                            }}
                          >
                            {emp.first_name?.[0]}
                          </Avatar>

                          <Box>

                            <Typography
                              fontWeight={700}
                            >
                              {emp.first_name} {emp.last_name}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Employee ID: {emp.id}
                            </Typography>

                          </Box>

                        </Stack>

                      </TableCell>

                      <TableCell>
                        {emp.email}
                      </TableCell>

                      <TableCell>

                        <Chip
                          label={emp.department}
                          size="small"
                          variant="outlined"
                        />

                      </TableCell>

                      <TableCell>
                        {emp.designation}
                      </TableCell>

                      <TableCell>

                        <Chip
                          label={emp.status}
                          size="small"
                          color={
                            emp.status === 'Active'
                              ? 'success'
                              : 'default'
                          }
                        />

                      </TableCell>

                      {
                        (role === 'HR' || role === 'Manager') &&

                        <TableCell>

                          <Stack direction="row">

                            <IconButton
                              color="primary"
                              onClick={() => handleEdit(emp)}
                            >
                              <Edit />
                            </IconButton>

                            {
                              role === 'HR' &&

                              <IconButton
                                color="error"
                                onClick={() => handleDelete(emp.id)}
                              >
                                <Delete />
                              </IconButton>
                            }

                          </Stack>

                        </TableCell>
                      }

                    </TableRow>

                  ))
                }

              </TableBody>

            </Table>

          </TableContainer>

        )
      }

      {/* DIALOG */}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >

        <DialogTitle fontWeight={700}>

          {
            editEmployee
              ? 'Edit Employee'
              : 'Add Employee'
          }

        </DialogTitle>

        <DialogContent>

          <Stack spacing={2} mt={1}>

            <Stack direction="row" spacing={2}>

              <TextField
                fullWidth
                label="First Name"
                value={form.first_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    first_name: e.target.value
                  })
                }
              />

              <TextField
                fullWidth
                label="Last Name"
                value={form.last_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    last_name: e.target.value
                  })
                }
              />

            </Stack>

            <TextField
              fullWidth
              label="Email"
              value={form.email}
              onChange={(e) =>
                setForm({
                  ...form,
                  email: e.target.value
                })
              }
            />

            <TextField
              fullWidth
              label="Department"
              value={form.department}
              onChange={(e) =>
                setForm({
                  ...form,
                  department: e.target.value
                })
              }
            />

            <TextField
              fullWidth
              label="Designation"
              value={form.designation}
              onChange={(e) =>
                setForm({
                  ...form,
                  designation: e.target.value
                })
              }
            />

            <TextField
              select
              fullWidth
              label="Status"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value
                })
              }
            >

              <MenuItem value="Active">
                Active
              </MenuItem>

              <MenuItem value="Inactive">
                Inactive
              </MenuItem>

            </TextField>

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
            Save Employee
          </Button>

        </DialogActions>

      </Dialog>

    </AppLayout>
  )
}