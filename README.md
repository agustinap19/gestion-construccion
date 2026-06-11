# CA & KANAGF — Sistema de Gestión de Construcción

Sistema web para gestión de proyectos de construcción desarrollado para CA & KANAGF S.R.L.

## Arquitectura
       INTERNET
           │
┌──────────▼──────────┐
│      FRONTEND        │
│    React 19 + Vite   │
│   NGINX puerto 80    │
│  constructora-       │
│  cakanagf.lat        │
└──────────┬──────────┘
           │ HTTPS /api/*
┌──────────▼──────────┐
│      BACKEND         │
│    Laravel 12        │
│  PHP-FPM + NGINX     │
│  api.constructora-   │
│  cakanagf.lat        │
└──────────┬──────────┘
           │ MySQL interno
┌──────────▼──────────┐
│      DATABASE        │
│     MySQL 8.0        │
│  red interna Docker  │
└─────────────────────┘

## URLs de producción

- Frontend: https://constructora-cakanagf.lat
- API: https://api.constructora-cakanagf.lat

## Requisitos para entorno local

- Docker Desktop
- Docker Compose v2

## Levantar en local

```bash
git clone https://github.com/agustinap19/gestion-construccion.git
cd gestion-construccion
cp .env.example .env
# Completar APP_KEY, DB_PASSWORD y credenciales de mail en .env
docker compose up --build
```

Frontend disponible en: http://localhost:3000
Backend API en: http://localhost:8000/api

## Usuarios de prueba

| Rol | Email | Contraseña | Secreto TOTP |
|-----|-------|------------|--------------|
| Administrador | admin@prueba.com | Admin123! | JBSWY3DPEHPK3PXP |
| Usuario regular | user@prueba.com | User123! | KNRW24TMMJQXEZLJ |

Configurar en Google Authenticator, Authy o FreeOTP ingresando el secreto manualmente.

## Versiones

| Tag | Estado | Descripción |
|-----|--------|-------------|
| v1.2.0 | ✅ Producción | TOTP + dispositivo confiable + Docker + deploy VPS |
| v1.1.0 | ✅ Estable | Autenticación en dos pasos |
| v1.0.0 | ✅ Estable | JWT + autenticación base |

```bash
git checkout v1.2.0
docker compose up --build
```

## Checklist de funcionalidades

- [x] Registro de usuario
- [x] Login con email y contraseña
- [x] Verificación TOTP con Google Authenticator
- [x] Checkbox "Confiar en este dispositivo" (30 días)
- [x] Rutas protegidas con JWT
- [x] Roles: super_admin, gerente, administrador_proyecto, técnico, almacén
- [x] Gestión de proyectos, contratos y beneficiarios
- [x] Módulo de almacenes con trazabilidad
- [x] Reportes exportables en PDF y Excel
- [x] Cierre de sesión
- [x] Deploy en VPS con HTTPS y dominio propio

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19, Vite 7, Tailwind CSS 4 |
| Backend | Laravel 12, PHP 8.4 |
| Base de datos | MySQL 8.0 |
| Autenticación | JWT + TOTP (2FA) |
| Contenedores | Docker + Docker Compose |
| Deploy | VPS Hostinger KVM 2, Ubuntu 24.04 |
| Dominio | constructora-cakanagf.lat |
