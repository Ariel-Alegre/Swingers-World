# Swingers World

Aplicación móvil Expo/React Native conectada con la API local incluida en `../server`.

Base tecnológica: Expo SDK 57, React Native 0.86 y React 19.2.

## Identidad

- Nombre: `Swingers World`
- Android package: `com.swingers.world`
- iOS bundle identifier: `com.swingers.world`
- Esquema de enlaces: `swingersworld://`

## Ejecutar localmente

1. Iniciar la API desde la carpeta `server`:

   ```bash
   npm install
   npm start
   ```

2. Instalar y ejecutar la app:

   ```bash
   npm install
   npm start
   ```

La configuración automática usa:

- Android Emulator: `http://10.0.2.2:3001`
- iOS Simulator y web: `http://localhost:3001`

Para usar un teléfono físico, copiar `.env.example` como `.env` y reemplazar la IP por la dirección local de la computadora:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3001
```

El teléfono y la computadora deben estar conectados a la misma red.

## Comprobaciones

```bash
npm run typecheck
npm run doctor
```

## Estructura

- `src/components`: componentes visuales reutilizables.
- `src/context`: sesión y usuario autenticado.
- `src/lib`: cliente HTTP y almacenamiento seguro.
- `src/navigation`: navegación pública y autenticada.
- `src/screens`: pantallas de acceso, perfiles, solicitudes, chat y cuenta.
- `src/theme`: colores y espaciado de la marca.
