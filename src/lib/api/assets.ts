import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

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

// ============================================
// Fetch Assets (with filters)
// ============================================
export async function fetchAssets(filters?: AssetFilters) {
    let query = supabase
        .from('assets')
        .select(`
      *,
      events:event_id (id, name),
      tasks:task_id (id, title)
    `)
        .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.search) {
        query = query.or(`filename.ilike.%${filters.search}%,title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
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

    const { data, error } = await query

    if (error) throw error
    return data as Asset[]
}

// ============================================
// Fetch Single Asset
// ============================================
export async function fetchAsset(assetId: string) {
    const { data, error } = await supabase
        .from('assets')
        .select(`
      *,
      events:event_id (id, name),
      tasks:task_id (id, title)
    `)
        .eq('id', assetId)
        .single()

    if (error) throw error
    return data as Asset
}

// ============================================
// Create Asset (after file upload)
// ============================================
export async function createAsset(assetData: CreateAssetData) {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    console.log('🟡 Delete attempt for asset:', assetId)

    // First get asset details
    const { data: asset, error: fetchError } = await supabase
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .single()

    if (fetchError) {
        console.error('🔴 Error fetching asset:', fetchError)
        throw fetchError
    }

    console.log('🟡 Asset to delete:', asset)

    // Delete from storage if file exists
    if (asset?.file_url) {
        // Extract file path from URL
        const urlParts = asset.file_url.split('/storage/v1/object/public/event-assets/')
        if (urlParts.length > 1) {
            const filePath = urlParts[1]
            console.log('🟡 Deleting from storage, path:', filePath)

            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('event-assets')
                .remove([filePath])

            if (storageError) {
                console.error('🔴 Storage delete error:', storageError)
                // Continue with database deletion even if storage delete fails
            } else {
                console.log('🟢 Storage file deleted successfully')
            }
        }
    }

    // Delete from database
    console.log('🟡 Deleting from database...')
    const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId)

    if (error) {
        console.error('🔴 Database delete error:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        })
        throw error
    }

    console.log('🟢 Asset deleted successfully from database')
}

// ============================================
// Upload File to Storage
// ============================================
export async function uploadFile(file: File, userId: string) {
    console.log('🔵 Upload attempt:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        userId
    })

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    console.log('🔵 Upload path:', filePath)

    const { data, error } = await supabase.storage
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

    console.log('🟢 Upload success:', data)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('event-assets')
        .getPublicUrl(filePath)

    console.log('🟢 Public URL:', publicUrl)

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
    const { error } = await supabase
        .from('assets')
        .update({ is_new: false })
        .eq('id', assetId)

    if (error) throw error
}
