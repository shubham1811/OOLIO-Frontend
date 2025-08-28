import React from 'react'
import { Snackbar as MUISnackbar } from '@mui/material'
import Alert from '@mui/material/Alert'
import './Snackbar.css'

interface SnackbarProps {
  open: boolean
  message: string
  severity?: 'success' | 'error' | 'warning' | 'info'
  onClose: () => void
}

const Snackbar: React.FC<SnackbarProps> = ({ open, message, severity = 'success', onClose }) => {
  return (
    <MUISnackbar open={open} autoHideDuration={3000} onClose={onClose} className="snackbar">
      <Alert severity={severity} onClose={onClose}>
        {message}
      </Alert>
    </MUISnackbar>
  )
}

export default Snackbar
