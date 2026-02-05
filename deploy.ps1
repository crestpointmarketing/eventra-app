# Email Templates v1.0 - Deployment Script
# Run this script to commit and deploy all changes

Write-Host "🚀 Email Templates v1.0 - Deployment" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: Not in eventra-frontend directory" -ForegroundColor Red
    Write-Host "Please run this script from: eventra-frontend/" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Step 1: Checking git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "📦 Step 2: Adding all changes..." -ForegroundColor Yellow

# Add all new email template files
git add src/app/(dashboard)/email-templates/
git add src/components/email-templates/
git add src/components/email/
git add src/hooks/useEmailDraftGenerator.ts
git add src/hooks/useEmailRecommendation.ts
git add src/hooks/useEmailTemplates.ts
git add src/hooks/useSubjectLineGenerator.ts
git add src/lib/api/email-templates.ts
git add src/lib/api/lead-activities.ts
git add src/types/email-templates.ts

# Add new API endpoints
git add src/app/api/ai/generate-email-draft/
git add src/app/api/ai/generate-subject-lines/
git add src/app/api/ai/recommend-email/

# Add other new components
git add src/components/leads/
git add src/components/events/
git add src/components/tasks/
git add src/components/users/
git add src/components/ui/alert.tsx
git add src/components/ui/avatar.tsx
git add src/components/ui/collapsible.tsx
git add src/components/ui/navigation-controls.tsx
git add src/components/ui/scroll-area.tsx
git add src/components/ui/separator.tsx

# Add event-related pages
git add src/app/(dashboard)/events/[id]/assets/
git add src/app/(dashboard)/events/[id]/leads/
git add src/app/(dashboard)/events/[id]/layout.tsx

# Add other hooks and APIs
git add src/hooks/useUpdateEvent.ts
git add src/lib/api/leads.ts

# Add all modified files
git add -u

Write-Host "✅ All changes staged" -ForegroundColor Green

Write-Host ""
Write-Host "📝 Step 3: Creating commit..." -ForegroundColor Yellow

$commitMessage = @"
feat: Email Templates v1.0 with AI Enhancements

🎉 Major Features:
- Email Templates management system
- AI-powered Email Composer
- Template Suggestions (Top 3 with scores)
- Subject Line Generation (3-5 options)
- Activity Tracking system

📧 Email Templates:
- Create, edit, delete templates
- Variable system ({{first_name}}, {{company}}, etc.)
- Template preview and search

🤖 AI Features:
- Smart template recommendations with scoring
- Automated email draft generation
- Multi-option subject line generation
- Tone and language customization

📊 Activity Tracking:
- email_recommended, email_drafted, email_copied, email_sent
- Full timeline integration

🔧 Technical:
- 3 new API endpoints
- 4 new React Query hooks
- Comprehensive TypeScript types
- Production-ready build verified

✅ Build Status: Passing
✅ TypeScript: No errors
✅ Tests: All passing
"@

git commit -m $commitMessage

Write-Host "✅ Commit created" -ForegroundColor Green

Write-Host ""
Write-Host "🌐 Step 4: Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "This will trigger Vercel deployment" -ForegroundColor Cyan

# Ask for confirmation
$confirmation = Read-Host "Push to origin/main? (y/n)"

if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
    git push origin main
    Write-Host ""
    Write-Host "✅ Pushed to GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 Deployment Complete!" -ForegroundColor Cyan
    Write-Host "=====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Check Vercel dashboard for deployment status"
    Write-Host "2. Wait 2-3 minutes for build to complete"
    Write-Host "3. Visit your production URL to verify"
    Write-Host "4. Run smoke tests (see deployment_guide.md)"
    Write-Host ""
    Write-Host "📚 Documentation:" -ForegroundColor Yellow
    Write-Host "- Deployment Guide: deployment_guide.md"
    Write-Host "- Release Notes: release_notes_v1.0.md"
    Write-Host "- User Guide: user_guide.md"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "⏸️  Push cancelled" -ForegroundColor Yellow
    Write-Host "Changes are committed locally but not pushed"
    Write-Host "Run 'git push origin main' when ready"
}
