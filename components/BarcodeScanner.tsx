'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onScan: (decodedText: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanningRef = useRef<boolean>(false)
  const [scanLinePosition, setScanLinePosition] = useState(0)
  const animationRef = useRef<number>(0)

  // Scan line animatsiyasi
  useEffect(() => {
    const animateScanLine = () => {
      let direction = 1
      let position = 0

      const animate = () => {
        position += direction * 2

        if (position >= 100) {
          direction = -1
          position = 100
        } else if (position <= 0) {
          direction = 1
          position = 0
        }

        setScanLinePosition(position)
        animationRef.current = requestAnimationFrame(animate)
      }

      animationRef.current = requestAnimationFrame(animate)

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    }

    const cleanup = animateScanLine()
    return cleanup
  }, [])

  // Beep ovozi funksiyasi - mobil uchun optimallashtirilgan
  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      const audioCtx = new AudioContextClass()

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          createAndPlayBeep(audioCtx)
        }).catch(() => { })
      } else {
        createAndPlayBeep(audioCtx)
      }
    } catch (err) {
      console.log('Audio error (non-critical):', err)
    }
  }

  const createAndPlayBeep = (audioCtx: AudioContext) => {
    try {
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime)
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime)

      oscillator.start()
      oscillator.stop(audioCtx.currentTime + 0.1)
    } catch (err) {
      console.log('Beep creation error:', err)
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeScanner = async () => {
      try {
        const readerElement = document.getElementById('reader')
        if (!readerElement) {
          throw new Error('Reader element not found')
        }

        const html5QrCode = new Html5Qrcode('reader')
        scannerRef.current = html5QrCode

        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const hasCamera = devices.some(device => device.kind === 'videoinput')

          if (!hasCamera) {
            throw new Error('Kamera topilmadi')
          }
        } catch (err) {
          throw new Error('Kamera ruxsati berilmagan yoki kamera mavjud emas')
        }

        const cameras = await Html5Qrcode.getCameras()

        if (!cameras || cameras.length === 0) {
          throw new Error('Kamera topilmadi')
        }

        const backCamera = cameras.find(
          camera => camera.id?.toLowerCase().includes('back') ||
            camera.label?.toLowerCase().includes('back')
        ) || cameras[0]

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
          disableFlip: false,
        }

        await html5QrCode.start(
          backCamera.id,
          config,
          (decodedText) => {
            if (!mounted || isScanningRef.current) return

            isScanningRef.current = true
            playBeep()
            onScan(decodedText)

            html5QrCode.stop()
              .then(() => {
                if (mounted) {
                  onClose()
                }
              })
              .catch(() => {
                if (mounted) {
                  onClose()
                }
              })
          },
          (errorMessage) => {
            if (errorMessage && !errorMessage.includes('No MultiFormat Readers')) {
              console.log('Scan error:', errorMessage)
            }
          }
        )

      } catch (err: any) {
        console.error('Scanner xatosi:', err)

        if (mounted) {
          let errorMessage = 'Kamera ishga tushmadi'

          if (err.message) {
            if (err.message.includes('permission')) {
              errorMessage = 'Kamera ruxsati berilmagan. Brauzer sozlamalaridan ruxsat bering.'
            } else if (err.message.includes('not found')) {
              errorMessage = 'Kamera topilmadi'
            } else {
              errorMessage = err.message
            }
          }

          alert(errorMessage)
          onClose()
        }
      }
    }

    initializeScanner()

    return () => {
      mounted = false

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }

      if (scannerRef.current && isScanningRef.current) {
        try {
          scannerRef.current.stop()
            .catch(() => { })
            .finally(() => {
              scannerRef.current = null
            })
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    }
  }, [onScan, onClose])

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] p-4">
      <div className="relative w-full max-w-md">
        {/* Reader container - to'liq ekran */}
        <div
          id="reader"
          className="w-full aspect-square bg-black rounded-2xl overflow-hidden"
          style={{
            minHeight: '400px',
          }}
        />

        {/* Scan overlay - faqat bitta ramka */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Asosiy scan ramkasi - markazda */}
          <div className="relative w-[280px] h-[180px]">
            {/* Ramka chiziqlari - faqat burchaklar */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div>

            {/* Ramka ichidagi yorug'lik effekti */}
            <div className="absolute inset-0 border border-blue-500/20 rounded-lg"></div>

            {/* Harakatlanuvchi scan chizig'i */}
            <div
              className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_10px_#3b82f6]"
              style={{
                top: `${scanLinePosition}%`,
                transform: 'translateY(-50%)',
                transition: 'top 0.1s linear',
              }}
            />

            {/* Scan nuqtalari */}
            <div className="absolute inset-0">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.2}s`,
                    opacity: 0.6,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Yuqori instruktsiya paneli */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-6 py-2 rounded-full border border-white/20 flex items-center gap-2 text-sm">
          <span className="text-blue-400">📷</span>
          Shtrix-kodni ramkaga joylashtiring
        </div>

        {/* Yopish tugmasi - pastda */}
        <button
          onClick={async () => {
            if (scannerRef.current) {
              try {
                await scannerRef.current.stop()
              } catch (err) { }
            }
            onClose()
          }}
          className="absolute -bottom-14 left-1/2 transform -translate-x-1/2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <span>✕</span>
          Yopish
        </button>
      </div>
    </div>
  )
}