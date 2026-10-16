import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url'
import { getBook, updateBook } from './db.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc

export default function Reader({ id, onClose }) {
  const [doc, setDoc] = useState(null)
  const [name, setName] = useState('')
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [error, setError] = useState('')
  const [night, setNight] = useState(() => localStorage.getItem('night') !== '0')
  const wrap = useRef(null)
  const canvas = useRef(null)
  const task = useRef(null)
  const touch = useRef({ x: 0, y: 0 })

  // Load the PDF bytes from on-device storage
  useEffect(() => {
    let dead = false
    let loaded
    ;(async () => {
      try {
        const { meta, bytes } = await getBook(id)
        loaded = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise
        if (dead) return loaded.destroy()
        setName(meta.name)
        setDoc(loaded)
        setPage(Math.min(meta.page || 1, loaded.numPages))
        if (meta.pages !== loaded.numPages) updateBook(id, { pages: loaded.numPages })
      } catch {
        if (!dead) setError('Couldn’t open that file. It may be damaged or password-protected.')
      }
    })()
    return () => {
      dead = true
      if (loaded) loaded.destroy()
    }
  }, [id])

  // Track width AND height of the reading area (also handles phone rotation
  // and mobile browser bars appearing/disappearing)
  useEffect(() => {
    const el = wrap.current
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])

  // Draw the current page
  useEffect(() => {
    if (!doc || !size.w || !size.h) return
    let dead = false
    ;(async () => {
      if (task.current) {
        task.current.cancel()
        try {
          await task.current.promise
        } catch {}
      }
      const pg = await doc.getPage(page)
      if (dead) return
      const base = pg.getViewport({ scale: 1 })
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      // Fit the whole page inside the area (width and height), then apply zoom.
      // The 2px margin avoids sub-pixel rounding creating phantom scrollbars.
      const fit = Math.min((size.w - 2) / base.width, (size.h - 2) / base.height)
      const cssScale = fit * zoom
      const vp = pg.getViewport({ scale: cssScale * dpr })
      const c = canvas.current
      c.width = Math.floor(vp.width)
      c.height = Math.floor(vp.height)
      c.style.width = Math.floor(vp.width) / dpr + 'px'
      c.style.height = Math.floor(vp.height) / dpr + 'px'
      task.current = pg.render({ canvasContext: c.getContext('2d'), viewport: vp })
      try {
        await task.current.promise
        wrap.current.scrollTop = 0
        wrap.current.scrollLeft = 0
      } catch {}
    })()
    return () => {
      dead = true
    }
  }, [doc, page, zoom, size.w, size.h])

  // Remember where the reader stopped
  useEffect(() => {
    if (doc) updateBook(id, { page })
  }, [doc, id, page])

  const go = (n) => doc && setPage(Math.min(Math.max(1, Math.round(n) || 1), doc.numPages))

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(page + 1)
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(page - 1)
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const toggleNight = () => {
    const next = !night
    setNight(next)
    localStorage.setItem('night', next ? '1' : '0')
  }

  return (
    <div className="reader">
      <div className="bar top">
        <button onClick={onClose}>← Library</button>
        <div className="ttl">{name}</div>
        <button className={night ? 'on' : ''} onClick={toggleNight} aria-label="Toggle night pages" title="Night pages">
          ◐
        </button>
      </div>

      <div
        className={'wrap' + (zoom > 1 ? ' zoomed' : '')}
        ref={wrap}
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (zoom > 1) return
          const dx = e.changedTouches[0].clientX - touch.current.x
          const dy = e.changedTouches[0].clientY - touch.current.y
          if (Math.abs(dx) > 60 && Math.abs(dy) < 50) go(page + (dx < 0 ? 1 : -1))
        }}
      >
        {!doc && !error && <p className="muted center">Opening…</p>}
        {error && <p className="error center">{error}</p>}
        <canvas ref={canvas} className={night ? 'night' : ''} />
      </div>

      <div className="bar bottom">
        <button onClick={() => go(page - 1)} aria-label="Previous page">‹</button>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          max={doc?.numPages}
          value={page}
          aria-label="Page number"
          onChange={(e) => go(+e.target.value)}
        />
        <span className="muted">/ {doc?.numPages ?? '…'}</span>
        <button onClick={() => go(page + 1)} aria-label="Next page">›</button>
        <button onClick={() => setZoom((z) => Math.max(1, z - 0.25))} aria-label="Zoom out">−</button>
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} aria-label="Zoom in">+</button>
      </div>
    </div>
  )
}