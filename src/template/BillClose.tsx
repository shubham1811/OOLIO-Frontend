import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ProductListing as DBProduct, Order as DBOrder, CheckoutItem } from '../db/db'
import {
  Box,
  Typography,
  Divider,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
} from '@mui/material'
import { useSnackbar } from '../context/SnackbarContext'

const BillClose = () => {
  const { showSnackbar } = useSnackbar()
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch all orders and products reactively from IndexedDB
  const allOrders = useLiveQuery(() => db.orders.toArray(), [])
  const allProducts = useLiveQuery(() => db.ProductListing.toArray(), [])

  // Memoize the current order for the selected seat
  const currentOrder = useMemo(() => {
    if (!allOrders || selectedSeat === null) return null
    return allOrders.find((order) => order.seatNo === selectedSeat)
  }, [allOrders, selectedSeat])

  // Memoize product data for easy lookup
  const productMap = useMemo(() => {
    if (!allProducts) return new Map<number, DBProduct>()
    return new Map(allProducts.map((p) => [p.pk_key, p]))
  }, [allProducts])

  // Calculate detailed order items and total for the selected seat
  const detailedOrder = useMemo(() => {
    if (!currentOrder || !productMap) return { items: [], total: 0 }

    let total = 0
    const items = currentOrder.items
      .map((item) => {
        const product = productMap.get(item.productId)
        if (!product) return null // Should not happen if data integrity is maintained

        const basePrice = product.ProductPrice // Already a number from DB
        const itemPrice = item.size === 'Small' ? basePrice : basePrice * 2
        const itemTotal = itemPrice * item.quantity
        total += itemTotal

        return {
          ...item,
          productName: product.ProductName,
          unitPrice: itemPrice,
          itemTotal: itemTotal,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    return { items, total }
  }, [currentOrder, productMap])

  const handleSeatChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedSeat(event.target.value as number)
  }

  const handleItemStatusChange = useCallback(
    async (cartItemId: string, newStatus: CheckoutItem['status']) => {
      if (selectedSeat === null || !currentOrder) return

      try {
        const updatedItems = currentOrder.items.map((item) =>
          item.cartItemId === cartItemId ? { ...item, status: newStatus } : item,
        )
        // Construct the object explicitly to ensure the primary key 'seatNo' is present.
        // This prevents the "key path did not yield a value" error if currentOrder is malformed.
        const orderToPut: DBOrder = {
          seatNo: selectedSeat,
          items: updatedItems,
          closed: currentOrder.closed,
        }
        await db.orders.put(orderToPut)
        console.log(`Item ${cartItemId} status updated to ${newStatus} for seat ${selectedSeat}`)

        // Request background sync
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.sync.register('sync-orders')
          })
          console.log('Background sync for orders requested.')
        } else {
          const orderToSync = orderToPut
          // Fallback for browsers that don't support background sync.
          console.log('Background sync not supported, syncing immediately.')
          await fetch(`http://localhost:3000/orders/${selectedSeat}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderToSync),
          })
        }
      } catch (e) {
        if (e instanceof Error) {
          console.error('Failed to update item status:', e)
          setError(e.message)
        } else {
          setError('An unknown error occurred while updating item status.')
        }
      }
    },
    [selectedSeat, currentOrder],
  )

  const handleCloseOrder = useCallback(async () => {
    if (selectedSeat === null || !currentOrder) return

    try {
      await db.orders.update(selectedSeat, { closed: true })
      console.log(`Order for seat ${selectedSeat} marked as closed in IndexedDB.`)
      setSelectedSeat(null) // Clear selected seat after closing
      showSnackbar('Order closed successfully', 'success')

      // Request background sync to remove from server
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.sync.register('sync-orders')
        })
        console.log('Background sync for orders requested after closing.')
      } else {
        // Construct the final state of the order to send to the server
        const closedOrder = { ...currentOrder, closed: true }
        // Fallback for browsers that don't support background sync.
        console.log('Background sync not supported, syncing immediately.')
        await fetch(`http://localhost:3000/orders/${selectedSeat}`, {
          method: 'PUT', // Use PUT to update the order state on the server
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(closedOrder),
        })
      }
    } catch (e) {
      if (e instanceof Error) {
        console.error('Failed to close order:', e)
        setError(e.message)
      } else {
        setError('An unknown error occurred while closing the order.')
      }
    }
  }, [selectedSeat, currentOrder, showSnackbar])

  if (error) {
    return <Typography color="error">Error: {error}</Typography>
  }

  // Only show seats for orders that are not closed
  const availableSeats =
    allOrders
      ?.filter((order) => !order.closed)
      .map((order) => order.seatNo)
      .sort((a, b) => a - b) || []

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Manage Bills
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <FormControl sx={{ minWidth: 150, mb: 3 }}>
        <InputLabel id="select-seat-label">Select Seat</InputLabel>
        <Select
          labelId="select-seat-label"
          value={selectedSeat || ''}
          onChange={handleSeatChange}
          label="Select Seat"
        >
          <MenuItem value="" disabled>
            <em>None</em>
          </MenuItem>
          {availableSeats.length > 0 ? (
            availableSeats.map((seat) => (
              <MenuItem key={seat} value={seat}>
                Seat {seat}
              </MenuItem>
            ))
          ) : (
            <MenuItem disabled>No active orders</MenuItem>
          )}
        </Select>
      </FormControl>

      {selectedSeat !== null && currentOrder ? (
        <Box>
          <Typography variant="h5" sx={{ mt: 2, mb: 2 }}>
            Order for Seat {selectedSeat}
          </Typography>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="order details table">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell>Instructions</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detailedOrder.items.map((item) => (
                  <TableRow key={item.cartItemId}>
                    <TableCell component="th" scope="row">
                      {item.productName}
                    </TableCell>
                    <TableCell align="right">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">{item.size}</TableCell>
                    <TableCell>{item.instructions || '-'}</TableCell>
                    <TableCell>
                      <Select
                        value={item.status}
                        onChange={(e) =>
                          handleItemStatusChange(
                            item.cartItemId,
                            e.target.value as CheckoutItem['status'],
                          )
                        }
                        size="small"
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value="ordered">Ordered</MenuItem>
                        <MenuItem value="in-progress">In Progress</MenuItem>
                        <MenuItem value="made">Made</MenuItem>
                        <MenuItem value="delivered">Delivered</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell align="right">${item.itemTotal.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={6} align="right">
                    <Typography variant="h6">Grand Total:</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6">${detailedOrder.total.toFixed(2)}</Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" color="error" onClick={handleCloseOrder}>
              Close Order for Seat {selectedSeat}
            </Button>
          </Box>
        </Box>
      ) : (
        selectedSeat === null && (
          <Typography variant="body1">Please select a seat to view its order.</Typography>
        )
      )}
      {selectedSeat !== null && !currentOrder && (
        <Typography variant="body1">No active order found for Seat {selectedSeat}.</Typography>
      )}
    </Box>
  )
}

export default BillClose
