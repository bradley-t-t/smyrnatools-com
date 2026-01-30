import React, { useEffect, useRef, useState } from 'react'

import vid1 from '../../assets/videos/1.mp4'
import vid2 from '../../assets/videos/2.mp4'
import vid3 from '../../assets/videos/3.mp4'
import vid4 from '../../assets/videos/4.mp4'

const backgroundVideos = [vid1, vid2, vid3, vid4]

function VideoBackground({ className = '' }) {
    const [currentVideoIndex, setCurrentVideoIndex] = useState(() =>
        Math.floor(Math.random() * backgroundVideos.length)
    )
    const [showVideo, setShowVideo] = useState(false)
    const videoRef = useRef(null)
    const videoTimerRef = useRef(null)
    const preloadedVideosRef = useRef([])

    useEffect(() => {
        backgroundVideos.forEach((src, index) => {
            const video = document.createElement('video')
            video.src = src
            video.preload = 'metadata'
            video.muted = true
            video.playsInline = true
            video.style.display = 'none'
            video.style.position = 'absolute'
            video.style.left = '-9999px'
            document.body.appendChild(video)
            preloadedVideosRef.current[index] = video
        })

        videoTimerRef.current = setInterval(() => {
            setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % backgroundVideos.length)
        }, 180000)

        return () => {
            if (videoTimerRef.current) {
                clearInterval(videoTimerRef.current)
            }
            preloadedVideosRef.current.forEach((video) => {
                if (video) {
                    video.pause()
                    video.src = ''
                    video.load()
                    if (video.parentNode) {
                        video.parentNode.removeChild(video)
                    }
                }
            })
            preloadedVideosRef.current = []
        }
    }, [])

    useEffect(() => {
        setShowVideo(false)
    }, [currentVideoIndex])

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 5
            videoRef.current
                .play()
                .then(() => {
                    setShowVideo(true)
                })
                .catch(() => {
                    setShowVideo(true)
                })
        }
    }

    const handleTimeUpdate = () => {
        if (videoRef.current && videoRef.current.duration) {
            const timeRemaining = videoRef.current.duration - videoRef.current.currentTime
            if (timeRemaining <= 10) {
                videoRef.current.pause()
                setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % backgroundVideos.length)
            }
        }
    }

    const handleVideoEnd = () => {
        setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % backgroundVideos.length)
    }

    const containerStyle = {
        height: '100%',
        left: 0,
        overflow: 'hidden',
        position: 'absolute',
        top: 0,
        width: '100%',
        zIndex: 0
    }

    const fallbackStyle = {
        backgroundColor: '#0a1929',
        height: '100%',
        left: 0,
        position: 'absolute',
        top: 0,
        width: '100%',
        zIndex: 1
    }

    const videoStyle = {
        filter: 'none',
        height: 'auto',
        left: '50%',
        minHeight: '100%',
        minWidth: '100%',
        objectFit: 'cover',
        opacity: showVideo ? 1 : 0,
        position: 'absolute',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        transition: 'opacity 1.5s ease-in-out',
        width: 'auto',
        zIndex: 2
    }

    const overlayStyle = {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        height: '100%',
        left: 0,
        position: 'absolute',
        top: 0,
        width: '100%',
        zIndex: 3
    }

    return (
        <div style={containerStyle} className={className}>
            <div style={fallbackStyle} />
            <video
                ref={videoRef}
                key={currentVideoIndex}
                muted
                loop={false}
                playsInline
                preload="auto"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnd}
                onError={() => setShowVideo(true)}
                style={videoStyle}
            >
                <source src={backgroundVideos[currentVideoIndex]} type="video/mp4" />
            </video>
            <div style={overlayStyle} />
        </div>
    )
}

export default VideoBackground
