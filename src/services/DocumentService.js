import { supabase } from './DatabaseService'
import { UserService } from './UserService'

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
    const ext = filename.split('.').pop().toLowerCase()
    return FILE_TYPE_MAP[ext] || 'other'
}

class DocumentServiceImpl {
    async fetchAll() {
        const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false })

        if (error) throw new Error(error.message)
        return data || []
    }

    async upload(file) {
        const user = await UserService.getCurrentUser()
        if (!user?.id) throw new Error('Authentication required')

        const ext = file.name.split('.').pop().toLowerCase()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${STORAGE_PREFIX}/${user.id}/${Date.now()}_${safeName}`

        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, file, { cacheControl: CACHE_CONTROL, upsert: false })

        if (uploadError) throw new Error('Failed to upload file: ' + uploadError.message)

        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath)
        const publicUrl = urlData?.publicUrl || storagePath

        const record = {
            file_path: publicUrl,
            file_size: file.size,
            file_type: getFileType(file.name),
            name: file.name,
            uploaded_by: user.id
        }

        const { data, error: insertError } = await supabase.from(TABLE).insert(record).select().single()

        if (insertError) throw new Error('Failed to save document record: ' + insertError.message)
        return data
    }

    async delete(doc) {
        const url = doc.file_path || ''
        const bucketSegment = `/storage/v1/object/public/${STORAGE_BUCKET}/`
        const pathIndex = url.indexOf(bucketSegment)
        const storagePath = pathIndex !== -1 ? url.substring(pathIndex + bucketSegment.length) : null

        if (storagePath) {
            await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
        }

        const { error } = await supabase.from(TABLE).delete().eq('id', doc.id)
        if (error) throw new Error('Failed to delete document: ' + error.message)
    }
}

export const DocumentService = new DocumentServiceImpl()
