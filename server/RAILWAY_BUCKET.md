# Railway Bucket

The server uses a private Railway Storage Bucket through its S3-compatible API.

## Railway configuration

1. Create a Bucket in the same Railway project and environment as the API.
2. Open the API service and add references to the Bucket variables:

   ```env
   BUCKET=${{Bucket.BUCKET}}
   ACCESS_KEY_ID=${{Bucket.ACCESS_KEY_ID}}
   SECRET_ACCESS_KEY=${{Bucket.SECRET_ACCESS_KEY}}
   REGION=${{Bucket.REGION}}
   ENDPOINT=${{Bucket.ENDPOINT}}
   AWS_S3_URL_STYLE=virtual
   ```

   Replace `Bucket` with the actual Railway service name.

3. Configure the public API URL and an independent secret for file links:

   ```env
   PUBLIC_API_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
   MEDIA_URL_SECRET=a-long-random-secret
   ADMIN_REGISTRATION_SECRET=another-long-random-secret
   ```

4. Redeploy the API.

The administrator registration endpoint requires the `x-admin-registration-secret` header to match `ADMIN_REGISTRATION_SECRET`.

If Railway already contains the legacy Spanish schema, run `npm run db:migrate:english` once before starting the new server version.

## How it works

- New images are stored as internal `railway://...` references.
- The bucket remains private.
- JSON responses convert those references into signed links that expire after 15 minutes.
- `/api/media/:token` validates the signature before streaming the file from the bucket.
- Existing Cloudinary URLs remain readable, but new uploads no longer use Cloudinary.

## Local development

Copy `.env.example` to `.env` and provide development credentials. Do not use production bucket credentials during local development.
