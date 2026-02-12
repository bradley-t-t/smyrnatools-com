import React, { memo, useEffect, useRef, useState } from 'react'

import vid1 from '../../assets/videos/1.mp4'
import vid2 from '../../assets/videos/2.mp4'
import vid3 from '../../assets/videos/3.mp4'
import vid4 from '../../assets/videos/4.mp4'

const backgroundVideos = [vid1, vid2, vid3, vid4]

const VideoBackground = memo(function VideoBackground({ className = '' }) {
    const [currentVideoIndex] = useState(() => Math.floor(Math.random() * backgroundVideos.length))
    const [showVideo, setShowVideo] = useState(false)
    const videoRef = useRef(null)

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.load()
        }
    }, [currentVideoIndex])

    const handleCanPlay = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 5
            videoRef.current
                .play()
                .then(() => setShowVideo(true))
                .catch(() => setShowVideo(true))
        }
    }

    return (
        <div
            style={{
                height: '100%',
                left: 0,
                overflow: 'hidden',
                position: 'absolute',
                top: 0,
                width: '100%',
                zIndex: 0
            }}
            className={className}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #0a1929 0%, #1e3a5f 100%)',
                    height: '100%',
                    left: 0,
                    position: 'absolute',
                    top: 0,
                    width: '100%',
                    zIndex: 1
                }}
            />
            <video
                ref={videoRef}
                muted
                loop
                playsInline
                preload="auto"
                onCanPlay={handleCanPlay}
                style={{
                    height: 'auto',
                    left: '50%',
                    minHeight: '100%',
                    minWidth: '100%',
                    objectFit: 'cover',
                    opacity: showVideo ? 1 : 0,
                    position: 'absolute',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    transition: 'opacity 1s ease-in-out',
                    width: 'auto',
                    zIndex: 2
                }}
            >
                <source src={backgroundVideos[currentVideoIndex]} type="video/mp4" />
            </video>
            <div
                style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    height: '100%',
                    left: 0,
                    position: 'absolute',
                    top: 0,
                    width: '100%',
                    zIndex: 3
                }}
            />
        </div>
    )
})

export default VideoBackground
