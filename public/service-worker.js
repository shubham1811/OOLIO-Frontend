// /Users/shubhamkumar/Desktop/OOLIO-Assignment/public/service-worker.js

// Using importScripts to load Dexie.js library in the service worker scope
importScripts('dexie.js')

// Re-defining the database schema to be accessible in the service worker.
// This schema must match the one in `src/db/db.ts`.
const db = new Dexie('OolioPosDatabase')
db.version(2).stores({
  ProductListing: 'pk_key, ProductName, ProductType',
  orders: 'seatNo', // 'seatNo' is the primary key
  printedBills: '++id, seatNo', // New table for closed/printed bills
})

// Listen for the 'sync' event.
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    // waitUntil() ensures the service worker doesn't terminate until the sync is complete.
    event.waitUntil(syncOrdersToServer())
  }
})

/**
 * Reads all orders from IndexedDB and sends them to the server.
 */
async function syncOrdersToServer() {
  console.log('Service Worker: Syncing orders to server...')
  try {
    const allOrders = await db.orders.toArray()
    if (allOrders.length === 0) {
      console.log('Service Worker: No orders in IndexedDB to sync.')
      return
    }

    // The backend has a PUT endpoint to replace an entire seat's order, which is idempotent.
    // We can send all orders to the server using this endpoint.
    const syncPromises = allOrders.map((order) => {
      console.log(`Service Worker: Syncing order for seat ${order.seatNo}`)
      return fetch(`http://localhost:3000/orders/${order.seatNo}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      }).then((response) => ({ response, order })) // Pass order along for post-sync processing
    })

    const results = await Promise.allSettled(syncPromises)

    const successfullyClosedOrders = []
    const failedSyncs = []

    // Check for any failed syncs
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.response.ok) {
        const { order } = result.value
        if (order.closed) {
          successfullyClosedOrders.push(order)
        }
      } else {
        failedSyncs.push(result)
      }
    })

    // If there were successfully closed orders, move them in the local DB
    if (successfullyClosedOrders.length > 0) {
      const seatNosToMove = successfullyClosedOrders.map((o) => o.seatNo)
      await db.transaction('rw', db.orders, db.printedBills, async () => {
        await db.printedBills.bulkAdd(successfullyClosedOrders)
        await db.orders.bulkDelete(seatNosToMove)
        console.log(`Service Worker: Moved ${seatNosToMove.length} closed orders to printedBills.`)
      })
    }

    if (failedSyncs.length > 0) {
      console.error('Service Worker: Some orders failed to sync.')
      failedSyncs.forEach((result) => {
        if (result.status === 'rejected') {
          // This happens for network errors, etc.
          console.error('  - A fetch promise was rejected:', result.reason)
        } else {
          // This happens for HTTP errors like 404, 500, etc.
          console.error(
            `  - A fetch completed but was not ok: ${result.value.status} ${result.value.statusText}`,
          )
        }
      })
      throw new Error('Some orders failed to sync.')
    } else {
      console.log('Service Worker: Sync process completed.')
    }
  } catch (error) {
    console.error('Service Worker: Failed to sync orders.', error)
    // Throwing an error here is important. It tells the browser that the sync
    // failed, and it will attempt to retry with exponential backoff.
    throw error
  }
}

// Standard service worker lifecycle events.
self.addEventListener('install', (event) => {
  console.log('Service worker installed')
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service worker activated')
  // Take control of all clients as soon as the service worker activates.
  return self.clients.claim()
})
