# Invitación de boda — Viridiana & Felipe

Sitio estático (HTML/CSS/JS puro) + funciones serverless de Vercel para el RSVP, la lista de invitados y el panel de admin. Sin frameworks.

## Estructura

```
index.html          página principal (sobre + landing + superposición de RSVP)
rsvp.html            página aparte con el formulario (respaldo si entran directo ahí)
admin/index.html     panel privado: confirmaciones + invitados (solo tú)
css/styles.css       estilos (todo el sitio, incluido admin)
js/main.js           sobre/carta, countdown, menú, superposición de RSVP, animaciones
js/rsvp.js           lógica del formulario (busca la invitación por ?invite=, envía, valida)
js/admin.js          login + tablas de confirmaciones e invitados
api/rsvp.js          POST guarda/actualiza una confirmación · GET lista cruda (protegido)
api/guest.js         GET público: busca una invitación por su código
api/guests.js        GET protegido: lista completa de invitados con su estado
api/admin-login.js   POST valida contraseña y crea la sesión
api/admin-logout.js  POST cierra la sesión
api/_lib/auth.js      helper de cookie de sesión firmada
assets/images/        tus fotos (ver README dentro de esa carpeta)
schema.sql            estructura de la base de datos (invitados + confirmaciones)
```

## 1. Crear la base de datos (Vercel Postgres)

1. En el dashboard de Vercel, entra a tu proyecto → pestaña **Storage** → **Create Database** → **Postgres**.
2. Conéctala al proyecto (esto agrega automáticamente las variables `POSTGRES_URL`, etc. — no hay que copiarlas a mano).
3. Abre el **Query** de esa base y pega el contenido de [`schema.sql`](schema.sql) para crear las tablas. Solo se hace una vez (es seguro volver a correrlo si algo cambia, no borra datos).

## 2. Variables de entorno

En el dashboard del proyecto → **Settings → Environment Variables**, agrega:

| Variable | Valor |
|---|---|
| `ADMIN_PASSWORD` | La contraseña que usarás para entrar a `/admin` |
| `SESSION_SECRET` | Cualquier cadena larga y aleatoria (ej. generada con `openssl rand -hex 32`) |

## 3. Tus fotos y música

- Fotos: sigue las instrucciones de [`assets/images/README.md`](assets/images/README.md). Mientras no las pongas, el sitio muestra un marcador de posición para que sepas exactamente qué falta.
- Música de fondo: sigue [`assets/audio/README.md`](assets/audio/README.md). Empieza a sonar automáticamente al abrir el sobre (el clic en el sello cuenta como la interacción que los navegadores exigen para permitir el audio); hay un botón flotante para pausarla.

## 4. Tu lista de invitados y sus links personalizados

Cada invitación (una familia, una pareja, una persona) es una fila en la tabla `guests`, con un **código único** y un **número de boletos asignados**. Ese código es lo que va en el link que le mandas a cada quien:

```
https://tusitio.com/?invite=PEREZ2026
https://tusitio.com/rsvp.html?invite=PEREZ2026   (funciona igual)
```

Al abrir ese link, el formulario de RSVP ya sabe quién es y solo lo deja confirmar hasta el número de boletos que le asignaste — no puede escribir "5 personas" si solo le diste 2.

**Cómo cargar tu lista**: abre el **Query** de tu base en el dashboard de Vercel y corre un `INSERT` como el que está de ejemplo al final de [`schema.sql`](schema.sql):

```sql
INSERT INTO guests (invite_code, display_name, guest_group, allowed_guests, phone) VALUES
  ('PEREZ2026',  'Familia Pérez García', 'Familia', 4, '+502 5555 0001'),
  ('LOPEZ2026',  'Ana López',            'Amigos',  2, '+502 5555 0002');
```

- `invite_code`: el que tú inventes, único por fila (sin espacios ni acentos — apellido + año es un patrón fácil).
- `display_name`: cómo se le va a saludar en el formulario ("Familia Pérez García", "Juan y María", etc.).
- `guest_group`: opcional, solo para que TÚ organices tu lista (no se le muestra a nadie).
- `allowed_guests`: sus boletos asignados.
- `phone`: opcional, por si luego quieres exportar y mandar los links por WhatsApp a mano.

Después, en `/admin` → pestaña **Invitados**, vas a ver cada uno con su estado (pendiente / confirmado / no asiste), sus boletos usados, y un botón **"Copiar link"** con su URL personalizada lista para pegar y enviar.

Si alguien confirma **sin** pasar por un link personalizado (por ejemplo, entra a `rsvp.html` directo sin `?invite=`), su respuesta igual se guarda — solo que no queda ligada a ninguna invitación de tu lista y no tiene límite de boletos (queda en la pestaña **Confirmaciones** del admin, no en **Invitados**).

## 5. Editar el contenido

Todo el texto (nombres, fecha, lugar, historia) está directamente en `index.html`, listo para editar:

- **Fecha de la boda / countdown**: atributo `data-wedding-date` en la sección `<section class="hero" id="inicio" ...>` de `index.html`. Formato `AAAA-MM-DDTHH:MM:SS`.
- **Horarios del día**: texto plano dentro de la sección `#itinerario` (cada `<li class="timeline-item">`).
- **Lugares, direcciones y links de "Ver mapa"**: sección `#ubicaciones` (una tarjeta por venue — ceremonia y recepción).
- **Padrinos**: sección `#padrinos`, edita el nombre en cada tarjeta.
- **Datos bancarios / lluvia de sobres**: sección `#regalos`.
- **Link del playlist colaborativo**: atributo `href` del botón "Abrir playlist" en `#canciones` (reemplaza `TU-PLAYLIST-AQUI`).
- **Hashtag**: texto dentro de `.hashtag-callout` en `#galeria`.
- **Contactos / WhatsApp**: sección `#contactos` (cambia el número en cada link `https://wa.me/...`).
- **Fecha límite de RSVP**: texto plano en la sección `#confirmar` de `index.html` y en `rsvp.html`.

## 6. Desarrollo local

```bash
npm install
npm run dev   # corre `vercel dev`, sirve el sitio + las funciones /api localmente
```

(Requiere tener la [Vercel CLI](https://vercel.com/docs/cli) instalada y el proyecto enlazado con `vercel link`.)

## 7. Deploy

```bash
vercel        # preview
vercel --prod # producción
```

O simplemente conecta el repositorio de git a un proyecto de Vercel y cada push despliega automáticamente.

## El panel de admin

Ruta: `/admin`. Pide la contraseña (`ADMIN_PASSWORD`); una vez dentro hay dos pestañas:

- **Confirmaciones**: todas las respuestas del formulario tal cual llegaron (con o sin invitación ligada).
- **Invitados**: tu lista precargada (ver sección 4), con boletos asignados vs. confirmados, estado de cada uno, y el link personalizado listo para copiar.

El botón **Salir** cierra la sesión. Nadie puede ver esos datos sin la contraseña, ya que las funciones que los entregan (`GET /api/rsvp` y `GET /api/guests`) exigen la cookie de sesión.
