# Comandos de administradores

Los archivos `*.admin.ts` extienden un comando público con un subcomando reservado a miembros que tengan el permiso `Administrator`.

`rank-roles.admin.ts` agrega `/rank roles` al comando `/rank`. El cargador fusiona su definición y su ejecutor sin registrar un segundo comando raíz.
