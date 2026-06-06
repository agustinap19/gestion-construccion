<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CodigoReaperturaMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $codigo,
        public string $nombreProyecto,
        public string $solicitante,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Código de reapertura de registros - ' . $this->nombreProyecto,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.codigo-reapertura',
            with: [
                'codigo'          => $this->codigo,
                'nombreProyecto'  => $this->nombreProyecto,
                'solicitante'     => $this->solicitante,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
