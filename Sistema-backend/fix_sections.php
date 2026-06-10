<?php
$dir = __DIR__ . '/resources/views/exports/';
$files = scandir($dir);

foreach ($files as $file) {
    if (!str_ends_with($file, '.blade.php')) continue;
    if ($file === '_base_styles.blade.php' || $file === 'layout_membrete.blade.php') continue;
    
    $path = $dir . $file;
    $content = file_get_contents($path);

    // If a file didn't have a <style> block, the previous regex failed to add @endsection and @section('content')
    // We are left with: @section('styles')\n</head>\n<body>
    if (strpos($content, "@section('styles')\n</head>\n<body>") !== false || 
        strpos($content, "@section('styles')\r\n</head>\r\n<body>") !== false) {
        
        $content = str_replace("@section('styles')\n</head>\n<body>", "@section('content')", $content);
        $content = str_replace("@section('styles')\r\n</head>\r\n<body>", "@section('content')", $content);
        
        file_put_contents($path, $content);
        echo "Fixed missing content section in: $file\n";
    }
}
