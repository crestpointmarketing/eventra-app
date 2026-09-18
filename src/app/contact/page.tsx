'use client'
import { useState } from 'react'
import { TopNav } from '@/components/layout/top-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
export default function ContactPage() {
    const [message,setMessage]=useState('')
    const [request,setRequest]=useState('')
    return <div className="eventra-workspace min-h-screen bg-background"><TopNav /><main className="mx-auto max-w-2xl space-y-5 px-4 py-8"><h1 className="text-2xl font-semibold">Help & feedback</h1><p className="text-muted-foreground">Prepare a support request to share with your workspace owner. This page does not send email automatically.</p><form className="space-y-4 rounded-xl border border-border p-5" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);setRequest(`Eventra support request\nName: ${form.get('name')}\nEmail: ${form.get('email')}\n\n${form.get('message')}`);setMessage('Request prepared. Copy or download it and share it with your workspace owner.')}}><label className="block space-y-2">Name<Input name="name" required maxLength={100} /></label><label className="block space-y-2">Email<Input name="email" type="email" required /></label><label className="block space-y-2">Message<Textarea name="message" required maxLength={5000} rows={6} /></label><Button type="submit">Prepare support request</Button></form>{request&&<section className="space-y-3"><pre className="whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-sm">{request}</pre><div className="flex flex-wrap gap-2"><Button onClick={async()=>{try{await navigator.clipboard.writeText(request);setMessage('Request copied.')}catch{setMessage('Copy failed. Download the request instead.')}}}>Copy request</Button><Button variant="outline" onClick={()=>{const url=URL.createObjectURL(new Blob([request],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='eventra-support-request.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Download requested.')}}>Download request</Button></div></section>}<p role="status">{message}</p></main></div>
}
