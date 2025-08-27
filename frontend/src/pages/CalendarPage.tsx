import React, { useState, useEffect, useRef } from 'react'
import { Box, Typography, Paper, ToggleButton, ToggleButtonGroup, Popover, Button, Stack, CircularProgress, Skeleton, Tooltip, Chip, Grid, Card, CardContent } from '@mui/material'
import { Download as DownloadIcon, Event as EventIcon, Upload as UploadIcon, ViewDay, ViewWeek, ViewList, CalendarToday, CalendarViewMonth } from '@mui/icons-material'
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

  const handleDownloadICS = () => {
    const link = document.createElement('a')
    link.href = `http://localhost:8000/calendar.ics`
    link.download = 'brm-renewal-calendar.ics'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getEventColor = (kind: string) => {
    switch (kind) {
      case 'notice_deadline':
        return '#dc004e' // Red for urgent notice deadlines
      case 'renewal_date':
        return '#1976d2' // Blue for renewal dates
      case 'expiration':
        return '#ff9800' // Orange for expirations
      default:
        return '#757575'
    }
  }

  const calendarEvents = getFilteredEvents().map(event => ({
    id: event.id,
    title: event.title,
    date: event.date,
    backgroundColor: getEventColor(event.kind),
    borderColor: getEventColor(event.kind),
    textColor: '#ffffff',
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
        
        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#dc004e10', border: '1px solid #dc004e20' }}>
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
            <Card sx={{ bgcolor: '#1976d210', border: '1px solid #1976d220' }}>
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
            <Card sx={{ bgcolor: '#ff980010', border: '1px solid #ff980020' }}>
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
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
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
        </Grid>

        {/* Controls */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
          {/* Filter Chips */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">Filter:</Typography>
            <Chip
              label="All Events"
              onClick={() => setFilterKind(null)}
              color={filterKind === null ? 'primary' : 'default'}
              variant={filterKind === null ? 'filled' : 'outlined'}
              size="small"
            />
            <Chip
              label={`Notice Deadlines (${stats.notice_deadline})`}
              onClick={() => setFilterKind('notice_deadline')}
              color={filterKind === 'notice_deadline' ? 'primary' : 'default'}
              variant={filterKind === 'notice_deadline' ? 'filled' : 'outlined'}
              size="small"
              sx={{ color: filterKind === 'notice_deadline' ? '#fff' : '#dc004e', 
                   bgcolor: filterKind === 'notice_deadline' ? '#dc004e' : 'transparent',
                   borderColor: '#dc004e' }}
            />
            <Chip
              label={`Renewals (${stats.renewal_date})`}
              onClick={() => setFilterKind('renewal_date')}
              color={filterKind === 'renewal_date' ? 'primary' : 'default'}
              variant={filterKind === 'renewal_date' ? 'filled' : 'outlined'}
              size="small"
              sx={{ color: filterKind === 'renewal_date' ? '#fff' : '#1976d2', 
                   bgcolor: filterKind === 'renewal_date' ? '#1976d2' : 'transparent',
                   borderColor: '#1976d2' }}
            />
            <Chip
              label={`Expirations (${stats.expiration})`}
              onClick={() => setFilterKind('expiration')}
              color={filterKind === 'expiration' ? 'primary' : 'default'}
              variant={filterKind === 'expiration' ? 'filled' : 'outlined'}
              size="small"
              sx={{ color: filterKind === 'expiration' ? '#fff' : '#ff9800', 
                   bgcolor: filterKind === 'expiration' ? '#ff9800' : 'transparent',
                   borderColor: '#ff9800' }}
            />
          </Stack>

          {/* View Controls and Actions */}
          <Stack direction="row" spacing={2} alignItems="center">
            {events.length > 0 && (
              <Tooltip title="Download as ICS file to import into Outlook, Google Calendar, etc." arrow>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadICS}
                  size="small"
                >
                  Download
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
              <ToggleButton value="listWeek">
                <Tooltip title="Week List" arrow>
                  <ViewWeek />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="listMonth">
                <Tooltip title="Month List" arrow>
                  <ViewList />
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
        '& .fc-list-day-cushion': {
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'primary.main',
          padding: '12px 16px'
        },
        '& .fc-list-day-side-text': {
          fontSize: '0.875rem',
          color: 'text.secondary'
        },
        '& .fc-list-event': {
          borderLeft: '4px solid',
          marginBottom: '2px'
        },
        '& .fc-list-event-title': {
          fontWeight: 500
        },
        '& .fc-list-table': {
          '& th, & td': {
            borderColor: 'divider'
          }
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
          events={calendarEvents}
          eventClick={handleEventClick}
          height="auto"
          dayMaxEventRows={3}
          moreLinkClick="popover"
          eventDisplay="block"
          displayEventTime={false}
          listDayFormat={{ 
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }}
          listDaySideFormat={false}
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
    </Box>
  )
}