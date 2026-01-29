import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { assessLeadQualification } from '@/lib/ai/lead-qualification-service'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Optional: Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.warn('Lead qualification API called without authentication')
        }

        const { leadId } = await request.json()

        if (!leadId) {
            return NextResponse.json(
                { error: 'Lead ID is required' },
                { status: 400 }
            )
        }

        // Fetch lead details
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) {
            return NextResponse.json(
                { error: 'Lead not found' },
                { status: 404 }
            )
        }

        // Assess qualification
        const qualification = await assessLeadQualification(lead)

        return NextResponse.json({
            qualification,
            leadId,
            leadName: lead.name,
            analyzedAt: new Date().toISOString()
        })

    } catch (error) {
        console.error('Error in qualify-lead API:', error)
        return NextResponse.json(
            { error: 'Failed to qualify lead' },
            { status: 500 }
        )
    }
}
