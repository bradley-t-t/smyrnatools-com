import React, {useEffect, useState} from 'react'
import './styles/PodcastPopup.css'

const RSS_URL = 'https://rss.buzzsprout.com/705426.rss'

function PodcastPopup() {
    const [episode, setEpisode] = useState(null)
    const [isVisible, setIsVisible] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const audioRef = React.useRef(null)

    useEffect(() => {
        fetchLatestEpisode()
    }, [])

    const fetchLatestEpisode = async () => {
        try {
            const proxyUrls = [
                `https://api.allorigins.win/raw?url=${encodeURIComponent(RSS_URL)}`,
                `https://corsproxy.io/?${encodeURIComponent(RSS_URL)}`
            ]
            
            let text = null
            for (const url of proxyUrls) {
                try {
                    const response = await fetch(url)
                    if (response.ok) {
                        text = await response.text()
                        if (text && text.includes('<item>')) break
                    }
                } catch (e) {
                    // try next proxy
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
                pubDate: new Date(pubDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}),
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

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause()
            } else {
                audioRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    const handleMinimize = () => {
        setIsMinimized(!isMinimized)
    }

    if (!isVisible || !episode) return null

    return (
        <div className={`podcast-popup ${isMinimized ? 'minimized' : ''}`}>
            {isMinimized ? (
                <div className="podcast-minimized" onClick={handleMinimize}>
                    <i className="fas fa-podcast"></i>
                    <span>New Episode</span>
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
                    {episode.audioUrl && (
                        <audio 
                            ref={audioRef} 
                            src={episode.audioUrl}
                            onEnded={() => setIsPlaying(false)}
                        />
                    )}
                </>
            )}
        </div>
    )
}

export default PodcastPopup