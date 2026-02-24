'use client'

import { Toaster } from 'react-hot-toast'

export default function ToasterProvider() {
  return <Toaster
    position="bottom-right"
    toastOptions={{
      style: {
        background: '#fff',
        color: '#374151',
        border: '1px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
      duration: 2000,
    }}
    gutter={16}
    containerStyle={{
      padding: '16px',
    }}  
    
  />
}
