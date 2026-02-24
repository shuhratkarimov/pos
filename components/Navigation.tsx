'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  Package,
  BarChart3,
  Receipt,
  FileText,
  ShoppingCart,
  CreditCard,
  Home,
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

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="relative">
              <div
                className="
        p-[2px] rounded-full
        bg-gradient-to-tr
        from-yellow-400 via-pink-500 to-purple-600
      "
              >
                <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center">
                  <img
                    src="/b-market-logo.png"
                    alt="B-Market"
                    className="w-10 h-10 object-cover rounded-full"
                  />
                </div>
              </div>
            </Link>

            <div className="leading-tight hidden md:block">
              <span className="block text-gray-900 font-bold text-lg">
                B-MARKET
              </span>
              <span className="block text-gray-500 text-xs">
                Professional savdo tizimi
              </span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative px-4 py-2.5 rounded-lg
                    flex items-center gap-2 text-sm font-medium
                    transition-all duration-200
                    group
                    ${isActive
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-blue-600'
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 group-hover:bg-blue-50 text-gray-600 group-hover:text-blue-600'
                    }
                  `}>
                    <Icon size={18} />
                  </div>

                  <span className="font-medium">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <ProfileMenu />
          </div>

          {/* Mobile Menu */}
          <div className="flex md:hidden items-center gap-2 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative px-3 py-2 rounded-lg flex flex-col items-center
                    transition-all duration-200 min-w-[70px]
                    ${isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-lg mb-1
                    ${isActive ? 'bg-blue-100' : 'bg-gray-100'}
                  `}>
                    <Icon size={18} />
                  </div>
                  <span className="text-xs font-medium">
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}