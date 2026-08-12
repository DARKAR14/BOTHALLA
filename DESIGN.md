# Bothalla Design System

## Direction

Bothalla usa el lenguaje nativo de Discord como una ficha competitiva legible: una respuesta principal, métricas agrupadas y navegación progresiva. No intenta imitar una web dentro del chat ni llenar cada resultado de decoraciones.

La escena de uso es un canal de Discord compartido, normalmente oscuro y con mensajes alrededor. El diseño prioriza lectura rápida, controles familiares y respuestas que sigan teniendo sentido cuando faltan emojis o datos de la API.

## Surfaces

- **Perfil creado:** confirmación privada, verde de éxito y dos acciones inmediatas.
- **Stats:** resumen, leyendas, combate y clan como apartados mutuamente excluyentes.
- **Rank:** portada privada con perfil, clan, 1v1, totales, 2v2 y rotativo; vistas secundarias para equipos 2v2 y leyendas.
- **Clan:** resumen y lista paginada de miembros.
- **Selección:** menú desplegable cuando una búsqueda por nombre devuelve varias coincidencias.
- **Estados:** embeds específicos para error, ausencia de vinculación, búsqueda vacía y modo ranked sin datos.
- **Roles ranked:** confirmación privada con roles creados y ya existentes; sincronización privada con jugador, tier y Elo.

## Color

- Brand/action: `#4F7CFF`.
- Success: `#33C27F`.
- Warning/empty: `#F0A83B`.
- Error: `#E45B68`.
- Neutral: `#667085`.
- Ranked: Valhallan `#FF4F87`, Diamond `#55B8FF`, Platinum `#71D8C5`, Gold `#E4B34C`, Silver `#B9C1CF`, Bronze `#B77949`, Tin `#8D918F`.

El color refuerza el estado o tier, pero ningún significado depende solo de él: los títulos y etiquetas permanecen explícitos.

## Typography and hierarchy

Discord controla la tipografía. La jerarquía se construye con:

1. Título: jugador o clan + apartado actual.
2. Descripción: identidad, tier o explicación del estado.
3. Campos cortos en línea para métricas comparables.
4. Campos de ancho completo para listados y contexto.

La negrita se reserva para valores y nombres; los backticks para IDs o etiquetas técnicas. Los campos sin valor dicen “Sin datos” en vez de desaparecer silenciosamente.

## Components

- Botones con texto, nunca solo iconos o emojis.
- El apartado actual aparece deshabilitado y con estilo Primary.
- El resto usa Secondary para mantener una única acción visual dominante.
- La paginación ocupa una fila separada y deshabilita los límites.
- Los menús muestran nombre, ID, tier y modos suficientes para desambiguar.
- Cada panel queda ligado al Discord user ID que lo abrió.
- `/rank self` se responde de forma efímera. Su portada usa dos embeds: identidad y rendimiento principal primero; modos de equipo después; tres botones estables cierran el panel: Principal, Ranked 2v2 y Leyendas.
- `/rank roles` y `/role self` son efímeros para evitar ruido administrativo. Los errores de permisos y jerarquía explican exactamente qué debe cambiarse.

## Legend emojis

Los iconos son Application Emojis de Discord. El bot acepta tanto `legend_<nombre_normalizado>` como los nombres directos cargados en Developer Portal (`bodvar`, `Lord_Vraxx`, `red_raptor`, etc.); `nai`, `roland` y `onix` se resuelven como alias de Queen Nai, Sir Roland y Onyx. Mejoran el reconocimiento de leyendas, pero la UI conserva siempre el nombre textual. Si un emoji no existe, el resultado se renderiza sin huecos ni errores.

Formato recomendado: WebP o PNG transparente, 128 × 128 y máximo 256 KiB.

Los tiers ranked muestran `Banner_Rank_<tier>` junto al nombre textual. Las regiones usan `Flag_of_<país>` solo cuando el código de Brawlhalla tiene una correspondencia inequívoca; si no existe, se conserva el nombre de región sin inventar una bandera.

## Content principles

- Español directo, sin jerga técnica innecesaria.
- Las limitaciones de Brawlhalla v1.0 se explican en el punto donde afectan al usuario.
- Los estados vacíos indican qué pasó y qué apartado se puede probar.
- Los errores ofrecen recuperación; nunca muestran stack traces ni secretos.
- Los paneles de datos no muestran footers ni timestamps automáticos; la información útil permanece en el cuerpo del embed.

## Responsive behavior

Discord decide el ancho según cliente y dispositivo. Los embeds evitan tablas de texto dependientes de alineación; usan campos y líneas breves que se reorganizan correctamente en móvil. Cada página limita el número de leyendas, equipos o miembros para respetar los límites de embeds y la altura de pantalla.

## Accessibility

- Controles con etiquetas completas.
- Información duplicada en texto cuando existe color o emoji.
- Estados actuales indicados con botón deshabilitado, estilo y título.
- Sin caracteres Unicode usados como sustituto de una iconografía funcional.
- Las fechas propias de los datos, cuando existen, usan timestamps de Discord para respetar idioma y zona horaria del usuario; no se añade la hora de consulta al embed.

## Implementation map

- Tokens: `src/ui/colors.ts`.
- IDs y propiedad de componentes: `src/ui/custom-ids.ts`.
- Formato numérico, porcentajes, duración y fechas: `src/ui/format.ts`.
- Vistas: `src/ui/stats-presenter.ts`, `src/ui/rank-presenter.ts`, `src/ui/clan-presenter.ts`.
- Estados compartidos y selectores: `src/ui/common.ts`.
- Descubrimiento de comandos: `src/commands/loader.ts`; cada módulo vive en `src/commands/public` o `src/commands/private` y declara su nivel de acceso.
- Sincronización de roles: `src/services/ranked-roles.ts`.
