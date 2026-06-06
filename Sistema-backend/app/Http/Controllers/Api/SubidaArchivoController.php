<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SubidaArchivoController extends Controller
{
    public function imagen(Request $request): JsonResponse
    {
        $request->validate([
            'archivo' => 'required|image|mimes:jpeg,jpg,png,webp|max:2048',
        ], [
            'archivo.image'  => 'El archivo debe ser una imagen (JPEG, PNG, WEBP).',
            'archivo.max'    => 'La imagen no puede superar los 2 MB.',
        ]);

        $ext    = $request->file('archivo')->getClientOriginalExtension();
        $nombre = Str::uuid() . '.' . strtolower($ext);
        $path   = $request->file('archivo')->storeAs('beneficiarios/fotos', $nombre, 'public');

        return response()->json([
            'status' => 'success',
            'url'    => Storage::url($path),
        ]);
    }

    public function documento(Request $request): JsonResponse
    {
        $request->validate([
            'archivo' => 'required|file|mimes:jpeg,jpg,png,pdf|max:5120',
        ], [
            'archivo.mimes' => 'El documento debe ser PDF, JPEG o PNG.',
            'archivo.max'   => 'El documento no puede superar los 5 MB.',
        ]);

        $ext    = $request->file('archivo')->getClientOriginalExtension();
        $nombre = Str::uuid() . '.' . strtolower($ext);
        $path   = $request->file('archivo')->storeAs('beneficiarios/documentos', $nombre, 'public');

        return response()->json([
            'status' => 'success',
            'url'    => Storage::url($path),
        ]);
    }

    public function plano(Request $request): JsonResponse
    {
        $request->validate([
            'archivo' => 'required|file|mimes:jpeg,jpg,png,pdf|max:5120',
        ], [
            'archivo.mimes' => 'El plano debe ser PDF, JPEG o PNG.',
            'archivo.max'   => 'El plano no puede superar los 5 MB.',
        ]);

        $ext    = $request->file('archivo')->getClientOriginalExtension();
        $nombre = Str::uuid() . '.' . strtolower($ext);
        $path   = $request->file('archivo')->storeAs('tipologias/planos', $nombre, 'public');

        return response()->json([
            'status' => 'success',
            'url'    => Storage::url($path),
        ]);
    }

    /** Foto de reporte técnico: guarda original + genera thumbnail con GD */
    public function fotoReporte(Request $request): JsonResponse
    {
        $request->validate([
            'archivo'     => 'required|image|mimes:jpeg,jpg,png,webp|max:5120',
            'proyecto_id' => 'required|integer',
            'unidad_id'   => 'nullable|integer',
        ], [
            'archivo.image' => 'El archivo debe ser una imagen (JPEG, PNG, WEBP).',
            'archivo.max'   => 'La foto no puede superar los 5 MB.',
        ]);

        $file = $request->file('archivo');
        $ext  = strtolower($file->getClientOriginalExtension());
        $uuid = Str::uuid();

        $ym  = now()->format('Y-m');
        $pid = $request->integer('proyecto_id');
        $uid = $request->integer('unidad_id', 0);
        $dir = "reportes/{$pid}/{$uid}/{$ym}";

        // Original
        $nombreOrig = "{$uuid}.{$ext}";
        $pathOrig   = $file->storeAs($dir, $nombreOrig, 'public');

        // Thumbnail (300×300 crop) con GD
        $pathThumb = null;
        if (extension_loaded('gd')) {
            $nombreThumb = "{$uuid}_thumb.jpg";
            $pathThumb   = $dir . '/' . $nombreThumb;
            $absOrig     = Storage::disk('public')->path($pathOrig);
            $absThumb    = Storage::disk('public')->path($pathThumb);

            $src = match ($ext) {
                'png'  => @imagecreatefrompng($absOrig),
                'webp' => @imagecreatefromwebp($absOrig),
                default => @imagecreatefromjpeg($absOrig),
            };

            if ($src) {
                $srcW = imagesx($src);
                $srcH = imagesy($src);
                $side = min($srcW, $srcH);

                $thumb = imagecreatetruecolor(300, 300);
                imagecopyresampled(
                    $thumb, $src,
                    0, 0,
                    (int) (($srcW - $side) / 2),
                    (int) (($srcH - $side) / 2),
                    300, 300,
                    $side, $side
                );
                imagejpeg($thumb, $absThumb, 85);
                imagedestroy($src);
                imagedestroy($thumb);
            }
        }

        return response()->json([
            'status'        => 'success',
            'url_original'  => Storage::url($pathOrig),
            'url_thumbnail' => $pathThumb ? Storage::url($pathThumb) : null,
        ]);
    }
}
