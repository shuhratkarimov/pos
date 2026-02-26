'use client'

import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';
import toast from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { FiUser, FiLock, FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({
    username: '',
    password: ''
  });

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

  const validateForm = () => {
    const newErrors = { username: '', password: '' };

    if (!formData.username.trim()) {
      newErrors.username = 'Foydalanuvchi nomini kiriting';
    } else if (formData.username.trim().length < 5) {
      newErrors.username = 'Foydalanuvchi nomi kamida 5 ta belgi';
    }

    if (!formData.password) {
      newErrors.password = 'Parolni kiriting';
    } else if (formData.password.length < 5) {
      newErrors.password = 'Parol kamida 5 ta belgi';
    }

    setErrors(newErrors);
    return !newErrors.username && !newErrors.password;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Maydonlarni to\'g\'ri to\'ldiring');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        toast.success(`Xush kelibsiz, ${data.user.username}!`);
        await refreshUser();
        router.push(data.user.role === 'admin' ? '/admin' : '/');
      } else {
        toast.error(data.message || 'Login yoki parol noto\'g\'ri');
      }
    } catch (error) {
      toast.error('Server bilan bog\'lanib bo\'lmadi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {/* Logo va sarlavha */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl mb-4">
            <FiLogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-teal-700">Tizimga kirish</h1>
          <p className="text-gray-600 mt-2">Xush kelibsiz! Ma'lumotlaringizni kiriting</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Foydalanuvchi nomi
              </label>
              <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-400 w-5 h-5" />
              <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Foydalanuvchi nomingiz"
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${errors.username ? 'border-red-500' : 'border-gray-300'
                    }`}
                  disabled={isLoading}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parol
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Parolingiz"
                  className={`w-full pl-10 pr-12 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-teal-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Kirish...
                </span>
              ) : (
                'Kirish'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}