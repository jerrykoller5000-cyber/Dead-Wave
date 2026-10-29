$path = (Resolve-Path -LiteralPath 'studio/zombie-concepts.js').Path
$stream = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::Read)
try {
  $bytes = [byte[]]::new($stream.Length)
  [void]$stream.Read($bytes, 0, $bytes.Length)
  $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
  if ($hash -ne 'D75EFC512BDF4672A531855493EEEDF79B34801E0CD0321F3057A44FD9781A0C') { throw "source changed underneath this edit: $hash" }
  $utf8 = [Text.UTF8Encoding]::new($false, $true)
  $source = $utf8.GetString($bytes)
  $eol = if ($source.Contains("`r`n")) { "`r`n" } else { "`n" }
  $old = @(
    "    if(['shambler','feral','leaper'].includes(k))",
    '      path(shin,shadow,[[.02,-.06,.064],[.018,-.14,.054],[.013,-.23,.048],[.008,-.31,.052]],.010,.006);'
  ) -join $eol
  $new = @(
    "    if(['shambler','feral','leaper'].includes(k)){",
    "      const inset=k==='feral'?.005:0;",
    '      path(shin,shadow,[[.02,-.06,.064],[.018,-.14,.054-inset],[.013,-.23,.048-inset],[.008,-.31,.052-inset]],.010,.006);',
    '    }'
  ) -join $eol
  if (-not $source.Contains($old)) { throw 'source match missing' }
  $updated = $source.Replace($old, $new)
  $out = $utf8.GetBytes($updated)
  $stream.Position = 0
  $stream.Write($out, 0, $out.Length)
  $stream.SetLength($out.Length)
  $stream.Flush($true)
  'feral shin midpoint inset 5 mm; source updated'
} finally {
  $stream.Dispose()
}
