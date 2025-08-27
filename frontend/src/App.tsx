import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Container, AppBar, Toolbar, Typography, Box, Button } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import ContractsPage from './pages/ContractsPage'
import CalendarPage from './pages/CalendarPage'

function App() {
  const location = useLocation()

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            BRM Renewal Calendar
          </Typography>
          <Button 
            color="inherit" 
            component={RouterLink} 
            to="/upload"
            variant={location.pathname === '/upload' ? 'outlined' : 'text'}
          >
            Upload
          </Button>
          <Button 
            color="inherit" 
            component={RouterLink} 
            to="/contracts"
            variant={location.pathname === '/contracts' ? 'outlined' : 'text'}
            sx={{ ml: 2 }}
          >
            Contracts
          </Button>
          <Button 
            color="inherit" 
            component={RouterLink} 
            to="/calendar"
            variant={location.pathname === '/calendar' ? 'outlined' : 'text'}
            sx={{ ml: 2 }}
          >
            Calendar
          </Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ mt: 4 }}>
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