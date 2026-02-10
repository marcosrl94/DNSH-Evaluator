# Socket.IO – Información en tiempo real

El frontend usa **Socket.IO** para:

- **Usuarios en línea**: ver quién está conectado y en qué operación/activo
- **Notificaciones**: tareas asignadas, comentarios nuevos, evidencia subida
- **Colaboración**: ver cuándo alguien está editando un campo (editing:start / editing:stop)
- **Eventos**: operaciones/activos/evaluaciones actualizados en vivo

## Configuración

### Vercel (frontend)
En **Vercel → Variables**:
```
VITE_SOCKET_URL=https://dnsh-evaluator-production.up.railway.app
```

Si no se define, se usa la URL de Railway cuando el origen es `vercel.app`.

### Railway (backend)
El backend ya incluye Socket.IO en el mismo servidor HTTP. Solo hace falta que **CORS_ORIGIN** incluya `https://dnsh-evaluator.vercel.app`.

## Eventos disponibles

| Evento (cliente recibe) | Cuándo |
|-------------------------|--------|
| `user:online` | Otro usuario se conecta |
| `user:offline` | Otro usuario se desconecta |
| `user:update` | Cambio de presencia (operación/activo actual) |
| `users:list` | Lista de usuarios en línea |
| `operation:updated` | Operación modificada |
| `asset:updated` | Activo modificado |
| `evaluation:updated` | Evaluación guardada |
| `evidence:uploaded` | Nueva evidencia |
| `comment:created` | Nuevo comentario |
| `task:assigned` | Tarea asignada |
| `editing:started` / `editing:stopped` | Alguien empieza/deja de editar un campo |

## Componentes que usan Socket.IO

- `FloatingOnlineUsers`: usuarios conectados
- `OnlineUsersContext`: presencia global
- `CollaborationNotification`: avisos de cambios
- `CollaborationIndicator` / `CollaborationIndicatorEnhanced`: indicador de edición
- `DnshEvaluationEnhanced`: cambios en la evaluación
- `App.tsx`: join/leave de operación y activo según navegación
