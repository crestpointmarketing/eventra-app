import { fetchAllRows } from '@/lib/api/pagination'
import { createClient } from '@/lib/supabase/client'

let _supabase: ReturnType<typeof createClient> | null = null
function getSupabase(): ReturnType<typeof createClient> {
    if (!_supabase) _supabase = createClient()
    return _supabase
}

// ============================================
// Types
// ============================================
export interface Asset {
    id: string
    filename: string
    file_type: 'document' | 'image' | 'video' | string
    file_url: string
    file_size: number | null
    mime_type: string | null
    event_id: string | null
    task_id: string | null
    uploaded_by: string | null
    title: string | null
    description: string | null
    tags: string[] | null
    is_new: boolean
    created_at: string
    updated_at: string
    // Joined data
    events?: { id: string; name: string }
    tasks?: { id: string; title: string }
}

export interface AssetFilters {
    search?: string
    fileTypes?: string[]
    eventId?: string
    taskId?: string
}

export interface CreateAssetData {
    filename: string
    file_type: string
    file_url: string
    file_size?: number
    mime_type?: string
    event_id?: string
    task_id?: string
    uploaded_by?: string
    title?: string
    description?: string
    tags?: string[]
}

export function assetStoragePath(url: string) {
    const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/event-assets\/([^?]+)/)
    return match ? decodeURIComponent(match[1]) : null
}
async function signAsset(asset: Asset): Promise<Asset> {
    const path = assetStoragePath(asset.file_url)
    if (!path) return asset
    const { data, error } = await getSupabase().storage.from('event-assets').createSignedUrl(path, 3600)
    if (error) throw new Error('Unable to access this file. Please sign in again.')
    return { ...asset, file_url: data.signedUrl }
}

// ============================================
// Fetch Assets (with filters)
// ============================================
export async function fetchAssets(filters?: AssetFilters) {
    let query = getSupabase()
        .from('assets')
        .select(`
      *,
      events:event_id (id, name),
      tasks:task_id (id, title)
    `)
        .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.search) {
        const search = filters.search.replace(/[(),.%_]/g, " ").trim()
        query = query.or(`filename.ilike.%${search}%,title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (filters?.fileTypes && filters.fileTypes.length > 0) {
        query = query.in('file_type', filters.fileTypes)
    }

    if (filters?.eventId) {
        query = query.eq('event_id', filters.eventId)
    }

    if (filters?.taskId) {
        query = query.eq('task_id', filters.taskId)
    }

    const data = await fetchAllRows<any>((from, to) => query.order('id').range(from, to))
    return Promise.all(data.map(signAsset))
}

// ============================================
// Fetch Single Asset
// ============================================
export async function fetchAsset(assetId: string) {
    const { data, error } = await getSupabase()
        .from('assets')
        .select(`
      *,
      events:event_id (id, name),
      tasks:task_id (id, title)
    `)
        .eq('id', assetId)
        .single()

    if (error) throw error
    return signAsset(data)
}

// ============================================
// Create Asset (after file upload)
// ============================================
export async function createAsset(assetData: CreateAssetData) {
    const { data, error } = await getSupabase()
        .from('assets')
        .insert(assetData)
        .select()
        .single()

    if (error) throw error
    return data as Asset
}

// ============================================
// Update Asset Metadata
// ============================================
export async function updateAsset(assetId: string, updates: Partial<CreateAssetData>) {
    const { data, error } = await getSupabase()
        .from('assets')
        .update(updates)
        .eq('id', assetId)
        .select()
        .single()

    if (error) throw error
    return data as Asset
}

// ============================================
// Delete Asset (and file from storage)
// ============================================
export async function deleteAsset(assetId: string) {
    const db = getSupabase()
    const { data: { user } } = await db.auth.getUser()
    if (!user) throw new Error('Please sign in again')
    const { data: asset, error: fetchError } = await db.from('assets').select('file_url,uploaded_by').eq('id', assetId).single()
    if (fetchError) throw fetchError
    if (asset.uploaded_by !== user.id) throw new Error('Only the uploader can delete this file')
    const path = asset.file_url?.split('/storage/v1/object/public/event-assets/')[1]
    if (path) {
        const { error } = await db.storage.from('event-assets').remove([path])
        if (error) throw new Error('File removal failed. Its metadata has been kept; please retry.')
    }
    const { error } = await db.from('assets').delete().eq('id', assetId).select('id').single()
    if (error) throw new Error('File removal needs another attempt to clear its metadata. Please retry.')
}

// ============================================
// Upload File to Storage
// ============================================
export async function uploadFile(file: File, userId: string) {
    if (file.size > 25 * 1024 * 1024) throw new Error('File must be smaller than 25 MB')
    const { data: { user } } = await getSupabase().auth.getUser()
    if (!user || user.id !== userId) throw new Error('Please sign in again')
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${userId}/${fileName}`


    const { data, error } = await getSupabase().storage
        .from('event-assets')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        })

    if (error) {
        console.error('🔴 Upload error:', {
            message: error.message,
            statusCode: error.statusCode,
            error: error
        })
        throw error
    }


    // Get public URL
    const { data: { publicUrl } } = getSupabase().storage
        .from('event-assets')
        .getPublicUrl(filePath)


    return {
        filePath: data.path,
        fileUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type
    }
}

// ============================================
// Mark Asset as Not New
// ============================================
export async function markAssetAsViewed(assetId: string) {
    const { error } = await getSupabase()
        .from('assets')
        .update({ is_new: false })
        .eq('id', assetId)

    if (error) throw error
}
