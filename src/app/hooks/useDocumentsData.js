import { useCallback, useEffect, useMemo, useState } from 'react'

import { DocumentService } from '../../services/DocumentService'
import { UserService } from '../../services/UserService'
export function useDocumentsData() {
    const [documents, setDocuments] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')
    const [canUpload, setCanUpload] = useState(false)
    const [profiles, setProfiles] = useState({})
    const loadDocuments = useCallback(async () => {
        setError('')
        try {
            const docs = await DocumentService.fetchAll()
            setDocuments(docs)
        } catch (err) {
            setError('Failed to load documents')
            console.error('Documents fetch error:', err)
        } finally {
            setLoading(false)
        }
    }, [])
    useEffect(() => {
        let cancelled = false
        async function init() {
            const user = await UserService.getCurrentUser()
            if (cancelled || !user?.id) return
            const hasUpload = await UserService.hasPermission(user.id, 'documents.upload')
            if (!cancelled) setCanUpload(hasUpload)
            await loadDocuments()
        }
        init()
        return () => {
            cancelled = true
        }
    }, [loadDocuments])
    const uploaderIds = useMemo(() => [...new Set(documents.map((d) => d.uploaded_by).filter(Boolean))], [documents])
    useEffect(() => {
        if (uploaderIds.length === 0) return
        let cancelled = false
        async function fetchProfiles() {
            const missing = uploaderIds.filter((id) => !profiles[id])
            if (missing.length === 0) return
            const { data, error } = await (await import('../../services/DatabaseService')).supabase
                .from('users_profiles')
                .select('id, first_name, last_name')
                .in('id', missing)
            if (cancelled || error || !Array.isArray(data)) return
            setProfiles((prev) => ({
                ...prev,
                ...data.reduce((map, p) => {
                    map[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown'
                    return map
                }, {})
            }))
        }
        fetchProfiles()
        return () => {
            cancelled = true
        }
    }, [uploaderIds, profiles])
    const uploadFile = useCallback(
        async (file) => {
            setUploading(true)
            setError('')
            try {
                await DocumentService.upload(file)
                await loadDocuments()
            } catch (err) {
                setError(err.message || 'Upload failed')
            } finally {
                setUploading(false)
            }
        },
        [loadDocuments]
    )
    const deleteDocument = useCallback(async (doc) => {
        setError('')
        try {
            await DocumentService.delete(doc)
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
        } catch (err) {
            setError(err.message || 'Delete failed')
        }
    }, [])
    return { canUpload, deleteDocument, documents, error, loading, profiles, uploadFile, uploading }
}
