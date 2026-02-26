'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X, ScanLine, Zap } from 'lucide-react'

const isMobile = /Mobi|Android/i.test(navigator.userAgent);

interface Props {
  onScan: (decodedText: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanningRef = useRef<boolean>(false)
  const [scanLinePosition, setScanLinePosition] = useState(0)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraInitializing, setCameraInitializing] = useState(true)
  const videoTrackRef = useRef<MediaStreamTrack | null>(null)
  const animationRef = useRef<number>(0)

  // Scan line animatsiyasi
  useEffect(() => {
    let direction = 1
    let position = 0

    const animate = () => {
      position += direction * 1.5

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
  }, [])

  // Beep ovozi
  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      const audioCtx = new AudioContextClass()

      const createBeep = () => {
        try {
          const oscillator = audioCtx.createOscillator()
          const gainNode = audioCtx.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(audioCtx.destination)

          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(600, audioCtx.currentTime)
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1)

          oscillator.start()
          oscillator.stop(audioCtx.currentTime + 0.1)
        } catch (err) {
          console.log('Beep creation error:', err)
        }
      }

      if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(createBeep).catch(() => { })
      } else {
        createBeep()
      }
    } catch (err) {
      console.log('Audio error:', err)
    }
  }

  // Torchni boshqarish
  const toggleTorch = async () => {
    if (!videoTrackRef.current || !torchAvailable) return

    try {
      await videoTrackRef.current.applyConstraints({
        advanced: [{ torch: !torchEnabled }] as any
      })
      setTorchEnabled(!torchEnabled)
    } catch (err) {
      console.log('Torch error:', err)
    }
  }

  useEffect(() => {
    let mounted = true
    let mediaStream: MediaStream | null = null

    const initializeScanner = async () => {
      try {
        setCameraInitializing(true)
        setCameraError(null)

        const readerElement = document.getElementById('reader')
        if (!readerElement) {
          throw new Error('Reader element not found')
        }

        // Kameraga ruxsat so'rash
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment'
            }
          })

          const track = stream.getVideoTracks()[0]
          videoTrackRef.current = track

          const capabilities = track.getCapabilities?.()
          if (capabilities && 'torch' in capabilities) {
            setTorchAvailable(true)
          }

          stream.getTracks().forEach(track => track.stop())
        } catch (err) {
          throw new Error('camera_permission_denied')
        }

        const html5QrCode = new Html5Qrcode('reader')
        scannerRef.current = html5QrCode

        const cameras = await Html5Qrcode.getCameras()

        if (!cameras || cameras.length === 0) {
          throw new Error('no_camera')
        }

        const backCamera = cameras.find(
          camera =>
            camera.label?.toLowerCase().includes('back') ||
            camera.label?.toLowerCase().includes('rear') ||
            camera.label?.toLowerCase().includes('environment') ||
            camera.id?.includes('back')
        ) || cameras[0]

        const config = {
          fps: 20,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.0,
          disableFlip: false,
          rememberLastUsedCamera: true,
        }

        await html5QrCode.start(
          backCamera.id,
          config,
          async (decodedText) => {
            if (!mounted || isScanningRef.current) return
            isScanningRef.current = true
            playBeep()
            if (navigator.vibrate) navigator.vibrate(50)

            // Scan qilingan barcode-ni jo'natish
            onScan(decodedText)

            if (videoTrackRef.current) {
              try {
                videoTrackRef.current.stop()
              } catch (err) {
                console.log('Stop video track error:', err)
              }
            }

            onClose()
          },
          (errorMessage) => {
            // xatoliklarni e'tiborsiz qoldirish
          }
        )

        setCameraInitializing(false)

      } catch (err: any) {
        console.error('Scanner xatosi:', err)

        if (mounted) {
          setCameraInitializing(false)

          if (err.message === 'camera_permission_denied') {
            setCameraError('Kamera ruxsati berilmagan. Iltimos, brauzer sozlamalaridan kameraga ruxsat bering.')
          } else if (err.message === 'no_camera') {
            setCameraError('Kamera topilmadi. Qurilmangizda kamera mavjudligini tekshiring.')
          } else {
            setCameraError('Kamera ishga tushirilmadi. Qaytadan urinib ko\'ring.')
          }
        }
      }
    }

    initializeScanner()

    return () => {
      mounted = false

      if (videoTrackRef.current) {
        try {
          videoTrackRef.current.stop()
        } catch (err) { }
      }

      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => { })
        } catch (err) { }
      }
    }
  }, [onScan, onClose])

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="absolute -top-12 left-0 right-0 text-center text-white/80 text-sm font-medium">
          Shtrix-kodni skanerlash
        </div>

        {/* Reader container */}
        <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10">
          {/* Camera view */}
          <div
            id="reader"
            className="w-full h-full bg-gray-900"
          />

          {/* Invisible input for wireless scanner */}
          <input
            type="text"
            autoFocus={!isMobile}
            className="absolute top-0 left-0 w-full h-full opacity-0 pointer-events-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onScan(e.currentTarget.value)
                e.currentTarget.value = ''
                onClose()
              }
            }}
          />

          {/* Camera initializing overlay */}
          {cameraInitializing && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <Camera className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-blue-500" />
              </div>
              <p className="mt-4 text-white/80 text-sm">Kamera ishga tushirilmoqda...</p>
            </div>
          )}

          {/* Camera error overlay */}
          {cameraError && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                <X className="w-10 h-10 text-red-500" />
              </div>
              <p className="text-white text-center font-medium mb-2">Kamera xatosi</p>
              <p className="text-white/60 text-sm text-center mb-6">{cameraError}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
              >
                Yopish
              </button>
            </div>
          )}

          {/* Scan overlay */}
          {!cameraInitializing && !cameraError && (
            <>
              {/* Qoraytirilgan qirralar */}
              <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>

              {/* Asosiy scan maydoni - FAQAT BURCHAKLAR */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-[280px] h-[180px]">
                  {/* Tashqi glow effekti */}
                  <div className="absolute -inset-2 bg-blue-500/10 rounded-2xl blur-xl"></div>

                  {/* FAQAT 4 TA BURCHAK - hech qanday to'liq ramka yo'q */}
                  {/* <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-blue-500 rounded-br-2xl"></div> */}

                  {/* Burchaklardagi yorug'lik nuqtalari
                  <div className="absolute top-0 left-0 w-2 h-2 bg-blue-500 rounded-full filter blur-sm"></div>
                  <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full filter blur-sm"></div>
                  <div className="absolute bottom-0 left-0 w-2 h-2 bg-blue-500 rounded-full filter blur-sm"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-blue-500 rounded-full filter blur-sm"></div> */}

                  {/* Harakatlanuvchi scan chizig'i */}
                  <div
                    className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                    style={{
                      top: `${scanLinePosition}%`,
                      transform: 'translateY(-50%)',
                      transition: 'top 0.1s linear',
                      boxShadow: '0 0 20px rgba(59,130,246,0.8)'
                    }}
                  />

                  {/* Scan nuqtalari */}
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-blue-400/40 rounded-full animate-pulse"
                      style={{
                        top: `${20 + Math.random() * 60}%`,
                        left: `${20 + Math.random() * 60}%`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}

                  {/* Markazdagi fokus indikatori */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-12 h-12 border border-white/20 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Yuqori instruktsiya */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-md text-white px-5 py-2 rounded-full border border-white/20 flex items-center gap-2 text-sm shadow-lg whitespace-nowrap">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Shtrix-kodni ramkaga joylashtiring</span>
              </div>

              {/* Torch tugmasi */}
              {torchAvailable && (
                <button
                  onClick={toggleTorch}
                  className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white p-3 rounded-full border border-white/20 hover:bg-black/70 transition-all shadow-lg"
                >
                  <Zap className={`w-5 h-5 ${torchEnabled ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} />
                </button>
              )}

              {/* Pastki instruktsiya */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-black/50 backdrop-blur-md text-white/80 px-4 py-2 rounded-full border border-white/20 text-xs flex items-center gap-2">
                  <ScanLine className="w-4 h-4 text-blue-400" />
                  Avtomatik skanerlanadi
                </div>
              </div>
            </>
          )}
        </div>

        {/* Yopish tugmasi */}
        <button
          onClick={async () => {
            if (scannerRef.current) {
              try {
                await scannerRef.current.stop()
              } catch (err) { }
            }
            if (videoTrackRef.current) {
              try {
                videoTrackRef.current.stop()
              } catch (err) { }
            }
            onClose()
          }}
          className="absolute -bottom-14 left-1/2 transform -translate-x-1/2 bg-red-500/20 hover:bg-red-500/30 text-white px-8 py-3 rounded-xl font-medium transition-all backdrop-blur-md border border-red-500/30 flex items-center gap-2 shadow-lg hover:shadow-red-500/10"
        >
          <X className="w-5 h-5" />
          Yopish
        </button>
      </div>
    </div>
  )
}