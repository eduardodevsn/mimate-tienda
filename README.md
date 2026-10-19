# Mimate.py – Tienda online

Tienda con catálogo, pedido por WhatsApp y panel de administración protegido con contraseña. Las fotos y el catálogo se guardan en Vercel Blob.

- Tienda pública: `/`
- Panel de administración (solo Angie): `/admin`

## Publicar en Vercel

1. Subí esta carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project** → importá el repositorio → **Deploy**.
3. En el proyecto, andá a **Storage → Create Database → Blob**. Elegí acceso **Public** y conectalo al proyecto (esto agrega solo la variable `BLOB_READ_WRITE_TOKEN`).
4. En **Settings → Environment Variables** creá `ADMIN_PASSWORD` con una contraseña larga (la que va a usar Angie para entrar a `/admin`).
5. En **Deployments**, hacé **Redeploy** para que tome las variables.
6. Entrá a `tudominio.vercel.app/admin`, ingresá la contraseña y cargá los productos.

## Uso del panel

- **Subir producto**: nombre, precio, categoría, descripción, talles y hasta 4 fotos.
- **Marcar agotado**, **Editar** y **Borrar** desde la lista.
- **Ajustes**: número de WhatsApp para pedidos, redes y textos de entrega y pago.
- Los cambios se ven en la tienda en menos de un minuto.

## Probar en tu computadora

```
npm install
npm run dev
```

Tienda en `http://localhost:3000`, panel en `http://localhost:3000/admin` con contraseña `dev`. Localmente los datos se guardan en la carpeta `.data`.

## Notas

- Los pedidos llegan al WhatsApp configurado en Ajustes (por defecto +595 971 280 309).
- Si cambiás la contraseña en Vercel, hacé Redeploy y se cierran las sesiones abiertas.
- No subas `.env` ni `.data` al repositorio (ya están en `.gitignore`).
