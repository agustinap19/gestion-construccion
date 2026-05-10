<?php

namespace App\Mail;

use App\Models\Rol;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RolCambiadoMail extends Mailable
{
    use Queueable, SerializesModels;

    public $usuario;
    public $rolAnterior;
    public $rolNuevo;
    public $razon;
    public $actor;

    public function __construct(User $usuario, Rol $rolAnterior, Rol $rolNuevo, ?string $razon, ?User $actor)
    {
        $this->usuario = $usuario;
        $this->rolAnterior = $rolAnterior;
        $this->rolNuevo = $rolNuevo;
        $this->razon = $razon;
        $this->actor = $actor;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tu rol en el sistema ha sido modificado',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.rol-cambiado');
    }

    public function attachments(): array { return []; }
}
