'use client'

import { useRef, useEffect } from 'react'
import JsBarcode from 'jsbarcode'

type Product = {
  _id: string
  name: string
  code?: string
}

type BarcodeSheetProps = {
  products: Product[]
  size?: 'small' | 'large'
}

const mmToPx = (mm: number) => Math.round(mm * 3.78)

export default function BarcodeSheet({ products, size = 'small' }: BarcodeSheetProps) {
  const svgRefs = useRef<SVGSVGElement[]>([])

  const [widthMM, heightMM] = size === 'small' ? [50, 30] : [60, 40]
  const widthPx = mmToPx(widthMM)
  const heightPx = mmToPx(heightMM)

  useEffect(() => {
    products.forEach((p, i) => {
      const svg = svgRefs.current[i]
      if (svg && p.code) {
        // Eski chizmani tozalash
        while (svg.firstChild) svg.removeChild(svg.firstChild)

        JsBarcode(svg, p.code, {
          format: 'CODE128',
          width: 2.2,
          height: heightPx - 55,
          displayValue: true,
          fontSize: 15,
          margin: 8,
          textMargin: 3,
        })
      }
    })
  }, [products, size, heightPx])

  return (
    <div className="p-4">
      <div className="grid grid-cols-2 gap-6">
        {products.map((p, i) => (
          <div
            key={p._id}
            className="flex flex-col items-center justify-center border border-gray-300 rounded-2xl bg-white shadow-sm overflow-hidden"
            style={{ width: widthPx, height: heightPx }}
          >
            <svg
              ref={(el) => {
                if (el) svgRefs.current[i] = el
              }}
              className="w-full"
              style={{ height: heightPx - 42 }}
            />
            <div className="text-center text-[11px] font-medium text-gray-800 mt-2 px-2 line-clamp-2">
              {p.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}