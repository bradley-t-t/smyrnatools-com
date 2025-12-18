import React, {useEffect, useRef, useState} from 'react'
import './VideoBackground.css'

const backgroundVideos = [
    '/videos/1.mp4',
    '/videos/2.mp4',
    '/videos/3.mp4',
    '/videos/4.mp4'
]

function VideoBackground({className = ''}) {
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
    const [showVideo, setShowVideo] = useState(false)
    const videoRef = useRef(null)
    const videoTimerRef = useRef(null)

    useEffect(() => {
        videoTimerRef.current = setInterval(() => {
            setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % backgroundVideos.length)
        }, 180000)
        return () => {
            if (videoTimerRef.current) {
                clearInterval(videoTimerRef.current)
            }
        }
    }, [])

    useEffect(() => {
        setShowVideo(false)
        
        const playVideo = () => {
            if (videoRef.current) {
                videoRef.current.load()
                videoRef.current.play().then(() => {
                    setShowVideo(true)
                }).catch((err) => {
                    console.error('Video play failed:', err)
                    setShowVideo(true)
                })
            }
        }
        
        playVideo()
    }, [currentVideoIndex])

    const handleVideoEnd = () => {
        setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % backgroundVideos.length)
    }

    return (
        <div className={`video-background-container ${className}`}>
            <div className="video-background-fallback"/>
            <video
                ref={videoRef}
                key={currentVideoIndex}
                autoPlay
                muted
                loop={false}
                playsInline
                preload="auto"
                onEnded={handleVideoEnd}
                onLoadedData={() => setShowVideo(true)}
                onError={() => setShowVideo(true)}
                className={`video-background-video ${showVideo ? 'video-visible' : ''}`}
            >
                <source src={backgroundVideos[currentVideoIndex]} type="video/mp4"/>
            </video>
            <div className="video-background-overlay"/>
        </div>
    )
}

export default VideoBackground