import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import GlobalStyles from '@mui/material/GlobalStyles'
import CssBaseline from '@mui/material/CssBaseline'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import App from './App'

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0e1116',
      paper: '#11151b',
    },
    primary: { main: '#7aa2f7' },
    secondary: { main: '#f7768e' },
    success: { main: '#9ece6a' },
    warning: { main: '#e0af68' },
    error: { main: '#f7768e' },
    divider: 'rgba(148, 163, 184, 0.12)',
    text: {
      primary: '#e6edf3',
      secondary: '#9aa4b2',
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(17, 21, 27, 0.6)',
          backdropFilter: 'saturate(180%) blur(10px)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10 }
      }
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontSize: 12 } }
    },
    MuiTableCell: {
      styleOverrides: { root: { borderColor: 'rgba(148, 163, 184, 0.12)' } }
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <GlobalStyles styles={{
            html: { scrollbarGutter: 'stable both-edges' as any },
            body: { overflowY: 'scroll' }
          }} />
          <App />
        </LocalizationProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)