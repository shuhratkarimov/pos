'use client'

import { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'
import { getReports, Invoice } from '@/lib/api'
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

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

const ITEMS_PER_PAGE = 20

export default function ReportsPage() {
  const [reports, setReports] = useState<{ totalSales: number; totalInvoices: number; invoices: Invoice[] }>({
    totalSales: 0,
    totalInvoices: 0,
    invoices: [],
  })
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar')
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days' | 'custom'>('30days')
  const [expandedView, setExpandedView] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [displayedInvoices, setDisplayedInvoices] = useState<Invoice[]>([])
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    calculateDefaultDates()
  }, [periodType, timeRange])

  useEffect(() => {
    if (!startDate || !endDate) return
    handleGetReport()
  }, [startDate, endDate])

  useEffect(() => {
    // Scrollga qarab yangi cheklarni ko'rsatish
    const startIndex = 0
    const endIndex = currentPage * ITEMS_PER_PAGE
    setDisplayedInvoices(reports.invoices.slice(0, endIndex))
  }, [reports.invoices, currentPage])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting &&
          !loadingMore &&
          displayedInvoices.length < reports.invoices.length) {
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
  }, [loadingMore, displayedInvoices.length, reports.invoices.length])

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

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Boshlanish sanasi tugatish sanasidan keyin bo\'lishi mumkin emas')
      return
    }

    setLoading(true)
    try {
      const data = await getReports(startDate, endDate)
      setReports(data)
      setCurrentPage(1) // Yangi hisobot olinganda 1-sahifaga qaytish
      toast.success(`Hisobot yuklandi: ${data.totalInvoices} ta chek`)
    } catch (error) {
      toast.error('Hisobotni yuklashda xatolik')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getSalesData = () => {
    const salesByDate: Record<string, { sales: number; count: number }> = {}

    reports.invoices.forEach(invoice => {
      const date = new Date(invoice.date).toLocaleDateString('uz-UZ')
      if (!salesByDate[date]) {
        salesByDate[date] = { sales: 0, count: 0 }
      }
      salesByDate[date].sales += invoice.total
      salesByDate[date].count += 1
    })

    return Object.entries(salesByDate).map(([date, data]) => ({
      date,
      sales: data.sales,
      count: data.count,
      formattedSales: data.sales.toLocaleString()
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const getProductData = () => {
    const productSales: Record<string, number> = {}

    reports.invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        if (!productSales[item.name]) {
          productSales[item.name] = 0
        }
        productSales[item.name] += item.subtotal
      })
    })

    return Object.entries(productSales)
      .map(([name, sales]) => ({ name, sales }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)
  }

  const getHourlyData = () => {
    const hourlySales: Record<number, number> = {}

    for (let i = 8; i <= 22; i++) {
      hourlySales[i] = 0
    }

    reports.invoices.forEach(invoice => {
      const hour = new Date(invoice.date).getHours()
      if (hour >= 8 && hour <= 22) {
        hourlySales[hour] = (hourlySales[hour] || 0) + invoice.total
      }
    })

    return Object.entries(hourlySales).map(([hour, sales]) => ({
      hour: `${hour}:00`,
      sales
    }))
  }

  const getStats = () => {
    const salesData = getSalesData()
    const totalItems = reports.invoices.reduce((sum, inv) =>
      sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    )

    const averageSale = reports.totalInvoices > 0 ? reports.totalSales / reports.totalInvoices : 0
    const maxSale = reports.invoices.length > 0 ? Math.max(...reports.invoices.map(i => i.total)) : 0
    const minSale = reports.invoices.length > 0 ? Math.min(...reports.invoices.map(i => i.total)) : 0
    const profit = reports.invoices.reduce((sum, inv) => sum + (inv.profit || 0), 0)
    let trend = 'stable'
    if (salesData.length >= 2) {
      const lastTwoDays = salesData.slice(-2)
      if (lastTwoDays[1].sales > lastTwoDays[0].sales) trend = 'up'
      if (lastTwoDays[1].sales < lastTwoDays[0].sales) trend = 'down'
    }

    return {
      totalItems,
      averageSale,
      maxSale,
      minSale,
      profit,
      trend,
      salesData,
      productData: getProductData(),
      hourlyData: getHourlyData()
    }
  }

  const stats = getStats()

  const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ]

  const downloadReport = () => {
    const content = `
HISOBOT TAFSILOTLARI
=============================================
Davr: ${startDate} dan ${endDate} gacha

ASOSIY KO'RSATKICHLAR:
• Jami Savdo: ${reports.totalSales.toLocaleString()} so'm
• Jami Cheklar: ${reports.totalInvoices}
• O'rtacha Chek: ${Math.round(stats.averageSale).toLocaleString()} so'm
• Sotilgan Mahsulotlar: ${stats.totalItems} dona
• Jami Profit: ${stats.profit.toLocaleString()} so'm

KUNLIK SAVDO:
${stats.salesData.map(d => `• ${d.date}: ${d.sales.toLocaleString()} so'm (${d.count} chek)`).join('\n')}

TOPSHIRIQLAR:
${stats.productData.map(p => `• ${p.name}: ${p.sales.toLocaleString()} so'm`).join('\n')}
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
        ? 'bg-blue-600 text-white border border-blue-600'
        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
        }`}
    >
      {label}
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-600 rounded-xl shadow">
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

            <div className="flex gap-3">
              <button
                onClick={downloadReport}
                disabled={reports.invoices.length === 0}
                className="px-4 py-3 bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-300 rounded-xl text-gray-700 flex items-center gap-2 transition-all shadow-sm hover:shadow"
              >
                <Download size={18} />
                Yuklab Olish
              </button>
              <button
                onClick={handleGetReport}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow hover:shadow-md"
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
              <Filter className="text-blue-600" size={24} />
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
                Davr Turi
              </label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
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
                Boshlanish Sanasi
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
                Tugatish Sanasi
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
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow"
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
          <div className="mt-6 flex gap-3">
            <p className="text-gray-600 text-sm flex items-center">Grafik turi:</p>
            <button
              onClick={() => setChartType('bar')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${chartType === 'bar'
                ? 'bg-blue-600 text-white border border-blue-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }`}
            >
              <BarChart size={16} />
              Ustunli
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${chartType === 'line'
                ? 'bg-blue-600 text-white border border-blue-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }`}
            >
              <LineChart size={16} />
              Chiziqli
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${chartType === 'pie'
                ? 'bg-blue-600 text-white border border-blue-600'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                }`}
            >
              <PieChart size={16} />
              Pasta
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="col-span-1 sm:col-span-1 lg:col-span-1">
              <div>
                <p className="text-gray-600 text-sm mb-1">Jami Savdo</p>
                <p className="text-2xl font-bold text-gray-900">{reports.totalSales.toLocaleString()}</p>
                <p className="text-gray-500 text-xs">so'm</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="text-blue-600" size={20} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {stats.trend === 'up' ? (
                <TrendingUp className="text-green-600" size={16} />
              ) : stats.trend === 'down' ? (
                <TrendingDown className="text-red-600" size={16} />
              ) : null}
              <span className={`text-sm ${stats.trend === 'up' ? 'text-green-600' :
                stats.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                }`}>
                {stats.trend === 'up' ? 'O\'sish' : stats.trend === 'down' ? 'Pasayish' : 'Barqaror'}
              </span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="col-span-1 sm:col-span-1 lg:col-span-1">
              <div>
                <p className="text-gray-600 text-sm mb-1">Jami Cheklar</p>
                <p className="text-2xl font-bold text-gray-900">{reports.totalInvoices}</p>
                <p className="text-gray-500 text-xs">ta operatsiya</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="text-green-600" size={20} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-gray-500 text-sm">
                O'rtacha: {Math.round(stats.averageSale).toLocaleString()} so'm
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="col-span-1 sm:col-span-1 lg:col-span-1">
              <div>
                <p className="text-gray-600 text-sm mb-1">Sotilgan Mahsulot</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
                <p className="text-gray-500 text-xs">dona</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="text-purple-600" size={20} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-gray-500 text-sm">
                Kuniga: {Math.round(stats.totalItems / (reports.invoices.length || 1))} dona
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="col-span-1 sm:col-span-1 lg:col-span-1">
              <div>
                <p className="text-gray-600 text-sm mb-1">Faollik</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reports.invoices.length > 0 ? Math.round(stats.salesData.length / reports.totalInvoices * 100) : 0}%
                </p>
                <p className="text-gray-500 text-xs">kunlarda savdo</p>
              </div>
              <div className="p-2 bg-amber-100 rounded-lg">
                <ShoppingCart className="text-amber-600" size={20} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-gray-500 text-sm">
                {stats.salesData.length} kun faol
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="col-span-1 sm:col-span-1 lg:col-span-1">
              <div>
                <p className="text-gray-600 text-sm mb-1">Foyda</p>
                <p className="text-2xl font-bold text-gray-900">{stats.profit.toLocaleString()}</p>
                <p className="text-gray-500 text-xs">so'm</p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="text-emerald-600" size={20} />
              </div>
            </div>
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

            <div className="h-80">
              {reports.invoices.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                {chartType === 'bar' ? (
                    <RechartsBarChart data={stats.salesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
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
                    <RechartsLineChart data={stats.salesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
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
                        data={stats.productData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => entry.name}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="sales"
                      >
                        {stats.productData.map((entry, index) => (
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
                <h2 className="text-xl font-bold text-gray-900">Mahsulotlar Reytingi</h2>
              </div>
              <div className="text-sm text-gray-600">
                Eng ko'p sotilgan
              </div>
            </div>

            <div className="space-y-4">
              {stats.productData.length > 0 ? (
                stats.productData.slice(0, 5).map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${index === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        index === 1 ? 'bg-gray-100 text-gray-600 border border-gray-300' :
                          index === 2 ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            'bg-gray-100 text-gray-600 border border-gray-300'
                        }`}>
                        <span className="font-bold">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium truncate max-w-[200px]">{product.name}</p>
                        <p className="text-gray-600 text-sm">{product.sales.toLocaleString()} so'm</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-600 font-bold">
                        {Math.round((product.sales / reports.totalSales) * 100)}%
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

            {/* Hourly Sales */}
            <div className="mt-8">
              <h3 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                Soatlik Savdo
              </h3>
              <div className="h-48">
                {reports.invoices.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart data={stats.hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
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
                      <Bar dataKey="sales" name="Savdo" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400">Soatlik ma'lumotlar mavjud emas</p>
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
                  {displayedInvoices.length} / {reports.invoices.length} ta chek
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
                  <th className="px-6 py-4 text-left text-gray-600 font-semibold">Sana va vaqt</th>
                  <th className="px-6 py-4 text-center text-gray-600 font-semibold">Chek ID</th>
                  <th className="px-6 py-4 text-center text-gray-600 font-semibold">Mahsulotlar</th>
                  <th className="px-6 py-4 text-right text-gray-600 font-semibold">Subtotal</th>
                  <th className="px-6 py-4 text-right text-gray-600 font-semibold">Jami</th>
                  <th className="px-6 py-4 text-center text-gray-600 font-semibold">To'lov usuli</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                      <p className="mt-4 text-gray-400">Hisobot yuklanmoqda...</p>
                    </td>
                  </tr>
                ) : displayedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <BarChart3 className="mx-auto text-gray-300 mb-4" size={48} />
                      <h3 className="text-xl font-semibold text-gray-400 mb-2">Hisobot ma'lumotlari yo'q</h3>
                      <p className="text-gray-500">
                        Belgilangan davr uchun savdo operatsiyalari mavjud emas
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedInvoices.map((invoice) => (
                    <tr
                      key={invoice._id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-gray-900 font-medium">
                          {new Date(invoice.date).toLocaleDateString('ru-RU')}
                        </div>
                        <div className="text-gray-600 text-sm">
                          {new Date(invoice.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono text-gray-700 text-sm">
                          {invoice._id.slice(-8)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-gray-900 font-medium">{invoice.items.length}</span>
                          <span className="text-gray-600 text-xs">dona mahsulot</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-gray-700">{invoice.subtotal.toLocaleString()}</div>
                        <div className="text-gray-500 text-xs">so'm</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-green-600 font-bold">{invoice.total.toLocaleString()}</div>
                        <div className="text-gray-500 text-xs">so'm</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium capitalize border border-gray-200">
                          {invoice.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Loading More Indicator */}
            {displayedInvoices.length > 0 && displayedInvoices.length < reports.invoices.length && (
              <div ref={observerTarget} className="py-6 text-center border-t border-gray-200">
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
            {displayedInvoices.length > 0 && displayedInvoices.length === reports.invoices.length && (
              <div className="py-6 text-center border-t border-gray-200">
                <div className="text-gray-500 text-sm">
                  Barcha {reports.invoices.length} ta chek ko'rsatilmoqda
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
              {reports.invoices.length > 0 && ` Oxirgi yangilanish: ${new Date(reports.invoices[0].date).toLocaleString('ru-RU')}`}
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