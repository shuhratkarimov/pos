// UserContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { API_URL } from '@/lib/api'

interface User {
  phoneNumber: string
  _id: string
  username: string
  role: string
  shop?: {
    _id: string
    shopName: string
  }
}

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  loading: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_URL}/user/me`, {
          credentials: 'include',
        })

        if (!res.ok) {
          setUser(null)
        } else {
          const data = await res.json()
          // Agar shop bo‘lmasa, default qilib bo‘sh object qo‘shish
          if (!data.shop) data.shop = { shopName: 'Do‘kon yo‘q', _id: '' }
          setUser(data)
        }
      } catch (err) {
        setUser({ username: '', role: '', shop: { shopName: 'Do‘kon yo‘q', _id: '' }, _id: '', phoneNumber: '' })
      } finally {
        setLoading(false)
      }
    }

    fetchMe()
  }, [])

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) throw new Error('useUser must be used inside UserProvider')
  return context
}