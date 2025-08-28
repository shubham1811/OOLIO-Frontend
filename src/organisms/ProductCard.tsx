import React, { useState } from 'react'
import Card from '@mui/material/Card'
import Box from '@mui/material/Box'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Typography from '@mui/material/Typography'
import configData from '../configuration/ProductPageConfig.json'
import IconButton from '@mui/material/IconButton'
import ControlPointIcon from '@mui/icons-material/ControlPoint'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import ProductCheckoutInstruction, { AddToCartItem } from './ProductCheckoutInstruction'

// Define the shape of the product data
interface Product {
  pk_key: number
  ProductName: string
  ProductPrice: string
  ProductImage: string
  FoodType: string
}

// Define the props for the component
interface ProductCardProps {
  product: Product
  checkoutDataHandle: (item: AddToCartItem) => void
}

export default function ProductCard({ product, checkoutDataHandle }: ProductCardProps) {
  const [specificationModal, setSpecificationModal] = useState(false)
  const isVeg = product.FoodType === 'veg'

  return (
    <div>
      <ProductCheckoutInstruction
        specificationModal={specificationModal}
        setSpecificationModal={setSpecificationModal}
        product={product}
        checkoutDataHandle={checkoutDataHandle}
      />
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          width: 280,
          cursor: 'pointer',
        }}
        onClick={() => {
          setSpecificationModal((prevData) => !prevData)
        }}
      >
        <CardMedia sx={{ height: 140 }} image={product.ProductImage} title={product.ProductName} />
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {configData.VEG_NONVEG_TYPE && (
              <Box
                component="span"
                title={isVeg ? 'Veg' : 'Non-Veg'}
                sx={{
                  width: 16,
                  height: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid',
                  borderColor: isVeg ? 'success.main' : 'error.main',
                  borderRadius: '4px',
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: isVeg ? 'success.main' : 'error.main',
                  }}
                />
              </Box>
            )}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {product.ProductName}
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            {product.ProductPrice}
          </Typography>
        </CardContent>
      </Card>
    </div>
  )
}
