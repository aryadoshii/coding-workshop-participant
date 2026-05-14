import { Box } from '@mui/material'

import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout({ children }) {

  return (

    <Box
      sx={{
        display: 'flex',
        width: '100vw',
        minHeight: '100vh',
        background:
          'linear-gradient(to bottom right, #f1f5f9, #e2e8f0)',
        overflow: 'hidden'
      }}
    >

      {/* SIDEBAR */}

      <Sidebar />

      {/* MAIN SECTION */}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          overflow: 'hidden'
        }}
      >

        {/* TOPBAR */}

        <Topbar />

        {/* CONTENT */}

        <Box
          component="main"
          sx={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            width: '100%',
            p: {
              xs: 2,
              md: 3
            }
          }}
        >

          {/* MAIN CARD */}

          <Box
            sx={{
              width: '100%',
              minHeight: '100%',
              borderRadius: 5,
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.45)',
              boxShadow:
                '0px 10px 40px rgba(15,23,42,0.08)',
              p: {
                xs: 2,
                md: 4
              },
              boxSizing: 'border-box'
            }}
          >

            {children}

          </Box>

        </Box>

      </Box>

    </Box>

  )
}