'use client'

import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe, Linkedin, Twitter, MapPin, Users, Building2, Calendar, FileText, Link as LinkIcon, ExternalLink, Mail, Phone, Sparkles, MoreVertical } from 'lucide-react'

interface ContextPanelProps {
    lead: any
}

export function ContextPanel({ lead }: ContextPanelProps) {
    const router = useRouter()

    return (
        <div className="space-y-6">
            {/* Contact Details */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold uppercase text-zinc-500 tracking-wider">Contact Details</CardTitle>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => window.location.href = `mailto:${lead.email}`}>
                                    <Mail className="w-4 h-4 mr-2 text-zinc-500" />
                                    Quick Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/leads/${lead.id}?tab=email`)}>
                                    <Sparkles className="w-4 h-4 mr-2 text-indigo-500" />
                                    AI-Powered Draft
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-1.5 -mx-1.5 rounded transition-colors" onClick={() => window.location.href = `mailto:${lead.email}`}>
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Mail className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-xs text-zinc-500 block mb-0.5">Email</span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-white truncate block">{lead.email}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 p-1.5 -mx-1.5 rounded transition-colors" onClick={() => window.location.href = `tel:${lead.phone}`}>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Phone className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-xs text-zinc-500 block mb-0.5">Phone</span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-white truncate block">{lead.phone || 'Not provided'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                            <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-xs text-zinc-500 block mb-0.5">Location</span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-white truncate block">{lead.location || 'Unknown'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Company Profile */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase text-zinc-500 tracking-wider">Company Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-zinc-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-zinc-900 dark:text-white leading-none mb-1">
                                {lead.company || 'Unknown Company'}
                            </h3>
                            <a href="#" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                techflow.inc <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                        <div>
                            <span className="text-zinc-500 text-xs block mb-0.5">Industry</span>
                            <span className="font-medium">{lead.industry || 'Technology'}</span>
                        </div>
                        <div>
                            <span className="text-zinc-500 text-xs block mb-0.5">Size</span>
                            <span className="font-medium">{lead.company_size || '500-1000'}</span>
                        </div>
                        <div>
                            <span className="text-zinc-500 text-xs block mb-0.5">Location</span>
                            <span className="font-medium">{lead.location || 'San Francisco, CA'}</span>
                        </div>
                        <div>
                            <span className="text-zinc-500 text-xs block mb-0.5">Founded</span>
                            <span className="font-medium">2018</span>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-zinc-500">
                            <Linkedin className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-zinc-500">
                            <Twitter className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-zinc-500">
                            <Globe className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Event History */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase text-zinc-500 tracking-wider">Related Events</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded text-indigo-600 dark:text-indigo-400">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-zinc-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                                {lead.events?.name || 'Current Event'}
                            </h4>
                            <span className="text-xs text-zinc-500">Registered · 2 days ago</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Documents */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase text-zinc-500 tracking-wider">Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 cursor-pointer">
                        <FileText className="w-4 h-4" />
                        <span>Generic_Proposal_v2.pdf</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 cursor-pointer">
                        <LinkIcon className="w-4 h-4" />
                        <span>SalesForce Record #8821</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
