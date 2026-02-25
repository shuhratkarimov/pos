'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutGrid,
  Package,
  BarChart3,
  Receipt,
  FileText,
  ShoppingCart,
  CreditCard,
  Home,
  Menu,
  X
} from 'lucide-react'
import ProfileMenu from '@/components/ProfileMenu'

const navItems = [
  { href: '/', label: 'Kassa', icon: ShoppingCart },
  { href: '/products', label: 'Mahsulotlar', icon: Package },
  { href: '/reports', label: 'Hisobotlar', icon: BarChart3 },
  { href: '/invoices', label: 'Cheklar', icon: Receipt },
  { href: '/debt', label: 'Qarzlar', icon: CreditCard },
]

export default function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Mobile menyu ochilganda scrollni bloklash
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link href="/" className="relative">
                <div className="p-[2px] rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-green-600">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-full flex items-center justify-center">
                    <img
                      src="/b-market-logo.png"
                      alt="B-Market"
                      className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded-full"
                    />
                  </div>
                </div>
              </Link>

              <div className="leading-tight hidden sm:block">
                <span className="block text-gray-900 font-bold text-base sm:text-lg">
                  B-MARKET
                </span>
                <span className="block text-gray-500 text-xs">
                  Professional savdo tizimi
                </span>
              </div>
            </div>

            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      relative px-3 lg:px-4 py-2.5 rounded-lg
                      flex items-center gap-2 text-sm font-medium
                      transition-all duration-200
                      group whitespace-nowrap
                      ${isActive
                        ? 'text-purple-600'
                        : 'text-gray-600 hover:text-purple-600'
                      }
                    `}
                  >
                    <div className={`
                      p-2 rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-gray-100 group-hover:bg-purple-50 text-gray-600 group-hover:text-purple-600'
                      }
                    `}>
                      <Icon size={18} />
                    </div>

                    <span className="font-medium hidden lg:inline">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>

            {/* Desktop Profile Menu */}
            <div className="hidden md:block flex-shrink-0">
              <ProfileMenu />
            </div>

            {/* Mobile Header Right Side */}
            <div className="flex md:hidden items-center gap-2 flex-shrink-0">
              {/* Mobile Profile Menu */}
              <ProfileMenu />
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Full Screen Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-40 md:hidden pt-16 animate-in slide-in-from-top duration-300">
          <div className="p-6 space-y-6">
            {/* User Info - Optional */}
            <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-green-600 flex items-center justify-center text-white font-bold text-xl">
                BM
              </div>
              <div>
                <p className="font-semibold text-gray-900">B-MARKET</p>
                <p className="text-sm text-gray-500">Professional savdo tizimi</p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
                Menyu
              </p>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      w-full flex items-center gap-4 px-4 py-4 rounded-xl
                      transition-all duration-200
                      ${isActive
                        ? 'bg-gradient-to-r from-purple-50 to-green-50 text-purple-700'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className={`
                      p-3 rounded-xl
                      ${isActive ? 'bg-white shadow-sm' : 'bg-gray-100'}
                    `}>
                      <Icon size={22} className={isActive ? 'text-purple-600' : 'text-gray-600'} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-base">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.href === '/' && 'Sotuv operatsiyalari'}
                        {item.href === '/products' && 'Mahsulotlarni boshqarish'}
                        {item.href === '/reports' && 'Statistika va hisobotlar'}
                        {item.href === '/invoices' && 'Chop etilgan cheklar'}
                        {item.href === '/debt' && 'Mijoz qarzlari'}
                      </p>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 bg-purple-600 rounded-full" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="border-t border-gray-200 pt-6">
                <p className="text-center text-sm text-gray-500">
                  B-MARKET v1.0.0
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}