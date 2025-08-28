import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Stack,
  DialogContentText,
  Skeleton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material'
import { EditOutlined as EditIcon, CheckCircle, Error, Pending, DeleteOutline as DeleteIcon, Clear as ClearIcon, Upload as UploadIcon, VisibilityOutlined as ViewIcon } from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs, { Dayjs } from 'dayjs'
import { Contract, ContractUpdate } from '../types'
import { contractsApi } from '../services/api'
import { useNavigate } from 'react-router-dom'
import PDFViewer from '../components/PDFViewer'

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [editForm, setEditForm] = useState<ContractUpdate>({})
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null)
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false)
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean, message: string, severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const navigate = useNavigate()

  type Order = 'asc' | 'desc'
  type OrderBy = 'name' | 'start_date' | 'end_date' | 'renewal_date' | 'notice_period_days' | 'notice_deadline' | 'status' | 'needs_review'
  const [order, setOrder] = useState<Order>('asc')
  const [orderBy, setOrderBy] = useState<OrderBy>('name')
  // removed needs-review filter chip per request

  useEffect(() => {
    loadContracts()
  }, [])

  const loadContracts = async () => {
    try {
      const data = await contractsApi.getContracts()
      setContracts(data)
    } catch (error) {
      console.error('Failed to load contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (contract: Contract) => {
    setEditingContract(contract)
    setEditForm({
      display_name: contract.display_name || '',
      vendor_name: contract.vendor_name || '',
      start_date: contract.start_date || undefined,
      end_date: contract.end_date || undefined,
      renewal_date: contract.renewal_date || undefined,
      renewal_term: contract.renewal_term || '',
      notice_period_days: (contract.notice_period_days ?? undefined),
      needs_review: contract.needs_review ?? false,
      extraction_notes: contract.extraction_notes || '',
      uncertain_fields: contract.uncertain_fields || [],
      candidate_dates: contract.candidate_dates || {},
    })
  }

  const handleSave = async () => {
    if (!editingContract) return

    try {
      setSaving(true)
      const {
        display_name,
        vendor_name,
        start_date,
        end_date,
        renewal_date,
        renewal_term,
        notice_period_days,
        // Only persist minimal review flag; exclude candidate_dates/uncertain_fields from update payload
        needs_review,
      } = editForm as any
      const payload: ContractUpdate = {
        display_name,
        vendor_name,
        start_date,
        end_date,
        renewal_date,
        renewal_term,
        notice_period_days,
        needs_review,
      }
      const updatedContract = await contractsApi.updateContract(editingContract.id, payload)
      setContracts(prev => prev.map(c => 
        c.id === editingContract.id ? updatedContract : c
      ))
      setEditingContract(null)
      setEditForm({})
      setSnackbar({ open: true, message: 'Contract updated', severity: 'success' })
    } catch (error) {
      console.error('Failed to update contract:', error)
      setSnackbar({ open: true, message: 'Failed to save changes', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (contract: Contract) => {
    setContractToDelete(contract)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!contractToDelete) return

    try {
      await contractsApi.deleteContract(contractToDelete.id)
      setContracts(prev => prev.filter(c => c.id !== contractToDelete.id))
      setDeleteDialogOpen(false)
      setContractToDelete(null)
    } catch (error) {
      console.error('Failed to delete contract:', error)
    }
  }

  const handleClearAllConfirm = async () => {
    try {
      await contractsApi.clearAllContracts()
      setContracts([])
      setClearAllDialogOpen(false)
    } catch (error) {
      console.error('Failed to clear contracts:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" />
      case 'failed':
        return <Error color="error" />
      case 'pending':
        return <Pending color="warning" />
      default:
        return null
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'success':
        return {
          color: '#9ece6a',
          bg: 'rgba(158,206,106,0.12)',
          border: 'rgba(158,206,106,0.25)'
        }
      case 'failed':
        return {
          color: '#f7768e',
          bg: 'rgba(247,118,142,0.12)',
          border: 'rgba(247,118,142,0.25)'
        }
      case 'pending':
        return {
          color: '#e0af68',
          bg: 'rgba(224,175,104,0.12)',
          border: 'rgba(224,175,104,0.25)'
        }
      default:
        return {
          color: '#9aa4b2',
          bg: 'rgba(154,164,178,0.12)',
          border: 'rgba(154,164,178,0.25)'
        }
    }
  }

  const getStatusRank = (c: Contract): number => {
    // Match the UI: needs review overrides extraction_status
    if (c.needs_review) return 0
    switch (c.extraction_status) {
      case 'failed':
        return 1
      case 'pending':
        return 2
      case 'success':
        return 3
      default:
        return 4
    }
  }

  const formatDate = (dateStr: string | null) => {
    return dateStr ? dayjs(dateStr).format('MMM DD, YYYY') : '—'
  }

  const getName = (c: Contract) => (c.display_name || c.file_name || '').toLowerCase()

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === 'asc'
    setOrder(isAsc ? 'desc' : 'asc')
    setOrderBy(property)
  }

  const sortedContracts = useMemo(() => {
    const arr = [...contracts]
    const compare = (a: Contract, b: Contract): number => {
      const dir = order === 'asc' ? 1 : -1
      // removed unused 'val'
      switch (orderBy) {
        case 'name': {
          const an = getName(a)
          const bn = getName(b)
          return an.localeCompare(bn) * dir
        }
        case 'start_date':
        case 'end_date':
        case 'renewal_date':
        case 'notice_deadline': {
          const ad = a[orderBy]
          const bd = b[orderBy]
          const at = ad ? dayjs(ad).valueOf() : Number.NEGATIVE_INFINITY
          const bt = bd ? dayjs(bd).valueOf() : Number.NEGATIVE_INFINITY
          return (at - bt) * dir
        }
        case 'notice_period_days': {
          const an = a.notice_period_days ?? -Infinity
          const bn = b.notice_period_days ?? -Infinity
          return (an - bn) * dir
        }
        case 'needs_review': {
          const an = a.needs_review ? 1 : 0
          const bn = b.needs_review ? 1 : 0
          return (an - bn) * dir
        }
        case 'status': {
          const ar = getStatusRank(a)
          const br = getStatusRank(b)
          if (ar !== br) return (ar - br) * dir
          // stable secondary sort by name
          return getName(a).localeCompare(getName(b)) * dir
        }
        default:
          return 0
      }
    }
    return arr.sort(compare)
  }, [contracts, order, orderBy])

  if (loading) {
    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Skeleton variant="text" width={200} height={48} />
          <Skeleton variant="rounded" width={120} height={36} />
        </Box>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Renewal Date</TableCell>
                <TableCell>Notice Period</TableCell>
                <TableCell>Notice Deadline</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[1, 2, 3].map((index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton variant="text" width={150} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="text" width={80} /></TableCell>
                  <TableCell><Skeleton variant="text" width={100} /></TableCell>
                  <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Skeleton variant="circular" width={32} height={32} />
                      <Skeleton variant="circular" width={32} height={32} />
                      <Skeleton variant="circular" width={32} height={32} />
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Contracts
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {contracts.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<ClearIcon />}
              onClick={() => setClearAllDialogOpen(true)}
            >
              Clear All
            </Button>
          )}
        </Stack>
      </Box>

      {contracts.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <UploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="text.secondary">
            No contracts uploaded yet
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Upload your first purchase agreement PDF to get started with contract management and renewal tracking.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/upload')}
            startIcon={<UploadIcon />}
            size="large"
          >
            Upload Contracts
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary' }}>
                  <TableSortLabel
                    active={orderBy === 'name'}
                    direction={orderBy === 'name' ? order : 'asc'}
                    onClick={() => handleRequestSort('name')}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>
                  <TableSortLabel
                    active={orderBy === 'start_date'}
                    direction={orderBy === 'start_date' ? order : 'asc'}
                    onClick={() => handleRequestSort('start_date')}
                  >
                    Start
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>
                  <TableSortLabel
                    active={orderBy === 'end_date'}
                    direction={orderBy === 'end_date' ? order : 'asc'}
                    onClick={() => handleRequestSort('end_date')}
                  >
                    End
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>
                  <TableSortLabel
                    active={orderBy === 'renewal_date'}
                    direction={orderBy === 'renewal_date' ? order : 'asc'}
                    onClick={() => handleRequestSort('renewal_date')}
                  >
                    Renewal
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>
                  <TableSortLabel
                    active={orderBy === 'notice_period_days'}
                    direction={orderBy === 'notice_period_days' ? order : 'asc'}
                    onClick={() => handleRequestSort('notice_period_days')}
                  >
                    Notice
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>
                  <TableSortLabel
                    active={orderBy === 'notice_deadline'}
                    direction={orderBy === 'notice_deadline' ? order : 'asc'}
                    onClick={() => handleRequestSort('notice_deadline')}
                  >
                    Deadline
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleRequestSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedContracts.map((contract) => (
              <TableRow key={contract.id} sx={{ height: 56 }}>
                <TableCell sx={{ overflow: 'hidden' }}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {contract.display_name || contract.file_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {contract.file_name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{formatDate(contract.start_date)}</TableCell>
                <TableCell>{formatDate(contract.end_date)}</TableCell>
                <TableCell>{formatDate(contract.renewal_date)}</TableCell>
                <TableCell>
                  {contract.notice_period_days ? `${contract.notice_period_days} days` : '—'}
                </TableCell>
                <TableCell>
                  <Tooltip title="Last day to provide renewal notice to cancel auto-renewal" arrow placement="top">
                    <Box>
                      {formatDate(contract.notice_deadline)}
                      {contract.notice_deadline && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Last day to cancel before auto-renew
                        </Typography>
                      )}
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {(() => {
                    // Collapse into one status: "needs review" overrides; otherwise "success|pending|failed"
                    if (contract.needs_review) {
                      return (
                        <Chip label="needs review" size="small" color="warning" variant="outlined" />
                      )
                    }
                    const s = getStatusStyle(contract.extraction_status)
                    const label = contract.extraction_status
                    return (
                      <Chip
                        icon={getStatusIcon(contract.extraction_status)}
                        label={label}
                        size="small"
                        variant="outlined"
                        sx={{
                          color: s.color,
                          bgcolor: s.bg,
                          borderColor: s.border,
                          '& .MuiChip-icon': { color: s.color }
                        }}
                      />
                    )
                  })()}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="View PDF" arrow>
                      <IconButton
                        onClick={() => setViewingContract(contract)}
                        size="small"
                        disableRipple
                        disableFocusRipple
                        sx={{
                          color: 'primary.main',
                          bgcolor: 'rgba(122,162,247,0.12)',
                          border: '1px solid',
                          borderColor: 'rgba(122,162,247,0.25)',
                          '&:hover': { bgcolor: 'rgba(122,162,247,0.2)' },
                          width: 32,
                          height: 32
                        }}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit contract details" arrow>
                      <IconButton
                        onClick={() => handleEditClick(contract)}
                        size="small"
                        disableRipple
                        disableFocusRipple
                        sx={{
                          color: '#e0af68',
                          bgcolor: 'rgba(224,175,104,0.12)',
                          border: '1px solid',
                          borderColor: 'rgba(224,175,104,0.25)',
                          '&:hover': { bgcolor: 'rgba(224,175,104,0.2)' },
                          width: 32,
                          height: 32
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete contract" arrow>
                      <IconButton
                        onClick={() => handleDeleteClick(contract)}
                        size="small"
                        disableRipple
                        disableFocusRipple
                        sx={{
                          color: '#f7768e',
                          bgcolor: 'rgba(247,118,142,0.12)',
                          border: '1px solid',
                          borderColor: 'rgba(247,118,142,0.25)',
                          '&:hover': { bgcolor: 'rgba(247,118,142,0.2)' },
                          width: 32,
                          height: 32
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      <Dialog open={!!editingContract} onClose={() => setEditingContract(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Edit Contract
          {editingContract && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000'
                const url = `${base}/contracts/${editingContract.id}/pdf?download=false`
                window.open(url, '_blank')
              }}
            >
              Open PDF
            </Button>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                label="Display Name"
                fullWidth
                value={editForm.display_name || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, display_name: e.target.value }))}
                helperText="Friendly name for this contract"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Vendor Name"
                fullWidth
                value={editForm.vendor_name || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, vendor_name: e.target.value }))}
                helperText="Company providing the service"
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="Start Date"
                value={editForm.start_date ? dayjs(editForm.start_date) : null}
                onChange={(date: Dayjs | null) => 
                  setEditForm(prev => ({ ...prev, start_date: date ? date.format('YYYY-MM-DD') : undefined }))
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="End Date"
                value={editForm.end_date ? dayjs(editForm.end_date) : null}
                onChange={(date: Dayjs | null) => 
                  setEditForm(prev => ({ ...prev, end_date: date ? date.format('YYYY-MM-DD') : undefined }))
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="Renewal Date"
                value={editForm.renewal_date ? dayjs(editForm.renewal_date) : null}
                onChange={(date: Dayjs | null) => 
                  setEditForm(prev => ({ ...prev, renewal_date: date ? date.format('YYYY-MM-DD') : undefined }))
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Notice Period (days)"
                type="number"
                fullWidth
                value={editForm.notice_period_days || ''}
                onChange={(e) => setEditForm(prev => ({ 
                  ...prev, 
                  notice_period_days: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                helperText="Days before renewal to provide notice"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Renewal Term"
                fullWidth
                multiline
                rows={2}
                value={editForm.renewal_term || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, renewal_term: e.target.value }))}
                helperText="Description of renewal terms"
              />
            </Grid>
            {/* Review & Uncertainty */}
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Review & Uncertainty</Typography>
                {editingContract?.extraction_notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Note: {editingContract.extraction_notes}
                  </Typography>
                )}
                <Grid container spacing={2}>
                  {(['start_date','end_date','renewal_date'] as const).map((field) => (
                    <Grid item xs={12} md={4} key={field}>
                      <Typography variant="caption" color="text.secondary">
                        {field.replace('_',' ')} candidates
                      </Typography>
                      <Stack spacing={1} sx={{ mt: 0.5 }}>
                        {(editingContract?.candidate_dates?.[field] || []).map((iso) => (
                          <Button
                            key={iso}
                            size="small"
                            variant={(editForm as any)[field] === iso ? 'contained' : 'outlined'}
                            onClick={() => setEditForm(prev => ({ ...prev, [field]: iso }))}
                          >
                            {dayjs(iso).format('MMM DD, YYYY')}
                          </Button>
                        ))}
                        {(editingContract?.candidate_dates?.[field]?.length ?? 0) === 0 && (
                          <Typography variant="caption" color="text.secondary">No candidates</Typography>
                        )}
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  {(editForm as any).needs_review ? (
                    <Button
                      variant="outlined"
                      color="success"
                      size="small"
                      onClick={() => setEditForm(prev => ({ ...prev, needs_review: false }))}
                    >
                      Mark review completed
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      onClick={() => setEditForm(prev => ({ ...prev, needs_review: true }))}
                    >
                      Mark as needs review
                    </Button>
                  )}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingContract(null)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Contract</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{contractToDelete?.display_name || contractToDelete?.file_name}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={clearAllDialogOpen} onClose={() => setClearAllDialogOpen(false)}>
        <DialogTitle>Clear All Contracts</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete all {contracts.length} contracts?
            This action cannot be undone and will remove all uploaded files.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearAllDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleClearAllConfirm} color="error" variant="contained">Clear All</Button>
        </DialogActions>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog 
        open={!!viewingContract} 
        onClose={() => setViewingContract(null)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          {viewingContract?.display_name || viewingContract?.file_name}
          {viewingContract?.vendor_name && (
            <Typography variant="subtitle2" color="text.secondary">
              {viewingContract.vendor_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ p: 1 }}>
          {viewingContract && (
            <PDFViewer 
              contract={viewingContract}
              pdfUrl={`http://localhost:8000/contracts/${viewingContract.id}/pdf`}
              highlightedClauses={[
                ...(viewingContract.vendor_name ? [{ text: viewingContract.vendor_name, type: 'vendor' as const }] : []),
                ...(viewingContract.start_date ? [{ text: viewingContract.start_date, type: 'date' as const }] : []),
                ...(viewingContract.end_date ? [{ text: viewingContract.end_date, type: 'date' as const }] : []),
                ...(viewingContract.renewal_date ? [{ text: viewingContract.renewal_date, type: 'date' as const }] : []),
                ...(viewingContract.renewal_term ? [{ text: viewingContract.renewal_term, type: 'term' as const }] : []),
                ...(viewingContract.notice_period_days ? [{ text: `${viewingContract.notice_period_days} days`, type: 'notice' as const }] : []),
              ]}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingContract(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}