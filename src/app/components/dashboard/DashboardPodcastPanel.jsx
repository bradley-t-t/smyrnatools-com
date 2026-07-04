/* eslint-disable react/forbid-dom-props */
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { useAccentColor } from '../../hooks/useAccentColor'

const SHOW_ID = '705426'
/* Cap the episode list at the 10 most recent so the side rail stays a
 * fixed-height column even after years of weekly releases. RSS feeds are
 * newest-first, so a head slice gives us the latest. */
const MAX_EPISODES = 10
const RSS_URL = `https://rss.buzzsprout.com/${SHOW_ID}.rss`
/** Cloudflare blocks direct browser access to `audio.buzzsprout.com` from
 *  some IPs / fingerprints (403 / "Sorry, you have been blocked"). The
 *  `audio-proxy` edge function side-steps that by fetching server-side. */
const AUDIO_PROXY_URL = `${import.meta.env.REACT_APP_EDGE_FUNCTIONS_URL}/audio-proxy`
const proxiedAudioUrl = (target) => `${AUDIO_PROXY_URL}?url=${encodeURIComponent(target)}`

/** Strip HTML tags + collapse whitespace from a feed description. */
const stripHtml = (raw) =>
    String(raw || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

/** Short local date for an RFC-2822 / ISO-8601 pubDate. */
const formatDate = (input) => {
    if (!input) return ''
    const d = new Date(input)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Format an iTunes:duration value (seconds or `H:MM:SS` / `M:SS`) into a
 *  compact display string. */
const formatDuration = (input) => {
    if (!input) return ''
    const raw = String(input).trim()
    if (!raw) return ''
    if (raw.includes(':')) return raw.replace(/^00:/, '')
    const total = parseInt(raw, 10)
    if (!Number.isFinite(total) || total <= 0) return ''
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
}

/** Format a number of seconds for the player's elapsed / total readouts. */
const formatPlayerTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const total = Math.floor(seconds)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
}

/** Walk `<item>` nodes in the Buzzsprout RSS feed into the compact shape
 *  the panel renders. Pulls the artwork URL when present so the player can
 *  show real episode art instead of a generic placeholder. */
const parseFeed = (xmlText) => {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml')
    if (doc.querySelector('parsererror')) return []
    const showImage =
        Array.from(doc.querySelectorAll('channel > image > url'))[0]?.textContent?.trim() ||
        Array.from(doc.querySelectorAll('channel > *'))
            .find((n) => n.localName === 'image')
            ?.getAttribute?.('href') ||
        ''
    return Array.from(doc.querySelectorAll('item'))
        .map((item, idx) => {
            const title = item.querySelector('title')?.textContent?.trim() || `Episode ${idx + 1}`
            const enclosureUrl = item.querySelector('enclosure')?.getAttribute('url') || ''
            const link = item.querySelector('link')?.textContent?.trim() || ''
            const pubDate = item.querySelector('pubDate')?.textContent?.trim() || ''
            const duration =
                Array.from(item.children)
                    .find((node) => node.localName === 'duration')
                    ?.textContent?.trim() || ''
            const description = stripHtml(item.querySelector('description')?.textContent || '')
            const episodeImage =
                Array.from(item.children)
                    .find((node) => node.localName === 'image')
                    ?.getAttribute?.('href') || ''
            return {
                artwork: episodeImage || showImage,
                audioUrl: enclosureUrl ? proxiedAudioUrl(enclosureUrl) : '',
                description,
                duration,
                fallbackUrl: link,
                key: enclosureUrl || link || String(idx),
                pubDate,
                title
            }
        })
        .filter((ep) => ep.audioUrl)
}

/**
 * Sticky left-rail podcast player themed to match the rest of the site
 * (uses `--bg-*` / `--text-*` / `--border-*` tokens and the user's accent
 * color from `useAccentColor`). Plays the RSS enclosure mp3 in a native
 * `<audio>` element with custom controls; falls back to a small "Open
 * episode page" link inside the same card if the audio fails to load
 * (which it can when the host CDN refuses cross-origin requests).
 */
export default function DashboardPodcastPanel() {
    const accent = useAccentColor()
    const audioRef = useRef(null)
    const [episodes, setEpisodes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedKey, setSelectedKey] = useState(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [audioDuration, setAudioDuration] = useState(0)
    const [audioError, setAudioError] = useState(false)

    useEffect(() => {
        let cancelled = false
        const fetchFeed = async () => {
            try {
                const res = await fetch(RSS_URL, { cache: 'no-store' })
                if (!res.ok) throw new Error(`feed responded with ${res.status}`)
                const text = await res.text()
                const parsed = parseFeed(text).slice(0, MAX_EPISODES)
                if (cancelled) return
                setEpisodes(parsed)
                setSelectedKey(parsed[0]?.key ?? null)
                setLoading(false)
            } catch (err) {
                if (cancelled) return
                setError(err?.message || 'Failed to load feed')
                setLoading(false)
            }
        }
        fetchFeed()
        return () => {
            cancelled = true
        }
    }, [])

    const selected = useMemo(() => episodes.find((ep) => ep.key === selectedKey) || null, [episodes, selectedKey])

    /** Reset player state on episode change — the new src will fire fresh
     *  `loadedmetadata` / `error` events. */
    useEffect(() => {
        setIsPlaying(false)
        setCurrentTime(0)
        setAudioDuration(0)
        setAudioError(false)
    }, [selectedKey])

    const togglePlay = () => {
        const el = audioRef.current
        if (!el) return
        if (el.paused) {
            el.play().catch(() => setAudioError(true))
        } else {
            el.pause()
        }
    }

    const seek = (event) => {
        const el = audioRef.current
        if (!el || !audioDuration) return
        const next = Number(event.target.value)
        el.currentTime = next
        setCurrentTime(next)
    }

    const progressPct = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0

    return (
        <aside
            className="flex flex-col gap-3 w-full pt-3 pb-0 lg:w-[300px] lg:shrink-0 lg:py-5 lg:pr-3 animate-fade-in-up"
            aria-label="SRM podcast player"
        >
            <header className="flex items-baseline justify-between gap-2 px-1">
                <span className="font-heading text-[13px] font-semibold text-text-primary">SRM Podcast</span>
                {episodes.length > 0 && (
                    <span className="text-[10.5px] font-mono tabular-nums text-text-tertiary">
                        {episodes.length} ep
                    </span>
                )}
            </header>

            {/* Player card — always rendered so the controls are visible even
                while the feed is loading or if the fetch fails. The title
                slot shows the current state; the play button stays disabled
                until an audio src is present. */}
            <div className="rounded-card border border-border-light bg-bg-primary overflow-hidden shadow-sm transition-shadow duration-200 hover:shadow-card">
                <div className="flex items-start gap-3 px-3 pt-3">
                    <div
                        className="shrink-0 rounded-md overflow-hidden flex items-center justify-center text-text-primary w-14 h-14 bg-bg-tertiary"
                        style={selected?.artwork ? undefined : { background: `${accent}1f` }}
                    >
                        {selected?.artwork ? (
                            <img src={selected.artwork} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <i className="fas fa-podcast text-[22px]" aria-hidden="true" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div
                            className="text-[12.5px] font-semibold leading-snug text-text-primary line-clamp-2"
                            title={selected?.title}
                        >
                            {loading
                                ? 'Loading episodes…'
                                : error
                                  ? 'Couldn’t load feed'
                                  : selected?.title || 'No episodes available'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10.5px] font-mono tabular-nums text-text-tertiary">
                            {selected ? (
                                <>
                                    <span>{formatDate(selected.pubDate)}</span>
                                    {selected.duration && (
                                        <>
                                            <span>·</span>
                                            <span>{formatDuration(selected.duration)}</span>
                                        </>
                                    )}
                                </>
                            ) : (
                                <span>—</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-3 py-3 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <button type="button"
                            onClick={togglePlay}
                            disabled={!selected || audioError}
                            className="w-10 h-10 rounded-full border-0 flex items-center justify-center text-white cursor-pointer transition-all duration-150 active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                            style={{ background: accent }}
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                            title={isPlaying ? 'Pause' : 'Play'}
                        >
                            <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-[13px]`} aria-hidden="true" />
                        </button>
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div
                                className="relative h-1.5 rounded-full bg-bg-tertiary overflow-hidden"
                                role="progressbar"
                                aria-valuenow={Math.round(progressPct)}
                                aria-valuemin={0}
                                aria-valuemax={100}
                            >
                                <div
                                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ease-out"
                                    style={{ background: accent, width: `${progressPct}%` }}
                                />
                                <input
                                    type="range"
                                    min={0}
                                    max={audioDuration || 0}
                                    step={1}
                                    value={currentTime}
                                    onChange={seek}
                                    disabled={!selected || !audioDuration || audioError}
                                    aria-label="Seek"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-text-tertiary">
                                <span>{formatPlayerTime(currentTime)}</span>
                                <span>{formatPlayerTime(audioDuration)}</span>
                            </div>
                        </div>
                    </div>

                    {audioError && selected?.fallbackUrl && (
                        <div className="text-[11px] leading-snug text-text-tertiary">
                            Playback blocked.{' '}
                            <a
                                href={selected.fallbackUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-text-secondary transition-colors duration-150 hover:text-text-primary focus-visible:outline-none focus-visible:underline"
                            >
                                Open episode ↗
                            </a>
                        </div>
                    )}

                    {selected && (
                        <audio
                            ref={audioRef}
                            src={selected.audioUrl}
                            preload="metadata"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => setIsPlaying(false)}
                            onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration || 0)}
                            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
                            onError={() => setAudioError(true)}
                        />
                    )}
                </div>
            </div>

            {!loading && !error && episodes.length > 1 && (
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-text-tertiary px-1">Episodes</div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 pr-0.5">
                {episodes.map((ep) => {
                    const active = ep.key === selectedKey
                    const stateClass = active
                        ? 'bg-bg-tertiary border-border-medium text-text-primary font-semibold'
                        : 'bg-transparent border-transparent text-text-secondary font-medium hover:bg-bg-hover'
                    return (
                        <button type="button"
                            key={ep.key}
                            onClick={() => setSelectedKey(ep.key)}
                            className={`text-left cursor-pointer rounded-md border px-2.5 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ${stateClass}`}
                            title={ep.title}
                            aria-pressed={active}
                        >
                            <div className="text-[12.5px] leading-snug line-clamp-2">{ep.title}</div>
                            <div className="flex items-center gap-1.5 mt-1 text-[10.5px] font-mono tabular-nums text-text-tertiary">
                                <span>{formatDate(ep.pubDate)}</span>
                                {ep.duration && (
                                    <>
                                        <span>·</span>
                                        <span>{formatDuration(ep.duration)}</span>
                                    </>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
        </aside>
    )
}
