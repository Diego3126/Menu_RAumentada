"use client"

import { useEffect, useRef } from "react"

export function ARBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number
    let time = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const drawGrid = () => {
      const gridSize = 60
      const perspectiveY = canvas.height * 0.6

      ctx.strokeStyle = "rgba(100, 130, 200, 0.15)"
      ctx.lineWidth = 1

      // Horizontal lines with perspective
      for (let i = 0; i <= 20; i++) {
        const y = perspectiveY + i * 25
        const opacity = 0.1 - i * 0.004
        ctx.strokeStyle = `rgba(100, 150, 255, ${Math.max(0.02, opacity)})`
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Vertical lines converging
      const vanishingPointX = canvas.width / 2
      for (let i = -15; i <= 15; i++) {
        const startX = vanishingPointX + i * gridSize
        const endX = vanishingPointX + i * gridSize * 4
        const opacity = 0.12 - Math.abs(i) * 0.006
        ctx.strokeStyle = `rgba(100, 150, 255, ${Math.max(0.02, opacity)})`
        ctx.beginPath()
        ctx.moveTo(startX, perspectiveY)
        ctx.lineTo(endX, canvas.height)
        ctx.stroke()
      }
    }

    const drawGlowingLines = () => {
      const lines = [
        { startX: 0, startY: canvas.height * 0.3, endX: canvas.width * 0.4, endY: canvas.height * 0.5, color: "255, 100, 50" },
        { startX: canvas.width, startY: canvas.height * 0.25, endX: canvas.width * 0.6, endY: canvas.height * 0.45, color: "255, 150, 50" },
        { startX: 0, startY: canvas.height * 0.7, endX: canvas.width * 0.5, endY: canvas.height * 0.8, color: "80, 150, 255" },
        { startX: canvas.width, startY: canvas.height * 0.75, endX: canvas.width * 0.5, endY: canvas.height * 0.85, color: "100, 180, 255" },
      ]

      lines.forEach((line, index) => {
        const offset = Math.sin(time * 0.5 + index) * 20
        
        // Glow effect
        ctx.shadowColor = `rgba(${line.color}, 0.8)`
        ctx.shadowBlur = 20
        ctx.strokeStyle = `rgba(${line.color}, 0.6)`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(line.startX, line.startY + offset)
        ctx.quadraticCurveTo(
          (line.startX + line.endX) / 2,
          (line.startY + line.endY) / 2 + Math.sin(time + index) * 30,
          line.endX,
          line.endY + offset
        )
        ctx.stroke()
        ctx.shadowBlur = 0
      })
    }

    const drawFloatingParticles = () => {
      const particles = 50
      for (let i = 0; i < particles; i++) {
        const x = ((i * 137.5 + time * 10) % canvas.width)
        const y = ((i * 89.3 + time * 5) % canvas.height)
        const size = 1 + Math.sin(time + i) * 0.5
        const opacity = 0.3 + Math.sin(time * 2 + i) * 0.2
        
        ctx.fillStyle = `rgba(255, 150, 80, ${opacity})`
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawHolographicElements = () => {
      // AR scanning lines
      const scanLineY = (time * 50) % canvas.height
      const gradient = ctx.createLinearGradient(0, scanLineY - 50, 0, scanLineY + 50)
      gradient.addColorStop(0, "rgba(255, 120, 50, 0)")
      gradient.addColorStop(0.5, "rgba(255, 120, 50, 0.1)")
      gradient.addColorStop(1, "rgba(255, 120, 50, 0)")
      ctx.fillStyle = gradient
      ctx.fillRect(0, scanLineY - 50, canvas.width, 100)

      // Corner brackets
      const bracketSize = 80
      const bracketWidth = 3
      ctx.strokeStyle = "rgba(255, 120, 50, 0.4)"
      ctx.lineWidth = bracketWidth

      // Top left
      ctx.beginPath()
      ctx.moveTo(40, 40 + bracketSize)
      ctx.lineTo(40, 40)
      ctx.lineTo(40 + bracketSize, 40)
      ctx.stroke()

      // Top right
      ctx.beginPath()
      ctx.moveTo(canvas.width - 40 - bracketSize, 40)
      ctx.lineTo(canvas.width - 40, 40)
      ctx.lineTo(canvas.width - 40, 40 + bracketSize)
      ctx.stroke()

      // Bottom left
      ctx.beginPath()
      ctx.moveTo(40, canvas.height - 40 - bracketSize)
      ctx.lineTo(40, canvas.height - 40)
      ctx.lineTo(40 + bracketSize, canvas.height - 40)
      ctx.stroke()

      // Bottom right
      ctx.beginPath()
      ctx.moveTo(canvas.width - 40 - bracketSize, canvas.height - 40)
      ctx.lineTo(canvas.width - 40, canvas.height - 40)
      ctx.lineTo(canvas.width - 40, canvas.height - 40 - bracketSize)
      ctx.stroke()
    }

    const animate = () => {
      time += 0.016
      ctx.fillStyle = "rgba(15, 20, 35, 1)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      drawGrid()
      drawGlowingLines()
      drawFloatingParticles()
      drawHolographicElements()
      
      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ background: "linear-gradient(135deg, #0a0f1a 0%, #1a1f35 50%, #0f1520 100%)" }}
    />
  )
}
