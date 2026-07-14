# Invitación de boda — Viridiana & Felipe

Sitio estático (HTML/CSS/JS puro) + 3 funciones serverless de Vercel para el RSVP y el panel de admin. Sin frameworks.

## Estructura

```
index.html          página principal
admin/index.html     panel privado de confirmaciones (solo tú)
css/styles.css       estilos (todo el sitio, incluido admin)
js/main.js           countdown, RSVP, menú móvil, animaciones
js/admin.js          login + tabla de confirmaciones del admin
api/rsvp.js          POST guarda una confirmación · GET lista (protegido)
api/admin-login.js   POST valida contraseña y crea la sesión
api/admin-logout.js  POST cierra la sesión
api/_lib/auth.js      helper de cookie de sesión firmada
assets/images/        tus fotos (ver README dentro de esa carpeta)
schema.sql            tabla de la base de datos
```

## 1. Crear la base de datos (Vercel Postgres)

1. En el dashboard de Vercel, entra a tu proyecto → pestaña **Storage** → **Create Database** → **Postgres**.
2. Conéctala al proyecto (esto agrega automáticamente las variables `POSTGRES_URL`, etc. — no hay que copiarlas a mano).
3. Abre el **Query** de esa base y pega el contenido de [`schema.sql`](schema.sql) para crear la tabla. Solo se hace una vez.

## 2. Variables de entorno

En el dashboard del proyecto → **Settings → Environment Variables**, agrega:

| Variable | Valor |
|---|---|
| `ADMIN_PASSWORD` | La contraseña que usarás para entrar a `/admin` |
| `SESSION_SECRET` | Cualquier cadena larga y aleatoria (ej. generada con `openssl rand -hex 32`) |

## 3. Tus fotos

Sigue las instrucciones de [`assets/images/README.md`](assets/images/README.md). Mientras no pongas las fotos, el sitio muestra un marcador de posición para que sepas exactamente qué falta.

## 4. Editar el contenido

Todo el texto (nombres, fecha, lugar, historia) está directamente en `index.html`, listo para editar:

- **Fecha de la boda / countdown**: atributo `data-wedding-date` en la sección `<section class="hero" id="inicio" ...>` de `index.html`. Formato `AAAA-MM-DDTHH:MM:SS`.
- **Horarios del día**: texto plano dentro de la sección `#itinerario` (cada `<li class="timeline-item">`).
- **Lugares, direcciones y links de "Ver mapa"**: sección `#ubicaciones` (una tarjeta por venue — ceremonia y recepción).
- **Padrinos**: sección `#padrinos`, edita el nombre en cada tarjeta.
- **Datos bancarios / lluvia de sobres**: sección `#regalos`.
- **Link del playlist colaborativo**: atributo `href` del botón "Abrir playlist" en `#canciones` (reemplaza `TU-PLAYLIST-AQUI`).
- **Hashtag**: texto dentro de `.hashtag-callout` en `#galeria`.
- **Contactos / WhatsApp**: sección `#contactos` (cambia el número en cada link `https://wa.me/...`).
- **Fecha límite de RSVP**: texto plano dentro de `#rsvp`.

## 5. Desarrollo local

```bash
npm install
npm run dev   # corre `vercel dev`, sirve el sitio + las funciones /api localmente
```

(Requiere tener la [Vercel CLI](https://vercel.com/docs/cli) instalada y el proyecto enlazado con `vercel link`.)

## 6. Deploy

```bash
vercel        # preview
vercel --prod # producción
```

O simplemente conecta el repositorio de git a un proyecto de Vercel y cada push despliega automáticamente.

## El panel de admin

Ruta: `/admin`. Pide la contraseña (`ADMIN_PASSWORD`); una vez dentro, muestra un resumen (respuestas, invitados confirmados, quiénes no asisten) y la tabla completa de confirmaciones. El botón **Salir** cierra la sesión. Nadie puede ver esos datos sin la contraseña, ya que la API que los entrega (`GET /api/rsvp`) exige la cookie de sesión.
