import L from 'leaflet'

export const TENNESSEE_CENTER = [35.86, -86.66]

/* Basemap tiles — CartoDB's Positron / Dark Matter sets. Vastly less
 * busy than the default OSM raster (no shaded relief, muted road
 * hierarchy, fewer minor labels) so the plant pins and animated routes
 * stay the visual focus. */
const CARTO_ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; ' +
    '<a href="https://carto.com/attributions">CARTO</a>'
const CARTO_LIGHT_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const CARTO_DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

/** Reads the current theme directly off the `<html>` class list — the
 *  same source the app uses to flip `--bg-*` tokens — so the basemap
 *  matches the active theme without a separate context dependency. */
export function isDarkTheme() {
    if (typeof document === 'undefined') return false
    return document.documentElement.classList.contains('dark')
}

export function buildTileLayer() {
    return L.tileLayer(isDarkTheme() ? CARTO_DARK_URL : CARTO_LIGHT_URL, {
        attribution: CARTO_ATTRIBUTION,
        maxZoom: 19,
        subdomains: 'abcd'
    })
}
