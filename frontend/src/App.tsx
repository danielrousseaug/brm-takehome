 
import { Routes, Route, Navigate } from 'react-router-dom'
import { Container, AppBar, Toolbar, Typography, Box, Button, Stack } from '@mui/material'
import { keyframes } from '@mui/system'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import ContractsPage from './pages/ContractsPage'
import CalendarPage from './pages/CalendarPage'

function App() {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path

  const pulse = keyframes`
    0% { box-shadow: 0 0 0 0 rgba(122,162,247,0.6); }
    70% { box-shadow: 0 0 0 8px rgba(122,162,247,0); }
    100% { box-shadow: 0 0 0 0 rgba(122,162,247,0); }
  `

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ minHeight: 64 }}>
          <Container maxWidth="xl" sx={{ display: 'flex', alignItems: 'center' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexGrow: 1 }}>
              <Box sx={{ width: 10, height: 10, bgcolor: 'primary.main', borderRadius: '50%', animation: `${pulse} 2.2s ease-out infinite` }} />
              <Typography variant="h6" component="div" sx={{ letterSpacing: 0.5 }}>
                BRM Renewal Calendar
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/upload"
                variant="text"
                sx={{
                  borderRadius: 999,
                  px: 2,
                  border: '1px solid',
                  borderColor: isActive('/upload') ? 'primary.main' : 'transparent',
                  bgcolor: isActive('/upload') ? 'rgba(122,162,247,0.08)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(122,162,247,0.12)' },
                }}
              >
                Upload
              </Button>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/contracts"
                variant="text"
                sx={{
                  borderRadius: 999,
                  px: 2,
                  border: '1px solid',
                  borderColor: isActive('/contracts') ? 'primary.main' : 'transparent',
                  bgcolor: isActive('/contracts') ? 'rgba(122,162,247,0.08)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(122,162,247,0.12)' },
                }}
              >
                Contracts
              </Button>
              <Button 
                color="inherit" 
                component={RouterLink} 
                to="/calendar"
                variant="text"
                sx={{
                  borderRadius: 999,
                  px: 2,
                  border: '1px solid',
                  borderColor: isActive('/calendar') ? 'primary.main' : 'transparent',
                  bgcolor: isActive('/calendar') ? 'rgba(122,162,247,0.08)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(122,162,247,0.12)' },
                }}
              >
                Calendar
              </Button>
            </Stack>
          </Container>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ mt: 4, pb: 6 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Routes>
      </Container>
    </Box>
  )
}

export default App