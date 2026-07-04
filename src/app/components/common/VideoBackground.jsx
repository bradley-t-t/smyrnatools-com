/* eslint-disable react/forbid-dom-props */
import React, { memo, useRef, useState } from 'react'

import vid1 from '../../../assets/videos/1.mp4'
import vid2 from '../../../assets/videos/2.mp4'
import vid3 from '../../../assets/videos/3.mp4'
import vid4 from '../../../assets/videos/4.mp4'
import { useAccentColor } from '../../hooks/useAccentColor'

/** Pool of background videos randomly selected on mount. */
const BACKGROUND_VIDEOS = [vid1, vid2, vid3, vid4]
const TRIM_END_SECONDS = 10
const SKIP_START_SECONDS = 5

/**
 * Ambient looping video background with a gradient underlay and dark overlay.
 * Randomly selects one video on mount; skips the first 5 seconds to avoid intro frames.
 */
const VideoBackground = memo(function VideoBackground({ className = '' }) {
    const [currentVideoIndex, setCurrentVideoIndex] = useState(() =>
        Math.floor(Math.random() * BACKGROUND_VIDEOS.length)
    )
    const [showVideo, setShowVideo] = useState(false)
    const videoRef = useRef(null)
    const hasStartedRef = useRef(false)
    const skippingRef = useRef(false)
    const accentColor = useAccentColor()
    const handleCanPlay = () => {
        if (!videoRef.current || hasStartedRef.current) return
        hasStartedRef.current = true
        videoRef.current.currentTime = SKIP_START_SECONDS
        videoRef.current
            .play()
            .then(() => setShowVideo(true))
            .catch(() => setShowVideo(true))
    }
    const advanceVideo = () => {
        if (skippingRef.current) return
        skippingRef.current = true
        setShowVideo(false)
        setTimeout(() => {
            setCurrentVideoIndex((prev) => (prev + 1) % BACKGROUND_VIDEOS.length)
            hasStartedRef.current = false
            skippingRef.current = false
        }, 1000)
    }
    const handleTimeUpdate = () => {
        const video = videoRef.current
        if (!video || !video.duration || skippingRef.current) return
        if (video.currentTime >= video.duration - TRIM_END_SECONDS) {
            advanceVideo()
        }
    }
    return (
        <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
            <div
                className="absolute inset-0 z-[1]"
                style={{ background: `linear-gradient(135deg, #0a1929 0%, ${accentColor} 100%)` }}
            />
            <video
                key={currentVideoIndex}
                ref={videoRef}
                autoPlay
                muted
                playsInline
                preload="auto"
                onCanPlay={handleCanPlay}
                onTimeUpdate={handleTimeUpdate}
                onEnded={advanceVideo}
                className={`absolute left-1/2 top-1/2 z-[2] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover transition-opacity duration-1000 motion-reduce:transition-none ${showVideo ? 'opacity-100' : 'opacity-0'}`}
            >
                <source src={BACKGROUND_VIDEOS[currentVideoIndex]} type="video/mp4" />
            </video>
            <div className="absolute inset-0 z-[3] bg-black/40" />
        </div>
    )
})
export default VideoBackground
