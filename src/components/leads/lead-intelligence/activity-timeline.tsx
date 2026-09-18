'use client'
import { LeadNotes } from '@/components/leads/lead-notes'
export function ActivityTimeline({ lead }: { lead: { id: string } }) { return <LeadNotes leadId={lead.id} /> }
