import React, {useEffect, useRef, useState} from 'react'
import './styles/PodcastPopup.css'
import {usePreferences} from '../../app/context/PreferencesContext'
import {useAuth} from '../../app/context/AuthContext'

const RSS_URL = 'https://rss.buzzsprout.com/705426.rss'

function PodcastPopup() {
    const {preferences} = usePreferences()
    const {user, loading} = useAuth()
    const [episode, setEpisode] = useState(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const audioRef = useRef(null)

    useEffect(() => {
        if (user?.id && !loading) {
            fetchLatestEpisode()
        }
    }, [user, loading])

    useEffect(() => {
        if (!preferences.showPodcastOverlay) {
            if (audioRef.current && isPlaying) {
                audioRef.current.pause()
                setIsPlaying(false)
            }
            setIsVisible(false)
        }
    }, [preferences.showPodcastOverlay, isPlaying])

    const fetchLatestEpisode = async () => {
        try {
            const proxyUrls = [
                `https://corsproxy.io/?${encodeURIComponent(RSS_URL)}`,
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(RSS_URL)}`,
                `https://cors-anywhere.herokuapp.com/${RSS_URL}`
            ]

            let text = null
            for (const url of proxyUrls) {
                try {
                    const response = await fetch(url, {
                        headers: {
                            'Accept': 'application/rss+xml, application/xml, text/xml'
                        }
                    })
                    if (response.ok) {
                        text = await response.text()
                        if (text && text.includes('<item>')) break
                    }
                } catch {
                }
            }

            if (!text) return

            const parser = new DOMParser()
            const xml = parser.parseFromString(text, 'text/xml')

            const item = xml.querySelector('item')
            if (!item) return

            const title = item.querySelector('title')?.textContent || ''
            const description = item.querySelector('description')?.textContent || ''
            const pubDate = item.querySelector('pubDate')?.textContent || ''
            const enclosure = item.querySelector('enclosure')
            const audioUrl = enclosure?.getAttribute('url') || ''
            const durationEl = item.getElementsByTagName('itunes:duration')[0]
            const duration = durationEl?.textContent || ''
            const imageEl = xml.getElementsByTagName('itunes:image')[0]
            const image = imageEl?.getAttribute('href') || ''

            const episodeData = {
                title,
                description: stripHtml(description).substring(0, 200) + '...',
                pubDate: new Date(pubDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                }),
                audioUrl,
                duration: formatDuration(duration),
                image
            }

            setEpisode(episodeData)
            setTimeout(() => setIsVisible(true), 2000)
        } catch (err) {
            // silently fail
        }
    }

    const stripHtml = (html) => {
        const tmp = document.createElement('div')
        tmp.innerHTML = html
        return tmp.textContent || tmp.innerText || ''
    }

    const formatDuration = (duration) => {
        if (!duration) return ''
        if (duration.includes(':')) return duration
        const seconds = parseInt(duration)
        if (isNaN(seconds)) return duration
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const togglePlay = async () => {
        if (audioRef.current) {
            try {
                if (isPlaying) {
                    audioRef.current.pause()
                    setIsPlaying(false)
                } else {
                    await audioRef.current.play()
                    setIsPlaying(true)
                }
            } catch (error) {
                console.error('Error playing audio:', error)
                setIsPlaying(false)
            }
        }
    }

    const handleMinimize = () => {
        setIsMinimized(!isMinimized)
    }

    if (loading || !user?.id || !preferences.showPodcastOverlay || !isVisible || !episode) return null

    return (
        <div className={`podcast-popup ${isMinimized ? 'minimized' : ''}`}>
            {episode.audioUrl && (
                <audio
                    ref={audioRef}
                    src={episode.audioUrl}
                    onEnded={() => setIsPlaying(false)}
                />
            )}
            {isMinimized ? (
                <div className="podcast-minimized" onClick={handleMinimize}>
                    <i className="fas fa-podcast"></i>
                    <span>{isPlaying ? 'Playing...' : 'New Episode'}</span>
                </div>
            ) : (
                <>
                    <div className="podcast-header">
                        <div className="podcast-badge">
                            <i className="fas fa-podcast"></i>
                            <span>New Episode</span>
                        </div>
                        <div className="podcast-actions">
                            <button className="podcast-btn minimize" onClick={handleMinimize} title="Minimize">
                                <i className="fas fa-minus"></i>
                            </button>
                        </div>
                    </div>
                    <div className="podcast-content">
                        {episode.image && (
                            <img src={episode.image} alt="Podcast" className="podcast-image"/>
                        )}
                        <div className="podcast-info">
                            <h4 className="podcast-title">{episode.title}</h4>
                            <p className="podcast-description">{episode.description}</p>
                            <div className="podcast-meta">
                                <span className="podcast-date">
                                    <i className="fas fa-calendar-alt"></i>
                                    {episode.pubDate}
                                </span>
                                {episode.duration && (
                                    <span className="podcast-duration">
                                        <i className="fas fa-clock"></i>
                                        {episode.duration}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="podcast-controls">
                        <button className="podcast-play-btn" onClick={togglePlay}>
                            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                            <span>{isPlaying ? 'Pause' : 'Listen Now'}</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

export default PodcastPopup