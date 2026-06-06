@extends('reportes.layouts.oficial')

@section('title', 'Reporte Fotográfico')

@section('styles')
<style>
    .cover-page {
        text-align: center;
        padding-top: 50px;
        page-break-after: always;
    }
    .cover-title {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 30px;
    }
    .beneficiario-info {
        text-align: left;
        width: 80%;
        margin: 0 auto;
        border: 1px solid #cbd5e1;
        padding: 20px;
        border-radius: 8px;
        background-color: #f8fafc;
    }
    .info-row {
        margin-bottom: 10px;
        font-size: 14px;
    }
    .info-label {
        font-weight: bold;
        display: inline-block;
        width: 150px;
    }
    .timeline {
        margin-top: 20px;
    }
    .photo-container {
        text-align: center;
        margin-bottom: 40px;
        page-break-inside: avoid;
    }
    .photo-img {
        max-width: 90%;
        max-height: 400px;
        border: 2px solid #e2e8f0;
        padding: 4px;
        border-radius: 4px;
    }
    .photo-caption {
        margin-top: 10px;
        font-size: 12px;
        font-weight: bold;
        color: #334155;
    }
    .photo-date {
        font-size: 10px;
        color: #64748b;
    }
</style>
@endsection

@section('content')

    <!-- Portada -->
    <div class="cover-page">
        <div class="cover-title">REPORTE FOTOGRÁFICO DE ENTREGAS</div>
        
        <div class="beneficiario-info">
            <h3 style="margin-top: 0; text-align: center;">Datos del Beneficiario</h3>
            
            <div class="info-row">
                <span class="info-label">Nombre Completo:</span>
                {{ $beneficiario->nombre }} {{ $beneficiario->apellido_paterno }} {{ $beneficiario->apellido_materno }}
            </div>
            <div class="info-row">
                <span class="info-label">C.I.:</span>
                {{ $beneficiario->ci }} {{ $beneficiario->expedido }}
            </div>
            <div class="info-row">
                <span class="info-label">Comunidad/Zona:</span>
                {{ $beneficiario->comunidad }}
            </div>
            <div class="info-row">
                <span class="info-label">Vivienda Asignada:</span>
                {{ $beneficiario->vivienda ? $beneficiario->vivienda->codigo : 'N/A' }}
            </div>
            <div class="info-row">
                <span class="info-label">GPS:</span>
                {{ $beneficiario->latitud ?? 'N/A' }}, {{ $beneficiario->longitud ?? 'N/A' }}
            </div>
            <div class="info-row">
                <span class="info-label">Fecha de Registro:</span>
                {{ $beneficiario->created_at ? $beneficiario->created_at->format('d/m/Y') : 'N/A' }}
            </div>
        </div>
    </div>

    <!-- Fotos -->
    <div class="timeline">
        @if(count($fotos) === 0)
            <div style="text-align: center; margin-top: 50px; font-size: 14px; color: #64748b;">
                Sin entregas fotográficas registradas al momento.
            </div>
        @else
            @foreach($fotos as $foto)
                <div class="photo-container">
                    @php
                        // En local/storage real, debemos convertir la URL a path absoluto para DomPDF si es necesario
                        $url = public_path(str_replace(config('app.url').'/', '', $foto['url']));
                        if (!file_exists($url)) {
                            // Intento alternativo para dompdf si no resuelve
                            $url = $foto['url'];
                        }
                    @endphp
                    <!-- Nota: Se usa un placeholder si la imagen física no existe localmente, para evitar errores de render -->
                    <img src="{{ $url }}" class="photo-img" alt="Evidencia fotográfica" onerror="this.src='{{ public_path('placeholder.png') }}'">
                    
                    <div class="photo-caption">{{ $foto['descripcion'] }}</div>
                    <div class="photo-date">Entregado el: {{ \Carbon\Carbon::parse($foto['fecha'])->format('d/m/Y H:i') }}</div>
                </div>
            @endforeach
        @endif
    </div>

@endsection
