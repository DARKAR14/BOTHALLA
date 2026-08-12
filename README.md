# Bothalla

Bot de Discord en TypeScript que consulta exclusivamente la [Brawlhalla Developer API v1.0](https://dev.brawlhalla.com/) y presenta estadísticas, ranked y clanes mediante embeds, botones y menús.

## Comandos

| Comando | Función |
|---|---|
| `/create brawlhalla_id` | Vincula o actualiza tu Brawlhalla ID. |
| `/stats id` | Estadísticas mediante un Brawlhalla ID. |
| `/stats mention` | Estadísticas de un usuario de Discord vinculado. |
| `/stats self` | Tus estadísticas vinculadas. |
| `/stats username` | Busca el nombre en los leaderboards ranked. |
| `/rank id` | Ranked mediante un Brawlhalla ID. |
| `/rank mention` | Ranked de un usuario de Discord vinculado. |
| `/rank self` | Abre en privado tu panel ranked vinculado. |
| `/rank username` | Busca el nombre en los leaderboards ranked. |
| `/rank roles` | Crea o corrige Tin, Bronze, Silver, Gold, Platinum, Diamond y Valhallan con su color y orden debajo del bot. Solo desarrollador o administrador. |
| `/role self` | Sincroniza tu rol de Discord con tu tier ranked 1v1 vinculado. |
| `/clan id` | Clan mediante su ID. |
| `/clan mention` | Clan de un usuario de Discord vinculado. |
| `/clan self` | Clan de tu cuenta vinculada. |
| `/clan name` | Busca entre los clanes vistos durante el proceso actual. |

Los paneles de estadísticas permiten cambiar entre resumen, leyendas, combate y clan. `/rank` ofrece una portada con 1v1, totales, 2v2 y rotativo, además de vistas para equipos 2v2 y leyendas. Los tiers usan los Application Emojis `Banner_Rank_*` y las regiones muestran `Flag_of_*` cuando existe una correspondencia correcta. Solo la persona que abrió el panel puede controlarlo.

### Límites reales de Brawlhalla v1.0

- No necesita API key y el límite publicado es 2.000 solicitudes cada cinco minutos.
- Steam ID Search no está disponible en v1.0.
- Player Stats necesita un Brawlhalla ID. La búsqueda por username de este bot usa el parámetro `search` del leaderboard, por lo que solo encuentra jugadores indexados en ranked.
- Guild Stats necesita un Guild ID. No existe búsqueda global por nombre; `/clan name` usa un índice temporal de los clanes consultados desde que arrancó el bot.
- MongoDB solo guarda `{ discordUserId, brawlhallaId }`. Las estadísticas no se persisten.

Referencias: [inicio y límites](https://dev.brawlhalla.com/), [upgrade v1.0](https://dev.brawlhalla.com/reference/upgrade/), [errores](https://dev.brawlhalla.com/reference/errors/).

## Requisitos

- Node.js 22 o posterior.
- Una aplicación con bot en el [Discord Developer Portal](https://discord.com/developers/applications).
- MongoDB Atlas o cualquier MongoDB accesible desde Discloud.

No requiere intents privilegiados. El único intent habilitado es `Guilds`.
Instala la aplicación con los scopes `bot` y `applications.commands`. Para `/rank roles` y `/role self`, el rol del bot necesita **Administrar roles** y debe estar por encima de los siete roles ranked en la jerarquía del servidor.

## Configuración local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` como `.env` y completa:

   ```dotenv
   DISCORD_TOKEN=token_del_bot
   DEVELOPER_IDS=tu_discord_user_id,otro_id_opcional
   MONGODB_URI=mongodb+srv://...
   MONGODB_DATABASE=bothalla
   ```

   No necesitas copiar el Application ID ni IDs de servidores. Después de autenticarse con `DISCORD_TOKEN`, el cliente obtiene automáticamente la aplicación y sincroniza sus comandos globales.

3. Arranca el bot:

   ```bash
   npm run dev
   ```

   Al iniciar, Bothalla escanea recursivamente `src/commands/public` y `src/commands/private`, muestra en el log cuántos módulos públicos y privados encontró y sincroniza una única copia global. También elimina automáticamente las copias antiguas por servidor para evitar que Discord muestre cada comando dos veces. No requiere IDs manuales ni reiniciar el cliente de Discord.

   Discord inicia y registra los comandos aunque MongoDB esté temporalmente inaccesible. La conexión a Mongo se reintenta en segundo plano cada 15–60 segundos; durante ese tiempo solo fallarán con un mensaje los comandos que necesitan perfiles vinculados.

   Los módulos de `commands/private` solo pueden ejecutarlos los IDs separados por comas en `DEVELOPER_IDS`. `/rank roles` es un caso mixto dentro de un comando público: lo puede ejecutar un desarrollador configurado o alguien con permiso **Administrador** en ese servidor.

   `npm run dev` usa Nodemon para reiniciar el proceso cuando cambia un archivo TypeScript o JSON. `npm run deploy:commands` sigue disponible para una sincronización global manual y también obtiene la aplicación desde el token.

   El cliente de Brawlhalla combina caché acotada, deduplicación de consultas simultáneas, máximo cuatro conexiones externas concurrentes y una cola global limitada. Las salidas se espacian para mantenerse por debajo del límite publicado de 2.000 llamadas cada cinco minutos. Discord además limita ráfagas por usuario a cinco interacciones cada diez segundos.

4. Verifica el proyecto:

   ```bash
   npm test
   npm run typecheck
   npm run build
   ```

## Emojis disponibles en cualquier servidor

Conviene usar **Application Emojis**, no emojis de un servidor. Discord permite hasta 2.000 emojis propiedad de la aplicación; solo el bot puede utilizarlos, funcionan donde esté instalada la app y no necesitan el permiso `USE_EXTERNAL_EMOJIS`.

Tienes dos formas de cargarlos:

### Desde Discord Developer Portal

1. Abre [Developer Portal](https://discord.com/developers/applications).
2. Entra a la aplicación de Bothalla.
3. Abre la sección **Emojis** de la configuración de la aplicación.
4. Sube una imagen 128 × 128, de máximo 256 KiB, por leyenda.
5. Puedes usar `legend_hattori`, `legend_ada`, etc., o el nombre directo de la leyenda como `hattori`, `Lord_Vraxx` y `red_raptor`. Bothalla normaliza mayúsculas, espacios y acentos. También reconoce `nai`, `roland` y `onix` para Queen Nai, Sir Roland y Onyx.
6. Reinicia el bot para que vuelva a cargar el catálogo.

### Con el script incluido

1. Coloca las imágenes en `assets/emojis/legends/` siguiendo su [guía](assets/emojis/legends/README.md).
2. Asegúrate de tener `DISCORD_TOKEN` en `.env`.
3. Ejecuta:

   ```bash
   npm run emojis:upload
   ```

El script omite nombres ya existentes y rechaza archivos mayores de 256 KiB. Consulta la [documentación oficial de Application Emojis](https://docs.discord.com/developers/resources/emoji).

## Despliegue en Discloud

El proyecto ya incluye `discloud.config` y compila TypeScript localmente en `build/`. Se evita `dist/` porque Discloud la reserva para su proceso interno. Con un plan de 100 MB no conviene compilar TypeScript en el servidor: el ZIP debe llevar `build/` ya generado.

1. Ejecuta las pruebas y genera el build:

   ```bash
   npm test
   npm run build
   ```

2. En **Environment Variables** del panel de Discloud configura el token de Discord, MongoDB URI y las demás variables de `.env.example`. No necesitas Client ID ni Guild ID.
3. Comprime `build/`, `package.json`, `package-lock.json` y `discloud.config` en la raíz del ZIP. No incluyas `.env`, `node_modules`, `src/` ni los tests.
4. En el servidor de Discloud usa `.upconfig` y adjunta el ZIP, o súbelo desde Dashboard/CLI.

La configuración usa los 100 MB disponibles en el plan básico y `VERSION=latest`. El inicio ejecuta Node directamente con un heap máximo de 64 MB para no mantener un proceso adicional de npm consumiendo la RAM limitada. El build se genera localmente, una modalidad contemplada en la [guía oficial para bots TypeScript](https://docs.discloud.com/en/how-to-host/bots).

En cada reinicio de Discloud, el bot vuelve a descubrir recursivamente los módulos `build/commands/public` y `build/commands/private` y sincroniza el conjunto actual con Discord.

El archivo `.env` queda reservado para desarrollo local. En producción, el bot lee directamente las variables del entorno de Discloud mediante `process.env`.

La URL de la API se lee desde `BRAWLHALLA_API_URL`; usa `https://api.brawlhalla.com/v1`. El dominio `dev.brawlhalla.com` contiene la documentación, no el servicio JSON.

### Render

El archivo `render.yaml` despliega el bot como Web Service gratuito en Virginia. Configura en Render los secretos `DISCORD_TOKEN`, `MONGODB_URI` y, si corresponde, `DEVELOPER_IDS`; el resto ya tiene valores definidos en el Blueprint.

El proceso escucha en `0.0.0.0:$PORT` y expone `GET /healt`, que responde `200` sin consultar Discord, MongoDB ni Brawlhalla. Configura `HEALTHCHECK_URL=https://TU-SERVICIO.onrender.com/healt`; el propio bot consultará esa URL cada 13 minutos, comenzando 13 minutos después del arranque.

Render apaga los Web Services gratuitos después de 15 minutos sin tráfico entrante. Su health check interno comprueba disponibilidad, pero para mantenerlo despierto necesitas el monitor externo de 13 minutos.

## Estructura

```text
src/
  brawlhalla/       Cliente v1.0, tipos, caché y errores
  commands/
    public/         Comandos disponibles para todos
    private/        Comandos exclusivos de DEVELOPER_IDS
    loader.ts       Descubrimiento recursivo y validación de acceso
  database/         Única colección MongoDB: profiles
  scripts/          Registro de comandos y carga de emojis
  services/         Catálogos, resolución e índice temporal
  ui/               Embeds, botones, menús y paginación
```

## Agregar un comando nuevo

No hay que modificar un arreglo central ni el controlador. Crea un archivo como `src/commands/public/legend.command.ts`:

```ts
import { SlashCommandBuilder } from "discord.js";
import type { BotCommand } from "../types.js";

const command: BotCommand = {
  access: "public",
  data: new SlashCommandBuilder()
    .setName("legend")
    .setDescription("Muestra información de una leyenda"),

  async execute(interaction, context) {
    await interaction.reply("Nuevo comando listo.");
  },
};

export default command;
```

El nombre debe terminar en `.command.ts` y el módulo debe exportar por defecto `{ access, data, execute }`. Usa `access: "public"` dentro de `commands/public` o `access: "developer"` dentro de `commands/private`; el cargador rechaza cualquier combinación incoherente. Tras reiniciar el bot:

1. El cargador descubre el archivo.
2. Valida que no tenga un nombre duplicado.
3. Lo añade al enrutador en memoria.
4. Sincroniza automáticamente la lista completa con Discord.
