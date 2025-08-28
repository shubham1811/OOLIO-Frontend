import React, { useMemo } from 'react'
import Box from '@mui/material/Box'
import Modal from '@mui/material/Modal'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import configData from '../configuration/ProductPageConfig.json'

// Define the shape of the product data
interface Product {
  pk_key: number
  ProductName: string
  ProductPrice: string
  ProductType: string
  ProductImage: string
  ShowInListing: boolean
  FoodType: string
}

// Define the shape of the checkout item
interface CheckoutItem {
  cartItemId: string
  productId: number
  quantity: number
  size: string
  instructions: string
}

interface CheckoutModalProps {
  checkoutModal: boolean
  setCheckoutModal: React.Dispatch<React.SetStateAction<boolean>>
  ordersBySeat: Record<number, CheckoutItem[]>
  productData: Product[]
  seatNo: number | null
}

const CheckoutModal = ({
  checkoutModal,
  setCheckoutModal,
  ordersBySeat,
  productData,
  seatNo,
}: CheckoutModalProps) => {
  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '1px solid #000',
    boxShadow: 24,
    p: 4,
  }

  const { orders, grandTotal } = useMemo(() => {
    let ordersToProcess = Object.entries(ordersBySeat)

    // If seat selection is enabled, filter for the selected seat.
    // If no seat is selected, the modal will show an empty cart.
    if (configData.SHOW_SEAT_NO) {
      if (seatNo !== null) {
        ordersToProcess = ordersToProcess.filter(([seat]) => parseInt(seat, 10) === seatNo)
      } else {
        ordersToProcess = []
      }
    }

    const processedOrders = ordersToProcess
      .map(([seat, items]) => {
        const seatNumber = parseInt(seat, 10)

        const detailedItems = items
          .map((item) => {
            const product = productData.find((p) => p.pk_key === item.productId)
            if (!product) return null

            const basePrice = parseFloat(product.ProductPrice.replace('$', ''))
            if (isNaN(basePrice)) return null

            // Adjust price based on size
            const itemPrice = item.size === 'Small' ? basePrice : basePrice * 2

            return {
              id: item.cartItemId, // Use the unique cart item ID for the key
              name: product.ProductName,
              quantity: item.quantity,
              size: item.size,
              instructions: item.instructions,
              price: itemPrice,
              totalItemPrice: itemPrice * item.quantity,
            }
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)

        const seatTotal = detailedItems.reduce((sum, item) => sum + item.totalItemPrice, 0)

        return {
          seatNo: seatNumber,
          items: detailedItems,
          seatTotal: seatTotal,
        }
      })
      .sort((a, b) => a.seatNo - b.seatNo) // Sort orders by seat number

    const total = processedOrders.reduce((sum, order) => sum + order.seatTotal, 0)

    return { orders: processedOrders, grandTotal: total }
  }, [ordersBySeat, productData, seatNo])

  return (
    <Modal
      open={checkoutModal}
      onClose={() => setCheckoutModal(false)}
      aria-labelledby="checkout-modal-title"
      aria-describedby="checkout-modal-description"
    >
      <Box sx={style}>
        <Typography id="checkout-modal-title" variant="h6" component="h2">
          Review Your Order
        </Typography>
        <Box id="checkout-modal-description" sx={{ mt: 2 }}>
          {orders.length > 0 ? (
            <List disablePadding>
              {orders.map((order, index) => (
                <React.Fragment key={order.seatNo}>
                  {index > 0 && <Divider sx={{ my: 2 }} />}
                  <Typography variant="h6" component="h3" sx={{ mt: index > 0 ? 2 : 0, mb: 1 }}>
                    Seat {order.seatNo}
                  </Typography>
                  {order.items.map((item) => (
                    <ListItem key={item.id} disableGutters sx={{ alignItems: 'flex-start' }}>
                      <ListItemText
                        primary={`${item.name} (x${item.quantity}) - ${item.size}`}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {item.instructions || 'No special instructions'}
                            </Typography>
                            {` — $${item.price.toFixed(2)} each`}
                          </>
                        }
                      />
                      <Typography variant="body2">${item.totalItemPrice.toFixed(2)}</Typography>
                    </ListItem>
                  ))}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      Seat Total
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      ${order.seatTotal.toFixed(2)}
                    </Typography>
                  </Box>
                </React.Fragment>
              ))}
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h5">Grand Total</Typography>
                <Typography variant="h5">${grandTotal.toFixed(2)}</Typography>
              </Box>
            </List>
          ) : (
            <Typography>Your cart is empty.</Typography>
          )}
        </Box>
      </Box>
    </Modal>
  )
}

export default CheckoutModal
