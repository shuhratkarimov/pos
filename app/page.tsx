'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { Product, CartItem, getProducts, addInvoice, Invoice, getTopSellingProducts, TopProduct, API_URL, getDebtRecords } from '@/lib/api'
import {
  Search,
  ShoppingCart,
  Package,
  RefreshCw,
  Receipt,
  X,
  Printer,
  Plus,
  Minus,
  Hash,
  Edit2,
  Trash2,
  Save,
  DollarSign,
  Loader2,
  ScanBarcodeIcon,
  Scale,
  Euro,
  NotebookPen
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { DebtRecord } from '@/lib/api'
import BarcodeScanner from '@/components/BarcodeScanner'

type CustomPriceItem = CartItem & {
  isCustom: boolean;
  editing?: boolean;
  originalPrice?: number;
}

export default function Home() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [cartItems, setCartItems] = useState<CustomPriceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [topSelling, setTopSelling] = useState<TopProduct[]>([])
  const [showKeypad, setShowKeypad] = useState(false)
  const [keypadProduct, setKeypadProduct] = useState<Product | null>(null)
  const [keypadValue, setKeypadValue] = useState('')
  const [showCustomPrice, setShowCustomPrice] = useState(false)
  const [customPriceProduct, setCustomPriceProduct] = useState<Product | null>(null)
  const [customPriceInput, setCustomPriceInput] = useState('')
  const [showCustomQuantity, setShowCustomQuantity] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editPriceValue, setEditPriceValue] = useState('')
  const [shopName, setShopName] = useState('')
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [debtSearch, setDebtSearch] = useState('')
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null)
  const [debtRecords, setDebtRecords] = useState<DebtRecord[]>([])
  const [debtLoading, setDebtLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showEditSubtotalModal, setShowEditSubtotalModal] = useState(false)
  const [editingCartItem, setEditingCartItem] = useState<CustomPriceItem | null>(null)
  const [editSubtotalInput, setEditSubtotalInput] = useState('')
  const [editSubtotalValue, setEditSubtotalValue] = useState('')

  const loadDebtsForModal = async () => {
    setDebtLoading(true)
    try {
      const debts = await getDebtRecords() // sizning api'dan
      setDebtRecords(debts)
    } catch (err) {
      toast.error("Qarzlarni yuklab bo'lmadi")
    } finally {
      setDebtLoading(false)
    }
  }

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/check-auth`, {
          credentials: 'include',
        });

        if (!res.ok) {
          router.push('/login');
          return;
        }
      } catch (err) {
        router.push('/login');
      }
    };

    checkAuth();
  }, []);

  const generateReceiptHTML = (invoice: Omit<Invoice, '_id'> | any) => {
    return `
      <html>
        <head>
          <title>Chek</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap');
            /* ... qolgan stillar o‘zgarmasdan qoladi ... */
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>SAVDO CHEKI</h1>
              <div>${new Date(invoice.date).toLocaleString('ru-RU')}</div>
              <div>${shopName?.toUpperCase() || 'Do‘kon'}</div>
            </div>
            
            <div class="items">
              ${invoice.items.map((item: any) => `
                <div class="item-row">
                  <div class="item-name">${item.name}</div>
                  <div class="item-details">
                    ${item.quantity} ${item.measure} × ${item.price.toLocaleString()} = ${item.subtotal.toLocaleString()} so'm
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div class="totals">
              <div class="final-total">
                <span>JAMI:</span>
                <span>${invoice.total.toLocaleString()} so'm</span>
              </div>
            </div>
            
            <div class="footer">
              <p>Xaridingiz uchun rahmat!</p>
              <p>${new Date().getFullYear()} ${shopName?.toUpperCase() || ''}</p>
            </div>
          </div>
          
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 1200);
            }
          </script>
        </body>
      </html>
    `
  }

  const printReceipt = (invoice: Omit<Invoice, '_id'> | any) => {
    const printWindow = window.open('', '_blank', 'width=380,height=600,scrollbars=yes')
    if (printWindow) {
      printWindow.document.write(generateReceiptHTML(invoice))
      printWindow.document.close()
    }
  }

  useEffect(() => {
    const getMe = async () => {
      try {
        const res = await fetch(`${API_URL}/user/me`, {
          credentials: 'include',
        });

        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setShopName(data?.shop?.shopName)
      } catch (err) {
        router.push('/login');
      }
    };

    getMe();
  }, []);


  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = products.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.code && product.code.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      setFilteredProducts(filtered.slice(0, 30))
    } else {
      const topProducts = topSelling.map(top => {
        const product = products.find(p => p._id === top.productId)
        return product
      }).filter(Boolean) as Product[]

      setFilteredProducts(topProducts.slice(0, 30))
    }
  }, [searchQuery, products, topSelling])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const productsData = await getProducts()
      setProducts(productsData)

      const topSellingData = await getTopSellingProducts(15)
      setTopSelling(topSellingData)

      toast.success('Ma\'lumotlar yangilandi')
    } catch (error) {
      toast.error('Ma\'lumotlarni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  const handleDebtSubmit = async (mode: 'new' | 'update', debtId?: string) => {
    if (cartItems.length === 0) return toast.error('Savatcha bo‘sh')

    const total = cartStats.totalAmount

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
      subtotal: total,
      total,
      paymentMethod: 'qarz'
    }

    try {
      // Chek saqlash
      const savedInvoice = await addInvoice(invoice)
      printReceipt(invoice)  // chop etish

      // URL parametrlarini tayyorlash
      const query = new URLSearchParams({
        mode,
        amount: total.toString(),
        invoiceId: savedInvoice._id || '',  // agar backend _id qaytarsa
        items: encodeURIComponent(JSON.stringify(cartItems))
      })

      if (mode === 'update' && debtId) {
        query.set('id', debtId)
      }

      // Sahifaga o'tish
      router.push(`/debt?${query.toString()}`)

      // Savatchani tozalash va yangilash
      setCartItems([])
      await loadAllData()

      toast.success(`Chek saqlandi va ${mode === 'new' ? 'yangi qarz' : 'qarz yangilandi'}!`)
    } catch (err: any) {
      toast.error('Xatolik: ' + (err.message || 'Noma\'lum xato'))
    }
  }

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    if (product.stock === 0) {
      toast.error("Ushbu mahsulot omborda mavjud emas!")
      return
    }

    if (product.stock < quantity) {
      toast.error(
        `Yetarli mahsulot yo'q! Omborda faqat ${product.stock} dona mavjud`
      )
      return
    }

    const existingItem = cartItems.find(
      (item) => item.id === product._id && !item.isCustom
    )

    if (existingItem) {
      const newTotalQuantity = existingItem.quantity + quantity

      if (product.stock < newTotalQuantity) {
        toast.error(
          `Yetarli mahsulot yo'q! Omborda faqat ${product.stock} dona mavjud`
        )
        return
      }

      setCartItems((prev) =>
        prev.map((item) =>
          item.id === product._id && !item.isCustom
            ? {
              ...item,
              quantity: newTotalQuantity,
              subtotal: newTotalQuantity * item.price,
            }
            : item
        )
      )
    } else {
      const newItem: CustomPriceItem = {
        id: product._id,
        name: product.name,
        price: product.price,
        quantity,
        measure: product.measure,
        subtotal: product.price * quantity,
        isCustom: false,
        originalPrice: product.price,
      }

      setCartItems((prev) => [...prev, newItem])
    }

    toast.success(
      `${product.name} savatchaga qo'shildi (${quantity} ${product.measure})`
    )
  }

  useEffect(() => {
    let barcodeBuffer = ''
    let timeout: NodeJS.Timeout

    const handleKeyDown = (e: KeyboardEvent) => {
      // Modal ochiq bo‘lsa – hech qanday global skanerni ishlatmaymiz
      if (showKeypad || showCustomPrice || showDebtModal || showScanner) {
        return
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 3) {
          const scannedCode = barcodeBuffer.trim()
          const product = products.find(p => p.code === scannedCode)

          if (product) {
            handleAddToCart(product, 1)
            toast.success(`${product.name} qo‘shildi (scan orqali)`)
          } else {
            toast.error(`Kod topilmadi: ${scannedCode}`)
          }
        }
        barcodeBuffer = ''
        return
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBuffer += e.key
      }

      clearTimeout(timeout)
      timeout = setTimeout(() => {
        barcodeBuffer = ''
      }, 150)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [products, showKeypad, showCustomPrice, showDebtModal, showScanner, handleAddToCart])

  const handleKeypadInput = (value: string | number) => {
    if (value === 'clear') {
      setKeypadValue('')
    } else if (value === 'backspace') {
      setKeypadValue(prev => {
        if (prev.length <= 1) return ''
        return prev.slice(0, -1)
      })
    } else if (value === 'enter') {
      if (keypadProduct && keypadValue) {
        const quantity = parseFloat(keypadValue)
        if (!isNaN(quantity) && quantity > 0) {
          handleAddToCart(keypadProduct, quantity)
          setShowKeypad(false)
          setKeypadValue('')
          setKeypadProduct(null)
        }
      }
    } else if (value === '00') {
      setKeypadValue(prev => {
        if (prev === '' || prev === '0') return '0'
        return prev + '00'
      })
    } else if (value === '.') {
      setKeypadValue(prev => {
        if (prev === '') return '0.'
        if (prev.includes('.')) return prev
        return prev + '.'
      })
    } else {
      setKeypadValue(prev => {
        if (prev === '0') return value.toString()
        return prev + value
      })
    }
  }

  const handleCustomPrice = (product: Product) => {
    setCustomPriceProduct(product)
    setCustomPriceInput('')
    setShowCustomPrice(true)
  }

  const addCustomPriceItem = () => {
    if (!customPriceProduct || !customPriceInput) return

    const totalPrice = Number(customPriceInput.replace(/\D/g, ''))
    if (totalPrice <= 0) {
      toast.error("Noto'g'ri narx")
      return
    }

    // Muhim qism — hisoblangan miqdorni tekshirish
    const calculatedQuantity = totalPrice / customPriceProduct.price
    const roundedQuantity = Number(calculatedQuantity.toFixed(3))

    if (roundedQuantity <= 0) {
      toast.error("Miqdor noto'g'ri hisoblandi")
      return
    }

    if (customPriceProduct.stock < roundedQuantity) {
      toast.error(
        `Yetarli mahsulot yo'q! Omborda faqat ${customPriceProduct.stock} ${customPriceProduct.measure} mavjud. ` +
        `(Siz kiritgan summa ≈ ${roundedQuantity} ${customPriceProduct.measure} ga teng)`
      )
      return
    }

    const customItem: CustomPriceItem = {
      id: `${customPriceProduct._id}-custom-${Date.now()}`,
      name: customPriceProduct.name,
      price: customPriceProduct.price,
      quantity: roundedQuantity,
      measure: customPriceProduct.measure,
      subtotal: totalPrice,
      isCustom: true,
      originalPrice: customPriceProduct.price
    }

    setCartItems(prev => [...prev, customItem])
    toast.success(
      `${roundedQuantity} ${customItem.measure} → ${totalPrice.toLocaleString()} so'm`
    )

    setShowCustomPrice(false)
    setCustomPriceInput('')
    setCustomPriceProduct(null)
  }

  const handleSaveNewSubtotal = () => {
    if (!editingCartItem) return

    const newTotalStr = editSubtotalInput.replace(/\D/g, '')
    const newTotal = Number(newTotalStr)

    if (!newTotal || newTotal <= 0) {
      toast.error("Iltimos, to‘g‘ri summa kiriting")
      return
    }

    const price = editingCartItem.price
    if (price <= 0) {
      toast.error("Mahsulot narxi noto‘g‘ri")
      return
    }

    const newQuantity = newTotal / price
    const roundedQuantity = Number(newQuantity.toFixed(3))

    if (roundedQuantity < 0.001) {
      toast.error("Juda kichik miqdor chiqdi")
      return
    }

    // Qo‘shimcha: agar oddiy mahsulot bo‘lsa — stockni tekshirish mumkin
    if (!editingCartItem.isCustom) {
      const product = products.find(p => p._id === editingCartItem.id)
      if (product && roundedQuantity > product.stock) {
        toast.error(`Yetarli mahsulot yo‘q! Omborda faqat ${product.stock} bor`)
        return
      }
    }

    setCartItems(prev =>
      prev.map(item =>
        item.id === editingCartItem.id
          ? {
            ...item,
            quantity: roundedQuantity,
            subtotal: newTotal,
            // isCustom: true deb qoldirish shart emas — o‘zgartirish mumkin, lekin hozircha qoldiramiz
          }
          : item
      )
    )

    toast.success(`Yangi summa: ${newTotal.toLocaleString()} so'm\nMiqdor: ${roundedQuantity} ${editingCartItem.measure}`)

    setShowEditSubtotalModal(false)
    setEditingCartItem(null)
    setEditSubtotalInput('')
  }

  const handleUpdateQuantity = (itemId: string, newQuantity: number, originalStock?: number) => {
    if (newQuantity <= 0) {
      setCartItems(prev => prev.filter(item => item.id !== itemId))
      toast('Mahsulot savatchadan olib tashlandi')
      return
    }

    const item = cartItems.find(item => item.id === itemId)
    if (item && !item.isCustom && originalStock && newQuantity > originalStock) {
      toast.error(`Yetarli mahsulot yo'q! Omborda faqat ${originalStock} dona mavjud`)
      return
    }

    setCartItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
            ...item,
            quantity: newQuantity,
            subtotal: newQuantity * item.price
          }
          : item
      )
    )
  }

  const handleUpdateCustomPrice = (itemId: string) => {
    const price = parseInt(editPriceValue.replace(/\s/g, ''))
    if (!isNaN(price) && price > 0) {
      setCartItems(prev =>
        prev.map(item =>
          item.id === itemId
            ? {
              ...item,
              price: price,
              subtotal: price * item.quantity,
              editing: false
            }
            : item
        )
      )
      toast.success(`Narx yangilandi: ${price.toLocaleString()} so'm`)
      setEditingItemId(null)
      setEditPriceValue('')
    } else {
      toast.error('Noto\'g\'ri narx kiritildi')
    }
  }

  const startEditPrice = (item: CustomPriceItem) => {
    setEditingItemId(item.id)
    setEditPriceValue(item.price.toString())
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error('Savatcha bo\'sh')
      return
    }

    for (const item of cartItems) {
      if (!item.isCustom) {
        const product = products.find(p => p._id === item.id)
        if (product && product.stock < item.quantity) {
          toast.error(`${item.name} uchun yetarli mahsulot yo'q! Omborda faqat ${product.stock} dona mavjud`)
          return
        }
        if (product && product.stock === 0) {
          toast.error(`${item.name} omborda mavjud emas!`)
          return
        }
      }
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
      printReceipt(invoice)
      toast.success(`Chek saqlandi! Jami: ${total.toLocaleString()} so'm`)
      setCartItems([])
      await loadAllData()
    } catch (error: any) {
      toast.error(`Chekni saqlashda xatolik: ${error.message || 'Noma\'lum xato'}`)
    }
  }

  const cartStats = {
    totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: cartItems.reduce((sum, item) => sum + item.subtotal, 0),
    uniqueItems: cartItems.length,
    customItems: cartItems.filter(item => item.isCustom).length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-teal-600 rounded-xl shadow">
                  <ShoppingCart className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Kassa
                  </h1>
                  <p className="text-gray-600 mt-1">Mahsulotlarni sotish va cheklarni chiqarish</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowScanner(true)}
                className="bg-teal-500 flex items-center gap-2 text-white px-4 py-2 rounded-xl md:hidden"
              >
                <ScanBarcodeIcon className="text-white" size={28} />
                Skanerlash
              </button>
              <button
                onClick={loadAllData}
                disabled={loading}
                className="px-5 py-2.5 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl text-gray-700 flex items-center gap-2 transition-all shadow-sm hover:shadow"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
                {loading ? 'Yuklanmoqda...' : 'Yangilash'}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Mahsulot nomi yoki kodini kiriting..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-base shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Package className="text-blue-600" size={22} />
                  <h2 className="text-lg font-bold text-gray-900">
                    {searchQuery ? 'Qidiruv natijalari' : 'Mahsulotlar'}
                  </h2>
                </div>
                <span className="text-sm text-gray-500">
                  {filteredProducts.length} ta
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock === 0

                  return (
                    <div
                      key={product._id}
                      className={`bg-white rounded-lg p-3 border transition-all hover:shadow ${isOutOfStock
                        ? 'border-gray-300 opacity-60'
                        : 'border-gray-200 hover:border-blue-300'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <Hash className="text-gray-400" size={10} />
                          <span className="text-[0.6rem] font-mono text-gray-500">{product?.code?.slice(-5) || 'Barcode yo`q'}</span>
                        </div>
                        <span className={`text-[0.6rem] px-2 py-0.5 rounded ${product.stock === 0 ? 'bg-red-100 text-red-700' :
                          product.stock < 10 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                          {product.stock !== 0 ? `${product.stock} ${product.measure}` : 'Qolmadi'}
                        </span>
                      </div>

                      <p className={`font-medium text-lg mb-2 truncate ${isOutOfStock ? 'text-gray-400' : 'text-gray-900'
                        }`}>
                        {product.name}
                      </p>

                      <div className="flex items-center justify-between mb-3">
                        <span className={`font-bold ${isOutOfStock ? 'text-gray-400' : 'text-green-600'
                          }`}>
                          {product.price.toLocaleString()} so'm
                        </span>
                        <span className="text-gray-500 text-xs">{product.measure}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!isOutOfStock) {
                              setKeypadProduct(product)
                              setKeypadValue('')
                              setShowKeypad(true)
                            }
                          }}
                          disabled={isOutOfStock}
                          className={`h-9 sm:h-10 w-9 sm:w-10 flex items-center justify-center rounded-lg ${isOutOfStock
                              ? 'bg-green-500 text-white cursor-not-allowed'
                              : 'bg-violet-400 hover:bg-violet-600 text-white'
                            }`}
                        >
                          <Scale size={18} />
                        </button>

                        <button
                          onClick={() => handleCustomPrice(product)}
                          disabled={isOutOfStock}
                          className={`h-9 sm:h-10 w-9 sm:w-10 flex items-center justify-center rounded-lg ${isOutOfStock
                              ? 'bg-orange-400 text-white cursor-not-allowed'
                              : 'bg-orange-400 hover:bg-orange-600 text-white'
                            }`}
                        >
                          <Euro size={18} />
                        </button>

                        <button
                          onClick={() => handleAddToCart(product, 1)}
                          disabled={isOutOfStock}
                          className={`h-9 sm:h-10 w-9 sm:w-10 flex-1 rounded-lg text-sm font-semibold transition-all ${isOutOfStock
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-teal-500 hover:bg-teal-600 text-white shadow-sm hover:shadow'
                            }`}
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {filteredProducts.length === 0 && !loading && (
                <div className="py-12 text-center">
                  <Package className="mx-auto text-gray-300" size={48} />
                  <p className="text-gray-400 mt-4">Mahsulotlar topilmadi</p>
                </div>
              )}

              {loading && (
                <div className="py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
                  <p className="mt-4 text-gray-400">Yuklanmoqda...</p>
                </div>
              )}
            </div>
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                <div className="bg-teal-600 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="text-white" size={22} />
                      <h2 className="text-xl font-bold text-white">Savatcha</h2>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-blue-100">
                        {cartStats.uniqueItems ? `${cartStats.uniqueItems} ta mahsulot` : `Mahsulotlar yo'q`}
                      </span>
                      {cartStats.customItems > 0 && (
                        <div className="text-xs text-purple-200 mt-1">
                          {cartStats.customItems} ta maxsus
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 max-h-[450px] overflow-y-auto">
                  {cartItems.length === 0 ? (
                    <div className="py-8 text-center">
                      <ShoppingCart className="mx-auto text-gray-300" size={40} />
                      <p className="text-gray-400 mt-3">Savatcha bo'sh</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Mahsulot qo'shish uchun ro'yxatdan tanlang
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {cartItems.map((item) => {
                        const product = products.find(p => p._id === item.id && !item.isCustom)
                        const isEditing = editingItemId === item.id

                        return (
                          <div
                            key={item.id}
                            className={`bg-gray-50 border rounded-lg p-3 ${item.isCustom ? 'border-purple-300' : 'border-gray-200'
                              }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-gray-900 font-medium text-sm">{item.name}</p>
                                  {item.isCustom && (
                                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded">
                                      Maxsus
                                    </span>
                                  )}
                                </div>

                                {isEditing ? (
                                  <div className="mt-2">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={editPriceValue}
                                        onChange={(e) => {
                                          const value = e.target.value.replace(/\D/g, '')
                                          setEditPriceValue(value ? parseInt(value).toLocaleString('uz-UZ') : '')
                                        }}
                                        className="flex-1 px-3 py-1 bg-white border border-gray-300 rounded-lg text-gray-900 text-base"
                                        placeholder="Narxni kiriting"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleUpdateCustomPrice(item.id)}
                                        className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                                        title="Saqlash"
                                      >
                                        <Save size={14} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingItemId(null)
                                          setEditPriceValue('')
                                        }}
                                        className="p-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
                                        title="Bekor qilish"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                    {item.originalPrice && (
                                      <p className="text-gray-500 text-xs mt-1">
                                        Asl narx: {item.originalPrice.toLocaleString()} so'm
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-blue-600 font-medium">
                                      {item.price.toLocaleString()} so'm
                                    </span>
                                    <span className="text-gray-400">x</span>
                                    <span className="text-gray-700">{item.quantity}</span>
                                    <span className="text-gray-500 text-l">{item.measure}</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <span
                                  className="text-green-600 text-xl font-bold cursor-pointer hover:text-green-700 transition-colors"
                                  onClick={() => {
                                    // Endi farq qilmaydi — har qanday item uchun subtotal modalini ochamiz
                                    setEditingCartItem(item)
                                    setEditSubtotalInput(item.subtotal.toLocaleString('uz-UZ'))
                                    setShowEditSubtotalModal(true)
                                  }}
                                >
                                  {item.subtotal.toLocaleString()}
                                </span>
                                <span className="text-gray-800 text-xs"> so'm</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => handleUpdateQuantity(
                                    item.id,
                                    item.quantity - 1,
                                    product?.stock
                                  )}
                                  className="w-10 h-10 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center transition-colors"
                                >
                                  <Minus size={18} />
                                </button>

                                {item.isCustom ? (
                                  <button
                                    onClick={() => startEditPrice(item)}
                                    className="w-10 h-10 bg-purple-100 border border-purple-300 hover:bg-purple-200 text-purple-600 rounded-full flex items-center justify-center transition-colors"
                                    title="Narxni tahrirlash"
                                  >
                                    <Edit2 size={18} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setKeypadProduct({
                                        _id: item.id,
                                        name: item.name,
                                        code: '',
                                        price: item.price,
                                        stock: product?.stock || 0,
                                        measure: item.measure,
                                      })
                                      setKeypadValue(item.quantity.toString())
                                      setShowKeypad(true)
                                    }}
                                    className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center font-mono transition-colors text-sm"
                                  >
                                    {item.quantity}
                                  </button>
                                )}

                                <button
                                  onClick={() => handleUpdateQuantity(
                                    item.id,
                                    item.quantity + 1,
                                    product?.stock
                                  )}
                                  className="w-10 h-10 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center transition-colors"
                                >
                                  <Plus size={18} />
                                </button>
                              </div>

                              <button
                                onClick={() => setCartItems(prev => prev.filter(i => i.id !== item.id))}
                                className="px-3 py-3 hover:cursor-pointer bg-red-500 hover:bg-red-600 text-white rounded-full text-sm transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {cartItems.length > 0 && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-600 font-medium">Jami summa:</span>
                      <span className="text-2xl font-bold text-gray-900">
                        {cartStats.totalAmount.toLocaleString()} so'm
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleCheckout}
                        className="flex-1 hover:cursor-pointer bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow hover:shadow-md"
                      >
                        <Receipt size={18} />
                        Sotish
                      </button>
                      <button
                        onClick={() => printReceipt({
                          date: new Date().toISOString(),
                          items: cartItems.map(item => ({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            measure: item.measure,
                            subtotal: item.subtotal
                          })),
                          subtotal: cartStats.totalAmount,
                          total: cartStats.totalAmount,
                          paymentMethod: 'naqd'
                        })}
                        className="px-4 py-2.5 hover:cursor-pointer bg-gray-700 hover:bg-gray-800 text-white rounded-lg font-bold flex items-center gap-2 transition-colors"
                      >
                        <Printer size={16} />
                      </button>
                      <button
                        onClick={() => setShowDebtModal(true)}
                        disabled={cartItems.length === 0}
                        className={`
      px-5 py-2.5 rounded-lg font-bold flex hover:cursor-pointer items-center gap-2 transition-all shadow hover:shadow-md
      ${cartItems.length === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-amber-600 hover:bg-amber-700 text-white'}
    `}
                      >
                        <NotebookPen size={18} />
                        Qarz
                      </button>
                    </div>

                    <button
                      onClick={() => setCartItems([])}
                      className="w-full hover:cursor-pointer flex items-center justify-center gap-2 mt-3 px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-gray-700 border border-gray-300 rounded-lg text-sm transition-colors shadow-sm"
                    >
                      Savatchani tozalash <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Keypad Modal - Modern Light Theme */}
      {showKeypad && keypadProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-xl max-w-sm w-full border border-gray-300 shadow-2xl">
            <input
              type="tel"
              inputMode="none"
              pattern="[0-9]*"
              readOnly={true}
              value={keypadValue}
              // onChange={(e) => {
              //   // faqat raqam va nuqta qoldiramiz
              //   const val = e.target.value.replace(/[^0-9.]/g, '');
              //   setKeypadValue(val);
              // }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleKeypadInput('enter');
                  addCustomPriceItem()       // ← bu sizda allaqachon bor funksiya
                  e.preventDefault();                // ikki marta submit bo'lmasligi uchun
                } else if (e.key === 'Escape') {
                  setShowKeypad(false);
                  setKeypadValue('');
                  setKeypadProduct(null);
                }
              }}
              className="absolute opacity-0 h-0 w-0 pointer-events-none"
            />
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate">Miqdorni kiriting</h3>
                  <p className="text-gray-600 text-sm mt-0.5 truncate">{keypadProduct.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-gray-500 text-xs">
                      Omborda: {keypadProduct.stock}
                    </span>
                    <span className="text-green-600 text-xs font-medium">
                      {keypadProduct.price.toLocaleString()} so'm
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowKeypad(false)
                    setKeypadValue('')
                    setKeypadProduct(null)
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
                >
                  <X className="text-gray-400" size={16} />
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* Display */}
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-gray-900 font-mono bg-gray-100 py-3 px-3 rounded-lg">
                  {keypadValue === '' ? '0' : keypadValue}
                </div>
              </div>

              {/* Compact Keypad */}
              <div className="space-y-2">
                {/* Quick Amounts */}
                <div className="grid grid-cols-4 gap-1">
                  {['0.5', '1', '1.5', '2'].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setKeypadValue(amount)}
                      className="px-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs transition-all border border-blue-100"
                    >
                      {amount}
                    </button>
                  ))}
                </div>

                {/* Main Keypad */}
                <div className="grid grid-cols-4 gap-1.5">
                  {/* Row 1 */}
                  {[7, 8, 9, 'backspace'].map((value, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleKeypadInput(value)}
                      className={`h-14 rounded-lg flex items-center justify-center text-xl font-bold transition-all active:scale-95 ${value === 'backspace'
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                        }`}
                    >
                      {value === 'backspace' ? '⌫' : value}
                    </button>
                  ))}

                  {/* Row 2 */}
                  {[4, 5, 6, 'clear'].map((value, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleKeypadInput(value)}
                      className={`h-14 rounded-lg flex items-center justify-center text-xl font-bold transition-all active:scale-95 ${value === 'clear'
                        ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-200'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                        }`}
                    >
                      {value === 'clear' ? 'C' : value}
                    </button>
                  ))}

                  {/* Row 3 */}
                  {[1, 2, 3, '.'].map((value, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleKeypadInput(value)}
                      className={`h-14 rounded-lg flex items-center justify-center text-xl font-bold transition-all active:scale-95 ${value === '.'
                        ? 'bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-200'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                        }`}
                    >
                      {value}
                    </button>
                  ))}

                  {/* Row 4 */}
                  <button
                    onClick={() => handleKeypadInput(0)}
                    className="h-14 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-lg flex items-center justify-center text-xl font-bold transition-all active:scale-95 col-span-2"
                  >
                    0
                  </button>
                  <button
                    onClick={() => setKeypadValue(keypadValue + '00')}
                    className="h-14 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-lg flex items-center justify-center text-lg font-bold transition-all active:scale-95"
                  >
                    00
                  </button>
                  <button
                    onClick={() => {
                      if (keypadProduct && keypadValue && keypadValue !== '0') {
                        const quantity = parseFloat(keypadValue)
                        if (!isNaN(quantity) && quantity > 0) {
                          if (keypadProduct.stock >= quantity) {
                            handleAddToCart(keypadProduct, quantity)
                            setShowKeypad(false)
                            setKeypadValue('')
                            setKeypadProduct(null)
                          } else {
                            toast.error(`Yetarli mahsulot yo'q! Omborda: ${keypadProduct.stock}`)
                          }
                        }
                      }
                    }}
                    disabled={!keypadValue || keypadValue === '0'}
                    className="px-3 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-all shadow-sm hover:shadow"
                  >
                    Qo'shish
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditSubtotalModal && editingCartItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-5 border-b">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Jami summani o‘zgartirish</h3>
                  <p className="text-gray-700 mt-1">{editingCartItem.name}</p>
                </div>
                <button
                  onClick={() => setShowEditSubtotalModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-full"
                >
                  <X size={24} className="text-gray-600" />
                </button>
              </div>
            </div>

            {/* Display + numpad */}
            <div className="p-4">
              <div className="mb-6 bg-gray-50 border rounded-xl p-5 text-right">
                <div className="text-2xl font-bold font-mono text-gray-900">
                  {editSubtotalValue || '0'}
                  <span className="text-xl text-gray-500 ml-1">so'm</span>
                </div>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-4 gap-3 select-none">
                {['1', '2', '3', '⌫', '4', '5', '6', 'C', '7', '8', '9', '00', '0', '.', ''].map((key, i) => {
                  if (key === '') return <div key={i} />; // bo‘sh joy

                  const isSpecial = ['⌫', 'C', '00', '.'].includes(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (key === '⌫') {
                          const digits = editSubtotalValue.replace(/\D/g, '').slice(0, -1);
                          setEditSubtotalValue(digits ? Number(digits).toLocaleString('uz-UZ') : '');
                        } else if (key === 'C') {
                          setEditSubtotalValue('');
                        } else {
                          let current = editSubtotalValue.replace(/\D/g, '');
                          let next = current + (key === '00' ? '00' : key);

                          if (key === '.' && current.includes('.')) return;
                          if (next.startsWith('0') && next.length > 1 && key !== '.') {
                            next = next.replace(/^0+/, '');
                          }

                          setEditSubtotalValue(Number(next).toLocaleString('uz-UZ'));
                        }
                      }}
                      className={`
                  h-12 text-lg font-bold rounded-xl transition-all active:scale-95
                  ${isSpecial
                          ? key === '⌫' || key === 'C'
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                        }
                `}
                    >
                      {key === '⌫' ? '⌫' : key}
                    </button>
                  );
                })}

                {/* Saqlash tugmasi */}
                <button
                  onClick={() => {
                    const newTotalStr = editSubtotalValue.replace(/\D/g, '');
                    const newTotal = Number(newTotalStr);

                    if (!newTotal || newTotal <= 0) {
                      toast.error("To‘g‘ri summa kiriting");
                      return;
                    }

                    const price = editingCartItem.price;
                    const newQty = newTotal / price;
                    const roundedQty = Number(newQty.toFixed(3));

                    setCartItems(prev => prev.map(it =>
                      it.id === editingCartItem.id
                        ? { ...it, quantity: roundedQty, subtotal: newTotal }
                        : it
                    ));

                    toast.success(`∑ ${newTotal.toLocaleString()} so'm\nMiqdor: ${roundedQty} ${editingCartItem.measure}`);
                    setShowEditSubtotalModal(false);
                    setEditingCartItem(null);
                    setEditSubtotalValue('');
                  }}
                  disabled={!editSubtotalValue || Number(editSubtotalValue.replace(/\D/g, '')) <= 0}
                  className="col-span-4 mt-4 h-10 text-lg font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                  Saqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDebtModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 max-h-[90vh] overflow-hidden flex flex-col">

            {/* Header */}
            <div className="p-2 border-b flex items-center justify-between bg-gradient-to-r from-amber-50 to-amber-100">
              <div className="flex items-center gap-3">
                <DollarSign className="text-amber-600" size={24} />
                <h2 className="text-lg md:text-xl font-bold text-gray-900">Qarz</h2>
              </div>
              <button
                onClick={() => {
                  setShowDebtModal(false)
                  setSelectedDebt(null)
                  setDebtSearch('')
                }}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            {/* Jami summa */}
            <div className="p-2 bg-amber-50 border-b text-center">
              <p className="text-gray-600 text-lg">Jami summa: {cartStats.totalAmount.toLocaleString()} so'm</p>
            </div>

            {/* Ikki variant */}
            <div className="p-2 space-y-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mavjud qarzga qo'shish */}
                <button
                  onClick={() => loadDebtsForModal()}
                  className="p-3 border-2 border-amber-200 hover:border-amber-400 rounded-2xl text-center transition-all hover:shadow-md active:scale-98 bg-white"
                >
                  <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                    <Search size={24} className="text-amber-600" />
                  </div>
                  <h3 className="font-bold text-base mb-1">Mavjud qarzga qo'shish</h3>
                  <p className="text-gray-600 text-xs">Qarzdorning mavjud yozuviga qo'shiladi</p>
                </button>

                {/* Yangi qarz yaratish */}
                <button
                  onClick={async () => {
                    setShowDebtModal(false)
                    await handleDebtSubmit('new')  // ← chek saqlanib, keyin /debt ga o'tadi
                  }}
                  className="p-3 border-2 border-green-200 hover:border-green-400 rounded-2xl text-center transition-all hover:shadow-md active:scale-98 bg-white"
                >
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <Plus size={24} className="text-green-600" />
                  </div>
                  <h3 className="font-bold text-base mb-1">Yangi qarz yaratish</h3>
                  <p className="text-gray-600 text-xs">Yangi qarzdor qo'shiladi</p>
                </button>
              </div>

              {/* Mavjud qarzlarni qidirish bloki */}
              {debtLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="animate-spin mx-auto" size={24} />
                  <p>Qarzlar yuklanmoqda...</p>
                </div>
              ) : debtRecords.length > 0 && (
                <>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Qarzdor ismini kiriting..."
                      value={debtSearch}
                      onChange={(e) => setDebtSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-1 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto border rounded-xl divide-y">
                    {debtRecords
                      .filter(d =>
                        d.customerName.toLowerCase().includes(debtSearch.toLowerCase()) &&
                        d.status === 'pending'
                      )
                      .map(debt => (
                        <div
                          key={debt._id}
                          onClick={async () => {
                            setSelectedDebt(debt)
                            setShowDebtModal(false)
                            await handleDebtSubmit('update', debt._id)  // ← chek saqlanib, keyin update rejimida ochiladi
                          }}
                          className="p-2 hover:bg-amber-50 cursor-pointer transition-colors flex justify-between items-center"
                        >
                          <div>
                            <p className="font-medium">{debt.customerName}</p>
                            <p className="text-sm text-gray-500">
                              Qoldiq: {debt.amount.toLocaleString()} so'm • {new Date(debt.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-amber-600 font-bold">
                              +{cartStats.totalAmount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}

                    {debtRecords.filter(d => d.status === 'pending').length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        To'lanmagan qarz topilmadi
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowDebtModal(false)}
                className="px-6 py-1 bg-gray-200 hover:bg-gray-300 rounded-xl font-medium transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          key="barcode-scanner-active"   // ← bu juda muhim! Har safar yangi instansiya yaratiladi
          onScan={(code) => {
            const product = products.find(p => p.code === code)
            if (product) {
              handleAddToCart(product, 1)
              toast.success(`Scan orqali qo‘shildi: ${product.name}`)
            } else {
              toast.error(`Mahsulot topilmadi: ${code}`)
            }
            // muhim: scan muvaffaqiyatli bo‘lsa ham modalni yopish mumkin (ixtiyoriy)
            // setShowScanner(false)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Custom Price Modal - Light Theme */}
      {showCustomPrice && customPriceProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full border border-gray-300 shadow-2xl">
            <input
              type="tel"
              inputMode="none"
              readOnly={true}
              pattern="[0-9]*"
              value={customPriceInput.replace(/\D/g, '')} // faqat raqamlar
              // onChange={(e) => {
              //   const raw = e.target.value.replace(/\D/g, '');
              //   setCustomPriceInput(raw ? Number(raw).toLocaleString('uz-UZ') : '');
              // }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleKeypadInput('enter');
                  addCustomPriceItem()       // ← bu sizda allaqachon bor funksiya
                  e.preventDefault();                // ikki marta submit bo'lmasligi uchun
                } else if (e.key === 'Escape') {
                  setShowCustomPrice(false);
                  setCustomPriceInput('');
                  setCustomPriceProduct(null);
                }
              }}
              className="absolute opacity-0 h-0 w-0 pointer-events-none"
              ref={(el) => {
                if (el) setTimeout(() => el.focus(), 100);
              }}
            />
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Maxsus narx kiriting</h3>
                <button
                  onClick={() => {
                    setShowCustomPrice(false)
                    setCustomPriceInput('')
                    setCustomPriceProduct(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="text-gray-400" size={20} />
                </button>
              </div>
              <p className="text-gray-600 text-sm mt-2">{customPriceProduct.name}</p>
              <p className="text-gray-500 text-xs mt-1">
                Standart narx: {customPriceProduct.price.toLocaleString()} so'm
              </p>
            </div>

            {/* Input */}
            <div className="p-6">
              {/* Professional Touch Keypad */}
              <div className="mb-6 space-y-4">
                {/* Display with Currency */}
                <div className="relative">
                  <div className="text-right bg-gray-100 border border-gray-300 rounded-xl p-4">
                    <div className="text-4xl font-bold text-gray-900 font-mono tracking-tight">
                      {customPriceInput || '0'}
                    </div>
                  </div>

                  {/* Clear button on display */}
                  {customPriceInput && (
                    <button
                      onClick={() => setCustomPriceInput('')}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <X className="text-gray-500 hover:text-gray-700" size={20} />
                    </button>
                  )}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-4 gap-2">
                  {/* Number buttons */}
                  {[
                    { value: '7', label: '7' },
                    { value: '8', label: '8' },
                    { value: '9', label: '9' },
                    { value: 'backspace', label: '⌫', color: 'amber' },
                    { value: '4', label: '4' },
                    { value: '5', label: '5' },
                    { value: '6', label: '6' },
                    { value: 'clear', label: 'C', color: 'red' },
                    { value: '1', label: '1' },
                    { value: '2', label: '2' },
                    { value: '3', label: '3' },
                    { value: '00', label: '00', color: 'blue' },
                    { value: '0', label: '0', colSpan: 2 },
                    { value: '000', label: '000', color: 'blue' },
                    { value: 'add', label: 'QO\'SHISH', color: 'green', colSpan: 1 }
                  ].map((btn) => {
                    const colSpan = btn.colSpan || 1
                    const colorClass = btn.color === 'amber'
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-200'
                      : btn.color === 'red'
                        ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-200'
                        : btn.color === 'blue'
                          ? 'bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100'
                          : btn.color === 'green'
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'

                    return (
                      <button
                        key={btn.value}
                        onClick={() => {
                          if (btn.value === 'backspace') {
                            const digits = customPriceInput.replace(/\D/g, '')
                            const newValue = digits.slice(0, -1)
                            setCustomPriceInput(newValue ? parseInt(newValue).toLocaleString('uz-UZ') : '')
                          } else if (btn.value === 'clear') {
                            setCustomPriceInput('')
                          } else if (btn.value === 'add') {
                            addCustomPriceItem()
                          } else {
                            const digits = customPriceInput.replace(/\D/g, '')
                            let newValue = digits

                            if (btn.value === '00') {
                              newValue = digits + '00'
                            } else if (btn.value === '000') {
                              newValue = digits + '000'
                            } else {
                              newValue = (digits + btn.value).replace(/^0+/, '')
                            }

                            setCustomPriceInput(newValue ? parseInt(newValue).toLocaleString('uz-UZ') : '')
                          }
                        }}
                        disabled={btn.value === 'add' && !customPriceInput}
                        className={`
                          h-14 rounded-lg border transition-all duration-200 active:scale-95
                          ${colorClass}
                          ${colSpan === 2 ? 'col-span-2' : ''}
                          ${btn.value === 'add' ? 'font-semibold text-base' : 'font-bold text-xl'}
                          ${btn.value === 'add' && !customPriceInput ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        {btn.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}