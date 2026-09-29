Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Projects\Cannan Diary\cannan\src\splash_screens\assets\images\canann.jpeg"
$assetsDir = "c:\Projects\Cannan Diary\cannan\assets\images"
$resDir = "c:\Projects\Cannan Diary\cannan\android\app\src\main\res"

if (!(Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

$srcImage = [System.Drawing.Image]::FromFile($srcPath)

function Create-Square-Image($targetPath, $targetSize, $padRatio = 0.0) {
    $bmp = New-Object System.Drawing.Bitmap $targetSize, $targetSize
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $pad = [int]($targetSize * $padRatio)
    $drawSize = $targetSize - ($pad * 2)

    $ratio = [Math]::Min($drawSize / $srcImage.Width, $drawSize / $srcImage.Height)
    $newW = [int]($srcImage.Width * $ratio)
    $newH = [int]($srcImage.Height * $ratio)
    $x = $pad + [int](($drawSize - $newW) / 2)
    $y = $pad + [int](($drawSize - $newH) / 2)

    $g.DrawImage($srcImage, $x, $y, $newW, $newH)
    $g.Dispose()

    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Created: $targetPath ($targetSize x $targetSize)"
}

# Expo assets
Create-Square-Image "$assetsDir\icon.png" 1024 0.05
Create-Square-Image "$assetsDir\adaptive-icon.png" 1024 0.15
Create-Square-Image "$assetsDir\splash-icon.png" 512 0.05
Create-Square-Image "$assetsDir\favicon.png" 48 0.0

# Android mipmap densities
$densities = @(
    @{ folder="mipmap-mdpi"; size=48; fgSize=108 },
    @{ folder="mipmap-hdpi"; size=72; fgSize=162 },
    @{ folder="mipmap-xhdpi"; size=96; fgSize=216 },
    @{ folder="mipmap-xxhdpi"; size=144; fgSize=324 },
    @{ folder="mipmap-xxxhdpi"; size=192; fgSize=432 }
)

foreach ($d in $densities) {
    $dir = "$resDir\$($d.folder)"
    if (Test-Path $dir) {
        Create-Square-Image "$dir\ic_launcher.png" $d.size 0.05
        Create-Square-Image "$dir\ic_launcher_round.png" $d.size 0.05
        Create-Square-Image "$dir\ic_launcher_foreground.png" $d.fgSize 0.15
        # remove old webp if png takes precedence
        if (Test-Path "$dir\ic_launcher.webp") { Remove-Item "$dir\ic_launcher.webp" -Force }
        if (Test-Path "$dir\ic_launcher_round.webp") { Remove-Item "$dir\ic_launcher_round.webp" -Force }
        if (Test-Path "$dir\ic_launcher_foreground.webp") { Remove-Item "$dir\ic_launcher_foreground.webp" -Force }
    }
}

$srcImage.Dispose()
Write-Output "All icons generated and synced to Android mipmaps!"
