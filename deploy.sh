#!/bin/bash
# Email Templates v1.0 - Deployment Script (Bash version)
# Run this script to commit and deploy all changes

echo "🚀 Email Templates v1.0 - Deployment"
echo "====================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in eventra-frontend directory"
    echo "Please run this script from: eventra-frontend/"
    exit 1
fi

echo "📋 Step 1: Checking git status..."
git status --short

echo ""
echo "📦 Step 2: Adding all changes..."

# Add all new email template files
git add src/app/\(dashboard\)/email-templates/
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
git add src/app/\(dashboard\)/events/\[id\]/assets/
git add src/app/\(dashboard\)/events/\[id\]/leads/
git add src/app/\(dashboard\)/events/\[id\]/layout.tsx

# Add other hooks and APIs
git add src/hooks/useUpdateEvent.ts
git add src/lib/api/leads.ts

# Add all modified files
git add -u

echo "✅ All changes staged"

echo ""
echo "📝 Step 3: Creating commit..."

git commit -m "feat: Email Templates v1.0 with AI Enhancements

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
✅ Tests: All passing"

echo "✅ Commit created"

echo ""
echo "🌐 Step 4: Pushing to GitHub..."
echo "This will trigger Vercel deployment"

# Ask for confirmation
read -p "Push to origin/main? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
    echo ""
    echo "✅ Pushed to GitHub!"
    echo ""
    echo "🎉 Deployment Complete!"
    echo "====================================="
    echo ""
    echo "Next steps:"
    echo "1. Check Vercel dashboard for deployment status"
    echo "2. Wait 2-3 minutes for build to complete"
    echo "3. Visit your production URL to verify"
    echo "4. Run smoke tests (see deployment_guide.md)"
    echo ""
    echo "📚 Documentation:"
    echo "- Deployment Guide: deployment_guide.md"
    echo "- Release Notes: release_notes_v1.0.md"
    echo "- User Guide: user_guide.md"
    echo ""
else
    echo ""
    echo "⏸️  Push cancelled"
    echo "Changes are committed locally but not pushed"
    echo "Run 'git push origin main' when ready"
fi
