import React, { memo, useEffect, useRef, useState } from 'react'

import vid1 from '../../../assets/videos/1.mp4'
import vid2 from '../../../assets/videos/2.mp4'
import vid3 from '../../../assets/videos/3.mp4'
import vid4 from '../../../assets/videos/4.mp4'
import { useAccentColor } from '../../hooks/useAccentColor'

const BACKGROUND_VIDEOS = [vid1, vid2, vid3, vid4]

const VideoBackground = memo(function VideoBackground({ className = '' }) {
    const [currentVideoIndex] = useState(() => Math.floor(Math.random() * BACKGROUND_VIDEOS.length))
    const [showVideo, setShowVideo] = useState(false)
    const videoRef = useRef(null)
    const accentColor = useAccentColor()

    useEffect(() => {
        videoRef.current?.load()
    }, [currentVideoIndex])

    const handleCanPlay = () => {
        if (!videoRef.current) return
        videoRef.current.currentTime = 5
        videoRef.current
            .play()
            .then(() => setShowVideo(true))
            .catch(() => setShowVideo(true))
    }

    return (
        <div className={`absolute inset-0 overflow-hidden ${className}`}>
            <div
                className="absolute inset-0 z-[1]"
                style={{ background: `linear-gradient(135deg, #0a1929 0%, ${accentColor} 100%)` }}
            />
            <video
                ref={videoRef}
                muted
                loop
                playsInline
                preload="auto"
                onCanPlay={handleCanPlay}
                className="absolute left-1/2 top-1/2 z-[2] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 object-cover transition-opacity duration-1000"
                style={{ opacity: showVideo ? 1 : 0 }}
            >
                <source src={BACKGROUND_VIDEOS[currentVideoIndex]} type="video/mp4" />
            </video>
            <div className="absolute inset-0 z-[3] bg-black/40" />
        </div>
    )
})

export default VideoBackground
