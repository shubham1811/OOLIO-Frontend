import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './page/Dashboard'
import { SnackbarProvider } from './context/SnackbarContext'

const App = () => {
  return (
    <SnackbarProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </Router>
    </SnackbarProvider>
  )
}

export default App
