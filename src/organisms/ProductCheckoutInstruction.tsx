import React, { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Modal from '@mui/material/Modal'
import IconButton from '@mui/material/IconButton'
import ControlPointIcon from '@mui/icons-material/ControlPoint'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import { TextField } from '@mui/material'

interface Product {
  pk_key: number
  ProductName: string
}

export interface AddToCartItem {
  productId: number
  quantity: number
  size: string
  instructions: string
}
interface ProductCheckoutInstructionProps {
  specificationModal: boolean
  setSpecificationModal: (value: boolean) => void
  product: Product
  checkoutDataHandle: (item: AddToCartItem) => void
}

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

const ProductCheckoutInstruction = ({
  specificationModal,
  setSpecificationModal,
  product,
  checkoutDataHandle,
}: ProductCheckoutInstructionProps) => {
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState('Small')
  const [specialInstructions, setSpecialInstructions] = useState('')

  useEffect(() => {
    if (specificationModal) {
      setQuantity(1)
      setSelectedSize('Small')
      setSpecialInstructions('')
    }
  }, [specificationModal])

  const handleAddToCart = () => {
    checkoutDataHandle({
      productId: product.pk_key,
      quantity,
      size: selectedSize,
      instructions: specialInstructions,
    })
    setSpecificationModal(false)
  }

  return (
    <Modal
      open={specificationModal}
      onClose={() => setSpecificationModal(false)}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style}>
        <Typography id="modal-modal-title" variant="h6" component="h2">
          {product.ProductName}
        </Typography>
        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          Size:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, my: 1 }}>
          <Button
            variant={selectedSize === 'Small' ? 'contained' : 'outlined'}
            onClick={() => setSelectedSize('Small')}
          >
            Small
          </Button>
          <Button
            variant={selectedSize === 'Medium' ? 'contained' : 'outlined'}
            onClick={() => setSelectedSize('Medium')}
          >
            Medium
          </Button>
        </Box>
        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          Quantity:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
          <IconButton
            aria-label="remove from cart"
            size="small"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <RemoveCircleOutlineIcon />
          </IconButton>
          <Typography sx={{ mx: 2 }}>{quantity}</Typography>
          <IconButton
            aria-label="add to cart"
            size="small"
            onClick={() => setQuantity((q) => q + 1)}
          >
            <ControlPointIcon />
          </IconButton>
        </Box>
        <Typography variant="subtitle1" sx={{ mt: 2 }}>
          Special Instructions:
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={2}
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          variant="outlined"
          sx={{ my: 1 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
          <Button variant="outlined" onClick={() => setSpecificationModal(false)} color="secondary">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddToCart}>
            Add to Cart
          </Button>
        </Box>
      </Box>
    </Modal>
  )
}

export default ProductCheckoutInstruction
