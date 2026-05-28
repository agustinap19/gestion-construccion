<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Gestión Construcción - React</title>
    
    <!-- Vite React Refresh (Required for React Fast Refresh) -->
    <?php echo app('Illuminate\Foundation\Vite')->reactRefresh(); ?>
    
    <!-- Configuración para Vite con React y Tailwind -->
    <?php echo app('Illuminate\Foundation\Vite')(['resources/css/app.css', 'resources/js/app.jsx']); ?>
</head>
<body class="antialiased bg-gray-100">
    <!-- Contenedor principal de React -->
    <div id="app"></div>
</body>
</html>
<?php /**PATH D:\ProyectosWeb\gestion-construccion\resources\views/welcome.blade.php ENDPATH**/ ?>