'use client'

import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onScan: (decodedText: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanningRef = useRef<boolean>(false)

  // Beep ovozi funksiyasi (oddiy va qisqa)
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      oscillator.type = 'square'          // yoki 'sine', 'sawtooth'
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime) // chastota (Hz)
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime)        // balandlik

      oscillator.start()
      oscillator.stop(audioCtx.currentTime + 0.1) // 100ms beep

      // brauzer bloklamasligi uchun resume
      if (audioCtx.state === 'suspended') {
        audioCtx.resume()
      }
    } catch (err) {
      console.warn('Beep ovozi ishlamadi:', err)
      // fallback: oddiy alert yoki hech narsa qilmaslik
    }
  }

  useEffect(() => {
    scannerRef.current = new Html5Qrcode('reader')

    const startScanner = async () => {
      try {
        await scannerRef.current?.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isScanningRef.current) return

            isScanningRef.current = true

            // Beep ovozi chiqaramiz
            playBeep()

            onScan(decodedText)

            scannerRef.current?.stop().then(() => {
              onClose()
            }).catch(() => {
              onClose()
            })
          },
          (err) => {}
        )
      } catch (err) {
        console.error('Scanner start xatosi:', err)
        onClose()
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
      scannerRef.current = null
      isScanningRef.current = false
    }
  }, [onScan, onClose])

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div id="reader" className="w-full aspect-square" />
        <div className="p-4 border-t">
          <button
            onClick={() => {
              if (scannerRef.current) {
                scannerRef.current.stop().catch(() => {})
              }
              onClose()
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  )
}