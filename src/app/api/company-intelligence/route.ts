import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) {
            console.error('Auth error in company-intelligence GET:', authError)
            return NextResponse.json(
                { error: 'Authentication failed', details: authError.message },
                { status: 401 }
            )
        }

        if (!user) {
            console.error('No user found in company-intelligence GET')
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            )
        }

        const userId = user.id
        console.log('Fetching company intelligence for user:', userId)

        // Fetch company intelligence for the user
        const { data: intelligence, error } = await supabase
            .from('company_intelligence')
            .select('*')
            .eq('user_id', userId)
            .single()

        // If no intelligence exists, return empty template
        if (error && error.code === 'PGRST116') {
            console.log('No company intelligence found for user, returning empty template')
            return NextResponse.json({
                intelligence: null,
                isNew: true
            })
        }

        if (error) {
            console.error('Error fetching company intelligence:', error)
            return NextResponse.json(
                { error: 'Failed to fetch company intelligence', details: error.message, code: error.code },
                { status: 500 }
            )
        }

        console.log('Successfully fetched company intelligence')
        return NextResponse.json({
            intelligence,
            isNew: false
        })

    } catch (error) {
        console.error('Error in company-intelligence GET:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError) {
            console.error('Auth error in company-intelligence PUT:', authError)
            return NextResponse.json(
                { error: 'Authentication failed', details: authError.message },
                { status: 401 }
            )
        }

        if (!user) {
            console.error('No user found in company-intelligence PUT')
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            )
        }

        const userId = user.id
        console.log('Updating company intelligence for user:', userId)

        const body = await request.json()
        const { isDraft = true, ...intelligenceData } = body

        // Check if intelligence already exists
        const { data: existing } = await supabase
            .from('company_intelligence')
            .select('id')
            .eq('user_id', userId)
            .single()

        let result

        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('company_intelligence')
                .update({
                    ...intelligenceData,
                    is_draft: isDraft,
                    user_id: userId
                })
                .eq('user_id', userId)
                .select()
                .single()

            if (error) {
                console.error('❌ Error updating company intelligence:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                })
                return NextResponse.json(
                    {
                        error: 'Failed to update company intelligence',
                        details: error.message,
                        code: error.code,
                        hint: error.hint
                    },
                    { status: 500 }
                )
            }

            result = data
        } else {
            // Insert new
            const { data, error } = await supabase
                .from('company_intelligence')
                .insert({
                    ...intelligenceData,
                    is_draft: isDraft,
                    user_id: userId
                })
                .select()
                .single()

            if (error) {
                console.error('❌ Error creating company intelligence:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                })
                return NextResponse.json(
                    {
                        error: 'Failed to create company intelligence',
                        details: error.message,
                        code: error.code,
                        hint: error.hint
                    },
                    { status: 500 }
                )
            }

            result = data
        }

        return NextResponse.json({
            intelligence: result,
            message: isDraft ? 'Draft saved' : 'Company Intelligence saved successfully'
        })

    } catch (error) {
        console.error('Error in company-intelligence PUT:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
