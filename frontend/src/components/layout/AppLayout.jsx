import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Box, Drawer, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Typography, Avatar,
  Divider, IconButton, Chip, Stack
} from '@mui/material'
import {
  Dashboard, People, Star, Psychology,
  School, Assignment, BarChart, Logout,
  Menu as MenuIcon
} from '@mui/icons-material'

const DRAWER_WIDTH = 260

const navItems = [
  { label: 'Dashboard',    path: '/dashboard',    icon: <Dashboard /> },
  { label: 'Employees',    path: '/employees',    icon: <People /> },
  { label: 'Reviews',      path: '/reviews',      icon: <Star /> },
  { label: 'Competencies', path: '/competencies', icon: <Psychology /> },
  { label: 'Training',     path: '/training',     icon: <School /> },
  { label: 'Plans',        path: '/plans',        icon: <Assignment /> },
  { label: 'Analytics',    path: '/analytics',    icon: <BarChart />, hrOnly: false },
]

export default function AppLayout({ children }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const role  = localStorage.getItem('role')  || 'Employee'
  const name  = localStorage.getItem('employee_name') || 'User'
  const email = localStorage.getItem('email') || ''

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const roleColor = {
    HR: '#6366f1', Manager: '#0ea5e9', Employee: '#10b981'
  }[role] || '#64748b'

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0f172a',
        color: '#fff',
      }}
    >
      {/* LOGO */}
      <Box sx={{ p: 3, pb: 2 }}>
        <Typography fontWeight={900} fontSize="1.3rem" sx={{ color: '#fff', letterSpacing: '-0.5px' }}>
          ACME HR
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', mt: 0.25 }}>
          Workforce Intelligence Platform
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* NAV */}
      <List sx={{ px: 1.5, pt: 1.5, flex: 1 }}>
        {navItems
          .filter(item => {
            // hide Analytics from Employee role
            if (item.path === '/analytics' && role === 'Employee') return false
            return true
          })
          .map((item) => {
            const active = location.pathname === item.path
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => { navigate(item.path); setMobileOpen(false) }}
                  sx={{
                    borderRadius: 2.5,
                    px: 2,
                    py: 1.1,
                    bgcolor: active ? 'rgba(99,102,241,0.18)' : 'transparent',
                    border: active ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: active ? '#818cf8' : 'rgba(255,255,255,0.45)' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.88rem',
                      fontWeight: active ? 700 : 500,
                      color: active ? '#fff' : 'rgba(255,255,255,0.6)',
                    }}
                  />
                  {item.path === '/analytics' && (
                    <Chip label="New" size="small" sx={{ bgcolor: '#6366f1', color: '#fff', height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                  )}
                </ListItemButton>
              </ListItem>
            )
          })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

      {/* USER */}
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: 36, height: 36, bgcolor: roleColor, fontSize: '0.85rem', fontWeight: 700 }}>
            {name[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </Typography>
            <Chip
              label={role}
              size="small"
              sx={{ bgcolor: roleColor + '22', color: roleColor, fontWeight: 700, fontSize: '0.65rem', height: 18, mt: 0.25 }}
            />
          </Box>
          <IconButton onClick={handleLogout} sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#f87171' } }}>
            <Logout fontSize="small" />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>

      {/* MOBILE TOGGLE */}
      <IconButton
        sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1300, display: { sm: 'none' } }}
        onClick={() => setMobileOpen(true)}
      >
        <MenuIcon />
      </IconButton>

      {/* MOBILE DRAWER */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawer}
      </Drawer>

      {/* DESKTOP DRAWER */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none' },
        }}
        open
      >
        {drawer}
      </Drawer>

      {/* MAIN CONTENT */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 2, sm: 4 },
          ml: { xs: 0, sm: 0 },
        }}
      >
        {children}
      </Box>

    </Box>
  )
}
