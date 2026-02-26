'use client'

import { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'
import { getInvoices, Invoice } from '@/lib/api'
import { FileText, Download, Eye, Calendar, Filter, Printer, Search, DollarSign, Package, Users, TrendingUp, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ITEMS_PER_PAGE = 20

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([])
  const [displayedInvoices, setDisplayedInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [expandedInvoices, setExpandedInvoices] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'items'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadInvoices()
  }, [])

  useEffect(() => {
    filterAndSortInvoices()
    setCurrentPage(1) // Filter o'zgarganda 1-sahifaga qaytish
  }, [invoices, searchTerm, dateFilter, sortBy, sortOrder])

  useEffect(() => {
    // Scrollga qarab yangi cheklarni ko'rsatish
    const startIndex = 0
    const endIndex = currentPage * ITEMS_PER_PAGE
    setDisplayedInvoices(filteredInvoices.slice(0, endIndex))
  }, [filteredInvoices, currentPage])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting &&
          !loadingMore &&
          displayedInvoices.length < filteredInvoices.length) {
          setLoadingMore(true)
          setTimeout(() => {
            setCurrentPage(prev => prev + 1)
            setLoadingMore(false)
          }, 300)
        }
      },
      { threshold: 0.5 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [loadingMore, displayedInvoices.length, filteredInvoices.length])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const data = await getInvoices()
      setInvoices(data)
      toast.success('Cheklar yuklandi')
    } catch (error) {
      toast.error('Cheklarni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortInvoices = () => {
    let filtered = [...invoices]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice =>
        invoice._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.items.some(item =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Date filter
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)
    const lastMonth = new Date(today)
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    if (dateFilter !== 'all') {
      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.date)

        switch (dateFilter) {
          case 'today':
            return invoiceDate >= today
          case 'yesterday':
            return invoiceDate >= yesterday && invoiceDate < today
          case 'week':
            return invoiceDate >= lastWeek
          case 'month':
            return invoiceDate >= lastMonth
          default:
            return true
        }
      })
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
          break
        case 'amount':
          aValue = a.total
          bValue = b.total
          break
        case 'items':
          aValue = a.items.length
          bValue = b.items.length
          break
        default:
          aValue = new Date(a.date).getTime()
          bValue = new Date(b.date).getTime()
      }

      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
    })

    setFilteredInvoices(filtered)
  }

  const downloadInvoice = (invoice: Invoice) => {
    const content = `
╔══════════════════════════════════════════╗
║               SAVDO CHEKI                ║
╠══════════════════════════════════════════╣
║ Sana: ${new Date(invoice.date).toLocaleString('ru-RU')}
║ Chek ID: ${invoice._id}
╠══════════════════════════════════════════╣
║           MAHSULOTLAR                    ║
╠══════════════════════════════════════════╣
${invoice.items.map((item, idx) =>
      `║ ${item.name.padEnd(25)} ║
║   ${item.quantity} ${item.measure} x ${item.price.toLocaleString()} so'm
║   Jami: ${item.subtotal.toLocaleString().padStart(10)} so'm
╠══════════════════════════════════════════╣`
    ).join('\n')}
║                                          ║
╠══════════════════════════════════════════╣
║ Jami: ${invoice.total.toLocaleString().padStart(25)} so'm
╠══════════════════════════════════════════╣
║ To'lov usuli: ${invoice.paymentMethod}
╚══════════════════════════════════════════╝
`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chek-${invoice._id}-${new Date(invoice.date).toLocaleDateString('ru-RU')}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Chek yuklab olindi')
  }

  const printInvoice = (invoice: Invoice) => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Chek #${invoice._id}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;700&display=swap');
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                font-family: 'Roboto Mono', monospace;
              }
              body { 
                background: white; 
                color: black; 
                padding: 20px;
                font-size: 14px;
              }
              .receipt {
                max-width: 300px;
                margin: 0 auto;
              }
              .header {
                text-align: center;
                padding-bottom: 10px;
                border-bottom: 1px dashed #000;
                margin-bottom: 15px;
              }
              .header h1 {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .items {
                margin: 15px 0;
              }
              .item-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding-bottom: 5px;
                border-bottom: 1px dotted #ccc;
              }
              .item-name {
                flex: 2;
                font-weight: 500;
              }
              .item-details {
                flex: 1;
                text-align: right;
              }
              .totals {
                margin-top: 20px;
                padding-top: 10px;
                border-top: 2px solid #000;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
              }
              .final-total {
                font-weight: bold;
                font-size: 18px;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px dashed #000;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                padding-top: 10px;
                border-top: 1px solid #000;
                font-size: 12px;
                opacity: 0.7;
              }
              @media print {
                body {
                  margin: 0;
                  padding: 10px;
                }
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <h1>SAVDO CHEKI</h1>
                <div>${new Date(invoice.date).toLocaleString('uz-UZ')}</div>
                <div>ID: ${invoice._id.slice(0, 8)}</div>
              </div>
              
              <div class="items">
                ${invoice.items.map(item => `
                  <div class="item-row">
                    <div class="item-name">${item.name}</div>
                    <div class="item-details">
                      ${item.quantity} x ${item.price.toLocaleString()} = ${item.subtotal.toLocaleString()} so'm
                    </div>
                  </div>
                `).join('')}
              </div>
              
              <div class="totals">
                <div class="final-total">
                  <span>ИТОГО:</span>
                  <span>${invoice.total.toLocaleString()} so'm</span>
                </div>
              </div>
              
              <div class="footer">
                <p>Rahmat!</p>
                <p>${new Date().getFullYear()} © Savdo Markazi</p>
              </div>
            </div>
            
            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 1000);
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const toggleExpandInvoice = (invoiceId: string) => {
    setExpandedInvoices(prev =>
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    )
  }

  const getStats = () => {
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0)
    const totalItems = filteredInvoices.reduce((sum, inv) =>
      sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    )
    const uniqueProducts = new Set(
      filteredInvoices.flatMap(inv => inv.items.map(item => item.name))
    ).size

    return {
      totalAmount,
      totalItems,
      uniqueProducts,
      count: filteredInvoices.length,
      average: filteredInvoices.length > 0 ? totalAmount / filteredInvoices.length : 0
    }
  }

  const stats = getStats()

  const SortButton = ({ type, label }: { type: typeof sortBy, label: string }) => (
    <button
      onClick={() => {
        if (sortBy === type) {
          setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
        } else {
          setSortBy(type)
          setSortOrder('desc')
        }
      }}
      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${sortBy === type
        ? 'bg-teal-600 text-white border border-teal-600'
        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
        }`}
    >
      {label}
      {sortBy === type && (
        sortOrder === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-teal-600 rounded-xl shadow">
              <FileText className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Cheklar arxivi
              </h1>
              <p className="text-gray-600 mt-1">
                Barcha savdo operatsiyalari va to'lovlar
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">Jami cheklar</p>
              <p className="text-2xl font-bold text-gray-900">{stats.count}</p>
              <p className="text-gray-500 text-xs">ta</p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="text-purple-600" size={20} />
            </div>
          </div>
        </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Jami summa</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAmount.toLocaleString()}</p>
                <p className="text-gray-500 text-xs">so'm</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="text-green-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Sotilgan mahsulot</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
                <p className="text-gray-500 text-xs">ta</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="text-blue-600" size={20} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">O'rtacha chek</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(stats.average).toLocaleString()}</p>
                <p className="text-gray-500 text-xs">so'm</p>
              </div>
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="text-amber-600" size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Chek ID yoki mahsulot nomi bo'yicha qidirish..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Date Filter */}
            <div className="flex gap-3">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="all">Barcha vaqt</option>
                <option value="today">Bugun</option>
                <option value="yesterday">Kecha</option>
                <option value="week">So'nggi hafta</option>
                <option value="month">So'nggi oy</option>
              </select>

              <button
                onClick={() => {
                  setSearchTerm('')
                  setDateFilter('all')
                }}
                className="flex-1 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl text-gray-700 hover:text-gray-900 transition-all flex items-center gap-2"
              >
                <X size={18} />
                Tozalash
              </button>
            </div>
          </div>

          {/* Sort Options */}
          <div className="mt-4 flex flex-wrap gap-2">
            <p className="text-gray-600 text-sm mr-4">Saralash:</p>
            <SortButton type="date" label="Sana bo'yicha" />
            <SortButton type="amount" label="Summa bo'yicha" />
            <SortButton type="items" label="Mahsulotlar bo'yicha" />
          </div>
        </div>

        {/* Invoices List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-400">Cheklar yuklanmoqda...</p>
            </div>
          ) : displayedInvoices.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
              <FileText className="mx-auto text-gray-300 mb-6" size={64} />
              <h3 className="text-2xl font-bold text-gray-400 mb-2">Cheklar topilmadi</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || dateFilter !== 'all'
                  ? 'Qidiruv natijalari bo\'sh'
                  : 'Hozircha hech qanday chek mavjud emas'}
              </p>
              {(searchTerm || dateFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setDateFilter('all')
                  }}
                  className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-all shadow hover:shadow-md"
                >
                  Filtrlarni tozalash
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="text-sm text-gray-600 mb-4">
                {displayedInvoices.length} / {filteredInvoices.length} ta chek • Jami: {stats.totalAmount.toLocaleString()} so'm
              </div>

              {displayedInvoices.map((invoice) => (
                <div
                  key={invoice._id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow transition-all duration-300"
                >
                  {/* Invoice Header */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpandInvoice(invoice._id)}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <FileText className="text-purple-600" size={20} />
                          </div>
                          <div>
                            <h3 className="text-gray-900 font-bold truncate text-lg">
                              Chek #{invoice._id.slice(-8).toUpperCase()}
                            </h3>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm border border-green-200">
                                <Calendar size={12} />
                                {new Date(invoice.date).toLocaleDateString('ru-RU')}
                              </span>
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm border border-blue-200">
                                <Package size={12} />
                                {invoice.items.length} ta mahsulot
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 md:gap-2 text-right min-w-[100px]">
                        <p className="text-gray-600 text-sm md:text-base">Jami summa</p>
                        <p className="text-2xl md:text-3xl font-bold text-green-600 truncate">
                          {invoice.total.toLocaleString()}
                        </p>
                        <p className="text-gray-500 text-sm md:text-base">so'm</p>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedInvoice(invoice)
                          }}
                          className="p-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors border border-blue-200"
                          title="Batafsil ko'rish"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            printInvoice(invoice)
                          }}
                          className="p-3 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl transition-colors border border-amber-200"
                          title="Chop etish"
                        >
                          <Printer size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            downloadInvoice(invoice)
                          }}
                          className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors border border-gray-300"
                          title="Yuklab olish"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpandInvoice(invoice._id)
                          }}
                          className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors border border-gray-300"
                        >
                          {expandedInvoices.includes(invoice._id) ?
                            <ChevronUp size={18} /> : <ChevronDown size={18} />
                          }
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedInvoices.includes(invoice._id) && (
                    <div className="border-t border-gray-200 bg-gray-50 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-x-auto">
                        <div>
                          <h4 className="text-gray-900 font-semibold mb-3">Mahsulotlar</h4>
                          <div className="space-y-2">
                            {invoice.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col md:flex-row gap-6 justify-between items-center p-3 bg-white rounded-lg border border-gray-200"
                              >
                                <div>
                                  <p className="text-gray-900 font-medium">{item.name}</p>
                                  <p className="text-gray-600 text-sm">
                                    {item.quantity} {item.measure} × {item.price.toLocaleString()} so'm
                                  </p>
                                </div>
                                <p className="text-green-600 font-semibold">
                                  {item.subtotal.toLocaleString()} so'm
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-gray-900 font-semibold mb-3">To'lov ma'lumotlari</h4>
                          <div className="space-y-4">
                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                              <p className="text-gray-600 text-sm mb-1">To'lov usuli</p>
                              <p className="text-gray-900 font-semibold capitalize">
                                {invoice.paymentMethod}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex flex-col md:flex-row gap-6 justify-between">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="text-gray-900">
                                  {invoice.subtotal.toLocaleString()} so'm
                                </span>
                              </div>
                              <div className="flex flex-col md:flex-row gap-6 justify-between border-t border-gray-300 pt-2">
                                <span className="text-gray-900 font-bold truncate">Jami:</span>
                                <span className="text-green-600 font-bold text-lg truncate">
                                  {invoice.total.toLocaleString()} so'm
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                              <button
                                onClick={() => printInvoice(invoice)}
                                className="flex-1 bg-amber-100 hover:bg-amber-200 text-amber-700 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors border border-amber-200"
                              >
                                <Printer size={16} />
                                Chop etish
                              </button>
                              <button
                                onClick={() => downloadInvoice(invoice)}
                                className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors border border-blue-200"
                              >
                                <Download size={16} />
                                Yuklab olish
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading More Indicator */}
              {displayedInvoices.length > 0 && displayedInvoices.length < filteredInvoices.length && (
                <div ref={observerTarget} className="py-6 text-center">
                  {loadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                      <Loader2 className="animate-spin" size={20} />
                      <span>Yana cheklar yuklanmoqda...</span>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      Pastga tushing yoki kuting...
                    </div>
                  )}
                </div>
              )}

              {/* End of List */}
              {displayedInvoices.length > 0 && displayedInvoices.length === filteredInvoices.length && (
                <div className="py-6 text-center border-t border-gray-200">
                  <div className="text-gray-500 text-sm">
                    📋 Barcha {filteredInvoices.length} ta chek ko'rsatilmoqda
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl sm:max-w-full w-full max-h-[90vh] overflow-y-auto ...">
            <div className="sticky top-0 bg-white border-b border-gray-300 px-6 py-4 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="text-purple-600" size={20} />
                </div>
                <h2 className="text-gray-900 text-xl font-bold">
                  Chek #{selectedInvoice._id.slice(-8).toUpperCase()}
                </h2>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="text-gray-500" size={24} />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Invoice Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-gray-600 text-sm mb-1">Sana va vaqt</p>
                  <p className="text-gray-900 font-semibold">
                    {new Date(selectedInvoice.date).toLocaleString('ru-RU')}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-gray-600 text-sm mb-1">Mahsulotlar soni</p>
                  <p className="text-gray-900 font-semibold">{selectedInvoice.items.length} ta</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <p className="text-gray-600 text-sm mb-1">To'lov usuli</p>
                  <p className="text-gray-900 font-semibold capitalize">{selectedInvoice.paymentMethod}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-300 rounded-xl overflow-hidden">
                <div className="bg-gray-50 p-4 border-b border-gray-300">
                  <h3 className="text-gray-900 font-bold text-lg">Mahsulotlar ro'yxati</h3>
                </div>
                <div className="divide-y divide-gray-300">
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium">{item.name}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-gray-600 text-sm">
                              Miqdori: {item.quantity} {item.measure}
                            </span>
                            <span className="text-gray-600 text-sm">
                              Narxi: {item.price.toLocaleString()} so'm
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-600 font-semibold text-lg">
                            {item.subtotal.toLocaleString()}
                          </p>
                          <p className="text-gray-500 text-sm">so'm</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Section */}
              <div className="bg-gray-50 border border-gray-300 rounded-xl p-6">
                <div className="flex justify-between items-center border-t border-gray-400 pt-4">
                  <span className="text-gray-900 text-2xl font-bold">Jami:</span>
                  <span className="text-green-600 text-3xl font-bold">
                    {selectedInvoice.total.toLocaleString()} so'm
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => printInvoice(selectedInvoice)}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow hover:shadow-md"
                >
                  <Printer size={20} />
                  Chop etish
                </button>
                <button
                  onClick={() => downloadInvoice(selectedInvoice)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow hover:shadow-md"
                >
                  <Download size={20} />
                  Yuklab olish
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-4 px-6 rounded-xl font-bold transition-colors"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}