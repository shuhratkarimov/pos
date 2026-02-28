'use client'

import { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'
import { getReportInvoices, getReportSummary, getTopSellingProducts, Invoice, TopProduct } from '@/lib/api'
import {
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Package,
  ShoppingCart,
  Download,
  RefreshCw,
  PieChart,
  BarChart,
  LineChart,
  Filter,
  ChevronRight,
  Users,
  Clock,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  LineChart as RechartsLineChart,
  Line
} from 'recharts'

const COLORS = [
  '#0D9488', // teal-600
  '#0891B2', // cyan-600  
  '#059669', // emerald-600
  '#7C3AED', // violet-600
  '#DB2777', // pink-600
  '#DC2626', // red-600
  '#D97706', // amber-600
  '#65A30D', // lime-600
  '#4F46E5', // indigo-600
  '#9333EA'  // purple-600
];

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | 'hourly'

const ITEMS_PER_PAGE = 20

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar')
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days')
  const [expandedView, setExpandedView] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const observerTarget = useRef<HTMLDivElement>(null)
  const [summary, setSummary] = useState<any>(null);           // jami statistika + chart datalari
  const [invoices, setInvoices] = useState<Invoice[]>([]);     // cheklar ro'yxati (pagination bilan)
  const [totalInvoices, setTotalInvoices] = useState(0);       // umumiy cheklar soni (pagination uchun)
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [topProducts, setTopProducts] = useState<TopProduct>({
    data: [{
      productId: '',
      name: '',
      code: '',
      price: 0,
      measure: '',
      stock: 0,
      soldQuantity: 0,
      totalRevenue: 0,
    }],
    period: {
      startDate: '',
      endDate: '',
    },
    success: false,
    totalSales: 0,
  });

  useEffect(() => {
    calculateDefaultDates()
  }, [periodType, timeRange])

  useEffect(() => {
    if (!startDate || !endDate) return
    handleGetReport()
  }, [startDate, endDate])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          loadMoreInvoices()
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
  }, [hasMore, loadingMore, startDate, endDate])   // muhim dependency'lar

  const calculateDefaultDates = () => {
    const today = new Date()
    const defaultEnd = today.toISOString().split('T')[0]

    let defaultStart = ''

    if (timeRange === 'custom') {
      if (periodType === 'daily') {
        defaultStart = defaultEnd
      } else if (periodType === 'weekly') {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        defaultStart = sevenDaysAgo.toISOString().split('T')[0]
      } else if (periodType === 'monthly') {
        const lastMonth = new Date()
        lastMonth.setMonth(lastMonth.getMonth() - 1)
        defaultStart = lastMonth.toISOString().split('T')[0]
      } else if (periodType === 'yearly') {
        const lastYear = new Date()
        lastYear.setFullYear(lastYear.getFullYear() - 1)
        defaultStart = lastYear.toISOString().split('T')[0]
      }
    } else {
      const start = new Date()
      if (timeRange === '7days') {
        start.setDate(start.getDate() - 7)
      } else if (timeRange === '30days') {
        start.setMonth(start.getMonth() - 1)
      } else if (timeRange === '90days') {
        start.setMonth(start.getMonth() - 3)
      }
      defaultStart = start.toISOString().split('T')[0]
      setPeriodType(timeRange === '7days' ? 'weekly' : 'monthly')
    }

    setStartDate(defaultStart)
    setEndDate(defaultEnd)
  }

  const handleGetReport = async () => {
    if (!startDate || !endDate) {
      toast.error('Sanalarni tanlang')
      return
    }

    setLoading(true)
    try {
      const summaryData = await getReportSummary(
        startDate,
        endDate,
        periodType as 'daily' | 'weekly' | 'monthly' | 'hourly'
      )
      setSummary(summaryData)
      setTotalInvoices(summaryData?.totalInvoices ?? 0)

      await loadTopProducts(startDate, endDate)

      const response = await getReportInvoices(
        startDate,
        endDate,
        1,
        ITEMS_PER_PAGE
      )

      const firstPage = Array.isArray(response?.invoices) ? response.invoices : []
      const hasMoreValue = response?.hasMore ?? false

      setInvoices(firstPage)
      setHasMore(hasMoreValue)
      setPage(1)

      toast.success(`Hisobot yuklandi: ${summaryData?.totalInvoices ?? 0} ta chek`)
    } catch (err: any) {
      console.error("Hisobot yuklash xatosi:", err)
      toast.error(err.message || 'Hisobot yuklanmadi')
      setTopProducts({
        data: [{
          productId: '',
          name: '',
          code: '',
          price: 0,
          measure: '',
          stock: 0,
          soldQuantity: 0,
          totalRevenue: 0,
        }],
        period: {
          startDate: '',
          endDate: '',
        },
        success: false,
        totalSales: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTopProducts = async (start: string, end: string) => {
    try {
      const data = await getTopSellingProducts(15, start, end)
      setTopProducts(data)
    } catch (error) {
      console.error('Top products yuklanmadi:', error)
      setTopProducts({
        data: [{
          productId: '',
          name: '',
          code: '',
          price: 0,
          measure: '',
          stock: 0,
          soldQuantity: 0,
          totalRevenue: 0,
        }],
        period: {
          startDate: '',
          endDate: '',
        },
        success: false,
        totalSales: 0,
      })
    }
  }


  useEffect(() => {
    if (startDate && endDate && summary) {
      loadTopProducts(startDate, endDate)
    }
  }, [startDate, endDate])

  const loadMoreInvoices = async () => {
    if (!hasMore || loadingMore || !startDate || !endDate) return
    setLoadingMore(true)

    try {
      const nextPage = page + 1
      const response = await getReportInvoices(
        startDate,
        endDate,
        nextPage,
        ITEMS_PER_PAGE
      )

      const newInvoices = Array.isArray(response?.invoices) ? response.invoices : []
      const stillMore = response?.hasMore ?? false

      setInvoices(prev => [...prev, ...newInvoices])
      setHasMore(stillMore)
      setPage(nextPage)
    } catch (err) {
      console.error('Yana cheklar yuklanmadi', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const chartData = summary?.timeSeries?.map((item: any) => ({
    date: item._id || item.date,           // _id ni date deb qayta nomlaymiz
    sales: item.sales,
    count: item.count
  })) || []

  console.log("Top products:", topProducts)

  const getTrend = () => {
    if (!summary?.timeSeries?.length || summary.timeSeries.length < 2) return 'stable'

    const last = summary.timeSeries[summary.timeSeries.length - 1].sales
    const prev = summary.timeSeries[summary.timeSeries.length - 2].sales

    if (last > prev) return 'up'
    if (last < prev) return 'down'
    return 'stable'
  }

  const trend = getTrend()

  const downloadReport = () => {
    const content = `
HISOBOT TAFSILOTLARI
=============================================
Davr: ${startDate} dan ${endDate} gacha

ASOSIY KO'RSATKICHLAR:
• Jami Savdo: ${summary.totalSales.toLocaleString()} so'm
• Jami Cheklar: ${summary.totalInvoices}
• O'rtacha Chek: ${Math.round(summary.averageTicket).toLocaleString()} so'm
• Sotilgan Mahsulotlar: ${summary.totalItems} dona
• Jami Profit: ${summary.totalProfit.toLocaleString()} so'm

KUNLIK SAVDO:
${summary.timeSeries.map((d: any) => `• ${d.date}: ${d.sales.toLocaleString()} so'm (${d.count} chek)`).join('\n')}

TOPSHIRIQLAR:
${summary.topProducts.map((p: any) => `• ${p.name}: ${p.sales.toLocaleString()} so'm`).join('\n')}
=============================================
Yaratilgan: ${new Date().toLocaleString('uz-UZ')}
    `

    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hisobot-${startDate}-${endDate}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Hisobot yuklab olindi')
  }

  const QuickRangeButton = ({ range, label }: { range: typeof timeRange, label: string }) => (
    <button
      onClick={() => {
        setTimeRange(range)
        setPeriodType(range === 'custom' ? 'monthly' : range === '7days' ? 'weekly' : 'monthly')
      }}
      className={`px-4 py-2 rounded-lg transition-all ${timeRange === range
        ? 'bg-teal-600 text-white border border-teal-600'
        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
        }`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navigation />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-teal-600 rounded-xl shadow">
                  <BarChart3 className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Savdo hisobotlari
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Savdo ko'rsatkichlari va tahlillar
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={downloadReport}
                disabled={invoices.length === 0}
                className="px-4 py-3 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-300 rounded-xl text-gray-700 flex items-center gap-2 transition-all shadow-sm hover:shadow"
              >
                <Download size={18} />
                Yuklab Olish
              </button>
              <button
                onClick={handleGetReport}
                disabled={loading}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow hover:shadow-md"
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <RefreshCw size={18} />
                )}
                {loading ? 'Yuklanmoqda...' : 'Yangilash'}
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {/* Jami savdo */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Jami savdo</p>
                    <p className="text-2xl font-bold text-gray-900 truncate max-w-[140px]">
                      {summary?.totalSales?.toLocaleString() ?? '0'}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">so'm</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <DollarSign className="text-blue-600" size={18} />
                  </div>
                </div>

                <div className="mt-auto pt-3 flex items-center gap-2">
                  {summary?.trend || trend === 'up' ? (
                    <>
                      <TrendingUp className="text-green-600" size={16} />
                      <span className="text-sm text-green-600">O'sish</span>
                    </>
                  ) : summary?.trend || trend === 'down' ? (
                    <>
                      <TrendingDown className="text-red-600" size={16} />
                      <span className="text-sm text-red-600">Pasayish</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">Barqaror</span>
                  )}
                </div>
              </div>
            </div>

            {/* Jami cheklar */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Jami cheklar</p>
                    <p className="text-2xl font-bold text-gray-900 truncate max-w-[140px]">
                      {summary?.totalInvoices?.toLocaleString() ?? '0'}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">ta operatsiya</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <FileText className="text-green-600" size={18} />
                  </div>
                </div>

                <div className="mt-auto pt-3">
                  <p className="text-gray-500 text-sm truncate">
                    O'rtacha: {Math.round(summary?.averageTicket ?? 0).toLocaleString()} so'm
                  </p>
                </div>
              </div>
            </div>

            {/* Sotilgan mahsulot */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Sotilgan mahsulot</p>
                    <p className="text-2xl font-bold text-gray-900 truncate max-w-[140px]">
                      {summary?.totalItems ? summary?.totalItems?.toFixed(1).toLocaleString() : '0'}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">dona</p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                    <Package className="text-purple-600" size={18} />
                  </div>
                </div>

                <div className="mt-auto pt-3">
                  <p className="text-gray-500 text-sm truncate">
                    Kuniga: {summary?.totalItems && summary?.totalInvoices ? Math.round(summary?.totalItems / (summary?.totalInvoices ?? 1)) : 0} dona
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Faollik</p>
                    <p className="text-2xl font-bold text-gray-900 truncate max-w-[140px]">
                      {summary?.timeSeries?.length > 0
                        ? Math.round((summary.timeSeries.length / (summary.totalInvoices || 1)) * 100)
                        : 0}%
                    </p>
                    <p className="text-gray-500 text-xs mt-1">kunlarda savdo</p>
                  </div>
                  <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                    <ShoppingCart className="text-amber-600" size={18} />
                  </div>
                </div>
                <div className="mt-auto pt-3">
                  <p className="text-gray-500 text-sm truncate">
                    {summary?.timeSeries?.length || 0} kun faol
                  </p>
                </div>
              </div>
            </div>

            {/* Foyda */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Foyda</p>
                    <p className="text-2xl font-bold text-gray-900 truncate max-w-[140px]">
                      {summary?.totalProfit?.toLocaleString() ?? '0'}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">so'm</p>
                  </div>
                  <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
                    <DollarSign className="text-emerald-600" size={18} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Range Selector */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="text-gray-500" size={18} />
              <p className="text-gray-600 text-sm">Tez davr tanlash:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickRangeButton range="7days" label="So'nggi 7 kun" />
              <QuickRangeButton range="30days" label="So'nggi 30 kun" />
              <QuickRangeButton range="90days" label="So'nggi 90 kun" />
              <QuickRangeButton range="custom" label="Maxsus davr" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Filter className="text-teal-600" size={24} />
              <h2 className="text-xl font-bold text-gray-900">Hisobot parametrlari</h2>
            </div>
            <div className="text-sm text-gray-600">
              {startDate && endDate && (
                <span>
                  {new Date(startDate).toLocaleDateString('uz-UZ')} - {new Date(endDate).toLocaleDateString('uz-UZ')}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Davr turi
              </label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="daily">Kunlik</option>
                <option value="weekly">Haftalik</option>
                <option value="monthly">Oylik</option>
                <option value="yearly">Yillik</option>
                <option value="custom">Maxsus</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Boshlanish sanasi
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setTimeRange('custom')
                  }}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tugatish sanasi
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setTimeRange('custom')
                  }}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGetReport}
                disabled={loading}
                className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow"
              >
                {loading ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <>
                    <BarChart3 size={18} />
                    Hisobot olish
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Chart Type Selector */}
          <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <p className="text-gray-600 text-sm flex items-center">
              Grafik turi:
            </p>
            <button
              onClick={() => setChartType('bar')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${chartType === 'bar'
                ? 'bg-teal-600 text-white border border-teal-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }`}
            >
              <BarChart size={16} />
              Ustunli
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${chartType === 'line'
                ? 'bg-teal-600 text-white border border-teal-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }`}
            >
              <LineChart size={16} />
              Chiziqli
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${chartType === 'pie'
                ? 'bg-teal-600 text-white border border-teal-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }`}
            >
              <PieChart size={16} />
              Pasta
            </button>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Sales Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="col-span-1 sm:col-span-1 lg:col-span-1">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Savdo oqimi</h2>
              </div>
              <div className="text-sm text-gray-600">
                Kunlik savdo
              </div>
            </div>

            <div className="h-80 w-full overflow-hidden">
              {summary?.timeSeries?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <RechartsBarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        fontSize={12}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit'
                          })
                        }
                      />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: '#374151',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: number) => [`${value.toLocaleString()} so'm`, 'Savdo']}
                      />
                      <Bar dataKey="sales" name="Savdo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  ) : chartType === 'line' ? (
                    <RechartsLineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        fontSize={12}
                        tickFormatter={(value) =>
                          new Date(value).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        }
                      />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: '#374151',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: number) => [`${value.toLocaleString()} so'm`, 'Savdo']}
                      />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        name="Savdo"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    </RechartsLineChart>
                  ) : (
                    <RechartsPieChart>
                      <Pie
                        data={topProducts?.data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => entry.name}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="totalRevenue"
                      >
                        {topProducts?.data.map((entry: any, index: any) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          color: '#374151',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: number) => [`${value.toLocaleString()} so'm`, 'Savdo']}
                      />
                      <Legend />
                    </RechartsPieChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-400">Savdo ma'lumotlari mavjud emas</p>
                    <p className="text-gray-500 text-sm mt-2">Hisobot olish uchun parametrlarni tanlang</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Performance */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Package className="text-green-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Mahsulotlar reytingi</h2>
              </div>
              <div className="text-sm text-gray-600">
                Eng ko'p sotilgan
              </div>
            </div>

            <div className="space-y-4">
              {topProducts?.data?.length > 0 ? (
                topProducts?.data?.slice(0, 5).map((product: any, index: any) => (
                  <div key={product.productId} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${index === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        index === 1 ? 'bg-gray-100 text-gray-600 border border-gray-300' :
                          index === 2 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            'bg-gray-100 text-gray-600 border border-gray-300'
                        }`}>
                        <span className="font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium truncate max-w-[200px]">{product?.name}</p>
                        <p className="text-gray-600 text-sm">{product?.totalRevenue.toLocaleString()} so'm</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-600 font-bold">
                        {Math.round((product?.totalRevenue / summary?.totalSales) * 100)}%
                      </div>
                      <div className="text-gray-500 text-sm">jami savdoda</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center py-12">
                  <div className="text-center">
                    <Package className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-400">Mahsulot ma'lumotlari mavjud emas</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8">
              <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
                <Clock size={18} className="text-teal-600" />
                Soatlik savdo
              </h3>
              <div className="h-48">
                {summary?.hourly?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={summary.hourly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        formatter={(value: number) => [`${value.toLocaleString()} so'm`, 'Savdo']}
                      />
                      <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400">
                      {periodType === 'hourly'
                        ? "Soatlik ma'lumotlar hali yuklanmadi"
                        : "Soatlik tahlil faqat kunlik davrda mavjud emas"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Report */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="text-gray-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Batafsil hisobot</h2>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {invoices.length} ta chek
                </span>
                <button
                  onClick={() => setExpandedView(!expandedView)}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
                >
                  {expandedView ? 'Yig\'ish' : 'Kengaytirish'}
                  <ChevronRight className={`transition-transform ${expandedView ? 'rotate-90' : ''}`} size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className={`overflow-x-auto transition-all duration-300 ${expandedView ? 'max-h-[600px]' : 'max-h-[400px]'}`}>
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr className="border-b border-gray-200">
                  <th className="px-3 md:px-6 py-4 text-left text-gray-600 font-semibold">Sana va vaqt</th>
                  <th className="px-3 md:px-6 py-4 text-center text-gray-600 font-semibold">Chek ID</th>
                  <th className="px-3 md:px-6 py-4 text-center text-gray-600 font-semibold">Mahsulotlar</th>
                  <th className="px-3 md:px-6 py-4 text-right text-gray-600 font-semibold">Subtotal</th>
                  <th className="px-3 md:px-6 py-4 text-right text-gray-600 font-semibold">Jami</th>
                  <th className="px-3 md:px-6 py-4 text-center text-gray-600 font-semibold">To'lov usuli</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 md:px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                      <p className="mt-4 text-gray-400">Hisobot yuklanmoqda...</p>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 md:px-6 py-12 text-center">
                      <BarChart3 className="mx-auto text-gray-300 mb-4" size={48} />
                      <h3 className="text-xl font-semibold text-gray-400 mb-2">Hisobot ma'lumotlari yo'q</h3>
                      <p className="text-gray-500">
                        Belgilangan davr uchun savdo operatsiyalari mavjud emas
                      </p>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr
                      key={invoice._id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-3 md:px-6 py-4">
                        <div className="text-gray-900 font-medium">
                          {new Date(invoice.date).toLocaleDateString('ru-RU')}
                        </div>
                        <div className="text-gray-600 text-sm">
                          {new Date(invoice.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-center">
                        <span className="font-mono text-gray-700 text-sm">
                          {invoice._id.slice(-8)}
                        </span>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-gray-900 font-medium">{invoice.items.length}</span>
                          <span className="text-gray-600 text-xs">dona mahsulot</span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-right">
                        <div className="text-gray-700">{invoice.subtotal.toLocaleString()}</div>
                        <div className="text-gray-500 text-xs">so'm</div>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-right">
                        <div className="text-green-600 font-bold">{invoice.total.toLocaleString()}</div>
                        <div className="text-gray-500 text-xs">so'm</div>
                      </td>
                      <td className="px-3 md:px-6 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize border border-gray-200">
                          {invoice.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {hasMore && (
              <div ref={observerTarget} className="py-6 text-center border-t border-gray-200">
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

            {/* End of List */}
            {invoices.length > 0 && invoices.length === totalInvoices && (
              <div className="py-6 text-center border-t border-gray-200">
                <div className="text-gray-500 text-sm">
                  Barcha {invoices.length} ta chek ko'rsatilmoqda
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-6 text-sm text-gray-600">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              Hisobot davri: {new Date(startDate).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(endDate).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} •
              {invoices.length > 0 && ` Oxirgi yangilanish: ${new Date(invoices[0].date).toLocaleString('ru-RU')}`}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Savdo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span>Mahsulot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></div>
                <span>Faollik</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}