<?php
$dir = __DIR__ . '/resources/views/exports/';
$files = scandir($dir);

foreach ($files as $file) {
    if ($file === '.' || $file === '..' || $file === '_base_styles.blade.php' || $file === 'layout_membrete.blade.php') continue;
    if (!str_ends_with($file, '.blade.php')) continue;

    $path = $dir . $file;
    $content = file_get_contents($path);

    // Remove Doctype and replace with extends
    $content = preg_replace('/<!DOCTYPE html>\s*<html[^>]*>\s*<head>[^<]*<meta[^>]*>\s*@include\([^)]+\)/s', "@extends('exports.layout_membrete')\n\n@section('styles')", $content);
    
    // Some files might not have @include
    $content = preg_replace('/<!DOCTYPE html>\s*<html[^>]*>\s*<head>[^<]*<meta[^>]*>/s', "@extends('exports.layout_membrete')\n\n@section('styles')", $content);

    // Replace </style>\n</head>\n<body> with </style>\n@endsection\n\n@section('content')
    $content = preg_replace('/<\/style>\s*<\/head>\s*<body>/s', "</style>\n@endsection\n\n@section('content')", $content);

    // Replace </body>\n</html> with @endsection
    $content = preg_replace('/<\/body>\s*<\/html>\s*$/s', "@endsection\n", $content);

    // Also remove the old footer if it exists: <div class="footer"> ... </div>
    // Note: Some have dynamic content in footer, like "Generado por...". 
    // We'll leave it for now or remove just the static part? The user said "sin enumeracion".
    // I will use regex to remove the <div class="footer">...</div> block if it exists
    $content = preg_replace('/<div class="footer">.*?<\/div>/s', '', $content);

    // Remove redundant <div class="empresa-nombre">...</div> if possible?
    // Actually, it's safer to just let the script do the main wrapper, and I can manually check if it worked well.

    file_put_contents($path, $content);
    echo "Refactored: $file\n";
}
