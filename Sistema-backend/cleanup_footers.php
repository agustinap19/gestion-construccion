<?php
$dir = __DIR__ . '/resources/views/exports/';
$files = scandir($dir);

foreach ($files as $file) {
    if (!str_ends_with($file, '.blade.php')) continue;
    $path = $dir . $file;
    $content = file_get_contents($path);

    // The old footer structure was:
    // <div class="footer">
    //     <div class="footer-left">...</div>
    //     <div class="footer-right">...</div>
    // </div>
    
    // My previous regex only removed <div class="footer">...</div> up to the first </div>.
    // So what's left is often:
    //     <div class="footer-right">...</div>
    // </div>

    // Let's remove any remaining <div class="footer-left">...</div>
    $content = preg_replace('/<div class="footer-left">.*?<\/div>/s', '', $content);
    
    // Let's remove any remaining <div class="footer-right">...</div>
    $content = preg_replace('/<div class="footer-right">.*?<\/div>/s', '', $content);

    // There might be stray </div> tags before @endsection because the wrapper <div class="footer"> closing tag was left behind.
    // Let's remove an empty </div> that is just before @endsection
    $content = preg_replace('/<\/div>\s*@endsection/s', '@endsection', $content);

    file_put_contents($path, $content);
    echo "Cleaned up: $file\n";
}
