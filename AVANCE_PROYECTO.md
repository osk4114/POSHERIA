
# POSHERIA — Registro de Avance y Guía para Colaboradores

## Estado al 17 de septiembre de 2025

### Descripción general
POSHERIA es un sistema backend para la gestión de una pollería (restaurante de pollo a la brasa), orientado a cubrir el flujo completo de operación: usuarios, caja, pedidos, menú y mesas. El objetivo es que cualquier colaborador pueda entender la arquitectura, contribuir y extender el sistema fácilmente.

---

## Estructura del proyecto

- **backend/**
  - `controllers/`: Lógica de negocio para cada entidad (usuarios, pedidos, caja, menú, mesas)
  - `models/`: Modelos de datos (MongoDB)
  - `routes/`: Rutas Express para cada recurso
  - `middlewares/`: Autenticación JWT y control de acceso adminOnly
  - `config/`: Conexión a MongoDB y configuración general
  - `views/`: Plantillas y archivos estáticos (si se usan)
  - `scripts/`: Utilidades para crear admin, insertar datos de ejemplo, etc.
  - `tests/`: Pruebas automatizadas y scripts de flujo completo
- **frontend/**
  - (Estructura React, aún en desarrollo)

## Tecnologías principales
- Node.js + Express
- MongoDB Atlas (cloud)
- JWT para autenticación
- bcryptjs para hash de contraseñas
- axios para pruebas y automatización

## Flujo principal implementado
1. **Login de usuario** (admin o cajero)
2. **Apertura de caja** (solo un usuario puede tener una caja abierta a la vez)
3. **Creación de pedido** (asociado a mesa y productos del menú)
4. **Edición de pedido** (solo si no está pagado)
5. **Cobro de pedido** (registra movimiento en la caja abierta)
6. **Consulta de estado de caja** (ver movimientos y saldo)
7. **Cierre de caja** (marca la caja como cerrada y registra el monto final)

Todo este flujo está automatizado y probado en `testFlujoCompleto.js`.

## Seguridad y buenas prácticas
- Todas las rutas sensibles requieren autenticación JWT.
- Solo usuarios con rol `admin` pueden gestionar usuarios.
- Los pedidos solo pueden editarse si no están pagados.
- Los movimientos de caja se registran automáticamente al cobrar pedidos.
- Validaciones robustas de ObjectId y estado en todos los endpoints.
- Logs de depuración en puntos críticos para facilitar troubleshooting.

## ¿Cómo colaborar?
1. Clona el repositorio y revisa la estructura.
2. Lee los controladores y modelos para entender la lógica de negocio.
3. Usa los scripts de prueba (`testFlujoCompleto.js`) para validar cambios.
4. Si agregas endpoints, sigue el patrón de controladores y rutas existentes.
5. Documenta tus cambios en este archivo o en el README principal.
6. Si encuentras bugs, agrega logs y describe el problema en un issue.

## Pendientes y recomendaciones
- Revisar y robustecer el endpoint de cierre de caja (actualmente puede dar 404 si la caja no existe o ya está cerrada).
- Completar y documentar el frontend React.
- Agregar más pruebas unitarias y de integración.
- Mejorar manejo de errores y mensajes para el usuario final.

---

Este archivo documenta el estado, arquitectura y recomendaciones para que cualquier colaborador pueda sumarse y aportar al proyecto POSHERIA.
