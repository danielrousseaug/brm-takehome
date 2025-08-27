import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Button
} from '@mui/material'
import { OpenInNew, Download } from '@mui/icons-material'
import { Contract } from '../types'

interface PDFViewerProps {
  contract: Contract
  pdfUrl: string
  highlightedClauses?: Array<{
    text: string
    type: 'date' | 'vendor' | 'term' | 'notice'
    page?: number
  }>
}

export default function PDFViewer({ contract, pdfUrl, highlightedClauses = [] }: PDFViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Set loading to false immediately since iframe will handle loading
    setLoading(false)
  }, [pdfUrl])

  const getClauseTypeColor = (type: string) => {
    switch (type) {
      case 'date': return 'primary'
      case 'vendor': return 'secondary' 
      case 'term': return 'warning'
      case 'notice': return 'error'
      default: return 'default'
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `${contract.display_name || contract.file_name}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenInNewTab = () => {
    window.open(pdfUrl, '_blank')
  }

  if (loading) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading PDF...
        </Typography>
      </Paper>
    )
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Failed to load PDF: {error}
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button size="small" onClick={handleDownload} startIcon={<Download />}>
            Download PDF
          </Button>
          <Button size="small" onClick={handleOpenInNewTab} startIcon={<OpenInNew />}>
            Open in New Tab
          </Button>
        </Stack>
      </Alert>
    )
  }

  return (
    <Box>
      {/* PDF Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
          <Typography variant="h6">
            {contract.display_name || contract.file_name}
          </Typography>

          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={handleDownload} startIcon={<Download />}>
              Download
            </Button>
            <Button size="small" onClick={handleOpenInNewTab} startIcon={<OpenInNew />}>
              Open in New Tab
            </Button>
          </Stack>
        </Stack>

        {/* Highlighted Clauses Legend */}
        {highlightedClauses.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">Extracted Data:</Typography>
            {Array.from(new Set(highlightedClauses.map(c => c.type))).map(type => (
              <Chip
                key={type}
                label={type}
                size="small"
                color={getClauseTypeColor(type) as any}
                variant="outlined"
              />
            ))}
          </Stack>
        )}
      </Paper>

      {/* PDF Actions */}
      <Paper sx={{ p: 4, textAlign: 'center', height: '70vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Typography variant="h5" gutterBottom>
          📄 PDF Document Ready
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Choose how you'd like to view this contract document:
        </Typography>
        <Stack direction="row" spacing={3} justifyContent="center" sx={{ mb: 4 }}>
          <Button 
            variant="contained" 
            size="large"
            onClick={handleOpenInNewTab} 
            startIcon={<OpenInNew />}
          >
            Open in New Tab
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            onClick={handleDownload} 
            startIcon={<Download />}
          >
            Download PDF
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          The extracted contract data is shown in the colored chips above.
          <br />
          PDF highlighting is not available in this preview mode.
        </Typography>
      </Paper>
    </Box>
  )
}