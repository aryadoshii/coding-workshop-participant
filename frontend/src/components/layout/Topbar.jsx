import {
  AppBar, Toolbar, Typography, Box,
  Avatar, IconButton, Badge, Stack, Chip, Tooltip
} from '@mui/material'
import {
  NotificationsNone, Logout, TrendingUp
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

const roleConfig = {
  HR:       { label: 'HR Administrator', color: '#6366f1', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
  Manager:  { label: 'Team Manager',     color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' },
  Employee: { label: 'Employee',         color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #34d399)' },
}

const pageTitles = {
  '/dashboard':    { title: 'Workforce Dashboard',     sub: 'Organization-wide analytics and insights' },
  '/employees':    { title: 'Employee Management',     sub: 'Manage workforce records and details' },
  '/reviews':      { title: 'Performance Reviews',     sub: 'Track ratings and review history' },
  '/competencies': { title: 'Competencies & Skills',   sub: 'Identify skill gaps across the organization' },
  '/training':     { title: 'Training Records',        sub: 'Monitor learning and development activities' },
  '/plans':        { title: 'Development Plans',       sub: 'Track goals and promotion readiness' },
}

export default function Topbar() {
  const navigate = useNavigate()
  const email = localStorage.getItem('email') || 'user@acme.com'
  const role = localStorage.getItem('role') || 'Employee'
  const initial = email.charAt(0).toUpperCase()
  const rc = roleConfig[role] || roleConfig.Employee
  const path = window.location.pathname
  const page = pageTitles[path] || { title: 'ACME HR Platform', sub: 'Employee Performance Management' }

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <AppBar position="sticky" elevation={0} sx={{
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #e2e8f0',
      color: '#0f172a'
    }}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: { xs: 2, md: 3 }, py: 1 }}>

        {/* LEFT — Page Title */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{
              width: 4, height: 36, borderRadius: 2,
              background: rc.gradient
            }} />
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                {page.title}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <TrendingUp sx={{ color: '#10b981', fontSize: 14 }} />
                <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.72rem' }}>
                  {page.sub}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>

        {/* RIGHT — Actions */}
        <Stack direction="row" spacing={1.5} alignItems="center">

          {/* Role Badge */}
          <Chip
            label={rc.label}
            size="small"
            sx={{
              background: rc.gradient,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.72rem',
              display: { xs: 'none', md: 'flex' }
            }}
          />

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton sx={{
              bgcolor: '#f1f5f9', width: 38, height: 38,
              '&:hover': { bgcolor: '#e2e8f0' }
            }}>
              <Badge badgeContent={3} color="error">
                <NotificationsNone sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Info */}
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{
            px: 1.5, py: 0.8, borderRadius: 2.5,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            cursor: 'default'
          }}>
            <Avatar sx={{
              width: 34, height: 34,
              fontSize: '0.85rem', fontWeight: 700,
              background: rc.gradient
            }}>
              {initial}
            </Avatar>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Typography fontWeight={700} fontSize="0.82rem" lineHeight={1.2}>
                {email.split('@')[0]}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.68rem' }}>
                {email}
              </Typography>
            </Box>
          </Stack>

          {/* Logout */}
          <Tooltip title="Logout">
            <IconButton onClick={handleLogout} sx={{
              bgcolor: '#fef2f2', color: '#ef4444', width: 38, height: 38,
              '&:hover': { bgcolor: '#fee2e2' }
            }}>
              <Logout sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  )
}