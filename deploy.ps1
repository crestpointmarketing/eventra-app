param([ValidateSet('Preview', 'Production')][string]$Environment = 'Preview')
$ErrorActionPreference = 'Stop'
npm ci
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
if ($Environment -eq 'Production') { npx vercel --prod } else { npx vercel }
exit $LASTEXITCODE
