import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
} from '@mui/material'
import { Order } from '../db/db'
import { useSnackbar } from '../context/SnackbarContext'

interface PrintedBill extends Order {
  grandTotal: number
  closedAt: string
  items: Array<{
    productId: number
    productName: string
    quantity: number
    size: string
    unitPrice: number
    itemTotal: number
    instructions?: string
    status: 'ordered' | 'in-progress' | 'made' | 'delivered'
  }>
}

const BillPrint = () => {
  const [bills, setBills] = useState<PrintedBill[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [printingBillId, setPrintingBillId] = useState<string | null>(null)
  const { showSnackbar } = useSnackbar()

  const fetchPrintedBills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // This component fetches from the server, as the server is the source of truth
      // for bills with calculated totals. The `printedBills` table in IndexedDB
      // is mainly for offline archival and might not contain the final calculated prices.
      const response = await fetch('http://localhost:3000/printed-bills')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: PrintedBill[] = await response.json()
      // Sort by most recent first
      data.sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime())
      setBills(data)
    } catch (e) {
      if (e instanceof Error) {
        console.error('Failed to fetch printed bills:', e)
        setError(e.message)
      } else {
        setError('An unknown error occurred while fetching bills.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrintedBills()
  }, [fetchPrintedBills])

  const handlePrint = async (bill: PrintedBill) => {
    const billId = `${bill.seatNo}-${bill.closedAt}`
    setPrintingBillId(billId)
    try {
      // This new endpoint will handle the actual printing using escpos on the server.
      const response = await fetch('http://localhost:3000/print-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bill),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`)
      }
      showSnackbar(result.message, 'success')
    } catch (e) {
      if (e instanceof Error) {
        console.error('Failed to send bill to printer:', e)
        showSnackbar(`Error printing bill: ${e.message}`, 'error')
      } else {
        showSnackbar('An unknown error occurred while printing.', 'error')
      }
    } finally {
      setPrintingBillId(null)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return <Typography color="error">Error: {error}</Typography>
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Printed Bills
      </Typography>
      <Divider sx={{ mb: 3 }} />

      {bills.length === 0 ? (
        <Typography>No printed bills found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="printed bills table">
            <TableHead>
              <TableRow>
                <TableCell>Seat No.</TableCell>
                <TableCell>Date Closed</TableCell>
                <TableCell align="right">Total Amount</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bills.map((bill) => (
                <TableRow key={`${bill.seatNo}-${bill.closedAt}`}>
                  <TableCell component="th" scope="row">
                    {bill.seatNo}
                  </TableCell>
                  <TableCell>{new Date(bill.closedAt).toLocaleString()}</TableCell>
                  <TableCell align="right">${bill.grandTotal.toFixed(2)}</TableCell>
                  <TableCell align="center">
                    <Button
                      variant="contained"
                      onClick={() => handlePrint(bill)}
                      disabled={printingBillId === `${bill.seatNo}-${bill.closedAt}`}
                    >
                      {printingBillId === `${bill.seatNo}-${bill.closedAt}`
                        ? 'Printing...'
                        : 'Print Bill'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}

export default BillPrint
