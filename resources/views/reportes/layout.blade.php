<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>@yield('title')</title>
    <style>
        @page {
            margin: 100px 25px;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 12px;
            color: #333;
        }
        header {
            position: fixed;
            top: -70px;
            left: 0px;
            right: 0px;
            height: 50px;
            border-bottom: 2px solid #10b981; /* emerald-500 */
            padding-bottom: 10px;
        }
        footer {
            position: fixed; 
            bottom: -60px; 
            left: 0px; 
            right: 0px;
            height: 30px; 
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 10px;
            color: #777;
            padding-top: 5px;
        }
        .page-number:after {
            content: counter(page);
        }
        .logo {
            float: left;
            font-size: 20px;
            font-weight: bold;
            color: #1e293b; /* slate-800 */
        }
        .logo span {
            color: #10b981; /* emerald-500 */
        }
        .report-info {
            float: right;
            text-align: right;
        }
        .report-title {
            font-size: 16px;
            font-weight: bold;
            color: #0f172a; /* slate-900 */
        }
        .report-date {
            font-size: 10px;
            color: #64748b; /* slate-500 */
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            border: 1px solid #cbd5e1; /* slate-300 */
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #334155; /* slate-700 */
            color: white;
            font-size: 11px;
            text-transform: uppercase;
        }
        tr:nth-child(even) {
            background-color: #f8fafc; /* slate-50 */
        }
        .clear {
            clear: both;
        }
        .group-header {
            background-color: #e2e8f0; /* slate-200 */
            font-weight: bold;
            padding-top: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid #94a3b8; /* slate-400 */
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <header>
        <div class="logo">CA & KANAGF <span>S.R.L.</span></div>
        <div class="report-info">
            <div class="report-title">@yield('title')</div>
            <div class="report-date">Fecha de generación: {{ date('d/m/Y H:i') }}</div>
        </div>
        <div class="clear"></div>
    </header>

    <footer>
        Página <span class="page-number"></span>
    </footer>

    <main>
        @yield('content')
    </main>
</body>
</html>
