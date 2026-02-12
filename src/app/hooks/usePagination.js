import { useCallback, useEffect, useMemo, useState } from 'react'

export function usePagination({ items, initialPageSize = 25, resetDependencies = [] }) {
    const [pageSize, setPageSize] = useState(initialPageSize)
    const [currentPage, setCurrentPage] = useState(1)

    const resetKey = JSON.stringify(resetDependencies)

    useEffect(() => {
        setCurrentPage(1)
    }, [resetKey, pageSize])

    const totalPages = useMemo(() => Math.max(1, Math.ceil(items.length / pageSize)), [items.length, pageSize])

    const paginatedItems = useMemo(
        () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [items, currentPage, pageSize]
    )

    const goToPage = useCallback(
        (page) => {
            setCurrentPage(Math.max(1, Math.min(totalPages, page)))
        },
        [totalPages]
    )

    const nextPage = useCallback(() => {
        goToPage(currentPage + 1)
    }, [currentPage, goToPage])

    const prevPage = useCallback(() => {
        goToPage(currentPage - 1)
    }, [currentPage, goToPage])

    const changePageSize = useCallback((newSize) => {
        setPageSize(newSize)
        setCurrentPage(1)
    }, [])

    return {
        changePageSize,
        currentPage,
        goToPage,
        nextPage,
        pageSize,
        paginatedItems,
        prevPage,
        totalPages
    }
}
