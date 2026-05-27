# Hook de validação de sincronia de documentação.
# Roda no Stop do Claude Code. Verifica se mudanças em código vieram
# acompanhadas de atualização em docs/SYSTEM.md.
#
# Exit codes:
#   0 → passa silenciosamente (sem mudanças, ou doc atualizada, ou apenas docs/config)
#   2 → bloqueia o Stop e re-injeta stderr no Claude (faltou atualizar docs)

$ErrorActionPreference = 'SilentlyContinue'

# git status sai com working tree do PWD; Claude Code roda hooks no project dir
$changes = & git status --porcelain 2>$null
if (-not $changes) { exit 0 }

$lines = $changes -split "`r?`n" | Where-Object { $_ -ne '' }

$codeRegex = '^.{2,3}(app/|modules/|lib/|services/|repositories/|components/|validations/|drizzle/migrations/|scripts/|hooks/|proxy\.ts|middleware\.ts|next\.config\.|drizzle\.config\.|package\.json|tsconfig\.json)'
$docRegex  = '^.{2,3}(docs/SYSTEM\.md|docs/CHANGELOG\.md|CLAUDE\.md|GEMINI\.md|docs/ARCHITECTURE\.md)'

$hasCode = $false
$hasDoc  = $false

foreach ($line in $lines) {
    if ($line -match $codeRegex) { $hasCode = $true }
    if ($line -match $docRegex)  { $hasDoc  = $true }
}

if ($hasCode -and -not $hasDoc) {
    $msg = @'
[hook check-docs-sync] Mudancas em codigo detectadas SEM atualizacao em docs/SYSTEM.md.

Antes de finalizar este turno:
  1. Abra docs/SYSTEM.md.
  2. Atualize a tabela de Fases (Sec 17) com a feature concluida,
     OU a secao arquitetural afetada (Sec 7 dados, Sec 8 padroes, Sec 13 jobs, etc.).
  3. Se a mudanca for trivial (typo, comentario, rename interno sem efeito externo),
     declare isso EXPLICITAMENTE na resposta ao usuario e atualize docs/SYSTEM.md
     com uma unica linha de timestamp + nota curta para satisfazer o hook.

Apos atualizar, finalize a resposta normalmente.
'@
    [Console]::Error.WriteLine($msg)
    exit 2
}

exit 0
