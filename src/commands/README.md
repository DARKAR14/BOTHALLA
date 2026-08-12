# Módulos de comandos

El bot descubre recursivamente todos los archivos que terminen en `.command.ts` dentro de:

- `public/`: comandos disponibles para cualquier usuario.
- `private/`: comandos que el controlador limita a `DEVELOPER_IDS`.

Cada módulo debe exportar por defecto un objeto con:

- `access`: `"public"` o `"developer"`, coherente con la carpeta.
- `data`: definición creada con `SlashCommandBuilder`.
- `execute(interaction, context)`: implementación asíncrona del comando.

No agregues el comando a ningún arreglo. Al iniciar, `loader.ts` escanea ambas carpetas, rechaza nombres duplicados o accesos incoherentes y entrega la colección al controlador. Después, `registry.ts` sincroniza esa colección con Discord.

Discord aplica permisos predeterminados al comando raíz, no a un subcomando individual. Por eso `/rank roles` vive en el módulo público de `/rank`, pero valida en ejecución que la persona sea desarrolladora o tenga `Administrator` en el servidor.

Los archivos auxiliares como `types.ts`, `player-targets.ts`, `loader.ts` y sus pruebas no terminan en `.command.ts`, por lo que nunca se interpretan como comandos.
