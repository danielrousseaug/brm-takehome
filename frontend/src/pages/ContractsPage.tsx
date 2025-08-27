import React, { useState, useEffect } from 'react'
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
  CircularProgress,
  Skeleton,
  Tooltip,
} from '@mui/material'
import { Edit as EditIcon, CheckCircle, Error, Pending, Delete as DeleteIcon, Clear as ClearIcon, Upload as UploadIcon, Visibility as ViewIcon } from '@mui/icons-material'
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null)
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false)
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  const navigate = useNavigate()

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
      start_date: contract.start_date,
      end_date: contract.end_date,
      renewal_date: contract.renewal_date,
      renewal_term: contract.renewal_term || '',
      notice_period_days: contract.notice_period_days,
    })
  }

  const handleSave = async () => {
    if (!editingContract) return

    try {
      const updatedContract = await contractsApi.updateContract(editingContract.id, editForm)
      setContracts(prev => prev.map(c => 
        c.id === editingContract.id ? updatedContract : c
      ))
      setEditingContract(null)
      setEditForm({})
    } catch (error) {
      console.error('Failed to update contract:', error)
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

  const formatDate = (dateStr: string | null) => {
    return dateStr ? dayjs(dateStr).format('MMM DD, YYYY') : '—'
  }

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
              {contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell>
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
                  <Chip
                    icon={getStatusIcon(contract.extraction_status)}
                    label={contract.extraction_status}
                    size="small"
                    color={contract.extraction_status === 'success' ? 'success' : 
                           contract.extraction_status === 'failed' ? 'error' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="View PDF" arrow>
                      <IconButton onClick={() => setViewingContract(contract)} size="small" color="primary">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit contract details" arrow>
                      <IconButton onClick={() => handleEditClick(contract)} size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete contract" arrow>
                      <IconButton onClick={() => handleDeleteClick(contract)} size="small" color="error">
                        <DeleteIcon />
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
        <DialogTitle>Edit Contract</DialogTitle>
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
                  setEditForm(prev => ({ ...prev, start_date: date?.format('YYYY-MM-DD') || null }))
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="End Date"
                value={editForm.end_date ? dayjs(editForm.end_date) : null}
                onChange={(date: Dayjs | null) => 
                  setEditForm(prev => ({ ...prev, end_date: date?.format('YYYY-MM-DD') || null }))
                }
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="Renewal Date"
                value={editForm.renewal_date ? dayjs(editForm.renewal_date) : null}
                onChange={(date: Dayjs | null) => 
                  setEditForm(prev => ({ ...prev, renewal_date: date?.format('YYYY-MM-DD') || null }))
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
                  notice_period_days: e.target.value ? parseInt(e.target.value) : null 
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingContract(null)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

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