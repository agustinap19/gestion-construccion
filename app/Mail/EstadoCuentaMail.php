<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EstadoCuentaMail extends Mailable
{
    use Queueable, SerializesModels;

    public $usuario;
    public $estadoAnterior;
    public $estadoNuevo;
    public $razon;

    public function __construct(User $usuario, string $estadoAnterior, string $estadoNuevo, ?string $razon)
    {
        $this->usuario = $usuario;
        $this->estadoAnterior = $estadoAnterior;
        $this->estadoNuevo = $estadoNuevo;
        $this->razon = $razon;
    }

    public function envelope(): Envelope
    {
        $subjects = [
            'suspendido' => 'Tu cuenta ha sido suspendida',
            'activo' => 'Tu cuenta ha sido reactivada',
            'inactivo' => 'Tu cuenta ha sido desactivada',
        ];

        return new Envelope(
            subject: $subjects[$this->estadoNuevo] ?? 'Estado de tu cuenta actualizado',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.estado-cuenta');
    }

    public function attachments(): array { return []; }
}
