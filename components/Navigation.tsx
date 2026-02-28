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

import { Viga } from 'next/font/google'

const viga = Viga({
  subsets: ['latin'],
  weight: '400'
})

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
      <nav className="sticky top-0 z-50 bg-teal-600 border-b border-teal-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-4 lg:px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link href="/" className="relative">
                <div className="p-[2px] rounded-full bg-gradient-to-tr from-teal-300 via-white to-white">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-white rounded-full flex items-center justify-center">
                    <img
                      src="/b-market-logo.png"
                      alt="B-Market"
                      className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded-full"
                    />
                  </div>
                </div>
              </Link>

              <span className="sm:hidden text-white font-semibold text-base">
                <p className={viga.className}>
                  B-MARKET
                </p>
                <p className="text-xs text-teal-100">
                  Professional savdo tizimi
                </p>
              </span>

              <div className="leading-tight hidden sm:block">
                <span className="block text-white font-bold text-base sm:text-lg">
                  <p className={viga.className}>
                    B-MARKET
                  </p>
                </span>
                <span className="block text-teal-100 text-xs">
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
                        ? 'text-white'
                        : 'text-teal-100 hover:text-white'
                      }
                    `}
                  >
                    <div className={`
                      p-2 rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-white text-teal-600'
                        : 'bg-teal-700 group-hover:bg-teal-800 text-teal-100 group-hover:text-white'
                      }
                    `}>
                      <Icon size={18} />
                    </div>

                    <span className="font-medium hidden lg:inline">
                      {item.label}
                    </span>

                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-teal-100 rounded-full"></span>
                    )}
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
                className="p-2 hover:bg-teal-600 rounded-lg transition-colors text-white"
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
        <div className="fixed inset-0 bg-gradient-to-br from-teal-50 to-emerald-50 z-40 md:hidden pt-16 animate-in slide-in-from-top duration-300">
          <div className="p-6 space-y-6">
            {/* User Info - Optional */}
            <div className="flex items-center gap-4 pb-6 border-b border-teal-200">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                BM
              </div>
              <div>
                <p className="font-semibold text-gray-800">B-MARKET</p>
                <p className="text-sm text-teal-600">Professional savdo tizimi</p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider px-3">
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
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-teal-100'
                      }
                    `}
                  >
                    <div className={`
                      p-3 rounded-xl
                      ${isActive
                        ? 'bg-white/20'
                        : 'bg-teal-100 text-teal-600'
                      }
                    `}>
                      <Icon size={22} className={isActive ? 'text-white' : 'text-teal-600'} />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium text-base ${isActive ? 'text-white' : 'text-gray-800'}`}>
                        {item.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${isActive ? 'text-teal-100' : 'text-teal-600'}`}>
                        {item.href === '/' && 'Sotuv operatsiyalari'}
                        {item.href === '/products' && 'Mahsulotlarni boshqarish'}
                        {item.href === '/reports' && 'Statistika va hisobotlar'}
                        {item.href === '/invoices' && 'Chop etilgan cheklar'}
                        {item.href === '/debt' && 'Mijoz qarzlari'}
                      </p>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="border-t border-teal-200 pt-6">
                <p className="text-center text-sm text-teal-600">
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