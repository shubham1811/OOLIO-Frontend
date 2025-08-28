import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './page/Dashboard'
import { SnackbarProvider } from './context/SnackbarContext'

const App = () => {
  return (
    <SnackbarProvider>
      <div style={{ margin: '10px', overflowX: 'hidden' }}>
        <Dashboard />
      </div>
    </SnackbarProvider>
  )
}

export default App
