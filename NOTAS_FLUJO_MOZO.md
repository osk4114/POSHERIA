# Notas: Flujo y endpoints sugeridos para el mozo (waiter)

## Funciones principales
- Ver mesas y su estado (libre/ocupada)
- Tomar pedidos para una mesa (crear pedido dine-in)
- Ver sus propios pedidos abiertos/asignados
- Marcar pedido como “servido” (opcional, si hay diferencia con “delivered” de cocina)
- Ver historial de pedidos atendidos

## Endpoints sugeridos
- GET /api/tables — Listar mesas y estado (ya existe)
- POST /api/orders — Crear pedido para una mesa (ya existe, pero se puede filtrar por mozo)
- GET /api/orders?waiterId=... — Listar pedidos de un mozo
- PUT /api/orders/:id/served — Marcar pedido como servido por el mozo (si se requiere)
- GET /api/orders/history?waiterId=... — Historial de pedidos del mozo

## Cambios en modelo
- Agregar campo waiterId al modelo de pedido (orderModel.js)
- Registrar el mozo que toma el pedido

## Seguridad
- Los endpoints deben requerir autenticación y rol mozo

---

Cuando quieras continuar, retomamos desde aquí.