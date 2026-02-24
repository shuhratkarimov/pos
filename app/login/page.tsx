'use client'

import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiLock, FiLogIn, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import { HiOutlineSparkles } from 'react-icons/hi';
type Bubble = {
  width: number;
  height: number;
  left: string;
  top: string;
  moveX: number;
  moveY: number;
  duration: number;
};

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

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
    const generated = Array.from({ length: 20 }).map(() => ({
      width: Math.random() * 300 + 50,
      height: Math.random() * 300 + 50,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      moveX: Math.random() * 100 - 50,
      moveY: Math.random() * 100 - 50,
      duration: Math.random() * 10 + 10,
    }));

    setBubbles(generated);
  }, []);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.user) {
        toast.success(
          <div className="flex items-center gap-2">
            <HiOutlineSparkles className="w-5 h-5" />
            <span>Xush kelibsiz, {data.user.username}!</span>
          </div>,
          {
            duration: 3000,
            style: {
              background: '#10b981',
              color: '#fff',
              padding: '16px',
              borderRadius: '12px'
            }
          }
        );
        await refreshUser();
        router.push(data.user.role === 'admin' ? '/admin' : '/');
      } else {
        toast.error(data.message || 'Kirishda xatolik', {
          style: {
            background: '#ef4444',
            color: '#fff',
            padding: '16px',
            borderRadius: '12px'
          }
        });
      }
    } catch (error) {
      toast.error('Server bilan bog‘lanishda xatolik', {
        style: {
          background: '#ef4444',
          color: '#fff',
          padding: '16px',
          borderRadius: '12px'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4 relative overflow-hidden">

      {/* Decorative card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl blur-xl opacity-20 animate-pulse" />

      <motion.div
        whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/50"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
            >
              <FiLogIn className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Tizimga kirish
            </h1>
            <p className="text-gray-600 mt-3">Xush kelibsiz! Iltimos, ma'lumotlaringizni kiriting</p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="relative">
                <FiUser className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'username' ? 'text-indigo-600' : 'text-gray-400'
                  }`} />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Foydalanuvchi nomi"
                  required
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none transition-all duration-300 placeholder-gray-400"
                />
              </div>
            </motion.div>

            {/* Password field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="relative"
            >
              <div className="relative">
                <FiLock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${focusedField === 'password' ? 'text-indigo-600' : 'text-gray-400'
                  }`} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Parol"
                  required
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:outline-none transition-all duration-300 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors duration-300"
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            {/* Submit button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                      Kirish...
                    </>
                  ) : (
                    <>
                      Kirish
                      <FiArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
                <motion.div
                  className="absolute inset-0 bg-white"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.5 }}
                  style={{ opacity: 0.2 }}
                />
              </motion.button>
            </motion.div>
          </form>
        </motion.div>
    </div>
  );
}