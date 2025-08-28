import React from 'react'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { Typography } from '@mui/material'

const Header = () => {
  const isOnline = useNetworkStatus()
  return (
    <div>
      <div
        className="HeaderContainer"
        style={{
          height: '5vh',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5vh',
          border: '1px solid black',
        }}
      >
        <div>The Coffee House</div>
        <Typography
          variant="body2"
          sx={{
            color: 'white',
            backgroundColor: isOnline ? 'green' : 'red',
            fontWeight: 'bold',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            display: 'inline-block',
          }}
        >
          {isOnline ? 'Online' : 'Offline'}
        </Typography>
      </div>
    </div>
  )
}

export default Header
