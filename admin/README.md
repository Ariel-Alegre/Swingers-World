# Swingers World Admin

Panel privado para consultar usuarios registrados y su estado de suscripción.

## Ejecutar localmente

```bash
cd admin
npm install
npm run dev
```

Abrir `http://localhost:3000`. El archivo `.env.local` configura `ADMIN_API_URL` con la URL del servidor de producción. Si se usa otro servidor, cambiar ese valor y reiniciar Next.js.

El acceso usa `ADMIN_LOGIN_EMAIL` y `ADMIN_LOGIN_PASSWORD` de `server/.env`. Para cambiar las credenciales, editá esas dos variables y reiniciá el servidor. El token se guarda en una cookie HTTP-only del panel y vence en 24 horas. Cambiar la contraseña invalida las sesiones anteriores. No hay creación de administradores desde la interfaz.

El panel separa **Usuarios de la app** de **Creados desde el panel**. La primera vista muestra los registros propios, con filtros para prueba, plan activo y sin suscripción; la segunda muestra las cuentas creadas por el administrador, incluidos los accesos vitalicios. La tabla consulta `/api/admin/users` desde el servidor Next.js y envía al navegador únicamente nombre, correo, fecha de registro, origen, plan y estado de suscripción. La prueba de 7 días se muestra solo cuando el webhook de RevenueCat registra `subscriptionStatus: trialing`; registrarse no inicia por sí solo la prueba. Los planes pagados se muestran cuando el backend marca la suscripción como `active`.

La sección **Registrar usuario** exige elegir un perfil individual o de pareja. Para un perfil individual se indica el género; para una pareja se indican el nombre y apellido de la otra persona y la composición de la pareja. Crea una cuenta con `plan: lifetime` y `subscriptionStatus: lifetime`. Se ingresa una contraseña inicial (mínimo 12 caracteres); no se envían correos ni se exige confirmación de email. El administrador debe confirmar que la persona, o ambas personas en una pareja, son mayores de 18 años y aceptaron los términos. La app reconoce este estado y permite entrar sin pasar por RevenueCat. El panel muestra estos usuarios como **Acceso vitalicio** y muestra su tipo de perfil en la tabla.

Para un despliegue independiente de la carpeta `admin`, configurar también `ADMIN_API_URL` en el proveedor de hosting. Si el panel apunta al backend de Railway, `ADMIN_LOGIN_EMAIL` y `ADMIN_LOGIN_PASSWORD` deben configurarse también en las variables de ese servicio y hay que desplegar el backend actualizado: el archivo local `server/.env` no modifica Railway. El acceso vitalicio también requiere publicar una versión nueva de la app móvil para que omita el paywall. El servidor backend debe estar disponible y recibir los webhooks de RevenueCat.
