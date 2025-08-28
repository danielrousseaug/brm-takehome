import React, { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Chip,
  Alert,
  LinearProgress,
  Tooltip,
  Stack
} from '@mui/material'
import { CloudUpload as UploadIcon, Description as PdfIcon } from '@mui/icons-material'
import { keyframes } from '@mui/system'
import { contractsApi } from '../services/api'
import { useNavigate } from 'react-router-dom'

interface FileWithStatus {
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'success' | 'failed'
  id?: number
  progress?: number
}

export default function UploadPage() {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const navigate = useNavigate()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
    },
    onDrop: (acceptedFiles) => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        status: 'pending' as const,
      }))
      setFiles(prev => [...prev, ...newFiles])
    },
  })

  const handleUpload = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    
    // Get files to upload before any state changes
    const filesToUpload = files.filter(f => f.status === 'pending').map(f => f.file)
    
    // Set all pending files to uploading
    setFiles(prev => prev.map(f => 
      f.status === 'pending' ? { ...f, status: 'uploading' as const, progress: 10 } : f
    ))
    
    try {
      console.log(`Uploading ${filesToUpload.length} files:`, filesToUpload.map(f => f.name))
      
      // Simulate progress for uploading phase
      const uploadProgressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => 
          f.status === 'uploading' ? { 
            ...f, 
            progress: Math.min((f.progress || 0) + Math.random() * 15, 80) 
          } : f
        ))
      }, 300)
      
      const response = await contractsApi.uploadContracts(filesToUpload)
      clearInterval(uploadProgressInterval)
      
      console.log('Upload response:', response)
      
      // Set final results immediately
      setFiles(prev => prev.map(fileItem => {
        const result = response.items.find(item => item.file_name === fileItem.file.name)
        if (result) {
          return {
            ...fileItem,
            status: result.extraction_status as 'success' | 'failed',
            id: result.id,
            progress: 100
          }
        }
        return fileItem
      }))
      
    } catch (error) {
      console.error('Upload failed:', error)
      setFiles(prev => prev.map(f => 
        f.status === 'uploading' ? { ...f, status: 'failed' as const, progress: 0 } : f
      ))
    } finally {
      setIsUploading(false)
    }
  }

  // removed unused getStatusChip helper

  const hasUploaded = files.some(f => f.status === 'success' || f.status === 'failed')
  const canUpload = files.some(f => f.status === 'pending') && !isUploading

  return (
    <Box>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 800 }}>
            Upload Purchase Agreements
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Drop your PDFs below and we’ll extract key dates for your renewal calendar.
          </Typography>
        </Box>

        {/* WOW Dropzone Card */}
        {(() => {
          const glow = keyframes`
            0% { transform: translateX(-30%) rotate(15deg); opacity: .25; }
            50% { transform: translateX(30%) rotate(15deg); opacity: .45; }
            100% { transform: translateX(-30%) rotate(15deg); opacity: .25; }
          `
          return (
            <Box sx={{ position: 'relative', mb: 3 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 3,
                  background: isDragActive
                    ? 'linear-gradient(135deg, rgba(122,162,247,.35), rgba(158,206,106,.35))'
                    : 'linear-gradient(135deg, rgba(122,162,247,.2), rgba(158,206,106,.15))',
                  transition: 'background 200ms ease',
                }}
              >
                <Paper
                  {...getRootProps()}
                  sx={{
                    position: 'relative',
                    p: { xs: 5, sm: 8 },
                    borderRadius: 2,
                    cursor: 'pointer',
                    textAlign: 'center',
                    bgcolor: 'rgba(16,20,26,0.9)',
                    border: '1px solid',
                    borderColor: isDragActive ? 'primary.main' : 'divider',
                    overflow: 'hidden',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                >
                  {/* animated beam */}
                  <Box sx={{
                    position: 'absolute',
                    top: -120,
                    left: 0,
                    width: '140%',
                    height: 240,
                    background: 'linear-gradient(90deg, rgba(122,162,247,.18), rgba(158,206,106,.18))',
                    filter: 'blur(24px)',
                    transform: 'translateX(-30%) rotate(15deg)',
                    animation: `${glow} 4s ease-in-out infinite`,
                    pointerEvents: 'none'
                  }} />

                  <input {...getInputProps()} />
                  <UploadIcon sx={{ fontSize: 64, color: isDragActive ? 'primary.main' : 'text.secondary', mb: 2 }} />
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 800 }}>
                    {isDragActive ? 'Drop PDFs to upload' : 'Drag & drop PDFs here'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    or click anywhere to browse
                  </Typography>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    sx={{ borderRadius: 999 }}
                  >
                    Browse files
                  </Button>
                </Paper>
              </Box>
            </Box>
          )
        })()}
      </Stack>

      {files.length > 0 && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Files to upload
          </Typography>
          <List>
            {files.map((fileItem, index) => (
              <ListItem key={index} divider>
                <PdfIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText
                  primary={fileItem.file.name}
                  secondary={
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                      {(fileItem.status === 'uploading' || fileItem.status === 'processing') && (
                        <Box sx={{ mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={fileItem.progress || 0}
                            sx={{
                              height: 8,
                              borderRadius: 999,
                              bgcolor: 'rgba(122,162,247,0.15)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 999,
                                background: 'linear-gradient(90deg, #7aa2f7, #9ece6a)'
                              }
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(fileItem.progress || 0)}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
                <Box sx={{ minWidth: 120, textAlign: 'right' }}>
                  {fileItem.status === 'uploading' && (
                    <Chip label="Uploading…" size="small" sx={{ bgcolor: 'rgba(122,162,247,0.15)', color: 'primary.main' }} />
                  )}
                  {fileItem.status === 'processing' && (
                    <Chip label="Processing…" size="small" sx={{ bgcolor: 'rgba(224,175,104,0.15)', color: '#e0af68' }} />
                  )}
                  {fileItem.status === 'success' && (
                    <Chip label="Success" size="small" color="success" variant="outlined" />
                  )}
                  {fileItem.status === 'failed' && (
                    <Chip label="Failed" size="small" color="error" variant="outlined" />
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <Tooltip 
              title={!canUpload ? 'No files ready to upload' : 'Upload files and extract contract data with AI'} 
              arrow
            >
              <span>
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={!canUpload}
                  startIcon={isUploading ? <CircularProgress size={20} /> : <UploadIcon />}
                >
                  {isUploading ? 'Processing...' : 'Upload Files'}
                </Button>
              </span>
            </Tooltip>
            
            {hasUploaded && (
              <>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/contracts')}
                >
                  View Contracts
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/calendar')}
                >
                  View Calendar
                </Button>
              </>
            )}
          </Box>
        </Paper>
      )}

      {hasUploaded && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Files have been processed. You can now review the extracted data in the Contracts page 
          and edit any fields as needed. The calendar will automatically update with the renewal dates.
        </Alert>
      )}
    </Box>
  )
}