# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmado por el usuario: TypeScript, discord.js y MongoDB. Despliegue en Discloud sin Docker.

## Users

Jugadores hispanohablantes de Brawlhalla que usan Discord y quieren consultar estadísticas, clasificación y clanes sin abandonar su servidor.

## Product Purpose

Bothalla enlaza una cuenta de Discord con un Brawlhalla ID y convierte los datos de la API oficial v1.0 en respuestas navegables con embeds, botones y menús nativos de Discord.

## Positioning

Una consulta enlazada una sola vez permite usar comandos `self` y `mention`; los resultados de Brawlhalla se organizan por apartados navegables y muestran emojis de aplicación para leyendas, tiers ranked y regiones compatibles.

## Operating Context

El usuario instala la aplicación en un servidor de Discord, vincula su Brawlhalla ID con `/create` y consulta perfiles propios o de otros miembros mediante comandos slash. El bot se ejecuta continuamente en Discloud y usa MongoDB externo.

## Capabilities and Constraints

- Usa exclusivamente la Brawlhalla Developer API v1.0.
- La API v1.0 no requiere API key y tiene un límite publicado de 2.000 solicitudes cada cinco minutos.
- MongoDB solo conserva la relación entre el Discord user ID y el Brawlhalla ID; no almacena estadísticas ni respuestas de la API.
- La búsqueda de jugadores por nombre se resuelve mediante el leaderboard y solo puede encontrar jugadores indexados allí.
- La API v1.0 no ofrece búsqueda global de clanes por nombre. `/clan name` busca entre clanes vistos durante la sesión actual del proceso.
- Los comandos de jugador son `/create`, `/stats`, `/rank`, `/role` y `/clan`, con los subcomandos de las referencias entregadas por el usuario.
- Los módulos se separan físicamente en públicos y privados. Los privados solo aceptan los Discord user IDs configurados como desarrolladores.
- `/rank roles` permite a un desarrollador o administrador crear los siete roles competitivos que falten; `/role self` mantiene un único rol ranked según el tier 1v1 actual de la cuenta vinculada.
- El panel ranked ofrece Principal, Ranked 2v2 y Leyendas; no incluye historial porque la API v1.0 no entrega temporadas anteriores.
- Los controles y textos de usuario están en español.

## Brand Commitments

Nombre de trabajo: Bothalla. La interfaz debe sentirse moderna dentro de las restricciones nativas de Discord y usar embeds, botones, menús y emojis personalizados de leyendas.

## Evidence on Hand

- Capturas de referencia de la estructura de comandos aportadas por el usuario.
- Documentación oficial de Brawlhalla API v1.0: https://dev.brawlhalla.com/
- Documentación oficial de emojis de aplicación de Discord: https://docs.discord.com/developers/resources/emoji

El usuario cargó en la aplicación de Discord los iconos de las leyendas, siete banners ranked y diez banderas regionales. Bothalla consume esos Application Emojis por nombre; no distribuye ni fabrica los assets.

## Product Principles

- Mostrar primero la información que ayuda a comparar rendimiento.
- Mantener cada respuesta explorable sin obligar a repetir comandos.
- Explicar con claridad cuándo una búsqueda está limitada por la API oficial.
- No persistir datos de juego que puedan consultarse nuevamente desde la fuente.
- Fallar con mensajes accionables en español.

## Accessibility & Inclusion

Los botones siempre incluyen etiquetas textuales; el color y los emojis nunca son el único medio para comunicar estado o significado.
