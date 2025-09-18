import React from 'react';
import './AppBase.css';

// Ejemplo de layout para el dashboard de cocina
export default function KitchenDashboardLayout({ children }) {
  return (
    <div className="kitchen-dashboard-bg" style={{ minHeight: '100vh', background: 'var(--color-secondary)' }}>
      <header className="flex justify-between align-center" style={{ padding: '1.5em 2em', background: 'var(--color-primary)', color: '#fff' }}>
        <h1 className="text-title" style={{ margin: 0 }}>Panel Cocina</h1>
        <div>
          {/* Aquí puede ir el nombre del usuario, botón de logout, etc. */}
          <button className="button danger">Cerrar sesión</button>
        </div>
      </header>
      <main style={{ maxWidth: 1200, margin: '2em auto', padding: '0 1em' }}>
        <section className="card" style={{ marginBottom: '2em' }}>
          <h2 className="text-subtitle" style={{ marginBottom: '1em' }}>Pedidos pendientes</h2>
          {/* Aquí se renderizan los pedidos, ejemplo: */}
          <div className="flex gap-1" style={{ flexWrap: 'wrap' }}>
            {/* Ejemplo de tarjeta de pedido */}
            <div className="card" style={{ minWidth: 250, flex: '1 1 300px' }}>
              <div className="flex justify-between align-center">
                <span className="text-title">Mesa 5</span>
                <span className="text-small text-muted">#1234</span>
              </div>
              <ul style={{ margin: '1em 0' }}>
                <li>1/4 Pollo a la brasa</li>
                <li>Papas fritas</li>
                <li>Inka Kola</li>
              </ul>
              <div className="flex gap-1">
                <button className="button success">En cocina</button>
                <button className="button secondary">Listo</button>
                <button className="button danger">Entregado</button>
              </div>
            </div>
            {/* ...más tarjetas de pedidos... */}
          </div>
        </section>
        {children}
      </main>
    </div>
  );
}
