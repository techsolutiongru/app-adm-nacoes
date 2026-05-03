'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export default function QRCodeReact({ value, size = 120 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
    }
  }, [value, size])

  return <canvas ref={canvasRef} className="rounded" />
}
