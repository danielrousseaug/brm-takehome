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
} from '@mui/material'
import { Upload as UploadIcon, CheckCircle, Error, Description as PdfIcon } from '@mui/icons-material'
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

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'pending':
        return <Chip label="Pending" color="default" size="small" />
      case 'uploading':
        return <Chip label="Uploading..." color="primary" size="small" />
      case 'processing':
        return <Chip label="Processing with AI..." color="warning" size="small" />
      case 'success':
        return <Chip label="Success" color="success" size="small" icon={<CheckCircle />} />
      case 'failed':
        return <Chip label="Failed" color="error" size="small" icon={<Error />} />
      default:
        return null
    }
  }

  const hasUploaded = files.some(f => f.status === 'success' || f.status === 'failed')
  const canUpload = files.some(f => f.status === 'pending') && !isUploading

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Upload Purchase Agreements
      </Typography>
      
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          cursor: 'pointer',
          textAlign: 'center',
          mb: 3,
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop PDFs here' : 'Drag & drop PDF files here, or click to select'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Only PDF files are accepted
        </Typography>
      </Paper>

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
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(fileItem.progress || 0)}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
                {getStatusChip(fileItem.status)}
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