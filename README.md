# OOLIO Frontend - The Coffee House POS

> A modern, offline-first Point of Sale (POS) frontend for "The Coffee House", designed to work seamlessly with the OOLIO-Backend.

This application provides an intuitive interface for managing customer orders, with a focus on reliability and performance, even with intermittent network connectivity.

---

## ✨ Features

- **Intuitive UI**: A clean and simple interface for managing coffee shop orders.
- **Seat-based Order Tracking**: Easily manage multiple orders associated with different seats.
- **Flexible Order Management**: Add, update, and remove items from an order, specify item size (Small/Large), and include custom instructions.
- **Offline First**: Continue taking and managing orders even when the network is down. All changes are saved locally and synced automatically when connectivity is restored.
- **Automatic Backend Sync**: Uses a robust synchronization mechanism to keep local data consistent with the backend.
- **Receipt Printing**: Finalize orders and print customer receipts with a single click.

## 🛠️ Tech Stack

- **Framework**: [React](https://reactjs.org/)
- **Offline Storage**: [Dexie.js](https://dexie.org/) (A powerful wrapper for IndexedDB)
- **Styling**: (e.g., Tailwind CSS, Material-UI, Styled Components)

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v16.x or later recommended)
- npm or yarn
- A running instance of the **OOLIO-Backend**.

## 🚀 Getting Started

Follow these steps to get the frontend application up and running on your local machine.

### 1. Backend Setup

The frontend requires the `OOLIO-Backend` server to be running.

```bash
# Navigate to the backend directory
cd ../OOLIO-Backend

# Install dependencies
npm install

# Start the backend server (runs on http://localhost:3000)
npm start
```

### 2. Frontend Setup

1.  **Clone the repository** (if you haven't already)

2.  **Navigate to the project directory**

    ```bash
    cd OOLIO-Frontend
    ```

3.  **Install dependencies**

    ```bash
    npm install
    ```

4.  **Start the development server**

    ```bash
    npm start
    ```

5.  **Open the application**

    The application should now be running and accessible at `http://localhost:8000` (or another port if 3001 is in use).

## ⚙️ How It Works

### Data Flow & Offline Support

This application is built with an "offline-first" architecture to ensure a smooth user experience regardless of network status.

1.  **Local First**: All data modifications (creating/updating orders) are first written to a local **Dexie.js (IndexedDB)** database in the browser. This makes the UI incredibly fast and responsive.
2.  **Background Sync**: A background process monitors for changes in the local database and network availability.
3.  **API Communication**: When the network is available, the sync process sends the queued changes to the corresponding backend API endpoints (`POST /orders`, `PUT /orders/:seatNo`).

This ensures that no data is lost and the application remains fully functional even during periods of no internet connection.

### Core Functionality

- **Order Creation**: When an order is created for a new seat, it's saved locally and then synced to the backend via `POST /orders`.
- **Order Updates**: Any changes to an existing order (adding items, changing quantities, adding notes) are saved locally and synced via `PUT /orders/:seatNo`.
- **Closing an Order**: When an order is marked as "closed" in the UI, the frontend sends a final state update to the backend with a `closed: true` flag. The backend then performs the final price calculation, archives the order to `billPrint.json`, and removes it from the active `orders.json`.
- **Printing**: After an order is successfully closed, the frontend can trigger a print request by sending the final bill data to the `POST /print-bill` endpoint. The backend then handles the communication with the thermal printer.
