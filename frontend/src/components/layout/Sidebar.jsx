import {
  Drawer, Box, Typography, List, ListItemButton,
  ListItemIcon, ListItemText, Divider, Chip, Avatar, Stack
} from '@mui/material'
import {
  Dashboard, People, Assessment, School,
  TrendingUp, Psychology, WorkspacePremium,
  AdminPanelSettings, ManageAccounts, Person
} from '@mui/icons-material'
import { useLocation, useNavigate } from 'react-router-dom'

const drawerWidth = 280

const allMenuItems = [
  { text: 'Dashboard',           icon: <Dashboard />,   path: '/dashboard',    roles: ['HR', 'Manager', 'Employee'] },
  { text: 'Employees',           icon: <People />,      path: '/employees',    roles: ['HR', 'Manager'] },
  { text: 'Performance Reviews', icon: <Assessment />,  path: '/reviews',      roles: ['HR', 'Manager', 'Employee'] },
  { text: 'Competencies',        icon: <Psychology />,  path: '/competencies', roles: ['HR', 'Manager', 'Employee'] },
  { text: 'Training',            icon: <School />,      path: '/training',     roles: ['HR', 'Manager', 'Employee'] },
  { text: 'Development Plans',   icon: <TrendingUp />,  path: '/plans',        roles: ['HR', 'Manager', 'Employee'] },
]

const roleConfig = {
  HR:       { label: 'HR Administrator', color: '#6366f1', bg: 'rgba(99,102,241,0.15)', icon: <AdminPanelSettings sx={{ fontSize: 16 }} /> },
  Manager:  { label: 'Team Manager',     color: '#0ea5e9', bg: 'rgba(14,165,233,0.15)', icon: <ManageAccounts sx={{ fontSize: 16 }} /> },
  Employee: { label: 'Employee',         color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: <Person sx={{ fontSize: 16 }} /> },
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = localStorage.getItem('role') || 'Employee'
  const email = localStorage.getItem('email') || ''
  const initial = email.charAt(0).toUpperCase()
  const menuItems = allMenuItems.filter(item => item.roles.includes(role))
  const rc = roleConfig[role] || roleConfig.Employee

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #020617 0%, #0f172a 50%, #111827 100%)',
          color: '#ffffff',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflowX: 'hidden',
        }
      }}
    >
      {/* LOGO */}
      <Box sx={{ px: 3, pt: 4, pb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(99,102,241,0.4)'
          }}>
            <WorkspacePremium sx={{ fontSize: 22, color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.5px', lineHeight: 1 }}>
              ACME HR
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
              Workforce Intelligence
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 1 }} />

      {/* USER CARD */}
      <Box sx={{ px: 2, py: 2 }}>
        <Box sx={{
          p: 2, borderRadius: 3,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{
              width: 38, height: 38, fontSize: '0.95rem', fontWeight: 700,
              background: `linear-gradient(135deg, ${rc.color}, ${rc.color}99)`
            }}>
              {initial}
            </Avatar>
            <Box sx={{ overflow: 'hidden' }}>
              <Typography variant="body2" fontWeight={700} noWrap sx={{ fontSize: '0.82rem' }}>
                {email}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5} mt={0.3}>
                <Box sx={{ color: rc.color, display: 'flex' }}>{rc.icon}</Box>
                <Typography variant="caption" sx={{ color: rc.color, fontWeight: 600, fontSize: '0.68rem' }}>
                  {rc.label}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* NAV LABEL */}
      <Box sx={{ px: 3, mb: 1 }}>
        <Typography variant="caption" sx={{
          color: 'rgba(255,255,255,0.3)', fontWeight: 700,
          letterSpacing: '1.5px', fontSize: '0.62rem'
        }}>
          NAVIGATION
        </Typography>
      </Box>

      {/* MENU ITEMS */}
      <Box sx={{ px: 2, flex: 1 }}>
        <List disablePadding>
          {menuItems.map((item) => {
            const active = location.pathname === item.path
            return (
              <ListItemButton
                key={item.text}
                onClick={() => navigate(item.path)}
                sx={{
                  mb: 0.5, py: 1.2, px: 2, borderRadius: 2.5,
                  background: active
                    ? 'linear-gradient(90deg, #6366f1, #4f46e5)'
                    : 'transparent',
                  boxShadow: active ? '0 4px 15px rgba(99,102,241,0.35)' : 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: active
                      ? 'linear-gradient(90deg, #6366f1, #4f46e5)'
                      : 'rgba(255,255,255,0.05)',
                    transform: 'translateX(4px)'
                  }
                }}
              >
                <ListItemIcon sx={{
                  color: active ? '#fff' : 'rgba(255,255,255,0.5)',
                  minWidth: 36,
                  '& svg': { fontSize: 20 }
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: active ? 700 : 500,
                    color: active ? '#fff' : 'rgba(255,255,255,0.75)'
                  }}
                />
                {active && (
                  <Box sx={{
                    width: 6, height: 6, borderRadius: '50%',
                    bgcolor: '#fff', opacity: 0.8
                  }} />
                )}
              </ListItemButton>
            )
          })}
        </List>
      </Box>

      {/* BOTTOM BADGE */}
      <Box sx={{ p: 2 }}>
        <Box sx={{
          p: 2.5, borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%',
              bgcolor: '#10b981',
              boxShadow: '0 0 6px #10b981'
            }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: '#a5b4fc', fontSize: '0.72rem' }}>
              AI INSIGHTS ACTIVE
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, fontSize: '0.72rem' }}>
            Workforce analytics powered by AI
          </Typography>
        </Box>
      </Box>
    </Drawer>
  )
}