# Eventra database isolation

Verified 2026-09-18.

| Product | Supabase project reference | Evidence |
| --- | --- | --- |
| Eventra | `tbicyyhprqbhimhrihgn` | Local environment, saved production environment, authenticated production browser requests and live table/storage access |
| Pomelo / ai-cmo | `hlkrfpadbtdhmdfqnljg` | Read-only inspection of ai-cmo local configuration; no Pomelo writes or deployments performed |

Eventra dashboard: https://supabase.com/dashboard/project/tbicyyhprqbhimhrihgn

GitHub: https://github.com/crestpointmarketing/eventra-app

Vercel: https://vercel.com/crestpointmarketings-projects/eventra-app

All application database clients (browser, server, session middleware and search worker) use `eventraDatabaseUrl()`. It requires HTTPS and the exact Eventra project host and rejects Pomelo, the legacy host and lookalike domains. A deliberate project migration requires a reviewed code change rather than only changing a secret.

Client configuration uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. User access is enforced with Supabase sessions and RLS. Search workers use the server-only SUPABASE_SERVICE_ROLE_KEY. Do not copy Pomelo credentials into any Eventra environment.

## File-address repair

Five assets rows had URLs on legacy project `lmcabtwbtoacylajrpno`. Each corresponding object was downloaded from Eventra storage and its byte length matched the recorded file_size. The original rows were backed up outside git before changing only those five file_url values to Eventra's project host using conditional updates. No source-project files were deleted or modified. Private file access still uses signed URLs.

The five `event_assets` rows refer to `demo-storage.supabase.co` placeholders, not Pomelo or verified real files. They were left intact; active asset screens use `assets`. Do not copy or promote those placeholder URLs as real uploads.

## Follow-up schema maintenance

No schema deletion or table consolidation was performed. Converting file URLs to bucket/object_path fields, removing legacy demo tables, and migrating task module/reminder markers into typed columns need separate backed-up migrations. They are not required to keep the present app connected only to Eventra.
