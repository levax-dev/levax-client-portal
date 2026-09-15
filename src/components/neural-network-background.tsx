"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  gold: boolean
}

const GOLD = "245, 188, 57"
const WHITE = "255, 255, 255"
const MAX_LINK_DISTANCE = 150
const GOLD_NODE_RATIO = 0.16
const SPEED = 0.12

export function NeuralNetworkBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let width = 0
    let height = 0
    let nodes: Node[] = []
    let frameId = 0

    function makeNodes(w: number, h: number) {
      const count = Math.min(70, Math.max(28, Math.floor((w * h) / 9000)))
      const arr: Node[] = []
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        arr.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.cos(angle) * SPEED * (0.5 + Math.random()),
          vy: Math.sin(angle) * SPEED * (0.5 + Math.random()),
          radius: 1.2 + Math.random() * 1.3,
          gold: Math.random() < GOLD_NODE_RATIO,
        })
      }
      return arr
    }

    function resize() {
      if (!canvas) return
      const rect = canvas.parentElement?.getBoundingClientRect()
      width = rect?.width ?? window.innerWidth
      height = rect?.height ?? window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
      nodes = makeNodes(width, height)
    }

    function drawFrame() {
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      // Links
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist >= MAX_LINK_DISTANCE) continue
          const opacity = (1 - dist / MAX_LINK_DISTANCE) * 0.22
          ctx.strokeStyle = `rgba(${WHITE}, ${opacity})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }

      // Nodes
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2)
        ctx.fillStyle = n.gold ? `rgba(${GOLD}, 0.85)` : `rgba(${WHITE}, 0.55)`
        ctx.fill()
      }
    }

    function step() {
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x <= 0 || n.x >= width) n.vx *= -1
        if (n.y <= 0 || n.y >= height) n.vy *= -1
        n.x = Math.min(Math.max(n.x, 0), width)
        n.y = Math.min(Math.max(n.y, 0), height)
      }
      drawFrame()
      frameId = requestAnimationFrame(step)
    }

    resize()
    drawFrame()

    let resizeObserver: ResizeObserver | undefined
    if (canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        resize()
        if (reduceMotion) drawFrame()
      })
      resizeObserver.observe(canvas.parentElement)
    }

    if (!reduceMotion) {
      frameId = requestAnimationFrame(step)
    }

    return () => {
      if (frameId) cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden className={cn("pointer-events-none", className)} />
}
