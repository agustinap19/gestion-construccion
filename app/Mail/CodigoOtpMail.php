<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CodigoOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $codigo;
    public string $nombreDispositivo;
    public string $ip;

    /**
     * Create a new message instance.
     */
    public function __construct(string $codigo, string $nombreDispositivo, string $ip)
    {
        $this->codigo = $codigo;
        $this->nombreDispositivo = $nombreDispositivo;
        $this->ip = $ip;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Código de verificación - Nuevo Dispositivo',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.codigo-otp',
            with: [
                'codigo' => $this->codigo,
                'nombreDispositivo' => $this->nombreDispositivo,
                'ip' => $this->ip,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
