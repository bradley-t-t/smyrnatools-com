import React, { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Fullscreen media viewer with zoom/pan (images) and playback (videos).
 * Supports touch gestures: pinch to zoom, drag to pan, swipe to navigate.
 */
function MediaViewer({ items, initialIndex = 0, onClose }) {
    const [index, setIndex] = useState(initialIndex)
    const [zoom, setZoom] = useState(1)
    const [pan, setPan] = useState({ x: 0, y: 0 })
    const [dragging, setDragging] = useState(false)
    const dragStart = useRef({ x: 0, y: 0 })
    const panStart = useRef({ x: 0, y: 0 })
    const lastTouchDist = useRef(null)
    const swipeStartX = useRef(null)

    const item = items?.[index]
    const isVideo = item?.type?.startsWith('video/')
    const hasPrev = index > 0
    const hasNext = items ? index < items.length - 1 : false

    const resetView = useCallback(() => {
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }, [])

    const goTo = useCallback((newIndex) => {
        setIndex(newIndex)
        setZoom(1)
        setPan({ x: 0, y: 0 })
    }, [])

    // Keyboard
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowLeft' && hasPrev) goTo(index - 1)
            if (e.key === 'ArrowRight' && hasNext) goTo(index + 1)
            if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.5, 5))
            if (e.key === '-') setZoom((z) => Math.max(z - 0.5, 0.5))
            if (e.key === '0') resetView()
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [onClose, hasPrev, hasNext, index, goTo, resetView])

    // Mouse wheel zoom
    const handleWheel = (e) => {
        if (isVideo) return
        e.preventDefault()
        setZoom((z) => Math.min(Math.max(z + (e.deltaY > 0 ? -0.2 : 0.2), 0.5), 5))
    }

    // Mouse drag
    const handlePointerDown = (e) => {
        if (isVideo) return
        if (zoom > 1) {
            e.preventDefault()
            setDragging(true)
            dragStart.current = { x: e.clientX, y: e.clientY }
            panStart.current = { ...pan }
        } else {
            swipeStartX.current = e.clientX
        }
    }

    const handlePointerMove = (e) => {
        if (!dragging) return
        setPan({
            x: panStart.current.x + (e.clientX - dragStart.current.x),
            y: panStart.current.y + (e.clientY - dragStart.current.y)
        })
    }

    const handlePointerUp = (e) => {
        setDragging(false)
        // Swipe navigation when not zoomed
        if (swipeStartX.current !== null && zoom <= 1) {
            const diff = e.clientX - swipeStartX.current
            if (Math.abs(diff) > 60) {
                if (diff > 0 && hasPrev) goTo(index - 1)
                if (diff < 0 && hasNext) goTo(index + 1)
            }
        }
        swipeStartX.current = null
    }

    // Touch pinch zoom
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            lastTouchDist.current = Math.sqrt(dx * dx + dy * dy)
        } else if (e.touches.length === 1) {
            if (zoom > 1) {
                setDragging(true)
                dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
                panStart.current = { ...pan }
            } else {
                swipeStartX.current = e.touches[0].clientX
            }
        }
    }

    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && lastTouchDist.current) {
            e.preventDefault()
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const dist = Math.sqrt(dx * dx + dy * dy)
            const scale = dist / lastTouchDist.current
            setZoom((z) => Math.min(Math.max(z * scale, 0.5), 5))
            lastTouchDist.current = dist
        } else if (e.touches.length === 1 && dragging) {
            setPan({
                x: panStart.current.x + (e.touches[0].clientX - dragStart.current.x),
                y: panStart.current.y + (e.touches[0].clientY - dragStart.current.y)
            })
        }
    }

    const handleTouchEnd = (e) => {
        lastTouchDist.current = null
        setDragging(false)
        if (swipeStartX.current !== null && zoom <= 1 && e.changedTouches.length === 1) {
            const diff = e.changedTouches[0].clientX - swipeStartX.current
            if (Math.abs(diff) > 60) {
                if (diff > 0 && hasPrev) goTo(index - 1)
                if (diff < 0 && hasNext) goTo(index + 1)
            }
        }
        swipeStartX.current = null
    }

    const handleDoubleClick = () => {
        if (isVideo) return
        zoom > 1 ? resetView() : setZoom(2.5)
    }

    if (!items || items.length === 0) return null

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/95 flex flex-col select-none"
            style={{ touchAction: 'none' }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => setDragging(false)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Top bar */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-white/70 text-xs sm:text-sm font-medium truncate">{item?.name}</span>
                    <span className="text-white/30 text-[10px] sm:text-xs shrink-0">
                        {index + 1}/{items.length}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {!isVideo && (
                        <>
                            <button
                                onClick={() => setZoom((z) => Math.max(z - 0.5, 0.5))}
                                className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-white/10 text-white/70 active:bg-white/30 hover:bg-white/20 border-none cursor-pointer flex items-center justify-center transition-colors"
                            >
                                <i className="fas fa-search-minus text-xs" />
                            </button>
                            <span className="text-white/50 text-[10px] sm:text-xs tabular-nums w-10 sm:w-12 text-center hidden sm:block">
                                {Math.round(zoom * 100)}%
                            </span>
                            <button
                                onClick={() => setZoom((z) => Math.min(z + 0.5, 5))}
                                className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-white/10 text-white/70 active:bg-white/30 hover:bg-white/20 border-none cursor-pointer flex items-center justify-center transition-colors"
                            >
                                <i className="fas fa-search-plus text-xs" />
                            </button>
                            <button
                                onClick={resetView}
                                className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-white/10 text-white/70 active:bg-white/30 hover:bg-white/20 border-none cursor-pointer flex items-center justify-center transition-colors hidden sm:flex"
                            >
                                <i className="fas fa-compress text-xs" />
                            </button>
                            <div className="w-px h-5 bg-white/10 mx-0.5 hidden sm:block" />
                        </>
                    )}
                    <a
                        href={item?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-white/10 text-white/70 active:bg-white/30 hover:bg-white/20 flex items-center justify-center transition-colors hidden sm:flex"
                    >
                        <i className="fas fa-external-link-alt text-xs" />
                    </a>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-white/10 text-white/70 active:bg-white/30 hover:bg-white/20 border-none cursor-pointer flex items-center justify-center transition-colors"
                    >
                        <i className="fas fa-times text-sm" />
                    </button>
                </div>
            </div>

            {/* Media area */}
            <div
                className="flex-1 flex items-center justify-center overflow-hidden relative"
                onWheel={handleWheel}
                onDoubleClick={handleDoubleClick}
            >
                {/* Prev */}
                {hasPrev && (
                    <button
                        onClick={() => goTo(index - 1)}
                        className="absolute left-2 sm:left-4 z-10 w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-white/10 text-white/70 active:bg-white/30 hover:bg-white/20 border-none cursor-pointer flex items-center justify-center transition-colors"
                    >
                        <i className="fas fa-chevron-left" />
                    </button>
                )}

                {/* Content */}
                {isVideo ? (
                    <video
                        key={item.url}
                        src={item.url}
                        controls
                        autoPlay
                        playsInline
                        className="max-w-full max-h-full rounded-lg"
                        style={{ maxHeight: 'calc(100vh - 100px)' }}
                    />
                ) : (
                    <img
                        src={item.url}
                        alt={item.name}
                        draggable={false}
                        onPointerDown={handlePointerDown}
                        className="transition-transform duration-100"
                        style={{
                            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                            maxWidth: '100%',
                            maxHeight: 'calc(100vh - 100px)',
                            cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
                            objectFit: 'contain',
                            touchAction: 'none'
                        }}
                    />
                )}

                {/* Next */}
                {hasNext && (
                    <button
                        onClick={() => goTo(index + 1)}
                        className="absolute right-2 sm:right-4 z-10 w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-white/10 text-white/70 active:bg-white/30 hover:bg-white/20 border-none cursor-pointer flex items-center justify-center transition-colors"
                    >
                        <i className="fas fa-chevron-right" />
                    </button>
                )}
            </div>

            {/* Thumbnail strip */}
            {items.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 shrink-0 overflow-x-auto">
                    {items.map((att, i) => {
                        const isVid = att.type?.startsWith('video/')
                        const isActive = i === index
                        return (
                            <button
                                key={att.url || i}
                                onClick={() => goTo(i)}
                                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                                    isActive
                                        ? 'border-white scale-110'
                                        : 'border-white/20 opacity-50 active:opacity-80 hover:opacity-80'
                                }`}
                            >
                                {isVid ? (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                        <i className="fas fa-play text-white/60 text-xs" />
                                    </div>
                                ) : (
                                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
export default MediaViewer
