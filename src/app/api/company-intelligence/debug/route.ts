import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Diagnostic endpoint to check Company Intelligence setup
 * Access at: /api/company-intelligence/debug
 */
export async function GET(request: NextRequest) {
    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        checks: [],
        status: 'checking'
    }

    try {
        // Check 1: Environment variables
        diagnostics.checks.push({
            name: 'Environment Variables',
            status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'pass' : '  fail',
            details: {
                supabaseUrlExists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                supabaseKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            }
        })

        // Check 2: Supabase client creation
        let supabase
        try {
            supabase = await createClient()
            diagnostics.checks.push({
                name: 'Supabase Client',
                status: 'pass',
                details: 'Client created successfully'
            })
        } catch (error: any) {
            diagnostics.checks.push({
                name: 'Supabase Client',
                status: 'fail',
                error: error.message
            })
            diagnostics.status = 'failed'
            return NextResponse.json(diagnostics)
        }

        // Check 3: Authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        diagnostics.checks.push({
            name: 'Authentication',
            status: user ? 'pass' : 'fail',
            details: {
                userId: user?.id,
                email: user?.email,
                error: authError?.message
            }
        })

        if (!user) {
            diagnostics.status = 'no_user'
            diagnostics.message = 'User is not authenticated. Please log in first.'
            return NextResponse.json(diagnostics, { status: 200 })
        }

        // Check 4: Database table exists
        const { data: tableCheck, error: tableError } = await supabase
            .from('company_intelligence')
            .select('id')
            .limit(1)

        diagnostics.checks.push({
            name: 'Database Table',
            status: tableError ? (tableError.code === '42P01' ? 'table_not_found' : 'fail') : 'pass',
            details: {
                error: tableError?.message,
                errorCode: tableError?.code,
                hint: tableError?.code === '42P01'
                    ? 'Run the SQL migration in Supabase Dashboard'
                    : tableError?.hint
            }
        })

        // Check 5: User's company intelligence
        if (!tableError) {
            const { data: intelligence, error: fetchError } = await supabase
                .from('company_intelligence')
                .select('*')
                .eq('user_id', user.id)
                .single()

            diagnostics.checks.push({
                name: 'User Company Intelligence',
                status: intelligence ? 'exists' : (fetchError?.code === 'PGRST116' ? 'not_found' : 'fail'),
                details: {
                    hasData: !!intelligence,
                    error: fetchError?.message,
                    errorCode: fetchError?.code
                }
            })
        }

        diagnostics.status = diagnostics.checks.every((c: any) => c.status === 'pass' || c.status === 'not_found' || c.status === 'exists')
            ? 'healthy'
            : 'issues_found'

        return NextResponse.json(diagnostics, { status: 200 })

    } catch (error: any) {
        diagnostics.status = 'error'
        diagnostics.error = error.message
        diagnostics.stack = error.stack
        return NextResponse.json(diagnostics, { status: 500 })
    }
}
