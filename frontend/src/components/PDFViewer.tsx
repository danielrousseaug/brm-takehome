/**
 * PDFViewer: displays the uploaded contract PDF with two modes:
 * 1) an OCR/text layer to enable clause highlighting and searching, and
 * 2) the original canvas-rendered PDF for fidelity.
 * Also provides download/open controls and a simple highlight legend.
 */
import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
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
import dayjs from 'dayjs'
import { contractsApi } from '../services/api'

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
  const [ocrText, setOcrText] = useState<string | null>(null)

  // Unified color palette for overlay and chips
  const HIGHLIGHT_COLORS: Record<string, { fill: string; border: string; chipBg: string; chipBorder: string; text: string }> = {
    notice: { fill: 'rgba(220, 0, 78, 0.24)', border: '#dc004e', chipBg: 'rgba(220, 0, 78, 0.12)', chipBorder: '#dc004e', text: '#0f1115' },
    date:   { fill: 'rgba(25, 118, 210, 0.24)', border: '#1976d2', chipBg: 'rgba(25, 118, 210, 0.12)', chipBorder: '#1976d2', text: '#0f1115' },
    term:   { fill: 'rgba(255, 152, 0, 0.22)', border: '#ff9800', chipBg: 'rgba(255, 152, 0, 0.12)', chipBorder: '#ff9800', text: '#0f1115' },
    vendor: { fill: 'rgba(156, 39, 176, 0.24)', border: '#9c27b0', chipBg: 'rgba(156, 39, 176, 0.12)', chipBorder: '#9c27b0', text: '#0f1115' },
  }

  // (removed unused color mapping helper)

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

  // Build robust highlight targets: support variants for dates and notice phrasing
  const highlightConfigs = useMemo(() => {
    const items: Array<{ text: string; type: string }> = []
    highlightedClauses
      .filter(c => c.text && c.text.trim().length > 0)
      .forEach(c => {
        const base = c.text.trim()
        if (c.type === 'date') {
          const d = dayjs(base)
          if (d.isValid()) {
            const variants = Array.from(new Set([
              d.format('YYYY-MM-DD'),
              d.format('MMMM D, YYYY'),
              d.format('MMM D, YYYY'),
              d.format('D MMMM YYYY'),
              d.format('M/D/YYYY'),
              d.format('MM/DD/YYYY')
            ]))
            variants.forEach(v => items.push({ text: v, type: c.type }))
          } else {
            items.push({ text: base, type: c.type })
          }
        } else if (c.type === 'notice') {
          const n = parseInt(base.replace(/[^0-9]/g, ''), 10)
          if (!Number.isNaN(n)) {
            ;[`${n} days`, `${n} day`, `(${n}) days`, `(${n}) day`].forEach(v => items.push({ text: v, type: c.type }))
          } else {
            items.push({ text: base, type: c.type })
          }
        } else {
          items.push({ text: base, type: c.type })
        }
      })
    return items
  }, [highlightedClauses])
  const ocrContainerRef = useRef<HTMLDivElement>(null)
  const escapeHtml = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  const applyHighlights = useCallback(() => {
    if (!ocrContainerRef.current || !highlightConfigs.length) return
    const textLayer = ocrContainerRef.current.querySelector('.react-pdf__Page__textContent') as HTMLElement | null
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
              const cfg = HIGHLIGHT_COLORS[currentType] || { fill: 'rgba(122,162,247,0.24)', text: '#0f1115' } as any
              // Soft filled highlight with light padding
              html += `<span data-hl="1" style="background-color:${cfg.fill}; color:${cfg.text}; padding:0 1px; border-radius:2px;">${buffer}</span>`
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
          const cfg = HIGHLIGHT_COLORS[currentType] || { fill: 'rgba(122,162,247,0.24)', text: '#0f1115' } as any
          html += `<span data-hl="1" style="background-color:${cfg.fill}; color:${cfg.text}; padding:0 1px; border-radius:2px;">${buffer}</span>`
          found.add(currentType)
        } else {
          html += buffer
        }
      }
      span.innerHTML = html
    })

    setFoundTypes(Array.from(found))
  }, [highlightConfigs])

  // When the OCR-only text layer renders empty (image scan PDFs), fetch OCR text from backend
  // Fetch OCR text if needed (for image-only PDFs)
  const ensureOcrText = useCallback(async () => {
    try {
      if (ocrText !== null) return
      const text = await contractsApi.getContractOCRText(contract.id)
      setOcrText(text || '')
    } catch (e) {
      setOcrText('')
    }
  }, [contract.id, ocrText])

  useEffect(() => {
    // Kick off OCR fetch in the background; harmless if text layer exists
    void ensureOcrText()
  }, [ensureOcrText])

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

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
          <Typography variant="caption" color="text.secondary">Highlighted:</Typography>
          {foundTypes.length > 0 ? (
            Array.from(new Set(foundTypes)).map(type => {
              const cfg = HIGHLIGHT_COLORS[type] || { chipBg: 'rgba(122,162,247,0.12)', chipBorder: '#7aa2f7' } as any
              return (
                <Chip
                  key={type}
                  label={type}
                  size="small"
                  variant="outlined"
                  sx={{ bgcolor: cfg.chipBg, borderColor: cfg.chipBorder, color: '#e6edf3' }}
                />
              )
            })
          ) : (
            <Typography variant="caption" color="text.secondary">none found on this page</Typography>
          )}
        </Stack>
      </Paper>

      {/* Inline PDF Viewer */}
      {/* OCR / Highlight view (text-only layer) */}
      <Paper sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, mb: 2 }}>
        <Box ref={ocrContainerRef} sx={{
          display: 'flex',
          justifyContent: 'center',
          mx: 'auto',
          // Hide the canvas so we only see the text layer
          '& .react-pdf__Page__canvas': { display: 'none !important' },
          // Make OCR text readable
          '& .react-pdf__Page__textContent': {
            color: '#000000',
            mixBlendMode: 'normal',
            paddingLeft: '16px',
            paddingTop: '16px',
            boxSizing: 'content-box'
          },
        }}>
          <Document
            file={pdfUrl}
            loading={(
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <CircularProgress color="primary" />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Loading OCR…</Typography>
              </Box>
            )}
            onLoadError={(e) => setError((e as any)?.message || 'Failed to load PDF')}
            onLoadSuccess={() => setTimeout(applyHighlights, 0)}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer
              onRenderSuccess={() => setTimeout(applyHighlights, 0)}
              renderAnnotationLayer={false}
            />
          </Document>
        </Box>

        {/* Fallback for pure image PDFs: render plain OCR text when no text layer/chunks exist */}
        {ocrText !== null && ocrText.trim().length > 0 && (
          <Box sx={{ mt: 2, px: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>OCR text (fallback)</Typography>
            <Box sx={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 12,
              lineHeight: 1.5,
              color: '#e6edf3',
              bgcolor: 'rgba(148,163,184,0.08)',
              border: '1px dashed',
              borderColor: 'divider',
              p: 1.5,
              borderRadius: 1
            }}>
              {ocrText}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Original PDF (clean) */}
      <Paper sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Original PDF</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mx: 'auto' }}>
          <Document
            file={pdfUrl}
            loading={(
              <Box sx={{ p: 6, textAlign: 'center' }}>
                <CircularProgress color="primary" />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Loading PDF...</Typography>
              </Box>
            )}
            onLoadError={(e) => setError((e as any)?.message || 'Failed to load PDF')}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setPageNumber(1) }}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>
        </Box>
      </Paper>
    </Box>
  )
}