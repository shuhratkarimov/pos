export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {/* Modern Spinner */}
        <div className="relative inline-block mb-6">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          
          {/* Center Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-teal-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <p className="text-gray-600 font-medium">Yuklanmoqda...</p>
          <p className="text-gray-400 text-sm">Iltimos, kuting</p>
        </div>

        {/* Progress dots */}
        <div className="mt-6 flex justify-center space-x-2">
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}