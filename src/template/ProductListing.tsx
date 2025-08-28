import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ProductListing as DBProduct, CheckoutItem } from '../db/db'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import ProductCard from '../organisms/ProductCard'
import configData from '../configuration/ProductPageConfig.json'
import CheckoutModal from '../organisms/CheckoutModal'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import { register as registerServiceWorker } from '../serviceWorkerRegistration'
import { useSnackbar } from '../context/SnackbarContext'

// Define a type for our product data for better type safety
interface Product {
  pk_key: number
  ProductName: string
  ProductPrice: string
  ProductType: string
  ProductImage: string
  ShowInListing: boolean
  FoodType: string
}

const ProductListing = () => {
  const [selectedTab, setSelectedTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [checkoutModal, setCheckoutModal] = useState(false)
  const [seatNo, setSeatNo] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue)
  }

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value)
  }

  const { showSnackbar } = useSnackbar()

  useEffect(() => {
    registerServiceWorker()

    const initializeProducts = async () => {
      try {
        // Check if data already exists in IndexedDB
        const productCount = await db.ProductListing.count()
        if (productCount > 0) {
          console.log('Products already exist in IndexedDB. Skipping API call.')
          return
        }

        // If DB is empty, fetch from the API
        console.log('IndexedDB is empty, fetching products from API...')
        const response = await fetch('http://localhost:3000/ProductListingItems')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const apiProducts: Product[] = await response.json()

        // Transform API data to match the database schema (string price to number)
        const dbProducts: DBProduct[] = apiProducts.map((p) => ({
          ...p,
          ProductPrice: parseFloat(p.ProductPrice.replace('$', '')),
        }))

        // Populate the database since it's empty
        await db.ProductListing.bulkAdd(dbProducts)
        console.log('Products fetched from API and stored in IndexedDB.')
      } catch (e) {
        if (e instanceof Error) {
          console.error('Failed to fetch products and update database:', e)
          setError(e.message)
        } else {
          setError('An unknown error occurred while fetching products.')
        }
      }
    }

    initializeProducts()
  }, []) // Empty dependency array ensures this runs only once on mount

  // Sync server orders to IndexedDB on initial load
  useEffect(() => {
    const syncOrdersToDb = async () => {
      try {
        const response = await fetch('http://localhost:3000/orders')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        // The server returns an object where keys are seat numbers and values are the full order objects.
        const serverOrders: Record<
          string,
          { seatNo: number; items: CheckoutItem[]; closed: boolean }
        > = await response.json()

        const dbOrders = Object.values(serverOrders)

        // Use a transaction to clear and bulk-put, ensuring consistency
        await db.transaction('rw', db.orders, async () => {
          await db.orders.clear()
          if (dbOrders.length > 0) {
            await db.orders.bulkPut(dbOrders)
          }
        })
        console.log('Orders synced from server to IndexedDB.')
      } catch (e) {
        if (e instanceof Error) {
          console.error('Failed to sync orders to IndexedDB:', e)
          setError(e.message)
        } else {
          setError('An unknown error occurred while syncing orders.')
        }
      }
    }
    syncOrdersToDb()
  }, [])

  // Read products reactively from the database using dexie-react-hooks
  const dbProducts = useLiveQuery(() => db.ProductListing.toArray(), [])

  // Read orders reactively from the database
  const liveOrders = useLiveQuery(() => db.orders.toArray(), [])

  // Memoize the transformation from DB format (number price) back to component format (string price)
  // This ensures child components receive the data in the format they expect.
  const products: Product[] | undefined = useMemo(() => {
    return dbProducts?.map((p) => ({
      ...p,
      ProductPrice: `$${p.ProductPrice?.toFixed(2)}`,
    }))
  }, [dbProducts])

  // Memoize the transformation of orders from Dexie's array format to the Record format used by the component
  const ordersBySeat: Record<number, CheckoutItem[]> = useMemo(() => {
    if (!liveOrders) return {}
    return liveOrders.reduce(
      (acc, order) => {
        acc[order.seatNo] = order.items
        return acc
      },
      {} as Record<number, CheckoutItem[]>,
    )
  }, [liveOrders])

  const productCategories = useMemo(() => {
    if (!products) return []
    // Create a sorted, unique list of categories from the products
    const categories = [...new Set(products.map((p) => p.ProductType.toLowerCase()))].sort()
    // Add "All" to the beginning
    return ['all', ...categories]
  }, [products])

  const filteredProducts = useMemo(() => {
    if (!products) return []
    return products
      .filter((product) => product.ShowInListing)
      .filter((product) => {
        if (selectedTab === 'all') return true
        return product.ProductType.toLowerCase() === selectedTab
      })
      .filter((product) => product.ProductName.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [products, selectedTab, searchTerm])

  const checkoutDataHandle = useCallback(
    async (newItem: {
      productId: number
      quantity: number
      size: string
      instructions: string
    }) => {
      if (configData.SHOW_SEAT_NO && seatNo === null) {
        showSnackbar('Please select a seat number before adding items to the cart.', 'error')
        return
      }

      const seatKey = seatNo ?? 0 // Use 0 as a fallback if seatNo is null for non-seat configurations

      const seatOrder = await db.orders.get(seatKey)
      if (seatOrder && seatOrder.closed) {
        showSnackbar('This seat is closed. You cannot add new items to it.', 'error')
        return
      }

      const newCartItem: CheckoutItem = {
        ...newItem,
        cartItemId: `${newItem.productId}-${newItem.size}-${Date.now()}`, // Simple unique ID for keys
        status: 'ordered',
      }

      try {
        // 1. Update IndexedDB immediately. This makes the UI responsive.
        const currentOrder = await db.orders.get(seatKey)
        let updatedItems: CheckoutItem[]

        if (currentOrder) {
          // Order for this seat exists, update it.
          const existingItemIndex = currentOrder.items.findIndex(
            (item) =>
              item.productId === newCartItem.productId &&
              item.size === newCartItem.size &&
              item.instructions === newCartItem.instructions,
          )

          if (existingItemIndex > -1) {
            // Item with same config exists, so update quantity.
            updatedItems = [...currentOrder.items]
            const updatedItem = {
              ...updatedItems[existingItemIndex],
              quantity: updatedItems[existingItemIndex].quantity + newCartItem.quantity,
            }
            updatedItems[existingItemIndex] = updatedItem
          } else {
            // It's a new item for this seat.
            updatedItems = [...currentOrder.items, newCartItem]
          }
          await db.orders.put({ ...currentOrder, items: updatedItems })
        } else {
          // No order for this seat, create a new one.
          updatedItems = [newCartItem]
          await db.orders.put({ seatNo: seatKey, items: updatedItems, closed: false })
        }

        // 2. Request a background sync.
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.sync.register('sync-orders')
          })
          console.log('Background sync for orders requested.')
        } else {
          // Fallback for browsers that don't support background sync.
          console.log('Background sync not supported, syncing immediately.')
          const orderToSync = await db.orders.get(seatKey)
          await fetch(`http://localhost:3000/orders/${seatKey}`, {
            method: 'PUT', // PUT is idempotent, so it's safe for creating or updating.
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderToSync),
          })
        }
      } catch (e) {
        if (e instanceof Error) {
          console.error('Failed to update order:', e)
          setError(e.message)
        } else {
          setError('An unknown error occurred while updating the order.')
        }
      }
    },
    [seatNo],
  )

  if (error) {
    return <Typography color="error">Error: {error}</Typography>
  }

  if (products === undefined) {
    return <Typography>Loading products...</Typography>
  }

  return (
    <div>
      <CheckoutModal
        checkoutModal={checkoutModal}
        setCheckoutModal={setCheckoutModal}
        ordersBySeat={ordersBySeat}
        productData={products}
        seatNo={seatNo}
      />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h4" component="h1">
          Products
        </Typography>
        <div>
          <Select
            value={seatNo ?? ''}
            onChange={(e) => {
              setSeatNo(e.target.value as number)
            }}
            displayEmpty
            size="small"
          >
            <MenuItem value="" disabled>
              <em>Select Seat</em>
            </MenuItem>
            <MenuItem value={1}>1</MenuItem>
            <MenuItem value={2}>2</MenuItem>
            <MenuItem value={3}>3</MenuItem>
            <MenuItem value={4}>4</MenuItem>
          </Select>
          {configData.SEARCH && (
            <TextField
              label="Search Product"
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ ml: '10px' }}
            />
          )}
        </div>
      </Box>

      <Divider />
      <div>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', overflowX: 'auto', width: '100%' }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            textColor="secondary"
            indicatorColor="secondary"
            aria-label="Product categories"
            variant="scrollable"
            scrollButtons="auto" // Best for mobile compatibility
            allowScrollButtonsMobile
            style={{ minWidth: 300 }} // Optional: Ensures a base width for tabs
          >
            {productCategories.map((category) => (
              <Tab
                key={category}
                value={category}
                label={category.charAt(0).toUpperCase() + category.slice(1)}
              />
            ))}
          </Tabs>
        </Box>
      </div>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Grid
          container
          spacing={3}
          sx={{
            justifyContent: { sm: 'center' },
            maxWidth: '1400px',
            '& .MuiGrid-item': {
              display: 'flex',
              justifyContent: 'center',
            },
            paddingTop: '20px',
          }}
        >
          {filteredProducts.map((product) => (
            <Grid item key={product.pk_key} xs={12} sm={6} md={4} lg={3} xl={2.4}>
              <ProductCard product={product} checkoutDataHandle={checkoutDataHandle} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </div>
  )
}

export default ProductListing
