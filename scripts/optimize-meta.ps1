Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\public\meta.png"
$backupPath = Join-Path $PSScriptRoot "..\public\meta-original.png"
$jpgPath = Join-Path $PSScriptRoot "..\public\meta.jpg"
$pngOptPath = Join-Path $PSScriptRoot "..\public\meta-optimized.png"

# Create backup of the original uncompressed 1.96MB PNG if not already backed up
if (!(Test-Path $backupPath)) {
    Copy-Item $srcPath $backupPath
}

$orig = [System.Drawing.Image]::FromFile($backupPath)

# 1200 x 675 (Standard 16:9 Open Graph ratio)
$newW = 1200
$newH = [int]($newW * $orig.Height / $orig.Width)

$bmp = New-Object System.Drawing.Bitmap($newW, $newH, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$graph = [System.Drawing.Graphics]::FromImage($bmp)
$graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

$graph.DrawImage($orig, 0, 0, $newW, $newH)
$graph.Dispose()
$orig.Dispose()

# 1. Save meta.jpg (Quality 88, ~170KB - ideal for WhatsApp < 300KB limit)
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]88)

$bmp.Save($jpgPath, $codec, $encoderParams)
$jpgSize = (Get-Item $jpgPath).Length
Write-Host "meta.jpg Size: $([math]::Round($jpgSize / 1KB, 2)) KB"

$bmp.Dispose()
