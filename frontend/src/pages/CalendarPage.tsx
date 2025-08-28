import { useState, useEffect, useRef } from 'react'
import { Box, Typography, Paper, ToggleButton, ToggleButtonGroup, Popover, Button, Stack, CircularProgress, Skeleton, Tooltip, Chip, Grid, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tabs, Tab, Snackbar, Alert, IconButton } from '@mui/material'
import { Download as DownloadIcon, Event as EventIcon, Upload as UploadIcon, ViewDay, CalendarToday, CalendarViewMonth, Email as EmailIcon, Close as CloseIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import { CalendarEvent } from '../types'
import { contractsApi } from '../services/api'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('dayGridMonth')
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [filterKind, setFilterKind] = useState<string | null>(null)
  const calendarRef = useRef<FullCalendar>(null)
  const navigate = useNavigate()
  // Export dialog state
  const [exportOpen, setExportOpen] = useState(false)
  const [exportTab, setExportTab] = useState<'download' | 'email'>('download')
  const [reminderDays, setReminderDays] = useState<string>('7')
  const [emails, setEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [isEmailing, setIsEmailing] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>(
    { open: false, message: '', severity: 'success' }
  )

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const data = await contractsApi.getCalendarEvents()
      setEvents(data)
    } catch (error) {
      console.error('Failed to load calendar events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEventClick = (info: any) => {
    const event = events.find(e => e.id === info.event.id)
    if (event) {
      setSelectedEvent(event)
      setAnchorEl(info.el)
    }
  }

  const handlePopoverClose = () => {
    setAnchorEl(null)
    setSelectedEvent(null)
  }

  const handleViewChange = (newView: string | null) => {
    if (newView && calendarRef.current) {
      setView(newView)
      calendarRef.current.getApi().changeView(newView)
    }
  }

  const getEventStats = () => {
    const stats = events.reduce((acc, event) => {
      acc[event.kind] = (acc[event.kind] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      notice_deadline: stats.notice_deadline || 0,
      renewal_date: stats.renewal_date || 0,
      expiration: stats.expiration || 0,
      total: events.length
    }
  }

  const getFilteredEvents = () => {
    if (!filterKind) return events
    return events.filter(event => event.kind === filterKind)
  }

  // Removed unused handler to satisfy TS6133 errors

  const getEventColor = (kind: string) => {
    switch (kind) {
      case 'notice_deadline':
        return '#f7768e'
      case 'renewal_date':
        return '#7aa2f7'
      case 'expiration':
        return '#e0af68'
      default:
        return '#6b7280'
    }
  }

  const calendarEvents = getFilteredEvents().map(event => ({
    id: event.id,
    title: event.title,
    date: event.date,
    backgroundColor: getEventColor(event.kind),
    borderColor: getEventColor(event.kind),
    textColor: '#e6edf3',
    extendedProps: {
      kind: event.kind,
      subtitle: event.subtitle,
      contract_id: event.contract_id
    }
  }))

  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="text" width={300} height={48} />
          <Skeleton variant="rounded" width={200} height={32} />
        </Box>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <Stack spacing={2} alignItems="center">
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary">
                Loading calendar events...
              </Typography>
            </Stack>
          </Box>
        </Paper>
      </Box>
    )
  }

  const stats = getEventStats()

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
          Renewal Calendar
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Click a card to filter
        </Typography>

        {/* Stats Cards (clickable filters) */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              onClick={() => setFilterKind(null)}
              sx={{
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                outline: filterKind === null ? '2px solid rgba(122,162,247,0.6)' : 'none',
                transition: 'transform 120ms ease, outline-color 120ms ease',
                '&:hover': { transform: 'translateY(-2px)' }
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CalendarToday color="primary" fontSize="small" />
                  <Typography variant="subtitle2">Total Events</Typography>
                </Stack>
                <Typography variant="h5" sx={{ mt: 1 }}>
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              onClick={() => setFilterKind('notice_deadline')}
              sx={{
                bgcolor: '#dc004e10',
                border: '1px solid #dc004e20',
                cursor: 'pointer',
                outline: filterKind === 'notice_deadline' ? '2px solid #dc004e' : 'none',
                transition: 'transform 120ms ease, outline-color 120ms ease',
                '&:hover': { transform: 'translateY(-2px)' }
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#dc004e', borderRadius: '50%' }} />
                  <Typography variant="subtitle2">Notice Deadlines</Typography>
                </Stack>
                <Typography variant="h5" sx={{ mt: 1, color: '#dc004e' }}>
                  {stats.notice_deadline}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              onClick={() => setFilterKind('renewal_date')}
              sx={{
                bgcolor: '#1976d210',
                border: '1px solid #1976d220',
                cursor: 'pointer',
                outline: filterKind === 'renewal_date' ? '2px solid #1976d2' : 'none',
                transition: 'transform 120ms ease, outline-color 120ms ease',
                '&:hover': { transform: 'translateY(-2px)' }
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#1976d2', borderRadius: '50%' }} />
                  <Typography variant="subtitle2">Renewal Dates</Typography>
                </Stack>
                <Typography variant="h5" sx={{ mt: 1, color: '#1976d2' }}>
                  {stats.renewal_date}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              onClick={() => setFilterKind('expiration')}
              sx={{
                bgcolor: '#ff980010',
                border: '1px solid #ff980020',
                cursor: 'pointer',
                outline: filterKind === 'expiration' ? '2px solid #ff9800' : 'none',
                transition: 'transform 120ms ease, outline-color 120ms ease',
                '&:hover': { transform: 'translateY(-2px)' }
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 12, height: 12, bgcolor: '#ff9800', borderRadius: '50%' }} />
                  <Typography variant="subtitle2">Expirations</Typography>
                </Stack>
                <Typography variant="h5" sx={{ mt: 1, color: '#ff9800' }}>
                  {stats.expiration}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Actions */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end" flexWrap="wrap">
          <Stack direction="row" spacing={2} alignItems="center">
            {events.length > 0 && (
              <Tooltip title="Export options: Download or Email ICS" arrow>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => setExportOpen(true)}
                  size="small"
                >
                  Export
                </Button>
              </Tooltip>
            )}
            
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={(_, newView) => handleViewChange(newView)}
              size="small"
            >
              <ToggleButton value="dayGridMonth">
                <Tooltip title="Month View" arrow>
                  <CalendarViewMonth />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="listYear">
                <Tooltip title="Year List" arrow>
                  <ViewDay />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      </Box>

      {/* Calendar */}
      <Paper sx={{ 
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        '& .fc': {
          '--fc-list-event-hover-bg-color': 'rgba(122,162,247,0.08)'
        },
        '& .fc-toolbar-title': {
          color: 'text.primary',
          fontWeight: 800,
          letterSpacing: 0.4
        },
        '& .fc .fc-button': {
          backgroundColor: 'rgba(17,21,27,0.6)',
          borderColor: 'rgba(122,162,247,0.25)',
          color: '#e6edf3',
          textTransform: 'capitalize',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
        },
        '& .fc .fc-button:hover': { backgroundColor: 'rgba(17,21,27,0.8)' },
        '& .fc .fc-button-primary:not(:disabled).fc-button-active, & .fc .fc-button-primary:focus': {
          backgroundColor: 'rgba(17,21,27,0.9)'
        },
        '& .fc-col-header-cell-cushion': { color: 'text.secondary', fontWeight: 700 },
        // Darken the column header row background
        '& .fc .fc-col-header': { backgroundColor: 'rgba(17,21,27,0.9)' },
        '& .fc .fc-col-header-cell': { backgroundColor: 'rgba(17,21,27,0.9)' },
        '& .fc-theme-standard .fc-scrollgrid .fc-scrollgrid-section-header,\
           & .fc-theme-standard .fc-scrollgrid .fc-scrollgrid-section-header th,\
           & .fc-theme-standard .fc-scrollgrid .fc-scrollgrid-section-header td': {
          backgroundColor: 'rgba(17,21,27,0.9)',
          borderColor: 'divider'
        },
        '& .fc-daygrid-day-number': { color: 'text.secondary', fontWeight: 600 },
        '& .fc-theme-standard .fc-scrollgrid': { borderColor: 'divider' },
        '& .fc-theme-standard td, & .fc-theme-standard th': { borderColor: 'divider' },
        '& .fc-day-today': { backgroundColor: 'rgba(122,162,247,0.08)' },
        // Ensure day grid (month) events show pointer cursor
        '& .fc .fc-daygrid-event, & .fc .fc-event': { cursor: 'pointer' },
        // List view aesthetics
        '& .fc-list-day-cushion': {
          fontSize: '0.95rem',
          fontWeight: 700,
          color: 'text.secondary',
          padding: '8px 12px',
          backgroundColor: 'rgba(17,21,27,0.9)'
        },
        '& .fc-list-day-side-text': {
          fontSize: '0.8rem',
          color: 'text.secondary'
        },
        '& .fc-list-event': {
          borderLeft: '4px solid',
          marginBottom: '2px',
          cursor: 'pointer'
        },
        '& .fc-list-event:hover td': {
          backgroundColor: 'rgba(122,162,247,0.08)'
        },
        '& .fc-list-event .fc-list-event-title a': {
          color: 'text.primary',
          textDecoration: 'none'
        },
        '& .fc-list-event-title': {
          fontWeight: 500
        },
        '& .fc-list-table': {
          border: 'none',
          '& th, & td': {
            borderColor: 'divider'
          }
        },
        // Dark list headers and rows; remove white outlines
        '& .fc .fc-list-sticky .fc-list-day, & .fc .fc-list-sticky .fc-list-day > *': {
          backgroundColor: 'rgba(17,21,27,0.9)',
          border: 'none'
        },
        '& .fc .fc-list-sticky .fc-list-event': {
          backgroundColor: 'rgba(13,16,21,0.9)'
        },
        '& .fc-theme-standard .fc-list': {
          border: 'none'
        }
      }}>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, listPlugin]}
          initialView={view}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          titleFormat={{ year: 'numeric', month: 'long' }}
          events={calendarEvents}
          eventClick={handleEventClick}
          height="auto"
          dayMaxEventRows={3}
          moreLinkClick="popover"
          eventDisplay="block"
          displayEventTime={false}
          noEventsText="No events to display for the selected timeframe"
        />
      </Paper>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handlePopoverClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        {selectedEvent && (
          <Box sx={{ p: 2, maxWidth: 300 }}>
            <Typography variant="h6" gutterBottom>
              {selectedEvent.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {selectedEvent.subtitle}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Date:</strong> {dayjs(selectedEvent.date).format('MMMM DD, YYYY')}
            </Typography>
            <Typography variant="body2">
              <strong>Type:</strong> {selectedEvent.kind.replace('_', ' ')}
            </Typography>
            <Tooltip title="Open original PDF" arrow>
              <Button
                variant="outlined"
                size="small"
                startIcon={<OpenInNewIcon />}
                onClick={() => {
                  const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'
                  const url = `${base}/contracts/${selectedEvent.contract_id}/pdf?download=false`
                  window.open(url, '_blank')
                }}
                sx={{ mt: 1 }}
              >
                Open PDF
              </Button>
            </Tooltip>
          </Box>
        )}
      </Popover>

      {events.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', mt: 3 }}>
          <EventIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="text.secondary">
            No renewal events scheduled
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Upload contracts with renewal dates to see upcoming deadlines and renewal events in your calendar.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              onClick={() => navigate('/upload')}
              startIcon={<UploadIcon />}
            >
              Upload Contracts
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/contracts')}
            >
              View Contracts
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Export Dialog */}
      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Export Calendar
          <IconButton onClick={() => setExportOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Tabs
            value={exportTab}
            onChange={(_, v) => setExportTab(v)}
            sx={{ mb: 2 }}
          >
            <Tab value="download" label="Download" icon={<DownloadIcon fontSize="small" />} iconPosition="start" />
            <Tab value="email" label="Email" icon={<EmailIcon fontSize="small" />} iconPosition="start" />
          </Tabs>

          {exportTab === 'download' && (
            <Box>
              <TextField
                label="Reminder (days before event)"
                type="number"
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                fullWidth
                inputProps={{ min: 0 }}
                helperText="Optional. Leave blank for no reminder."
              />
            </Box>
          )}

          {exportTab === 'email' && (
            <Stack spacing={2}>
              <TextField
                label="Add recipient email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
                    e.preventDefault()
                    const value = emailInput.trim().replace(/,$/, '')
                    if (value && validateEmail(value) && !emails.includes(value)) {
                      setEmails(prev => [...prev, value])
                      setEmailInput('')
                    }
                  }
                }}
                placeholder="Press Enter to add"
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {emails.map((em) => (
                  <Chip key={em} label={em} onDelete={() => setEmails(prev => prev.filter(x => x !== em))} />
                ))}
              </Box>
              <TextField
                label="Reminder (days before event)"
                type="number"
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                fullWidth
                inputProps={{ min: 0 }}
                helperText="Optional. Leave blank for no reminder."
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportOpen(false)}>Close</Button>
          {exportTab === 'download' ? (
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  setIsDownloading(true)
                  const parsed = reminderDays.trim() === '' ? undefined : Number(reminderDays)
                  const blob = await contractsApi.downloadICS(
                    typeof parsed === 'number' && !Number.isNaN(parsed) ? parsed : undefined
                  )
                  const url = window.URL.createObjectURL(new Blob([blob]))
                  const link = document.createElement('a')
                  link.href = url
                  link.download = 'brm-renewal-calendar.ics'
                  document.body.appendChild(link)
                  link.click()
                  link.remove()
                  window.URL.revokeObjectURL(url)
                  setSnackbar({ open: true, message: 'ICS downloaded', severity: 'success' })
                  setExportOpen(false)
                } catch (e) {
                  setSnackbar({ open: true, message: 'Failed to download ICS', severity: 'error' })
                } finally {
                  setIsDownloading(false)
                }
              }}
              disabled={isDownloading}
            >
              {isDownloading ? 'Downloading…' : 'Download ICS'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  if (emails.length === 0) {
                    setSnackbar({ open: true, message: 'Add at least one valid email', severity: 'error' })
                    return
                  }
                  setIsEmailing(true)
                  const parsed = reminderDays.trim() === '' ? undefined : Number(reminderDays)
                  await contractsApi.emailCalendar(emails, typeof parsed === 'number' && !Number.isNaN(parsed) ? parsed : undefined)
                  setSnackbar({ open: true, message: 'Email sent successfully', severity: 'success' })
                  setExportOpen(false)
                } catch (e) {
                  setSnackbar({ open: true, message: 'Failed to send email. Check SMTP config.', severity: 'error' })
                } finally {
                  setIsEmailing(false)
                }
              }}
              disabled={isEmailing}
            >
              {isEmailing ? 'Sending…' : 'Send Email'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

function validateEmail(value: string): boolean {
  // Simple RFC 5322 compliant-enough check
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(value)
}