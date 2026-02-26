'use client'

import { useRef, useEffect, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function BarcodeScanner({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [rotation, setRotation] = useState(0)

  // Window rotation / orientation
  useEffect(() => {
    const updateRotation = () => {
      const angle = (window.screen.orientation?.angle ?? 0)
      setRotation(angle)
    }

    window.addEventListener('orientationchange', updateRotation)
    window.addEventListener('resize', updateRotation)

    updateRotation() // init

    return () => {
      window.removeEventListener('orientationchange', updateRotation)
      window.removeEventListener('resize', updateRotation)
    }
  }, [])

  useEffect(() => {
    const initScanner = async () => {
      if (!containerRef.current) return
      const html5QrCode = new Html5Qrcode('reader')
      scannerRef.current = html5QrCode
      const cameras = await Html5Qrcode.getCameras()
      if (!cameras || cameras.length === 0) return
      const backCamera = cameras[0]
      await html5QrCode.start(
        backCamera.id,
        { fps: 20, qrbox: 250 },
        (decoded) => {
          onScan(decoded)
          onClose()
        },
        (errorMessage) => {
          // xatoliklarni e'tiborsiz qoldirish yoki konsolga chiqish
          // console.log('Scan error:', errorMessage)
        }
      )
    }

    initScanner()

    return () => {
      scannerRef.current?.stop().catch(() => { })
    }
  }, [onScan, onClose])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black flex items-center justify-center z-[200] p-4"
      style={{
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        transition: 'transform 0.3s ease',
      }}
    >
      <div
        id="reader"
        className="w-full max-w-md aspect-square bg-gray-900 rounded-2xl overflow-hidden shadow-lg"
      />
    </div>
  )
}