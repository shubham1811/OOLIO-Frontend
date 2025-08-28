import Dexie, { Table } from 'dexie'

// This is the shape of the data in the ProductListing table
export interface ProductListing {
  pk_key: number
  ProductName: string
  ProductPrice: number // Price is stored as a number for calculations
  ProductType: string
  ProductImage: string
  ShowInListing: boolean
  FoodType: string
}

// This is the shape of a single item within an order
export interface CheckoutItem {
  cartItemId: string
  productId: number
  quantity: number
  size: string
  instructions: string
  status: 'ordered' | 'in-progress' | 'made' | 'delivered' // Added status field
  // Optional fields that are added when a bill is closed/printed
  productName?: string
  unitPrice?: number
  itemTotal?: number
}

// This is the shape of the data in the new 'orders' table
export interface Order {
  seatNo: number // This will be our primary key
  items: CheckoutItem[]
  closed?: boolean
  id?: number // Optional: for printedBills table
  // Optional fields that are added when a bill is closed/printed
  grandTotal?: number
  closedAt?: string
}

export class MySubClassedDexie extends Dexie {
  ProductListing!: Table<ProductListing>
  orders!: Table<Order>
  printedBills!: Table<Order> // New table for closed orders

  constructor() {
    super('OllioPosDatabase') // A descriptive name for your database
    this.version(1).stores({
      ProductListing: 'pk_key, ProductName, ProductType',
      orders: 'seatNo', // Define the 'orders' table with 'seatNo' as the primary key
    });
    this.version(2).stores({
      ProductListing: 'pk_key, ProductName, ProductType',
      orders: 'seatNo',
      printedBills: '++id, seatNo' // New table for printed bills
    })
  }
}

export const db = new MySubClassedDexie()