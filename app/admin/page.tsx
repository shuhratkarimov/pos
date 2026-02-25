'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { API_URL } from '@/lib/api'
import {
  Store,
  Users,
  LogOut,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Phone,
  Key,
  X,
  Search,
  ShoppingBag,
  UserCog,
  BarChart3,
  CreditCard,
  Mail,
  Calendar,
  TrendingUp,
  Wallet,
  MessageSquare,
  Settings,
  ChevronRight,
  Minus
} from 'lucide-react'

interface User {
  _id: string
  username: string
  shop: Shop
  role: string
  phoneNumber?: string
}

interface Shop {
  _id: string
  shopName: string
  owner: User
}

interface TotalProviderBalance {
  balance: number;
  response: {
    data: {
      balance: string
      sms_price: string
      statistics: {
        month_sms: number
        month_spent: string
        today_sms: number
        today_spent: string
        total_sms: number
        total_spent: string
      }
    }
  }
}

export default function AdminPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [shopName, setShopName] = useState('')
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [editingShopId, setEditingShopId] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingUserName, setEditingUserName] = useState('')
  const [loading, setLoading] = useState(false)
  const [shopModalOpen, setShopModalOpen] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'shops' | 'users'>('shops')
  const [newPasswordInput, setNewPasswordInput] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [newUserPhone, setNewUserPhone] = useState('')
  const [editingUserPhone, setEditingUserPhone] = useState('')
  const [updatingPhone, setUpdatingPhone] = useState(false)
  const [balances, setBalances] = useState<{ storeId: string; balance: number }[]>([]);
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpStoreId, setTopUpStoreId] = useState<string | null>(null);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [totalProviderBalance, setTotalProviderBalance] = useState<TotalProviderBalance>({} as TotalProviderBalance);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deductModalOpen, setDeductModalOpen] = useState(false);
  const [deductAmount, setDeductAmount] = useState('');
  const [deductStoreId, setDeductStoreId] = useState<string | null>(null);
  const [deductLoading, setDeductLoading] = useState(false);

  // ---------- FETCH DATA ----------
  const fetchShops = async () => {
    try {
      const res = await fetch(`${API_URL}/shop/all-shops`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xatolik')
      setShops(data)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/user/users`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xatolik')
      setUsers(data)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const fetchBalancesAdmin = async () => {
    try {
      const res = await fetch(`${API_URL}/shop/get-sms-balances-admin`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Xatolik');
      setBalances(data);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const fetchTotalProviderBalance = async () => {
    try {
      const res = await fetch(`${API_URL}/shop/in-provider-balance`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Xatolik');
      setTotalProviderBalance(data);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    fetchShops()
    fetchUsers()
    fetchBalancesAdmin()
    fetchTotalProviderBalance()
  }, [])

  const handleTopUpSubmit = async () => {
    if (!topUpStoreId || !topUpAmount) {
      toast.error('Miqdor kiriting');
      return;
    }
    const amountNumber = Number(topUpAmount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast.error('Miqdor musbat son bo‘lishi kerak');
      return;
    }

    setTopUpLoading(true);
    try {
      const res = await fetch(`${API_URL}/shop/top-up-balance`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNumber, storeId: topUpStoreId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Xatolik');
      toast.success('Balans to‘ldirildi');
      setTopUpModalOpen(false);
      fetchBalancesAdmin();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTopUpLoading(false);
    }
  };

  const openTopUpModal = (shop: any) => {
    setTopUpStoreId(shop._id);
    setTopUpModalOpen(true);
    setTopUpAmount('');
  };

  const handleDeductSubmit = async () => {
    if (!deductStoreId || !deductAmount) {
      toast.error('Miqdor kiriting');
      return;
    }

    const amountNumber = Number(deductAmount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      toast.error('Miqdor musbat son bo‘lishi kerak');
      return;
    }

    setDeductLoading(true);
    try {
      const res = await fetch(`${API_URL}/shop/deduct-balance`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountNumber, storeId: deductStoreId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Xatolik');
      toast.success('Balans kamaytirildi');
      setDeductModalOpen(false);
      fetchBalancesAdmin();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeductLoading(false);
    }
  };

  const handleSaveShop = async () => {
    if (!shopName || !selectedOwnerId) {
      toast.error('Do\'kon nomi va egasini tanlang')
      return
    }
    setLoading(true)
    try {
      const body = { shopName, owner: selectedOwnerId }
      const res = await fetch(
        editingShopId
          ? `${API_URL}/shop/update-shop/${editingShopId}`
          : `${API_URL}/shop/create-shop`,
        {
          method: editingShopId ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xatolik')
      toast.success(editingShopId ? 'Do\'kon yangilandi' : 'Do\'kon yaratildi')
      setShopName('')
      setSelectedOwnerId('')
      setEditingShopId(null)
      setShopModalOpen(false)
      fetchShops()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePhone = async (userId: string) => {
    if (!editingUserPhone) {
      toast.error("Telefon raqamni kiriting")
      return
    }

    setUpdatingPhone(true)
    try {
      const res = await fetch(`${API_URL}/user/update-phone/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: editingUserPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xatolik')
      toast.success('Telefon raqam muvaffaqiyatli yangilandi')
      setEditingUserPhone('')
      setUserModalOpen(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUpdatingPhone(false)
    }
  }

  const handleEditShop = (shop: Shop) => {
    setEditingShopId(shop._id)
    setShopName(shop.shopName)
    setSelectedOwnerId(shop?.owner?._id ? shop?.owner?._id : '')
    setShopModalOpen(true)
  }

  const handleDeleteShop = async (shopId: string) => {
    if (!confirm("Do'konni o'chirmoqchimisiz?")) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/shop/delete-shop/${shopId}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xatolik')
      toast.success(`Do'kon o'chirildi`)
      fetchShops()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelShop = () => {
    setEditingShopId(null)
    setShopName('')
    setSelectedOwnerId('')
    setShopModalOpen(false)
  }

  const handleSaveUser = async () => {
    if (!editingUserId && (!newUserName || !newUserPassword || !newUserPhone)) {
      toast.error('Barcha maydonlarni to\'ldiring')
      return
    }
    if (editingUserId && !editingUserName) {
      toast.error('Foydalanuvchi nomini kiriting')
      return
    }

    setLoading(true)
    try {
      let res
      if (editingUserId) {
        res = await fetch(`${API_URL}/user/update-username/${editingUserId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: editingUserName }),
        })
      } else {
        res = await fetch(`${API_URL}/user/register`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: newUserName, password: newUserPassword, phoneNumber: newUserPhone }),
        })
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xatolik')

      toast.success(editingUserId ? 'Foydalanuvchi yangilandi' : 'Foydalanuvchi yaratildi')
      setEditingUserId(null)
      setEditingUserName('')
      setNewUserName('')
      setUserModalOpen(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditingUserId(user._id)
    setEditingUserName(user.username)
    setUserModalOpen(true)
    setEditingUserPhone(user.phoneNumber || '')
  }

  const handleViewDetails = (user: User) => {
    setSelectedUser(user)
    setDetailsModalOpen(true)
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Foydalanuvchini o'chirmoqchimisiz?")) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/user/delete-user/${userId}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xatolik')
      toast.success('Foydalanuvchi o\'chirildi')
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelUser = () => {
    setEditingUserId(null)
    setEditingUserName('')
    setNewUserName('')
    setNewUserPassword('')
    setUserModalOpen(false)
    setSelectedUser(null)
  }

  const handleChangePassword = async (userId: string) => {
    if (!newPasswordInput) {
      toast.error("Parolni kiriting")
      return
    }

    setChangingPassword(true)
    try {
      const res = await fetch(`${API_URL}/user/change-password-by-admin/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xatolik')

      toast.success('Parol muvaffaqiyatli yangilandi')
      setNewPasswordInput('')
      setUserModalOpen(false)
      setSelectedUser(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setChangingPassword(false)
    }
  }

  const handleLogout = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
      if (!res.ok) throw new Error('Chiqishda xatolik')
      window.location.href = '/login'
      toast.success('Chiqish amalga oshirildi')
      localStorage.setItem('logout', Date.now().toString());
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Filter functions
  const filteredShops = shops.filter(shop =>
    shop.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.owner?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.shop?.shopName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function openDeductModal(shop: Shop): void {
    setDeductStoreId(shop._id);
    setDeductAmount('');
    setDeductModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Super Admin
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-indigo-600 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Provayder balansi</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {Number(totalProviderBalance?.response?.data?.balance || 0).toLocaleString()} so'm
                </p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <Wallet className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-600 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bugun yuborilgan</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalProviderBalance?.response?.data?.statistics?.today_sms || 0} ta
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-600 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Do'konlar soni</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{shops.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-600 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Foydalanuvchilar</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{users.length}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Bugun sarflandi</span>
              <TrendingUp className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-lg font-semibold">
              {Number(totalProviderBalance?.response?.data?.statistics?.today_spent || 0).toLocaleString()} so'm
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Bu oy sarflandi</span>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-lg font-semibold">
              {Number(totalProviderBalance?.response?.data?.statistics?.month_spent || 0).toLocaleString()} so'm
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Jami sarflandi</span>
              <BarChart3 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-lg font-semibold">
              {Number(totalProviderBalance?.response?.data?.statistics?.total_spent || 0).toLocaleString()} so'm
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('shops')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative ${activeTab === 'shops'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Store className="h-5 w-5" />
                Do'konlar
                {shops.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {shops.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative ${activeTab === 'users'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Users className="h-5 w-5" />
                Foydalanuvchilar
                {users.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                    {users.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Search and Add Bar */}
        <div className="flex flex-wrap flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">          <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Qidirish..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
          <button
            onClick={() => activeTab === 'shops' ? setShopModalOpen(true) : setUserModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5" />
            <span>Yangi {activeTab === 'shops' ? 'do\'kon' : 'foydalanuvchi'}</span>
          </button>
        </div>

        {/* Content Tables */}
        {activeTab === 'shops' ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Do'kon nomi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Egasi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SMS balans</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amallar</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredShops.map((shop, idx) => (
                    <tr key={shop._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ShoppingBag className="h-5 w-5 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">{shop.shopName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shop.owner?.username || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm font-medium text-gray-900">
                            {balances.find(b => b.storeId === shop._id)?.balance ?? 0} so'm
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openTopUpModal(shop)}
                            className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors"
                            title="Balans to'ldirish"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeductModal(shop)}
                            className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                            title="Balansni kamaytirish"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditShop(shop)}
                            className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                            title="Tahrirlash"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteShop(shop._id)}
                            className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Foydalanuvchi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Do'kon</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roli</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amallar</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user, idx) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-600">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.shop?.shopName || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-1" />
                          {user.phoneNumber || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(user)}
                            className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                            title="Batafsil"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                            title="Tahrirlash"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Shop Modal */}
        {shopModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingShopId ? 'Do\'konni tahrirlash' : 'Yangi do\'kon qo\'shish'}
                </h2>
                <button
                  onClick={handleCancelShop}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Do'kon nomi
                  </label>
                  <input
                    type="text"
                    placeholder="Do'kon nomini kiriting"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Do'kon egasi
                  </label>
                  <select
                    value={selectedOwnerId}
                    onChange={e => setSelectedOwnerId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Egasi tanlang</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.username}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={handleCancelShop}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleSaveShop}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Jarayon...' : editingShopId ? 'Saqlash' : 'Yaratish'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Up Modal */}
        {topUpModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">SMS balansni to'ldirish</h2>
                <button
                  onClick={() => setTopUpModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Miqdor (so'm)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Miqdorni kiriting"
                    value={topUpAmount}
                    onChange={e => setTopUpAmount(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => setTopUpModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleTopUpSubmit}
                  disabled={topUpLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                >
                  {topUpLoading ? 'Jarayon...' : 'To\'ldirish'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Modal */}
        {userModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingUserId ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi qo\'shish'}
                </h2>
                <button
                  onClick={handleCancelUser}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Foydalanuvchi nomi
                  </label>
                  <input
                    type="text"
                    placeholder="Foydalanuvchi nomini kiriting"
                    value={editingUserId ? editingUserName : newUserName}
                    onChange={e => editingUserId ? setEditingUserName(e.target.value) : setNewUserName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                {!editingUserId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Parol
                    </label>
                    <input
                      type="password"
                      placeholder="Parolni kiriting"
                      value={newUserPassword}
                      onChange={e => setNewUserPassword(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon raqam
                  </label>
                  <input
                    type="text"
                    placeholder="Telefon raqamni kiriting"
                    value={editingUserId ? editingUserPhone : newUserPhone}
                    onChange={e => editingUserId ? setEditingUserPhone(e.target.value) : setNewUserPhone(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {editingUserId && (
                  <>
                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-900 mb-3">Parolni yangilash</h3>
                      <div className="space-y-3">
                        <input
                          type="password"
                          placeholder="Yangi parol"
                          value={newPasswordInput}
                          onChange={e => setNewPasswordInput(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button
                          onClick={() => handleChangePassword(editingUserId)}
                          disabled={changingPassword}
                          className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                        >
                          <Key className="h-4 w-4" />
                          {changingPassword ? 'Jarayon...' : 'Parolni yangilash'}
                        </button>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-medium text-gray-900 mb-3">Telefon raqamni yangilash</h3>
                      <button
                        onClick={() => handleChangePhone(editingUserId)}
                        disabled={updatingPhone}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                      >
                        <Phone className="h-4 w-4" />
                        {updatingPhone ? 'Jarayon...' : 'Telefonni yangilash'}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={handleCancelUser}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleSaveUser}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
                >
                  {loading ? 'Jarayon...' : editingUserId ? 'Saqlash' : 'Yaratish'}
                </button>
              </div>
            </div>
          </div>
        )}

        {deductModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Balansni kamaytirish</h2>
                <button
                  onClick={() => setDeductModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Miqdor (so'm)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Miqdorni kiriting"
                    value={deductAmount}
                    onChange={e => setDeductAmount(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => setDeductModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleDeductSubmit}
                  disabled={deductLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
                >
                  {deductLoading ? 'Jarayon...' : 'Kamaytirish'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {detailsModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Foydalanuvchi ma'lumotlari</h2>
                <button
                  onClick={() => setDetailsModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-medium text-indigo-600">
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">{selectedUser.username}</h3>
                    <p className="text-sm text-gray-500">ID: {selectedUser._id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Roli</p>
                    <p className="font-medium capitalize">{selectedUser.role}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Telefon</p>
                    <p className="font-medium">{selectedUser.phoneNumber || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Do'kon</p>
                    <p className="font-medium">{selectedUser.shop?.shopName || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Do'kon ID</p>
                    <p className="font-medium">{selectedUser.shop?._id || '-'}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => setDetailsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Yopish
                </button>
                <button
                  onClick={() => {
                    setDetailsModalOpen(false)
                    handleEditUser(selectedUser)
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Tahrirlash
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}