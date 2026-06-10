<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MovimientoAlmacen extends Model
{
    use SoftDeletes;

    protected $table = 'movimientos_almacen';

    protected $fillable = [
        'codigo',
        'tipo',
        'estado',
        'almacen_origen_id',
        'almacen_destino_id',
        'proyecto_id',
        'beneficiario_id',
        'presupuesto_item_proyecto_id',
        'receptor_personal_id',
        'receptor_nombre',
        'receptor_ci',
        'proveedor_nombre',
        'proveedor_id',
        'numero_factura',
        'fecha_factura',
        'archivo_factura_url',
        'modalidad_entrega',
        'justificacion_sobre_consumo',
        'requiere_aprobacion',
        'aprobado_por_id',
        'aprobado_en',
        'monto_total',
        'notas',
        'metadata',
        'registrado_por_id',
        'anulado_por_id',
        'anulado_en',
        'motivo_anulacion',
        'fecha_movimiento',
    ];

    protected $casts = [
        'metadata'        => 'array',
        'requiere_aprobacion' => 'boolean',
        'fecha_factura'   => 'date',
        'aprobado_en'     => 'datetime',
        'anulado_en'      => 'datetime',
        'fecha_movimiento'=> 'datetime',
        'monto_total'     => 'decimal:4',
    ];

    // ─── Tipos agrupados ────────────────────────────────────────────────────────
    const TIPOS_ENTRADA  = ['entrada_compra', 'entrada_devolucion', 'entrada_transferencia', 'entrada_ajuste', 'inventario_inicial'];
    const TIPOS_SALIDA   = ['salida_social', 'salida_privado', 'salida_devolucion_proveedor', 'salida_ajuste'];
    const TIPOS_TRANSFER = ['transferencia_interna'];

    public function esEntrada(): bool
    {
        return in_array($this->tipo, self::TIPOS_ENTRADA);
    }

    public function esSalida(): bool
    {
        return in_array($this->tipo, self::TIPOS_SALIDA);
    }

    // ─── Relaciones ─────────────────────────────────────────────────────────────
    public function almacenOrigen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_origen_id');
    }

    public function almacenDestino(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_destino_id');
    }

    public function proyecto(): BelongsTo
    {
        return $this->belongsTo(Proyecto::class);
    }

    public function beneficiario(): BelongsTo
    {
        return $this->belongsTo(Beneficiario::class);
    }

    public function presupuestoItem(): BelongsTo
    {
        return $this->belongsTo(PresupuestoItemProyecto::class, 'presupuesto_item_proyecto_id');
    }

    public function receptorPersonal(): BelongsTo
    {
        return $this->belongsTo(Personal::class, 'receptor_personal_id');
    }

    public function registradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'registrado_por_id');
    }

    public function aprobadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprobado_por_id');
    }

    public function anuladoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'anulado_por_id');
    }

    public function proveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(DetalleMovimientoAlmacen::class, 'movimiento_almacen_id');
    }

    public function evidencias(): HasMany
    {
        return $this->hasMany(EvidenciaMovimiento::class, 'movimiento_almacen_id');
    }

    public function movimientosKardex(): HasMany
    {
        return $this->hasMany(MovimientoMaterial::class, 'movimiento_almacen_id');
    }

    // ─── Generador de código ─────────────────────────────────────────────────────
    public static function generarCodigo(string $tipo): string
    {
        $prefijos = [
            'entrada_compra'            => 'EC',
            'entrada_devolucion'        => 'ED',
            'entrada_transferencia'     => 'ET',
            'entrada_ajuste'            => 'EA',
            'salida_social'             => 'SS',
            'salida_privado'            => 'SP',
            'salida_devolucion_proveedor' => 'DP',
            'salida_ajuste'             => 'SA',
            'transferencia_interna'     => 'TI',
            'inventario_inicial'        => 'II',
        ];
        $prefijo  = $prefijos[$tipo] ?? 'MV';
        $año      = date('Y');
        $ultimo   = static::where('codigo', 'like', "{$prefijo}-{$año}-%")
                          ->lockForUpdate()
                          ->count();
        return sprintf('%s-%s-%04d', $prefijo, $año, $ultimo + 1);
    }
}
