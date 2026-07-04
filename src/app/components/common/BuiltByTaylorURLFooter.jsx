import React from 'react'

const TAYLOR_URL = 'https://www.taylorurl.com'

/**
 * Site-wide credit badge linking back to TaylorURL. Renders a single centered
 * link line at the very bottom of the page layout. Uses the app's muted text
 * token by default and transitions to the accent color on hover/focus, so it
 * adapts to the dark, light, and gray themes without extra work.
 */
export default function BuiltByTaylorURLFooter() {
    return (
        <footer className="w-full py-3.5 text-center">
            <a
                href={TAYLOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs tracking-wide text-text-secondary transition-colors duration-150 ease-out hover:text-accent focus:text-accent focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary motion-reduce:transition-none"
            >
                Built by&nbsp;<span className="font-semibold">TaylorURL</span>
            </a>
        </footer>
    )
}
