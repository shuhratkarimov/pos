'use client'

import { useState, useEffect, useRef } from 'react'
import {
  User,
  LogOut,
  Lock,
  Pencil,
  Settings,
  ChevronDown,
  Store,
  Phone,
  Save,
  X,
  Key,
  Bell,
  Calendar,
  Clock,
  AlertCircle,
  Wallet,
  Headphones,
  Send,
  Menu,
  Home,
  History,
  BarChart3,
  HelpCircle,
  FileText,
  ShoppingBag
} from 'lucide-react'
import { API_URL } from '@/lib/api'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { useUser } from '@/context/UserContext'

export default function ProfileMenu() {
  const { user, setUser, loading } = useUser()
  const [open, setOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [supportOpen, setSupportOpen] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newShopName, setNewShopName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [settings, setSettings] = useState({
    autoSmsOnDueDate: false,
    autoSmsOverdue: false
  })
  const [smsBalance, setSmsBalance] = useState<number | null>(null)
  const [smsRemaining, setSmsRemaining] = useState<number | null>(null)
  const [balanceLoading, setBalanceLoading] = useState(true)

  const menuRef = useRef<HTMLDivElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const refreshUser = async () => {
    try {
      const res = await fetch(`${API_URL}/user/me`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data);
      return data;
    } catch (err) {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    if (!user) return

    const fetchSmsBalance = async () => {
      try {
        setBalanceLoading(true)
        const res = await fetch(`${API_URL}/shop/get-sms-balance`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        })

        if (!res.ok) throw new Error('Balans yuklanmadi')

        const data = await res.json()
        const bal = data.balance || data.data?.balance || 0
        setSmsBalance(bal)
        setSmsRemaining(Math.floor(bal / 200))

      } catch (err) {
        console.error('SMS balance fetch error:', err)
        setSmsBalance(null)
      } finally {
        setBalanceLoading(false)
      }
    }

    fetchSmsBalance()
  }, [user])

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Initialize form values
  useEffect(() => {
    if (user) {
      setNewUsername(user.username)
      setNewPhone(user.phoneNumber || '')
      setNewShopName(user.shop?.shopName || '')
    }
  }, [user])

  // Fetch settings
  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/user/settings`, { credentials: 'include' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSettings({
          autoSmsOnDueDate: data.autoSmsOnDueDate,
          autoSmsOverdue: data.autoSmsOverdue
        });
      } catch (err) {
        console.log('Settings load error', err);
      }
    };

    fetchSettings();
  }, [user]);

  const logout = async () => {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    setUser(null)
    localStorage.setItem('logout', Date.now().toString())
    router.push('/login')
    toast.success('Chiqish amalga oshirildi')
  }

  const changeShopName = async () => {
    if (!newShopName.trim()) {
      return toast.error("Do'kon nomini kiriting")
    }

    try {
      const res = await fetch(`${API_URL}/shop/update-shop-name`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName: newShopName }),
      })

      const data = await res.json()

      if (!res.ok) {
        return toast.error(data.message || "Do'kon nomini yangilashda xatolik")
      }

      const freshRes = await fetch(`${API_URL}/user/me`, { credentials: 'include' })
      if (freshRes.ok) {
        const freshUser = await freshRes.json()
        setUser(freshUser)
      }

      toast.success("Do'kon nomi yangilandi")
      setActiveModal(null)
    } catch (err) {
      toast.error("Server bilan bog'lanishda xatolik")
    }
  }

  const changePassword = async () => {
    if (!oldPassword || !newPassword) {
      return toast.error("Barcha maydonlarni to'ldiring")
    }

    const res = await fetch(`${API_URL}/user/change-password`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword }),
    })

    const data = await res.json()

    if (!res.ok) return toast.error(data.message)

    toast.success('Parol yangilandi')
    setActiveModal(null)
    setOldPassword('')
    setNewPassword('')
  }

  const changeUsername = async () => {
    if (!newUsername.trim()) {
      return toast.error("Foydalanuvchi nomini kiriting")
    }

    const res = await fetch(`${API_URL}/user/change-username`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername, oldUsername: user!.username }),
    });

    if (!res.ok) {
      const data = await res.json();
      return toast.error(data.message || "Xatolik");
    }

    await refreshUser();
    toast.success('Foydalanuvchi nomi yangilandi');
    setActiveModal(null);
  };

  const changePhoneNumber = async () => {
    if (!newPhone.trim()) return toast.error("Telefon raqamni kiriting")

    try {
      const res = await fetch(`${API_URL}/user/update-phone/${user?._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: newPhone })
      })

      const data = await res.json()
      if (!res.ok) return toast.error(data.message || "Xatolik")

      await refreshUser()
      toast.success("Telefon raqam yangilandi")
      setActiveModal(null)
    } catch (err) {
      toast.error("Server bilan bog'lanishda xatolik")
    }
  }

  const handleToggle = async (field: 'autoSmsOnDueDate' | 'autoSmsOverdue') => {
    if (!settings) return
    const updatedValue = !settings[field]
    setSettings({ ...settings, [field]: updatedValue })

    try {
      const res = await fetch(`${API_URL}/user/update-settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: updatedValue }),
      })
      if (!res.ok) {
        throw new Error('Xatolik yuz berdi')
      }
      toast.success('Sozlamalar yangilandi')
    } catch (err: any) {
      toast.error(err.message)
      setSettings({ ...settings, [field]: !updatedValue })
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) return (
    <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
  )
  
  if (!user) return null

  return (
    <>
      {/* Desktop Profile Menu */}
      <div className="hidden md:block relative" ref={menuRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-green-600 flex items-center justify-center text-white font-medium text-sm shadow-sm">
            {getInitials(user.username)}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-700">{user.username}</p>
            <p className="text-xs text-gray-500">{user.shop?.shopName || 'Do‘kon'}</p>
          </div>
          <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Desktop Dropdown */}
        {open && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                  {getInitials(user.username)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{user.username}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Store size={14} />
                    {user.shop?.shopName || 'Do‘kon nomi mavjud emas'}
                  </p>
                  {user.phoneNumber && (
                    <p className="text-xs text-gray-400 mt-1">{user.phoneNumber}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1 max-h-[70vh] overflow-y-auto">
              <MenuItem
                icon={<Pencil size={16} className="text-amber-500" />}
                label="Foydalanuvchi nomini o‘zgartirish"
                onClick={() => {
                  setActiveModal('username')
                  setOpen(false)
                }}
              />

              {user.role !== 'admin' && (
                <MenuItem
                  icon={<Store size={16} className="text-amber-500" />}
                  label="Do'kon nomini o'zgartirish"
                  onClick={() => {
                    setActiveModal('shopName')
                    setOpen(false)
                  }}
                />
              )}

              <MenuItem
                icon={<Phone size={16} className="text-amber-500" />}
                label="Telefon raqamni o‘zgartirish"
                onClick={() => {
                  setActiveModal('phone')
                  setOpen(false)
                }}
              />

              <MenuItem
                icon={<Key size={16} className="text-amber-500" />}
                label="Parolni o‘zgartirish"
                onClick={() => {
                  setActiveModal('password')
                  setOpen(false)
                }}
              />

              <MenuItem
                icon={<Settings size={16} className="text-blue-500" />}
                label="Sozlamalar"
                onClick={() => {
                  setActiveModal('settings')
                  setOpen(false)
                }}
              />

              <div className="border-t border-gray-100 my-1"></div>

              {/* Support Section */}
              <div className="relative">
                <button
                  onClick={() => setSupportOpen(!supportOpen)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                >
                  <Headphones size={16} className="text-green-500" />
                  Qo‘llab-quvvatlash
                  <ChevronDown size={14} className={`ml-auto transition-transform ${supportOpen ? 'rotate-180' : ''}`} />
                </button>

                {supportOpen && (
                  <div className="ml-6 mb-2 flex flex-col bg-gray-50 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => window.open('tel:+998970400049', '_blank')}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Phone size={16} className="text-blue-500" />
                      +998 97 040 0049
                    </button>
                    <button
                      onClick={() => window.open('https://t.me/sentinel_core', '_blank')}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Send size={16} className="text-green-500" />
                      @sentinel_core
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 my-1"></div>

              <MenuItem
                icon={<LogOut size={16} />}
                label="Chiqish"
                onClick={() => {
                  setOpen(false)
                  logout()
                }}
                danger
              />

              {/* SMS Balance */}
              <div className="mt-3 pt-3 border-t border-gray-100 px-4 pb-2">
                <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-green-50 p-3 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Wallet size={18} className="text-purple-600" />
                    <span className="text-sm font-medium text-gray-800">SMS Balans</span>
                  </div>

                  {balanceLoading ? (
                    <div className="text-sm text-gray-500 animate-pulse">Yuklanmoqda...</div>
                  ) : smsBalance === null ? (
                    <div className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle size={14} />
                      Yuklanmadi
                    </div>
                  ) : (
                    <div className="text-right">
                      <p className={`font-bold text-lg ${smsBalance < 1000 ? 'text-red-600' : 'text-green-600'}`}>
                        {smsBalance.toLocaleString('uz-UZ')} so‘m
                      </p>
                      <p className="text-xs text-gray-600">
                        ≈ {smsRemaining} ta SMS
                        {smsBalance < 1000 && (
                          <span className="ml-1 text-red-500 font-medium">⚠️</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu Button and Drawer */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <User size={24} className="text-gray-700" />
        </button>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              ref={mobileMenuRef}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* User Info */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-green-600 flex items-center justify-center text-white font-bold text-xl">
                    {getInitials(user.username)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{user.username}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Store size={14} />
                      {user.shop?.shopName || 'Do‘kon'}
                    </p>
                    {user.phoneNumber && (
                      <p className="text-xs text-gray-400 mt-1">{user.phoneNumber}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 my-1"></div>

              {/* Profile Settings */}
              <div className="py-2">
                <p className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Sozlamalar
                </p>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setActiveModal('username')
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Pencil size={18} className="text-amber-500" />
                  <span className="text-sm">Foydalanuvchi nomini o‘zgartirish</span>
                </button>

                {user.role !== 'admin' && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      setActiveModal('shopName')
                    }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Store size={18} className="text-amber-500" />
                    <span className="text-sm">Do'kon nomini o'zgartirish</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setActiveModal('phone')
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Phone size={18} className="text-amber-500" />
                  <span className="text-sm">Telefon raqamni o‘zgartirish</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setActiveModal('password')
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Key size={18} className="text-amber-500" />
                  <span className="text-sm">Parolni o‘zgartirish</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setActiveModal('settings')
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={18} className="text-blue-500" />
                  <span className="text-sm">Sozlamalar</span>
                </button>
              </div>

              <div className="border-t border-gray-100 my-1"></div>

              {/* Support */}
              <div className="py-2">
                <p className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Qo'llab-quvvatlash
                </p>
                <button
                  onClick={() => window.open('tel:+998970400049', '_blank')}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Phone size={18} className="text-blue-500" />
                  <span className="text-sm">+998 97 040 0049</span>
                </button>
                <button
                  onClick={() => window.open('https://t.me/sentinel_core', '_blank')}
                  className="w-full flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Send size={18} className="text-green-500" />
                  <span className="text-sm">@sentinel_core</span>
                </button>
              </div>

              <div className="border-t border-gray-100 my-1"></div>

              {/* SMS Balance Mobile */}
              <div className="px-5 py-4">
                <div className="bg-gradient-to-r from-purple-50 to-green-50 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Wallet size={20} className="text-purple-600" />
                      <span className="font-medium text-gray-800">SMS Balans</span>
                    </div>
                    {balanceLoading ? (
                      <div className="text-sm text-gray-500">Yuklanmoqda...</div>
                    ) : smsBalance === null ? (
                      <div className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle size={14} />
                        Yuklanmadi
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className={`font-bold ${smsBalance < 1000 ? 'text-red-600' : 'text-green-600'}`}>
                          {smsBalance.toLocaleString('uz-UZ')} so‘m
                        </p>
                      </div>
                    )}
                  </div>
                  {!balanceLoading && smsBalance !== null && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Taxminan:</span>
                      <span className="font-medium text-gray-800">{smsRemaining} ta SMS</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <div className="px-5 py-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-medium hover:bg-red-100 transition-colors"
                >
                  <LogOut size={18} />
                  Chiqish
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modals (same as before) */}
      <Modal
        isOpen={activeModal === 'username'}
        onClose={() => setActiveModal(null)}
        title="Foydalanuvchi nomini o‘zgartirish"
        onSave={changeUsername}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yangi foydalanuvchi nomi
            </label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              placeholder="Yangi username"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'shopName'}
        onClose={() => setActiveModal(null)}
        title="Do'kon nomini o'zgartirish"
        onSave={changeShopName}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yangi do'kon nomi
            </label>
            <input
              type="text"
              value={newShopName}
              onChange={(e) => setNewShopName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              placeholder="Yangi do'kon nomi"
              maxLength={100}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'phone'}
        onClose={() => setActiveModal(null)}
        title="Telefon raqamni o'zgartirish"
        onSave={changePhoneNumber}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yangi telefon raqam
            </label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              placeholder="+998 90 123 45 67"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'password'}
        onClose={() => {
          setActiveModal(null)
          setOldPassword('')
          setNewPassword('')
        }}
        title="Parolni o‘zgartirish"
        onSave={changePassword}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eski parol
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yangi parol
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={activeModal === 'settings'}
        onClose={() => setActiveModal(null)}
        title="Sozlamalar"
        onSave={() => setActiveModal(null)}
        hideSaveButton
      >
        <div className="space-y-6">
          <div className="bg-purple-50 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-purple-700 mb-3">
              <Bell size={18} />
              <span className="font-medium">SMS Bildirishnomalar</span>
            </div>

            <div className="space-y-4">
              <ToggleItem
                icon={<Calendar size={16} />}
                label="Qarzlarni to‘lash kunida avtomatik SMS"
                checked={settings.autoSmsOnDueDate}
                onChange={() => handleToggle('autoSmsOnDueDate')}
              />

              <ToggleItem
                icon={<Clock size={16} />}
                label="Qarz muddati o‘tgan mijozlarga har kuni SMS"
                checked={settings.autoSmsOverdue}
                onChange={() => handleToggle('autoSmsOverdue')}
              />
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}

// Helper Components
function MenuItem({ icon, label, onClick, danger = false }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150
        ${danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-gray-700 hover:bg-gray-50'
        }`}
    >
      <span className={danger ? 'text-red-500' : 'text-gray-500'}>{icon}</span>
      {label}
    </button>
  )
}

function Modal({ isOpen, onClose, title, children, onSave, hideSaveButton = false }: any) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        {!hideSaveButton && (
          <div className="flex gap-3 p-6 pt-0">
            <button
              onClick={onSave}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-green-600 hover:from-purple-700 hover:to-green-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200"
            >
              <Save size={18} />
              Saqlash
            </button>
            <button
              onClick={onClose}
              className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl transition-colors duration-200"
            >
              Bekor qilish
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ToggleItem({ icon, label, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="text-gray-400">{icon}</span>
        <span>{label}</span>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${checked ? 'bg-purple-600' : 'bg-gray-200'
          }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
      </button>
    </div>
  )
}