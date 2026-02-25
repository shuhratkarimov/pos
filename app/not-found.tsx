// app/not-found.tsx
import Link from 'next/link'
import { Home } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
            <div className="text-center max-w-md">
                <h1 className="text-6xl font-extrabold mb-4 text-red-800 animate-pulse">404</h1>
                <h2 className="text-3xl font-bold mb-4 text-gray-700">Ushbu sahifa topilmadi</h2>
                <p className="text-gray-500 mb-6">
                    Siz izlayotgan sahifa mavjud emas
                </p>
                <Link href="/">
                    <button className=" hover:cursor-pointer inline-flex items-center gap-2 px-5 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-lg hover:bg-green-700 hover:scale-105 transition-all duration-200">
                        <Home className="w-5 h-5" />
                        Bosh sahifaga qaytish
                    </button>
                </Link>
            </div>
        </div>
    )
}