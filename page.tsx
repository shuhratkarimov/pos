'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import ProductList from '@/components/ProductList'
import Cart from '@/components/Cart'
import { Product, CartItem, getProducts, addInvoice, Invoice } from '@/lib/api'
import { Search, ShoppingCart, Package, DollarSign, TrendingUp, RefreshCw, Receipt, Bell } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  let added = false
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await getProducts()
      setProducts(data)
      setFilteredProducts(data)
      toast.success('Mahsulotlar yangilandi')
    } catch (error) {
      toast.error('Mahsulotlarni yuklashda xatolik')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadProducts()
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(query.toLowerCase()) ||
          product.code.toLowerCase().includes(query.toLowerCase())
      )
      setFilteredProducts(filtered)
    }
  }

  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === product._id)
    
      if (existingItem) {
        return prev.map((item) =>
          item.id === product._id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price,
              }
            : item
        )
      } else {
        added = true
        return [
          ...prev,
          {
            id: product._id,
            name: product.name,
            price: product.price,
            quantity: 1,
            measure: product.measure,
            subtotal: product.price,
          },
        ]
      }
    })
    
    if (added) {
      toast.success(`${product.name} savatchaga qo'shildi`)
    }
  }

  const handleUpdateCartItem = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== id))
      toast('Mahsulot savatchadan olib tashlandi')
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, quantity, subtotal: quantity * item.price }
            : item
        )
      )
    }
  }

  const handleRemoveFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
    toast('Mahsulot savatchadan olib tashlandi')
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Savatcha bo\'sh')
      return
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0)
    const total = subtotal

    const invoice: Omit<Invoice, '_id'> = {
      date: new Date().toISOString(),
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        measure: item.measure,
        subtotal: item.subtotal
      })),
      subtotal,
      total,
      paymentMethod: 'naqd'
    }

    try {
      await addInvoice(invoice)
      toast.success(
        <div>
          <p className="font-semibold">Chek muvaffaqiyatli saqlandi!</p>
          <p className="text-sm opacity-80">Jami: {total.toLocaleString()} so'm</p>
        </div>,
        { duration: 3000 }
      )
      setCartItems([])
      await loadProducts()
    } catch (error) {
      toast.error('Chekni saqlashda xatolik')
      console.error(error)
    }
  }

  const cartStats = {
    totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: cartItems.reduce((sum, item) => sum + item.subtotal, 0),
    uniqueItems: cartItems.length
  }

  const productStats = {
    total: products.length,
    lowStock: products.filter(p => p.stock < 10).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-blue-900/20">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Stats */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                  <ShoppingCart className="text-white" size={28} />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  Kassa
                </h1>
              </div>
              <p className="text-slate-400 text-lg">
                Tez va qulay savdo platformasi
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 border border-slate-700 rounded-xl text-white flex items-center gap-3 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={refreshing ? 'animate-spin' : ''} size={20} />
              {refreshing ? 'Yuklanmoqda...' : 'Yangilash'}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 transform -translate-y-1/2 text-slate-400 group-hover:text-blue-400 transition-colors" size={22} />
            <input
              type="text"
              placeholder="Mahsulot nomi yoki kodini kiriting..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-16 pr-6 py-4 bg-slate-800/50 backdrop-blur-sm border-2 border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all duration-300 text-lg"
            />
          </div>
          
          {searchQuery && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <span className="text-sm text-slate-400 bg-slate-800/80 px-3 py-1 rounded-full">
                {filteredProducts.length} ta topildi
              </span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-slate-800/30 to-blue-900/10 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="border-b border-slate-700/50 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="text-blue-400" size={24} />
                    <h2 className="text-2xl font-bold text-white">Mahsulotlar ro'yxati</h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400 px-3 py-1 bg-slate-800/50 rounded-full">
                      {filteredProducts.length} ta mahsulot
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-2">
                <ProductList
                  products={filteredProducts}
                  loading={loading}
                  onAddToCart={handleAddToCart}
                />
              </div>
            </div>
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-gradient-to-br from-slate-800/30 to-emerald-900/10 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm h-full">
                <div className="border-b border-slate-700/50 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="text-emerald-400" size={24} />
                      <h2 className="text-2xl font-bold text-white">Savatcha</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-emerald-400">
                        {cartStats.uniqueItems} ta mahsulot
                      </span>
                    </div>
                  </div>
                </div>
                
                <Cart
                  items={cartItems}
                  onUpdateItem={handleUpdateCartItem}
                  onRemoveItem={handleRemoveFromCart}
                  onCheckout={handleCheckout}
                />
                
                {cartItems.length > 0 && (
                  <div className="p-6 border-t border-slate-700/50 bg-gradient-to-r from-emerald-900/10 to-teal-900/10">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Jami summa:</span>
                        <span className="text-3xl font-bold text-white">
                          {cartStats.totalAmount.toLocaleString()} so'm
                        </span>
                      </div>
                      
                      <button
                        onClick={handleCheckout}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-4 px-6 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-emerald-500/25"
                      >
                        <Receipt size={22} />
                        Sotuvni yakunlash
                      </button>
                      
                      <p className="text-center text-sm text-slate-400">
                        Savatchani tozalash uchun barcha mahsulotlarni o'chiring
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => setCartItems([])}
            disabled={cartItems.length === 0}
            className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 rounded-lg text-slate-300 text-sm transition-colors"
          >
            Savatchani tozalash
          </button>
          <button
            onClick={() => handleSearch('')}
            className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg text-slate-300 text-sm transition-colors"
          >
            Qidiruvni tozalash
          </button>
        </div>
      </main>
    </div>
  )
}