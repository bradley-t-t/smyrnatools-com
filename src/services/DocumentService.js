import APIUtility from '../utils/APIUtility'
import { Database } from './DatabaseService'
import { UserService } from './UserService'
const DOC_FUNCTION = '/document-service'
const postDoc = (endpoint, body) => APIUtility.post(`${DOC_FUNCTION}/${endpoint}`, body)
const TABLE = 'documents'
const STORAGE_BUCKET = 'smyrna'
const STORAGE_PREFIX = 'documents'
const CACHE_CONTROL = '3600'
const FILE_TYPE_MAP = {
    csv: 'spreadsheet',
    doc: 'document',
    docx: 'document',
    gif: 'image',
    jpeg: 'image',
    jpg: 'image',
    mov: 'video',
    mp4: 'video',
    pdf: 'pdf',
    png: 'image',
    ppt: 'presentation',
    pptx: 'presentation',
    svg: 'image',
    txt: 'text',
    webm: 'video',
    webp: 'image',
    xls: 'spreadsheet',
    xlsx: 'spreadsheet'
}
function getFileType(filename) {
    if (!filename) return 'other'
    const ext = filename.split('.').pop().toLowerCase()
    return FILE_TYPE_MAP[ext] || 'other'
}
class DocumentServiceImpl {
    async fetchAll() {
        const { data, error } = await Database.from(TABLE).select('*').order('created_at', { ascending: false })
        if (error) throw new Error(error.message)
        return data || []
    }
    async upload(file) {
        const user = await UserService.getCurrentUser()
        if (!user?.id) throw new Error('Authentication required')
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${STORAGE_PREFIX}/${user.id}/${Date.now()}_${safeName}`
        const { error: uploadError } = await Database.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, { cacheControl: CACHE_CONTROL, upsert: false })
        if (uploadError) throw new Error('Failed to upload file: ' + uploadError.message)
        const { data: urlData } = Database.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath)
        const publicUrl = urlData?.publicUrl || storagePath
        const record = {
            file_path: publicUrl,
            file_size: file.size,
            file_type: getFileType(file.name),
            name: file.name,
            uploaded_by: user.id
        }
        const { json } = await postDoc('insert-record', { record })
        if (!json) throw new Error('Failed to save document record')
        return json
    }
    async delete(doc) {
        const url = doc.file_path || ''
        const bucketSegment = `/storage/v1/object/public/${STORAGE_BUCKET}/`
        const pathIndex = url.indexOf(bucketSegment)
        const storagePath = pathIndex !== -1 ? url.substring(pathIndex + bucketSegment.length) : null
        if (storagePath) {
            await Database.storage.from(STORAGE_BUCKET).remove([storagePath])
        }
        const { json } = await postDoc('delete', { id: doc.id })
        if (!json) throw new Error('Failed to delete document')
    }
}
export const DocumentService = new DocumentServiceImpl()
