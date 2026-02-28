'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Navigation from '@/components/Navigation'
import { getInvoices, getInvoiceStats, Invoice } from '@/lib/api'
import { FileText, Download, Eye, Calendar, Printer, Search, DollarSign, Package, TrendingUp, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ITEMS_PER_PAGE = 20

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [expandedInvoices, setExpandedInvoices] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'items'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalInvoices, setTotalInvoices] = useState(0)
  const observerTarget = useRef<HTMLDivElement>(null)

  const [invoiceStats, setInvoiceStats] = useState({
    totalInvoices: 0,
    totalValue: 0,
    totalItems: 0,
    average: 0,
  })

  // Statistika yuklash
  const loadInvoiceStats = useCallback(async () => {
    try {
      const response = await getInvoiceStats()
      setInvoiceStats(response)
    } catch {
      toast.error('Statistikani yuklashda xatolik')
    }
  }, [])

  const loadInvoices = useCallback(async (isLoadMore = false) => {
    if (isLoadMore && (!hasMore || loadingMore)) return

    if (!isLoadMore) {
      setLoading(true)
      setInvoices([])
      setPage(1)
      setHasMore(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const currentPage = isLoadMore ? page + 1 : 1

      const response = await getInvoices({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm || undefined,
        dateFilter: dateFilter === 'all' ? undefined : dateFilter,
        sortBy,
        sortOrder,
      })

      const newInvoices = response.invoices || []

      setInvoices(prev => {
        const merged = [...prev, ...newInvoices]

        const unique = Array.from(
          new Map(merged.map(item => [item._id, item])).values()
        )

        return unique
      })
      setTotalInvoices(response.total || 0)
      setHasMore(response.hasMore ?? (newInvoices.length === ITEMS_PER_PAGE))
      if (isLoadMore) setPage(currentPage)

      // Toast faqat birinchi yuklashda chiqsin
      if (!isLoadMore && !searchTerm) {
        toast.success('Cheklar yuklandi')
      } else if (newInvoices.length > 0) {
        // ixtiyoriy: yangi cheklar yuklanganda kichik bildirishnoma
        // toast.success(`${newInvoices.length} ta yangi chek qo‘shildi`, { duration: 2000 })
      }

    } catch (err) {
      console.error(err)
      toast.error('Cheklarni yuklashda xatolik')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [searchTerm, dateFilter, sortBy, sortOrder, page, hasMore, loadingMore])

  // Birinchi yuklash va filtr o‘zgarganda
  useEffect(() => {
    loadInvoices(false)
  }, [searchTerm, dateFilter, sortBy, sortOrder])

  // Statistika bir marta yuklanadi
  useEffect(() => {
    loadInvoiceStats()
  }, [loadInvoiceStats])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && !loadingMore && hasMore) {
          loadInvoices(true)
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [loading, loadingMore, hasMore])


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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Jami cheklar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Jami cheklar</p>
                <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <FileText className="text-purple-600" size={18} />
                </div>
              </div>
              <div className="mt-auto">
                <p className="text-2xl font-bold text-gray-900 truncate">{invoiceStats.totalInvoices}</p>
                <p className="text-gray-500 text-xs mt-1">ta chek</p>
              </div>
            </div>
          </div>

          {/* Jami summa */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Jami summa</p>
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <DollarSign className="text-green-600" size={18} />
                </div>
              </div>
              <div className="mt-auto">
                <p className="text-2xl font-bold text-gray-900 truncate">{invoiceStats.totalValue.toLocaleString()}</p>
                <p className="text-gray-500 text-xs mt-1">so'm</p>
              </div>
            </div>
          </div>

          {/* Sotilgan mahsulot */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Sotilgan mahsulot</p>
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <Package className="text-blue-600" size={18} />
                </div>
              </div>
              <div className="mt-auto">
                <p className="text-2xl font-bold text-gray-900 truncate">
                  {invoiceStats?.totalItems?.toFixed(1)}
                </p>
                <p className="text-gray-500 text-xs mt-1">dona</p>
              </div>
            </div>
          </div>

          {/* O'rtacha chek */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col h-full">
              <div className="flex items-start justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">O'rtacha chek</p>
                <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                  <TrendingUp className="text-amber-600" size={18} />
                </div>
              </div>
              <div className="mt-auto">
                <p className="text-2xl font-bold text-gray-900 truncate">
                  {Math.round(invoiceStats.average).toLocaleString()}
                </p>
                <p className="text-gray-500 text-xs mt-1">so'm</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Qidiruv
              </label>
              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Chek ID yoki mahsulot nomi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                     text-gray-900 placeholder-gray-400 
                     focus:outline-none focus:border-blue-500 
                     focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>
            </div>

            {/* Date + Clear */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                Sana filtri
              </label>
              <div className="flex gap-3">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 
                     rounded-xl text-gray-700 
                     focus:outline-none focus:border-blue-500 
                     focus:ring-2 focus:ring-blue-100 transition"
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
                  className="px-4 py-3 bg-white border border-gray-300 
                     rounded-xl text-gray-700 
                     hover:bg-gray-50 hover:border-gray-400 
                     transition"
                >
                  Tozalash
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="my-6 border-t border-gray-100" />

          {/* Sort Options */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm font-medium text-gray-600">
              Saralash
            </p>

            <div className="flex rounded-xl p-1 gap-2 w-fit">
              <SortButton type="date" label="Sana" />
              <SortButton type="amount" label="Summa" />
              <SortButton type="items" label="Mahsulotlar" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading && invoices.length === 0 ? (
            <div className="text-center py-16">
              <Loader2 className="inline-block animate-spin h-10 w-10 text-teal-600" />
              <p className="mt-4 text-gray-400">Cheklar yuklanmoqda...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
              <FileText className="mx-auto text-gray-300 mb-6" size={64} />
              <h3 className="text-2xl font-bold text-gray-400 mb-2">Cheklar topilmadi</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || dateFilter !== 'all'
                  ? 'Qidiruv natijalari bo‘sh'
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
                {invoices.length} / {totalInvoices} ta chek ko‘rsatilmoqda
              </div>

              {Array.isArray(invoices) &&
                invoices.map((invoice) => (
                  <div
                    key={invoice._id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow transition-all duration-200"
                  >
                    {/* Invoice Header - Compact */}
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleExpandInvoice(invoice._id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Left side - Basic info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-1.5 bg-purple-100 rounded-lg flex-shrink-0">
                            <FileText className="text-purple-600" size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-gray-900 font-semibold text-base truncate">
                              Chek #{invoice._id.slice(-8).toUpperCase()}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs border border-green-200">
                                <Calendar size={10} />
                                {new Date(invoice.date).toLocaleDateString('ru-RU')}
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs border border-blue-200">
                                <Package size={10} />
                                {invoice.items.length} ta
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right side - Amount & Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right mr-1">
                            <p className="text-xs text-gray-500">summa</p>
                            <p className="text-sm font-bold text-green-600 truncate max-w-[100px]">
                              {invoice.total.toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedInvoice(invoice)
                              }}
                              className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors border border-blue-200"
                              title="Batafsil"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleExpandInvoice(invoice._id)
                              }}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors border border-gray-200"
                            >
                              {expandedInvoices.includes(invoice._id) ?
                                <ChevronUp size={14} /> : <ChevronDown size={14} />
                              }
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content - Compact */}
                    {expandedInvoices.includes(invoice._id) && (
                      <div className="border-t border-gray-200 bg-gray-50 p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Products list */}
                          <div>
                            <h4 className="text-gray-900 font-medium text-sm mb-2">Mahsulotlar</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {invoice.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 text-sm"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-gray-900 font-medium truncate">{item.name}</p>
                                    <p className="text-gray-500 text-xs">
                                      {item.quantity} {item.measure} × {item.price.toLocaleString()}
                                    </p>
                                  </div>
                                  <p className="text-green-600 font-medium text-xs ml-2 whitespace-nowrap">
                                    {item.subtotal.toLocaleString()} so'm
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Payment info */}
                          <div>
                            <h4 className="text-gray-900 font-medium text-sm mb-2">To'lov</h4>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Usul:</span>
                                <span className="text-gray-900 font-medium capitalize">
                                  {invoice.paymentMethod}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="text-gray-900">{invoice.subtotal.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-2">
                                <span className="text-gray-800 font-medium">Jami:</span>
                                <span className="text-green-600 font-bold">
                                  {invoice.total.toLocaleString()} so'm
                                </span>
                              </div>

                              {/* Action buttons */}
                              <div className="flex gap-2 pt-2">
                                <button
                                  onClick={() => printInvoice(invoice)}
                                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 text-xs transition-colors border border-teal-200"
                                >
                                  <Printer size={12} />
                                  Chop etish
                                </button>
                                <button
                                  onClick={() => downloadInvoice(invoice)}
                                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 text-xs transition-colors border border-teal-200"
                                >
                                  <Download size={12} />
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

              {/* Loading More */}
              {hasMore && (
                <div ref={observerTarget} className="py-6 text-center">
                  {loadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                      <Loader2 className="animate-spin" size={20} />
                      <span>Yana cheklar yuklanmoqda...</span>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">
                      Pastga tushing...
                    </div>
                  )}
                </div>
              )}

              {!hasMore && invoices.length > 0 && (
                <div className="py-6 text-center border-t border-gray-200">
                  <div className="text-gray-500 text-sm">
                    Barcha {totalInvoices} ta chek ko‘rsatildi
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Invoice Detail Modal - Compact & Beautiful */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">

            {/* Modal Header - Sticky */}
            <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-teal-500 px-5 py-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <FileText size={18} className="text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-base">Chek #{selectedInvoice._id.slice(-8).toUpperCase()}</h2>
                  <p className="text-xs text-teal-100">{new Date(selectedInvoice.date).toLocaleDateString('uz-UZ')}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-120px)] space-y-4">

              {/* Quick Stats Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-teal-50 p-3 rounded-xl border border-teal-200">
                  <p className="text-teal-600 text-xs mb-0.5">To'lov usuli</p>
                  <p className="font-bold text-gray-800 capitalize text-sm">{selectedInvoice.paymentMethod}</p>
                </div>
                <div className="bg-teal-50 p-3 rounded-xl border border-teal-200">
                  <p className="text-teal-600 text-xs mb-0.5">Mahsulotlar</p>
                  <p className="font-bold text-gray-800 text-sm">{selectedInvoice.items.length} ta</p>
                </div>
                <div className="bg-teal-50 p-3 rounded-xl border border-teal-200">
                  <p className="text-teal-600 text-xs mb-0.5">Jami summa</p>
                  <p className="font-bold text-teal-600 text-sm">{selectedInvoice.total.toLocaleString()} so'm</p>
                </div>
              </div>

              {/* Products List - Compact */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                    <Package size={14} className="text-teal-600" />
                    Mahsulotlar
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
                  {selectedInvoice.items.map((item, idx) => (
                    <div key={idx} className="px-4 py-2.5 hover:bg-white transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800 text-sm truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">
                              {item.quantity} {item.measure}
                            </span>
                            <span className="text-xs text-gray-400">×</span>
                            <span className="text-xs text-gray-600">{item.price.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-teal-600 whitespace-nowrap">
                            {item.subtotal.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500 ml-0.5">so'm</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total inside products section */}
                <div className="bg-teal-50 px-4 py-2.5 border-t border-teal-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-700 text-sm">Umumiy:</span>
                    <span className="font-bold text-teal-600 text-base">
                      {selectedInvoice.total.toLocaleString()} so'm
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer - Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex gap-2">
              <button
                onClick={() => printInvoice(selectedInvoice)}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow"
              >
                <Printer size={16} />
                Chop etish
              </button>
              <button
                onClick={() => downloadInvoice(selectedInvoice)}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow"
              >
                <Download size={16} />
                Yuklab olish
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors border border-gray-200"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  )
}