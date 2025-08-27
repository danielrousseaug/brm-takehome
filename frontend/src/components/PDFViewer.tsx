import React, { useMemo, useRef, useState, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Button,
  IconButton
} from '@mui/material'
import { OpenInNew, Download, ZoomIn, ZoomOut, NavigateBefore, NavigateNext } from '@mui/icons-material'
import { Contract } from '../types'
import { Document, Page, pdfjs } from 'react-pdf'

// Configure pdf.js worker
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'

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
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [error, setError] = useState<string | null>(null)
  const [foundTypes, setFoundTypes] = useState<string[]>([])

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
    const url = new URL(pdfUrl)
    url.searchParams.set('download', 'true')
    link.href = url.toString()
    link.download = `${contract.display_name || contract.file_name}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenInNewTab = () => {
    const url = new URL(pdfUrl)
    url.searchParams.set('download', 'false')
    window.open(url.toString(), '_blank')
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

  // Prepare regex for highlighting
  const highlightConfigs = useMemo(() => {
    return highlightedClauses
      .filter(c => c.text && c.text.trim().length > 0)
      .map(c => ({
        ...c,
        regex: new RegExp(c.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      }))
  }, [highlightedClauses])
  const containerRef = useRef<HTMLDivElement>(null)
  const escapeHtml = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  const applyHighlights = useCallback(() => {
    if (!containerRef.current || !highlightConfigs.length) return
    const textLayer = containerRef.current.querySelector('.react-pdf__Page__textContent') as HTMLElement | null
    if (!textLayer) return
    const spans = Array.from(textLayer.querySelectorAll('span')) as HTMLSpanElement[]
    if (!spans.length) return

    // Reset spans to original text and capture originals
    const originals: string[] = spans.map((span) => {
      const orig = span.getAttribute('data-orig-text') ?? (span.textContent || '')
      if (!span.getAttribute('data-orig-text')) span.setAttribute('data-orig-text', orig)
      span.textContent = orig
      return orig
    })

    // Build combined text and mapping from global index -> (spanIdx, offset)
    const map: { spanIdx: number; offset: number }[] = []
    let combined = ''
    originals.forEach((txt, spanIdx) => {
      for (let i = 0; i < txt.length; i++) {
        map.push({ spanIdx, offset: i })
        combined += txt[i]
      }
    })
    const combinedLower = combined.toLowerCase()

    type Match = { start: number; end: number; type: string }
    const matches: Match[] = []
    highlightConfigs.forEach(cfg => {
      const q = cfg.text.trim().toLowerCase()
      if (!q) return
      let idx = 0
      while (idx <= combinedLower.length - q.length) {
        const pos = combinedLower.indexOf(q, idx)
        if (pos === -1) break
        matches.push({ start: pos, end: pos + q.length, type: cfg.type })
        idx = pos + q.length
      }
    })

    // Build mask with priority per type
    const rank: Record<string, number> = { notice: 0, date: 1, term: 2, vendor: 3 }
    const maskType: (string | null)[] = new Array(combined.length).fill(null)
    matches.forEach(m => {
      for (let i = m.start; i < m.end; i++) {
        const curr = maskType[i]
        if (curr === null || (rank[m.type] ?? 99) < (rank[curr] ?? 99)) {
          maskType[i] = m.type
        }
      }
    })

    // Track which types actually matched
    const found = new Set<string>()

    // Rebuild each span's HTML with contiguous highlight chunks
    let globalIndex = 0
    spans.forEach((span, spanIdx) => {
      const text = originals[spanIdx]
      if (!text) return
      let html = ''
      let currentType: string | null = null
      let buffer = ''
      for (let j = 0; j < text.length; j++, globalIndex++) {
        const t = maskType[globalIndex]
        const ch = escapeHtml(text[j])
        if (t !== currentType) {
          // flush previous buffer
          if (buffer) {
            if (currentType) {
              const color = currentType === 'notice' ? '#ffebee' : currentType === 'date' ? '#e3f2fd' : currentType === 'term' ? '#fff3e0' : '#f3e5f5'
              const border = currentType === 'notice' ? '#dc004e' : currentType === 'date' ? '#1976d2' : currentType === 'term' ? '#ff9800' : '#9c27b0'
              html += `<span data-hl="1" style="background-color:${color}; border:1px solid ${border}; border-radius:3px; padding:0 2px;">${buffer}</span>`
              found.add(currentType)
            } else {
              html += buffer
            }
            buffer = ''
          }
          currentType = t
        }
        buffer += ch
      }
      // flush last buffer
      if (buffer) {
        if (currentType) {
          const color = currentType === 'notice' ? '#ffebee' : currentType === 'date' ? '#e3f2fd' : currentType === 'term' ? '#fff3e0' : '#f3e5f5'
          const border = currentType === 'notice' ? '#dc004e' : currentType === 'date' ? '#1976d2' : currentType === 'term' ? '#ff9800' : '#9c27b0'
          html += `<span data-hl="1" style="background-color:${color}; border:1px solid ${border}; border-radius:3px; padding:0 2px;">${buffer}</span>`
          found.add(currentType)
        } else {
          html += buffer
        }
      }
      span.innerHTML = html
    })

    setFoundTypes(Array.from(found))
  }, [highlightConfigs])

  return (
    <Box>
      {/* Header & Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
          <Typography variant="h6">
            {contract.display_name || contract.file_name}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton size="small" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}><ZoomOut /></IconButton>
            <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>{Math.round(scale * 100)}%</Typography>
            <IconButton size="small" onClick={() => setScale(s => Math.min(3, s + 0.1))}><ZoomIn /></IconButton>
            <IconButton size="small" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}><NavigateBefore /></IconButton>
            <Typography variant="caption">Page {pageNumber} / {numPages || '?'}</Typography>
            <IconButton size="small" onClick={() => setPageNumber(p => Math.min((numPages || p), p + 1))} disabled={!numPages || pageNumber >= (numPages || 1)}><NavigateNext /></IconButton>
            <Button size="small" onClick={handleDownload} startIcon={<Download />}>Download</Button>
            <Button size="small" onClick={handleOpenInNewTab} startIcon={<OpenInNew />}>Open</Button>
          </Stack>
        </Stack>

        {(foundTypes.length > 0 || highlightedClauses.length > 0) && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">Highlighted:</Typography>
            {Array.from(new Set((foundTypes.length ? foundTypes : highlightedClauses.map(c => c.type)))).map(type => (
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

      {/* Inline PDF Viewer */}
      <Paper sx={{ p: 2 }}>
        <Box ref={containerRef} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Document
            file={pdfUrl}
            loading={(
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Loading PDF...</Typography>
              </Box>
            )}
            onLoadError={(e) => setError((e as any)?.message || 'Failed to load PDF')}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1); setTimeout(applyHighlights, 0) }}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer
              onRenderSuccess={() => setTimeout(applyHighlights, 0)}
            />
          </Document>
        </Box>
      </Paper>
    </Box>
  )
}