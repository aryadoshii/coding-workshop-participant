import { useState, useEffect } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Stack
} from '@mui/material'

import {
  Security,
  BusinessCenter,
  TrendingUp,
  Psychology
} from '@mui/icons-material'

export default function LoginPage() {

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {

    const token = localStorage.getItem('token')

    if (token) {
      window.location.href = '/dashboard'
    }

  }, [])

  const clearOldSession = () => {

  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('user_id')
  localStorage.removeItem('employee_id')
  localStorage.removeItem('employee_name')
  localStorage.removeItem('employee_first_name')
  localStorage.removeItem('employee_last_name')
  localStorage.removeItem('manager_id')
  localStorage.removeItem('email')
}

  const handleLogin = async () => {

    setLoading(true)
    setError('')

    if (!email || !password) {
      setError('Please enter email and password')
      setLoading(false)
      return
    }

    try {

      clearOldSession()

      /*
        LOGIN REQUEST
      */

      const response = await fetch('http://localhost:8001/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      /*
        STORE AUTH
      */

      localStorage.setItem('token', data.token)
      localStorage.setItem('role', data.user.role)
      localStorage.setItem('user_id', data.user.id)
      localStorage.setItem('email', data.user.email)

      /*
        GET PROFILE
      */

      const meResponse = await fetch('http://localhost:8001/me', {
        headers: {
          Authorization: `Bearer ${data.token}`
        }
      })

      const meData = await meResponse.json()

      /*
        EMPLOYEE DETAILS
      */

      if (meData.employee) {

  const firstName =
    meData.employee.first_name || ''

  const lastName =
    meData.employee.last_name || ''

  localStorage.setItem(
    'employee_id',
    meData.employee.id
  )

  localStorage.setItem(
    'employee_first_name',
    firstName
  )

  localStorage.setItem(
    'employee_last_name',
    lastName
  )

  localStorage.setItem(
    'employee_name',
    `${firstName} ${lastName}`.trim()
  )

  localStorage.setItem(
    'manager_id',
    meData.employee.manager_id || ''
  )
}

      /*
        SUCCESS
      */

      window.location.href = '/dashboard'

    } catch (err) {

      setError(err.message || 'Login failed')

    } finally {

      setLoading(false)

    }
  }

  return (

    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background:
          'linear-gradient(135deg, #020617 0%, #0f172a 40%, #111827 100%)'
      }}
    >

      {/* LEFT SIDE */}

      <Box
        sx={{
          flex: 1,
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          px: 12,
          color: 'white'
        }}
      >

        <Chip
          label="Enterprise Workforce Intelligence"
          sx={{
            width: 'fit-content',
            mb: 4,
            bgcolor: '#4f46e5',
            color: 'white',
            fontWeight: 700
          }}
        />

        <Typography
          variant="h2"
          fontWeight={900}
          sx={{
            mb: 3,
            letterSpacing: '-2px'
          }}
        >
          ACME HR
        </Typography>

        <Typography
          variant="h4"
          sx={{
            mb: 4,
            opacity: 0.95,
            maxWidth: 650,
            lineHeight: 1.5
          }}
        >
          Employee Performance &
          Development Intelligence Platform
        </Typography>

        <Typography
          sx={{
            opacity: 0.72,
            maxWidth: 620,
            fontSize: '1.1rem',
            lineHeight: 1.9
          }}
        >
          AI-powered workforce analytics platform for performance reviews,
          competency tracking, employee growth planning,
          promotion intelligence, and learning management.
        </Typography>

        <Stack direction="row" spacing={2} mt={5} flexWrap="wrap">

          <Chip
            icon={<TrendingUp />}
            label="Performance Analytics"
            color="primary"
          />

          <Chip
            icon={<Psychology />}
            label="AI Insights"
            color="secondary"
          />

          <Chip
            icon={<BusinessCenter />}
            label="Promotion Planning"
            color="success"
          />

          <Chip
            icon={<Security />}
            label="Enterprise Security"
            color="warning"
          />

        </Stack>

      </Box>

      {/* RIGHT LOGIN PANEL */}

      <Box
        sx={{
          width: { xs: '100%', lg: '520px' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4
        }}
      >

        <Card
          sx={{
            width: '100%',
            borderRadius: 6,
            backdropFilter: 'blur(20px)',
            background: 'rgba(255,255,255,0.97)',
            boxShadow: '0 25px 90px rgba(0,0,0,0.4)'
          }}
        >

          <CardContent sx={{ p: 5 }}>

            <Typography
              variant="h4"
              fontWeight={900}
              gutterBottom
            >
              Welcome Back
            </Typography>

            <Typography
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              Sign in to continue to your dashboard
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Email Address"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && handleLogin()
              }
            />

            <TextField
              fullWidth
              type="password"
              label="Password"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && handleLogin()
              }
            />

            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              onClick={handleLogin}
              sx={{
                mt: 4,
                py: 1.7,
                borderRadius: 3,
                fontSize: '1rem',
                fontWeight: 800,
                textTransform: 'none'
              }}
            >

              {
                loading
                  ? <CircularProgress size={24} color="inherit" />
                  : 'Sign In'
              }

            </Button>

            {/* DEMO ACCOUNTS */}

            <Box
              sx={{
                mt: 4,
                p: 3,
                borderRadius: 4,
                background: '#f8fafc',
                border: '1px solid #e2e8f0'
              }}
            >

              <Typography
                variant="subtitle2"
                fontWeight={800}
                gutterBottom
              >
                Demo Accounts
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                Password: Admin@123
              </Typography>

              <Stack spacing={1.5} mt={2}>

                {[
                  {
                    label: 'HR Admin',
                    email: 'admin@acme.com',
                    color: '#6366f1'
                  },
                  {
                    label: 'Manager',
                    email: 'john.mgr@acme.com',
                    color: '#0ea5e9'
                  },
                  {
                    label: 'Employee',
                    email: 'alex.emp@acme.com',
                    color: '#10b981'
                  }
                ].map((acc) => (

                  <Box
                    key={acc.email}
                    onClick={() => {
                      setEmail(acc.email)
                      setPassword('Admin@123')
                    }}
                    sx={{
                      p: 1.7,
                      borderRadius: 3,
                      cursor: 'pointer',
                      border: `1px solid ${acc.color}22`,
                      background: `${acc.color}08`,
                      transition: '0.2s',
                      '&:hover': {
                        background: `${acc.color}15`
                      }
                    }}
                  >

                    <Typography
                      fontWeight={700}
                      sx={{
                        color: acc.color,
                        fontSize: '0.9rem'
                      }}
                    >
                      {acc.label}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {acc.email}
                    </Typography>

                  </Box>

                ))}

              </Stack>

            </Box>

          </CardContent>

        </Card>

      </Box>

    </Box>
  )
}