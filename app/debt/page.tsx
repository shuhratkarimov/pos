'use client'

import { useState, useEffect, useRef } from 'react'
import Navigation from '@/components/Navigation'
import { DebtRecord, getDebtRecords, addDebtRecord, updateDebtRecord, deleteDebtRecord, sendSms, getSmsHistoryForPhone } from '@/lib/api'
import { Plus, AlertCircle, CheckCircle2, Edit2, Trash2, Save, X, Calendar, User, DollarSign, Search, Filter, TrendingUp, Clock, Users, RefreshCw, Loader2, Send, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSearchParams, useRouter } from 'next/navigation'
const ITEMS_PER_PAGE = 20
import { useUser } from '@/context/UserContext'
const STANDARD_SMS_TEMPLATE = (amount: number, dueDate: string, shopName?: string, phone?: string) =>
  `Assalomu alaykum! Sizning ${shopName || ''} do'konidagi ${amount.toLocaleString('uz-UZ')} so'm qarzingizni to'lash muddati o'tib ketdi. Iltimos do'konga uchrashing! Tel: ${phone || ''}`

export default function DebtPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useUser()
  // Barcha state'lar shu yerda (sizda allaqachon bor)
  const [debts, setDebts] = useState<DebtRecord[]>([])
  const [filteredDebts, setFilteredDebts] = useState<DebtRecord[]>([])
  const [displayedDebts, setDisplayedDebts] = useState<DebtRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<DebtRecord>>({})
  const [dateFilter, setDateFilter] = useState<'all' | 'overdue' | 'today' | 'week'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const observerTarget = useRef<HTMLDivElement>(null)
  const updateHandledRef = useRef(false)
  const [showDebtModal, setShowDebtModal] = useState(false)
  const hasOpenedFromKassa = useRef(false)
  const [formData, setFormData] = useState({
    customerName: '',
    amount: '',
    dueDate: '',
    phoneNumber: '+998',
  })
  const [sendingSmsId, setSendingSmsId] = useState<string | null>(null)
  const [showSmsHistoryModal, setShowSmsHistoryModal] = useState(false)
  const [selectedDebtForSms, setSelectedDebtForSms] = useState<DebtRecord | null>(null)
  const [smsHistory, setSmsHistory] = useState<any[]>([])           // { date, text, status? }
  // Yangi state'lar (sizda allaqachon bor)
  const [mode, setMode] = useState<'normal' | 'new' | 'update'>('normal')
  const [preFillAmount, setPreFillAmount] = useState<number | null>(null)
  const [isSendingSms, setIsSendingSms] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const m = searchParams.get('mode')
    const amtStr = searchParams.get('amount')
    const did = searchParams.get('id')

    // Yangi qarz (kassadan kelgan)
    if (m === 'new' && amtStr && !hasOpenedFromKassa.current) {
      const amountNum = Number(amtStr)
      if (!isNaN(amountNum) && amountNum > 0) {
        setMode('new')
        setFormData(prev => ({
          ...prev,
          amount: amountNum.toString(),
        }))
        setShowDebtModal(true)
        toast.success(`Yangi qarz summasi: ${amountNum.toLocaleString()} so'm`)

        // Bir marta ochildi deb belgilaymiz
        hasOpenedFromKassa.current = true
      }
    }

    // Update holati (sizda bor kod)
    if (m === 'update' && did && amtStr && debts.length > 0) {
      if (updateHandledRef.current) return

      const target = debts.find(d => d._id === did)
      if (target) {
        const newAmount = target.amount + Number(amtStr)
        setEditingId(target._id)
        setEditForm({
          ...target,
          amount: newAmount,
        })
        updateHandledRef.current = true
      } else {
        toast.error("Tanlangan qarz topilmadi")
      }
    }
  }, [searchParams, debts])

  useEffect(() => {
    loadDebts()
  }, [])

  useEffect(() => {
    if (mode === 'new' && preFillAmount) {
      setFormData(prev => ({
        ...prev,
        amount: preFillAmount.toString(),
      }))
    }
  }, [mode, preFillAmount])

  useEffect(() => {
    filterDebts()
    setCurrentPage(1) // Filter o'zgarganda 1-sahifaga qaytish
  }, [debts, searchTerm, statusFilter, dateFilter])

  useEffect(() => {
    // Scrollga qarab yangi qarzlarni ko'rsatish
    const startIndex = 0
    const endIndex = currentPage * ITEMS_PER_PAGE
    setDisplayedDebts(filteredDebts.slice(0, endIndex))
  }, [filteredDebts, currentPage])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting &&
          !loadingMore &&
          displayedDebts.length < filteredDebts.length) {
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
  }, [loadingMore, displayedDebts.length, filteredDebts.length])

  const loadDebts = async () => {
    try {
      setLoading(true)
      const data = await getDebtRecords()
      setDebts(data)
      toast.success('Qarzlar yuklandi')
    } catch (error) {
      toast.error('Qarzlarni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Agar query parametrlar yo'q bo'lsa (masalan, qo'lda /debt ga kirilganda)
    if (!searchParams.get('mode')) {
      setShowDebtModal(false)
      setEditingId(null)
      hasOpenedFromKassa.current = false  // keyingi safar uchun reset
      updateHandledRef.current = false
    }
  }, [searchParams])

  const filterDebts = () => {
    let filtered = [...debts]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(debt =>
        debt.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(debt => debt.status === statusFilter)
    }

    // Date filter
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    if (dateFilter !== 'all') {
      filtered = filtered.filter(debt => {
        const dueDate = new Date(debt.dueDate)

        switch (dateFilter) {
          case 'overdue':
            return dueDate < today && debt.status === 'pending'
          case 'today':
            return dueDate >= today && dueDate < tomorrow && debt.status === 'pending'
          case 'week':
            return dueDate >= today && dueDate < nextWeek && debt.status === 'pending'
          default:
            return true
        }
      })
    }

    filtered.sort((a, b) =>
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )
    setFilteredDebts(filtered)
  }

  const handleAddDebt = async () => {
    if (!formData.customerName || !formData.amount || !formData.dueDate) {
      toast.error('Majburiy maydonlarni to\'ldiring')
      return
    }

    try {
      await addDebtRecord({
        date: new Date().toISOString(),
        customerName: formData.customerName,
        amount: parseInt(formData.amount),
        status: 'pending',
        dueDate: formData.dueDate,
        phoneNumber: formData.phoneNumber,
      })
      toast.success('Yangi qarz qayd qilindi')
      setFormData({ customerName: '', amount: '', dueDate: '', phoneNumber: '+998' })
      setShowDebtModal(false)
      loadDebts()
      router.replace('/debt')
    } catch (error) {
      toast.error('Qarz qo\'shishda xatolik')
      console.error(error)
    }
  }

  const handleUpdateDebt = async (id: string) => {
    if (!editForm.amount || editForm.amount <= 0) {
      toast.error("Summa noto'g'ri")
      return
    }

    try {
      // Backendga faqat kerakli maydonlarni yuboramiz
      const updatedData = {
        amount: editForm.amount,           // yangi umumiy summa
        customerName: editForm.customerName,
        dueDate: editForm.dueDate,
        status: editForm.status || 'pending',
        phoneNumber: editForm.phoneNumber,
        // agar izoh qo'shmoqchi bo'lsangiz: note: `Kassa orqali qo'shildi: ${preFillItems ? 'mahsulotlar mavjud' : ''}`
      }

      await updateDebtRecord(id, updatedData)

      toast.success(`Qarz yangilandi! Yangi summa: ${editForm.amount.toLocaleString()} so'm`)

      // Formani tozalash va edit rejimidan chiqish
      setEditingId(null)
      setEditForm({})

      // Ro'yxatni yangilash
      loadDebts()

      // URL'dan parametrlar tozalash (tavsiya etiladi)
      router.replace('/debt')
    } catch (error) {
      toast.error("Qarzni yangilashda xatolik")
      console.error(error)
    }
  }

  const handleDeleteDebt = async (id: string) => {
    if (!confirm('Haqiqatan ham ushbu qarz yozuvini o\'chirmoqchimisiz?')) return

    try {
      await deleteDebtRecord(id)
      toast.success('Qarz yozuvi o\'chirildi')
      loadDebts()
    } catch (error) {
      toast.error('O\'chirishda xatolik')
    }
  }

  const handleMarkAsPaid = async (debt: DebtRecord) => {
    try {
      await updateDebtRecord(debt._id, { status: 'paid' })
      toast.success('Qarz to\'langan deb belgilandi')
      loadDebts()
    } catch (error) {
      toast.error('Yangilashda xatolik')
    }
  }

  const handleMarkAsPending = async (debt: DebtRecord) => {
    try {
      await updateDebtRecord(debt._id, { status: 'pending' })
      toast.success('Qarz to\'lanmagan deb belgilandi')
      loadDebts()
    } catch (error) {
      toast.error('Yangilashda xatolik')
    }
  }

  const handleOpenSmsModal = async (debtId: string) => {
    const debt = debts.find(d => d._id === debtId)
    if (!debt) return

    setSelectedDebtForSms(debt)
    setShowSmsHistoryModal(true)

    try {
      const history = await getSmsHistoryForPhone(debt.phoneNumber)

      setSmsHistory(history || [])
    } catch (err) {
      console.error("SMS tarixini yuklashda xato", err)
      setSmsHistory([])
    }
  }

  const handleSendSms = async () => {
    if (!selectedDebtForSms) return

    setIsSendingSms(true)

    try {
      const message = STANDARD_SMS_TEMPLATE(
        selectedDebtForSms.amount,
        selectedDebtForSms.dueDate,
        user?.shop?.shopName,
        user?.phoneNumber
      )

      const response = await sendSms(selectedDebtForSms.phoneNumber, message)

      if (response?.success) {
        toast.success('Xabar muvaffaqiyatli yuborildi')

        // SMS tarixini yangilash (agar backenddan yangi yozuv qaytmasa, qo‘lda qo‘shish mumkin)
        setSmsHistory(prev => [{
          date: new Date().toISOString(),
          text: message,
          // status: response.status || 'sent'
        }, ...prev])
      } else {
        toast.error(response?.error || 'Xabar yuborishda xatolik')
      }
    } catch (err: any) {
      toast.error(err.message || 'Xatolik yuz berdi')
    } finally {
      setIsSendingSms(false)
      // setShowSmsHistoryModal(false)  // muvaffaqiyatli bo‘lsa yoki xato bo‘lsa ham yopiladi
    }
  }

  const getStats = () => {
    const pendingDebts = debts.filter(d => d.status === 'pending')
    const paidDebts = debts.filter(d => d.status === 'paid')

    const totalDebt = pendingDebts.reduce((sum, d) => sum + d.amount, 0)
    const totalPaid = paidDebts.reduce((sum, d) => sum + d.amount, 0)
    const overdueDebts = pendingDebts.filter(d => new Date(d.dueDate) < new Date())
    const overdueAmount = overdueDebts.reduce((sum, d) => sum + d.amount, 0)
    const dueThisWeek = pendingDebts.filter(d => {
      const dueDate = new Date(d.dueDate)
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      return dueDate <= nextWeek && dueDate >= new Date()
    })

    return {
      totalDebt,
      totalPaid,
      overdueCount: overdueDebts.length,
      overdueAmount,
      dueThisWeekCount: dueThisWeek.length,
      dueThisWeekAmount: dueThisWeek.reduce((sum, d) => sum + d.amount, 0),
      pendingCount: pendingDebts.length,
      paidCount: paidDebts.length
    }
  }

  const stats = getStats()

  const getStatusColor = (debt: DebtRecord) => {
    const dueDate = new Date(debt.dueDate)
    const today = new Date()

    if (debt.status === 'paid') return 'bg-emerald-100 text-emerald-700 border-emerald-200'

    if (dueDate < today) return 'bg-red-100 text-red-700 border-red-200'

    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue <= 3) return 'bg-yellow-100 text-yellow-700 border-yellow-200'

    return 'bg-blue-100 text-blue-700 border-blue-200'
  }

  const getStatusText = (debt: DebtRecord) => {
    if (debt.status === 'paid') return 'To\'langan'

    const dueDate = new Date(debt.dueDate)
    const today = new Date()

    if (dueDate < today) return 'Muddati o\'tgan'

    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilDue === 0) return 'Bugun'
    if (daysUntilDue === 1) return 'Ertaga'
    return `${daysUntilDue} kun qoldi`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="p-2 bg-red-600 rounded-xl shadow">
                  <AlertCircle className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Qarzlar boshqaruvi
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Barcha qarzlar va to'lovlarni nazorat qilish
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDebtModal(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow hover:shadow-md"
            >
              <Plus size={20} />
              Yangi qarz qo'shish
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Qolgan Qarz</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDebt.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">{stats.pendingCount} ta qarz</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="text-red-600" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">To'langan Qarz</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPaid.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">{stats.paidCount} ta to'lov</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="text-green-600" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Muddati O'tgan</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.overdueCount}</p>
                  <p className="text-gray-500 text-xs">{stats.overdueAmount.toLocaleString()} so'm</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="text-yellow-600" size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">Bu Hafta To'lanadi</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.dueThisWeekCount}</p>
                  <p className="text-gray-500 text-xs">{stats.dueThisWeekAmount.toLocaleString()} so'm</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="text-blue-600" size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {showDebtModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-200 overflow-hidden">

              {/* Modal header */}
              <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-red-50 to-red-100">
                <div className="flex items-center gap-3">
                  <Plus className="text-red-600" size={28} />
                  <h2 className="text-2xl font-bold text-gray-900">Yangi qarz qo'shish</h2>
                </div>
                <button
                  onClick={() => setShowDebtModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-600" />
                </button>
              </div>

              {/* Forma */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="inline mr-2 text-gray-500" size={16} />
                      Qarzdor ismi *
                    </label>
                    <input
                      type="text"
                      placeholder="Ismi va familiyasi"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="inline mr-2 text-gray-500" size={16} />
                      Qarz summasi *
                    </label>
                    <input
                      type="number"
                      placeholder="Summani kiriting (so'm)"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline mr-2 text-gray-500" size={16} />
                      Muddati *
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="inline mr-2 text-gray-500" size={16} />
                      Telefon raqami *
                    </label>
                    <input
                      type="tel"
                      placeholder="+998901234567"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        // Har doim +998 bilan boshlanishini majburlash
                        let val = e.target.value
                        if (!val.startsWith('+998')) val = '+998' + val.replace(/^(\+)?0*/, '')
                        setFormData({ ...formData, phoneNumber: val })
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    />
                  </div>
                </div>

                {/* Tugmalar */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDebtModal(false)}
                    className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
                  >
                    Bekor qilish
                  </button>
                  <button
                    onClick={async () => {
                      await handleAddDebt()
                      if (formData.customerName && formData.amount && formData.dueDate) {
                        setShowDebtModal(false) // muvaffaqiyatli bo'lsa modal yopiladi
                      }
                    }}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow hover:shadow-md"
                  >
                    <Save size={18} />
                    Saqlash
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters - Accordion Version for Very Small Screens */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 mb-6 shadow-sm">
          {/* Mobile Filter Toggle */}
          <div className="sm:hidden mb-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg text-gray-700"
            >
              <span className="font-medium">Filtrlar</span>
              <ChevronDown size={20} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Filters Content */}
          <div className={`${showFilters ? 'block' : 'hidden'} sm:block`}>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                />
              </div>

              {/* Filters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="px-3 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                >
                  <option value="all">Holat</option>
                  <option value="pending">To'lanmagan</option>
                  <option value="paid">To'langan</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
                  className="px-3 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                >
                  <option value="all">Sana</option>
                  <option value="overdue">Muddati o'tgan</option>
                  <option value="today">Bugun</option>
                  <option value="week">Bu hafta</option>
                </select>

                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('all')
                    setDateFilter('all')
                  }}
                  className="px-3 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl text-gray-700 hover:text-gray-900 transition-all flex items-center justify-center"
                  title="Filtrlarni tozalash"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Chips */}
          {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-500 hidden sm:inline">Faol filtrlar:</span>

              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm">
                  <span className="truncate max-w-[150px]">{searchTerm}</span>
                  <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-blue-900">
                    <X size={14} />
                  </button>
                </span>
              )}

              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-xs sm:text-sm">
                  {statusFilter === 'pending' ? 'To\'lanmagan' : 'To\'langan'}
                  <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-purple-900">
                    <X size={14} />
                  </button>
                </span>
              )}

              {dateFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs sm:text-sm">
                  {dateFilter === 'overdue' ? 'Muddati o\'tgan' :
                    dateFilter === 'today' ? 'Bugun' : 'Bu hafta'}
                  <button onClick={() => setDateFilter('all')} className="ml-1 hover:text-green-900">
                    <X size={14} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {showSmsHistoryModal && selectedDebtForSms && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">

              {/* Header */}
              <div className="p-6 border-b bg-gradient-to-r from-red-50 to-red-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Send className="text-red-600" size={28} />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">SMS eslatma yuborish</h2>
                    <p className="text-gray-600 mt-1">
                      {selectedDebtForSms.customerName} • {selectedDebtForSms.phoneNumber}
                    </p>
                  </div>
                </div>
                <button onClick={() => {
                  setShowSmsHistoryModal(false)
                  setSelectedDebtForSms(null)
                  setSmsHistory([])
                }} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X size={24} className="text-gray-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Joriy qarz ma'lumoti */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Hozirgi qarz:</p>
                      <p className="text-2xl font-bold text-red-700">
                        {selectedDebtForSms.amount.toLocaleString()} so'm
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Muddati:</p>
                      <p className="font-medium">
                        {new Date(selectedDebtForSms.dueDate).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Endi custom yozish maydoni yo'q — faqat ma'lumot + tugma */}

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <p className="text-gray-700 font-medium mb-3">Yuboriladigan xabar:</p>
                  <div className="p-4 bg-white border rounded-lg text-gray-800 whitespace-pre-wrap">
                    {STANDARD_SMS_TEMPLATE(selectedDebtForSms.amount, selectedDebtForSms.dueDate, user?.shop?.shopName, user?.phoneNumber)}
                  </div>
                </div>

                {/* Yuborish tugmasi */}
                <div className="flex justify-end">
                  <div className="flex justify-end">
                    <button
                      onClick={handleSendSms}
                      disabled={isSendingSms}
                      className={`
      px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow hover:shadow-md
      ${isSendingSms
                          ? 'bg-red-400 cursor-not-allowed text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                        }
    `}
                    >
                      {isSendingSms ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Yuborilmoqda...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Eslatma yuborish
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* SMS tarixi qismi o'zgarmaydi */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Clock size={18} />
                    Ushbu raqamga yuborilgan xabarlar
                  </h3>

                  {smsHistory.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
                      Hali hech qanday xabar yuborilmagan
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {smsHistory.map((sms, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{new Date(sms.date || sms.sentAt).toLocaleString('ru-RU')}</span>
                            {/* <span className={sms.status === 'sent' ? "text-green-600" : "text-red-600"}>{sms.status === 'sent' ? 'Yetkazilgan' : 'Ketmagan'}</span> */}
                          </div>
                          <p className="text-gray-800">{sms.text || sms.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Debts List */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-2 sm:gap-0 border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-600" size={24} />
                <h2 className="text-2xl font-bold text-gray-900 text-center sm:text-left">
                  Qarzlar ro'yxati
                </h2>
              </div>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                {displayedDebts.length} / {filteredDebts.length} ta qarz
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
                <p className="mt-4 text-gray-400">Qarzlar yuklanmoqda...</p>
              </div>
            ) : displayedDebts.length === 0 ? (
              <div className="py-12 flex flex-row items-center justify-center text-center gap-2">
                <AlertCircle className="text-gray-300" size={48} />
                <h3 className="text-xl font-semibold text-gray-400">Qarzlar topilmadi</h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                    ? 'Qidiruv natijalari bo\'sh'
                    : 'Hozircha hech qanday qarz mavjud emas'}
                </p>
              </div>
            ) : (
              <>
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-4 text-left text-gray-600 font-semibold">Buyurtmachi</th>
                      <th className="px-6 py-4 text-left text-gray-600 font-semibold">Qarz sana</th>
                      <th className="px-6 py-4 text-left text-gray-600 font-semibold">Muddati</th>
                      <th className="px-6 py-4 text-left text-gray-600 font-semibold">Summa</th>
                      <th className="px-6 py-4 text-left text-gray-600 font-semibold">Holati</th>
                      <th className="px-6 py-4 text-left text-gray-600 font-semibold">Telefon</th>
                      <th className="px-6 py-4 text-center text-gray-600 font-semibold">Harakatlar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedDebts.map((debt) => (
                      <tr
                        key={debt._id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        {/* Customer Name */}
                        <td className="px-6 py-4">
                          {editingId === debt._id ? (
                            <input
                              value={editForm.customerName || ''}
                              onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all"
                            />
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <User className="text-gray-600" size={18} />
                              </div>
                              <div>
                                <p className="text-gray-900 font-medium">{debt.customerName}</p>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4">
                          <div className="text-gray-600 text-sm">
                            {new Date(debt.date).toLocaleDateString('ru-RU')}
                          </div>
                        </td>

                        {/* Due Date */}
                        <td className="px-6 py-4">
                          {editingId === debt._id ? (
                            <input
                              type="date"
                              value={editForm.dueDate?.toString().split('T')[0] || ''}
                              onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                              className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all"
                            />
                          ) : (
                            <div className="text-gray-700 font-medium">
                              {new Date(debt.dueDate).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4">
                          {editingId === debt._id ? (
                            <input
                              type="number"
                              value={editForm.amount || 0}
                              onChange={(e) => setEditForm({ ...editForm, amount: parseInt(e.target.value) })}
                              className="w-32 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all"
                            />
                          ) : (
                            <div>
                              <p className="text-red-600 font-bold text-lg">
                                {debt.amount.toLocaleString()}
                              </p>
                              <p className="text-gray-500 text-xs">so'm</p>
                            </div>
                          )}
                        </td>


                        {/* Status */}
                        <td className="px-6 py-4 text-center md:text-left">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(debt)}`}>
                            {getStatusText(debt)}
                          </span>
                        </td>

                        {/* Customer Phone Number */}
                        <td className="px-6 py-4">
                          {editingId === debt._id ? (
                            <input
                              type="tel"
                              value={editForm.phoneNumber || '+998'}
                              onChange={(e) => {
                                let val = e.target.value
                                if (!val.startsWith('+998')) val = '+998' + val.replace(/^(\+)?0*/, '')
                                setEditForm({ ...editForm, phoneNumber: val })
                              }}
                              className="w-40 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all"
                            />
                          ) : (
                            <div className="text-gray-700 font-medium">
                              {debt.phoneNumber}
                            </div>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex flwex-wrap items-center justify-center gap-2">
                            {editingId === debt._id ? (
                              <>
                                <button
                                  onClick={() => handleUpdateDebt(debt._id)}
                                  className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors border border-green-200"
                                  title="Saqlash"
                                >
                                  <Save size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(null)
                                    setEditForm({})
                                  }}
                                  className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                                  title="Bekor qilish"
                                >
                                  <X size={18} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingId(debt._id)
                                    setEditForm(debt)
                                  }}
                                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors border border-blue-200"
                                  title="Tahrirlash"
                                >
                                  <Edit2 size={18} />
                                </button>

                                {debt.status === 'pending' ? (
                                  <button
                                    onClick={() => handleMarkAsPaid(debt)}
                                    className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors border border-green-200"
                                    title="To'langan deb belgilash"
                                  >
                                    <CheckCircle2 size={18} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleMarkAsPending(debt)}
                                    className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg transition-colors border border-yellow-200"
                                    title="To'lanmagan deb belgilash"
                                  >
                                    <Clock size={18} />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteDebt(debt._id)}
                                  className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors border border-red-200"
                                  title="O'chirish"
                                >
                                  <Trash2 size={18} />
                                </button>
                                {debt.status === 'pending' && (
                                  <button
                                    onClick={() => handleOpenSmsModal(debt._id)}
                                    disabled={sendingSmsId === debt._id}
                                    className={`p-2 rounded-lg transition-colors border border-red-200
         ${sendingSmsId === debt._id
                                        ? 'bg-red-50 text-red-400 cursor-not-allowed'
                                        : 'bg-red-100 hover:bg-red-200 text-red-700'
                                      }`}
                                    title="SMS yuborish / tarix"
                                  >
                                    {sendingSmsId === debt._id ? (
                                      <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                      <Send size={18} />
                                    )}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Loading More Indicator */}
                {displayedDebts.length > 0 && displayedDebts.length < filteredDebts.length && (
                  <div ref={observerTarget} className="py-6 text-center border-t border-gray-200">
                    {loadingMore ? (
                      <div className="flex items-center justify-center gap-2 text-gray-600">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Yana qarzlar yuklanmoqda...</span>
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm">
                        Pastga tushing yoki kuting...
                      </div>
                    )}
                  </div>
                )}

                {/* End of List */}
                {displayedDebts.length > 0 && displayedDebts.length === filteredDebts.length && (
                  <div className="py-6 text-center border-t border-gray-200">
                    <div className="text-gray-500 text-sm">
                      Barcha {filteredDebts.length} ta qarz ko'rsatilmoqda
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Summary Footer */}
        <div className="mt-6 text-sm text-gray-600">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                <span>Muddati o'tgan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>Yaqinda to'lanadi (≤ 3 kun)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Normal muddat</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span>To'langan</span>
              </div>
            </div>
            <div className="text-gray-500">
              Jami: {debts.length} ta qarz • {stats.pendingCount} ta to'lanmagan • {stats.paidCount} ta to'langan
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}