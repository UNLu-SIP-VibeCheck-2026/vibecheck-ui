# VibeCheck UI

Frontend del sistema de venta de entradas VibeCheck, construido con Angular 19 y Angular Material.

## Stack Tecnológico

- **Angular 19** (Standalone Components)
- **Angular Material** (Componentes UI)
- **SCSS** (Estilos)
- **TypeScript** (Strict mode)

## Estructura del Proyecto

```
src/app/
├── components/          # Componentes standalone
│   ├── navbar/         # Barra de navegación
│   ├── login/          # Pantalla de inicio de sesión
│   └── register/       # Pantalla de registro
├── services/           # Servicios de negocio
│   └── auth.service.ts # Servicio de autenticación
├── models/             # Interfaces y tipos TypeScript
│   ├── user.model.ts
│   ├── login-request.model.ts
│   ├── register-request.model.ts
│   └── auth-response.model.ts
├── interceptors/       # Interceptores HTTP
│   └── jwt.interceptor.ts
├── guards/             # Guards de rutas
│   └── auth.guard.ts
├── app.component.ts   # Componente raíz
└── app.routes.ts       # Configuración de rutas
```

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200/`

## Build

```bash
npm run build
```

## Configuración de API

La URL de la API se configura en los archivos de entorno:

- `src/environments/environment.ts` (Producción)
- `src/environments/environment.development.ts` (Desarrollo)

Por defecto apunta a: `http://localhost:8081/api/v1`

## Características

- ✅ Standalone Components (sin NgModules)
- ✅ Angular Material para UI
- ✅ Autenticación con JWT
- ✅ Interceptor HTTP para headers Authorization
- ✅ Guards de rutas para protección
- ✅ Formularios reactivos
- ✅ TypeScript strict mode