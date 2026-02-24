'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { API_URL } from '@/lib/api'

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
  const [oldPassword, setOldPassword] = useState('')
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
      console.log(data)
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
      fetchBalancesAdmin(); // yangilash
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

  // ---------- SHOP HANDLERS ----------
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
      console.log(data)
      toast.success('Telefon raqam muvaffaqiyatli yangilandi')
      setEditingUserPhone('')
      setUserModalOpen(false)
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
    console.log(shop)
    setShopModalOpen(true)
  }

  const handleDeleteShop = async (shopId: string) => {
    if (!confirm("Do'konni o'chirmoqchimisiz?")) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/shop/delete-shop/${shopId}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xatolik')
      toast.success(`Do'kon o'chirildi: ${data.shopName || data.shop?.shopName || ''}`)
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

  // ---------- USER HANDLERS ----------
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

      toast.success(editingUserId ? 'Foydalanuvchi yangilandi' : `Foydalanuvchi yaratildi: ${data.user?.username || data.username}`)
      setEditingUserId(null)
      setEditingUserName('')
      setNewUserName('')
      setUserModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUserId(user._id)
    setEditingUserName(user.username)
    setUserModalOpen(true)
    setEditingUserPhone(user.phoneNumber || '')
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Foydalanuvchini o'chirmoqchimisiz?")) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/user/delete-user/${userId}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Xatolik')
      toast.success(`Foydalanuvchi o'chirildi: ${data.username}`)
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
      setOldPassword('')
      setNewPasswordInput('')
      setUserModalOpen(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setChangingPassword(false)
    }
  }

  // ---------- LOGOUT ----------
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

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin panel</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Chiqish
        </button>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-indigo-600">
          <h3 className="text-gray-500 text-sm">Provayder umumiy SMS balansi</h3>
          <p className="text-2xl font-bold text-indigo-700 mt-2">
            {totalProviderBalance?.response?.data?.balance.toLocaleString() || 0} so'm
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-indigo-600">
          <h3 className="text-gray-500 text-sm">Bugun yuborilgan SMSlar</h3>
          <p className="text-2xl font-bold text-indigo-700 mt-2">
            {totalProviderBalance?.response?.data?.statistics?.today_sms || 0} ta SMS
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-indigo-600">
          <h3 className="text-gray-500 text-sm">Bugun sarflandi</h3>
          <p className="text-2xl font-bold text-indigo-700 mt-2">
            {totalProviderBalance?.response?.data?.statistics?.today_spent || 0} so'm
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-indigo-600">
          <h3 className="text-gray-500 text-sm">Bu oy yuborilgan SMSlar</h3>
          <p className="text-2xl font-bold text-indigo-700 mt-2">
            {totalProviderBalance?.response?.data?.statistics?.month_sms || 0} ta SMS
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-indigo-600">
          <h3 className="text-gray-500 text-sm">Bu oy sarflandi</h3>
          <p className="text-2xl font-bold text-indigo-700 mt-2">
            {totalProviderBalance?.response?.data?.statistics?.month_spent || 0} so'm
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-indigo-600">
          <h3 className="text-gray-500 text-sm">Jami yuborilgan SMSlar</h3>
          <p className="text-2xl font-bold text-indigo-700 mt-2">
            {totalProviderBalance?.response?.data?.statistics?.total_sms || 0} ta SMS
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 border-l-4 border-indigo-600">
          <h3 className="text-gray-500 text-sm">Jami sarflandi</h3>
          <p className="text-2xl font-bold text-indigo-700 mt-2">
            {totalProviderBalance?.response?.data?.statistics?.total_spent || 0} so'm
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-gray-500 text-sm">Do'konlar soni</h3>
          <p className="text-2xl font-bold mt-2">
            {shops.length}
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h3 className="text-gray-500 text-sm">Foydalanuvchilar soni</h3>
          <p className="text-2xl font-bold mt-2">
            {users.length}
          </p>
        </div>
      </div>


      {/* TAB NAV */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 ${activeTab === 'shops' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('shops')}
        >
          Do'konlar
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          onClick={() => setActiveTab('users')}
        >
          Foydalanuvchilar
        </button>
      </div>

      {/* ---------- SHOPS TAB ---------- */}
      {activeTab === 'shops' && (
        <>
          <div className="flex gap-4 my-4">
            <button
              onClick={() => setShopModalOpen(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Yangi do'kon qo'shish
            </button>
          </div>

          {/* SHOP MODAL */}
          {shopModalOpen && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-4 relative">
                <h2 className="text-xl font-semibold">
                  {editingShopId ? 'Do\'konni tahrirlash' : 'Yangi do\'kon qo\'shish'}
                </h2>
                <input
                  type="text"
                  placeholder="Do'kon nomi"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <select
                  value={selectedOwnerId}
                  onChange={e => setSelectedOwnerId(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Egasi tanlang</option>
                  {users.map(u => <option key={u._id} value={u._id}>{u.username}</option>)}
                </select>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveShop}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {loading ? 'Jarayon...' : editingShopId ? 'Saqlash' : 'Yaratish'}
                  </button>
                  <button
                    onClick={handleCancelShop}
                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SHOPS LIST */}
          <div className="bg-white shadow-md p-6 rounded-lg">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2">#</th>
                  <th className="border px-4 py-2">Do'kon nomi</th>
                  <th className="border px-4 py-2">Foydalanuvchi nomi</th>
                  <th className="border px-4 py-2">SMS balans</th>
                  <th className="border px-4 py-2">To‘ldirish</th>
                  <th className="border px-4 py-2">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((shop, idx) => (
                  <tr key={shop._id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{idx + 1}</td>
                    <td className="border px-4 py-2">{shop.shopName}</td>
                    <td className="border px-4 py-2">{shop.owner?.username || '-'}</td>
                    <td className="border px-4 py-2">
                      {balances.find(b => b.storeId === shop._id)?.balance ?? 0}
                    </td>
                    <td className="border px-4 py-2">
                      <button
                        onClick={() => openTopUpModal(shop)}
                        className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        To‘ldirish
                      </button>
                    </td>
                    <td className="border px-4 py-2">
                      <button onClick={() => handleEditShop(shop)} className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Tahrirlash</button>
                      <button onClick={() => handleDeleteShop(shop._id)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 ml-2">O'chirish</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ---------- USERS TAB ---------- */}
      {activeTab === 'users' && (
        <>
          <div className="flex justify-end my-4">
            <button
              onClick={() => setUserModalOpen(true)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Yangi foydalanuvchi
            </button>
          </div>

          {/* USERS LIST */}
          <div className="bg-white shadow-md p-6 rounded-lg overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2">#</th>
                  <th className="border px-4 py-2">Foydalanuvchi nomi</th>
                  <th className="border px-4 py-2">Do'kon nomi</th>
                  <th className="border px-4 py-2">Roli</th>
                  <th className="border px-4 py-2">Telefon raqami</th>
                  <th className="border px-4 py-2">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{idx + 1}</td>
                    <td className="border px-4 py-2">{user.username}</td>
                    <td className="border px-4 py-2">{user.shop?.shopName || '-'}</td>
                    <td className="border px-4 py-2">{user.role}</td>
                    <td className="border px-4 py-2">{user.phoneNumber}</td>
                    <td className="border px-4 py-2">
                      <button onClick={() => handleEditUser(user)} className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Tahrirlash</button>
                      <button onClick={() => handleDeleteUser(user._id)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 ml-2">O'chirish</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {topUpModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-4 relative">
            <h2 className="text-xl font-semibold">SMS balansni to‘ldirish</h2>
            <input
              type="number"
              min="1"
              placeholder="Miqdor"
              value={topUpAmount}
              onChange={e => setTopUpAmount(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleTopUpSubmit}
                disabled={topUpLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {topUpLoading ? 'Jarayon...' : 'To‘ldirish'}
              </button>
              <button
                onClick={() => setTopUpModalOpen(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- USER MODAL ---------- */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-4 relative">
            <h2 className="text-xl font-semibold">{editingUserId ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi qo\'shish'}</h2>
            <input
              type="text"
              placeholder="Foydalanuvchi nomi"
              value={editingUserId ? editingUserName : newUserName}
              onChange={e => editingUserId ? setEditingUserName(e.target.value) : setNewUserName(e.target.value)}
              className="w-full p-2 border rounded"
            />
            {!editingUserId && (
              <input
                type="password"
                placeholder="Parol"
                value={newUserPassword}
                onChange={e => setNewUserPassword(e.target.value)}
                className="w-full p-2 border rounded"
              />
            )}
            <input
              type="text"
              placeholder="Telefon raqam"
              value={editingUserId ? editingUserPhone : newUserPhone}
              onChange={e => editingUserId ? setEditingUserPhone(e.target.value) : setNewUserPhone(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveUser}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Jarayon...' : editingUserId ? 'Saqlash' : 'Yaratish'}
              </button>
              <button
                onClick={handleCancelUser}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Bekor qilish
              </button>
            </div>
            {editingUserId && (
              <div className="space-y-2 mt-4">
                <h3 className="font-semibold">Parolni yangilash</h3>
                <input
                  type="password"
                  placeholder="Yangi parol"
                  value={newPasswordInput}
                  onChange={e => setNewPasswordInput(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={() => handleChangePassword(editingUserId)}
                  disabled={changingPassword}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400"
                >
                  {changingPassword ? 'Jarayon...' : 'Parolni yangilash'}
                </button>
              </div>
            )}
            {editingUserId && (
              <div className="space-y-2 mt-4">
                <h3 className="font-semibold">Telefon raqamni yangilash</h3>
                <input
                  type="text"
                  placeholder="Telefon raqam"
                  value={editingUserPhone}
                  onChange={e => setEditingUserPhone(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={() => handleChangePhone(editingUserId)}
                  disabled={updatingPhone}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
                >
                  {updatingPhone ? 'Jarayon...' : 'Telefonni yangilash'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
