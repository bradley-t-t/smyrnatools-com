import { useCallback, useEffect, useRef, useState } from 'react'

import { getCategoryForView } from '../constants/navigationConstants'

const TABLET_MIN = 768
const TABLET_MAX = 1024

/** Tracks whether the viewport is in the tablet breakpoint range. */
export function useIsTablet() {
    const [isTablet, setIsTablet] = useState(window.innerWidth >= TABLET_MIN && window.innerWidth < TABLET_MAX)
    useEffect(() => {
        const handleResize = () => {
            setIsTablet(window.innerWidth >= TABLET_MIN && window.innerWidth < TABLET_MAX)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])
    return isTablet
}

/** Closes the active dropdown when the user clicks outside of it. */
export function useDropdownOutsideClose(openDropdown, setOpenDropdown) {
    const dropdownRef = useRef(null)
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpenDropdown(null)
            }
        }
        if (openDropdown) document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [openDropdown, setOpenDropdown])
    return dropdownRef
}

/** Closes the mobile drawer when the user clicks outside of it (two-level mode). */
export function useMobileDrawerOutsideClose(isMobile, mobileMenuOpen, isTwoLevel, setMobileMenuOpen) {
    const mobileDrawerRef = useRef(null)
    useEffect(() => {
        if (!isMobile || !mobileMenuOpen || !isTwoLevel) return
        const handleClickOutside = (e) => {
            if (mobileDrawerRef.current && !mobileDrawerRef.current.contains(e.target)) {
                setMobileMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isMobile, mobileMenuOpen, isTwoLevel, setMobileMenuOpen])
    return mobileDrawerRef
}

/** Animates the sliding underline of the two-level secondary nav to match
 *  whichever tab is currently active. Returns refs for the nav container and
 *  the underline element. */
export function useTwoLevelUnderline(isTwoLevel, selectedView, activeCategory, visibleMenuItems) {
    const secondaryNavRef = useRef(null)
    const underlineRef = useRef(null)
    const updateUnderline = useCallback(() => {
        if (!secondaryNavRef.current || !underlineRef.current) return
        const activeTab = secondaryNavRef.current.querySelector('[data-active="true"]')
        if (activeTab) {
            const navRect = secondaryNavRef.current.getBoundingClientRect()
            const tabRect = activeTab.getBoundingClientRect()
            underlineRef.current.style.left = `${tabRect.left - navRect.left + secondaryNavRef.current.scrollLeft}px`
            underlineRef.current.style.width = `${tabRect.width}px`
        } else {
            underlineRef.current.style.width = '0'
        }
    }, [])
    useEffect(() => {
        if (isTwoLevel) updateUnderline()
    }, [selectedView, activeCategory, visibleMenuItems, updateUnderline, isTwoLevel])
    useEffect(() => {
        if (!isTwoLevel) return
        window.addEventListener('resize', updateUnderline)
        return () => window.removeEventListener('resize', updateUnderline)
    }, [updateUnderline, isTwoLevel])
    return { secondaryNavRef, underlineRef }
}

/** Keeps the two-level active category in sync with the externally controlled
 *  selectedView. */
export function useActiveCategory(isTwoLevel, selectedView) {
    const [activeCategory, setActiveCategory] = useState(() => getCategoryForView(selectedView))
    useEffect(() => {
        if (isTwoLevel) setActiveCategory(getCategoryForView(selectedView))
    }, [selectedView, isTwoLevel])
    return [activeCategory, setActiveCategory]
}
