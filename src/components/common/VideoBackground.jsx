import React, {useEffect, useRef, useState} from 'react'
import './VideoBackground.css'
import vid1 from '../../assets/videos/1.mp4'
import vid2 from '../../assets/videos/2.mp4'
import vid3 from '../../assets/videos/3.mp4'
import vid4 from '../../assets/videos/4.mp4'

const backgroundVideos = [
    vid1,
    vid2,
    vid3,
    vid4
]

function VideoBackground({className = ''}) {
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
    const [showVideo, setShowVideo] = useState(false)
    const videoRef = useRef(null)
    const videoTimerRef = useRef(null)
    const blobCacheRef = useRef(new Map())
    const [currentBlobUrl, setCurrentBlobUrl] = useState(null)

    useEffect(() => {
        const preloadVideos = async () => {
            for (let i = 0; i < backgroundVideos.length; i++) {
                const videoSrc = backgroundVideos[i]
                if (!blobCacheRef.current.has(videoSrc)) {
                    try {
                        const response = await fetch(videoSrc)
                        const blob = await response.blob()
                        const blobUrl = URL.createObjectURL(blob)
                        blobCacheRef.current.set(videoSrc, blobUrl)
                    } catch (error) {
                        console.error('Failed to preload video:', videoSrc, error)
                    }
                }
            }
        }

        preloadVideos()

        videoTimerRef.current = setInterval(() => {
            setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % backgroundVideos.length)
        }, 180000)

        return () => {
            if (videoTimerRef.current) {
                clearInterval(videoTimerRef.current)
            }
            // Clean up blob URLs on unmount
            blobCacheRef.current.forEach(blobUrl => {
                URL.revokeObjectURL(blobUrl)
            })
            blobCacheRef.current.clear()
        }
    }, [])

    useEffect(() => {
        const videoSrc = backgroundVideos[currentVideoIndex]
        const blobUrl = blobCacheRef.current.get(videoSrc)

        if (blobUrl) {
            setCurrentBlobUrl(blobUrl)
            setShowVideo(false)

            const playVideo = () => {
                if (videoRef.current) {
                    videoRef.current.play().then(() => {
                        setShowVideo(true)
                    }).catch((err) => {
                        console.error('Video play failed:', err)
                        setShowVideo(true)
                    })
                }
            }

            playVideo()
        } else {
            // Fallback to original URL if blob not ready
            setCurrentBlobUrl(videoSrc)
            setShowVideo(false)
        }
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
                <source src={currentBlobUrl || backgroundVideos[currentVideoIndex]} type="video/mp4"/>
            </video>
            <div className="video-background-overlay"/>
        </div>
    )
}

export default VideoBackground