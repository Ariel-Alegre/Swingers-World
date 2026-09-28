# Railway Bucket

El servidor utiliza un Railway Storage Bucket privado mediante la API compatible con S3.

## Configuración en Railway

1. Crear un Bucket en el mismo proyecto y ambiente que la API.
2. Abrir el servicio de la API y agregar referencias a las variables del Bucket:

   ```env
   BUCKET=${{Bucket.BUCKET}}
   ACCESS_KEY_ID=${{Bucket.ACCESS_KEY_ID}}
   SECRET_ACCESS_KEY=${{Bucket.SECRET_ACCESS_KEY}}
   REGION=${{Bucket.REGION}}
   ENDPOINT=${{Bucket.ENDPOINT}}
   AWS_S3_URL_STYLE=virtual
   ```

   Reemplazar `Bucket` por el nombre real del servicio en Railway.

3. Configurar la URL pública y un secreto independiente para enlaces de archivos:

   ```env
   PUBLIC_API_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
   MEDIA_URL_SECRET=un-secreto-largo-y-aleatorio
   ```

4. Volver a desplegar la API.

## Funcionamiento

- Las nuevas imágenes se guardan como referencias internas `railway://...`.
- El bucket permanece privado.
- Las respuestas JSON convierten esas referencias en enlaces firmados que expiran en 15 minutos.
- `/api/media/:token` valida la firma antes de transmitir el archivo desde el bucket.
- Las URLs antiguas de Cloudinary continúan mostrándose, pero las nuevas cargas ya no utilizan Cloudinary.

## Desarrollo local

Copiar `.env.example` como `.env` y completar las credenciales del ambiente de desarrollo. No usar las credenciales del bucket de producción durante desarrollo.
