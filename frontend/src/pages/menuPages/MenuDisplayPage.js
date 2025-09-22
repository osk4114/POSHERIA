import React, { useState, useEffect } from 'react';
import api from '../../api';
import { menuData } from '../../data/menuData';
import './MenuDisplayPage.css';

const MenuDisplayPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const categories = ['Todos', 'Pollos', 'Bebidas', 'Acompañamientos', 'Postres', 'Ensaladas'];

  useEffect(() => {
    fetchMenuItems();
    
    // Actualizar la hora cada segundo
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Rotar automáticamente los productos cada 15 segundos
    const rotationInterval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % getFilteredItems().length);
    }, 15000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(rotationInterval);
    };
  }, [selectedCategory]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/menu');
      
      if (response.data && response.data.length > 0) {
        setMenuItems(response.data.filter(item => item.available));
      } else {
        setMenuItems(menuData.filter(item => item.available));
      }
    } catch (error) {
      console.log('Usando datos locales del menú');
      setMenuItems(menuData.filter(item => item.available));
    } finally {
      setLoading(false);
    }
  };

  const getFilteredItems = () => {
    return selectedCategory === 'Todos' 
      ? menuItems 
      : menuItems.filter(item => item.category === selectedCategory);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('es-PE', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-PE', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="menu-display-loading">
        <div className="loading-spinner"></div>
        <h2>Cargando Menú...</h2>
      </div>
    );
  }

  const filteredItems = getFilteredItems();
  const currentItem = filteredItems[currentIndex];
  const nextItems = filteredItems.slice(currentIndex + 1, currentIndex + 4);

  return (
    <div className="menu-display-container">
      {/* Header con información del restaurante */}
      <header className="menu-display-header">
        <div className="restaurant-info">
          <h1 className="restaurant-name">🍗 POSHERIA</h1>
          <p className="restaurant-tagline">Deliciosa comida peruana</p>
        </div>
        <div className="time-info">
          <div className="current-time">{formatTime(currentTime)}</div>
          <div className="current-date">{formatDate(currentTime)}</div>
        </div>
      </header>

      {/* Navegación de categorías */}
      <nav className="category-nav">
        {categories.map(category => (
          <button
            key={category}
            className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => {
              setSelectedCategory(category);
              setCurrentIndex(0);
            }}
          >
            {category === 'Todos' && '🍽️'}
            {category === 'Pollos' && '🍗'}
            {category === 'Bebidas' && '🥤'}
            {category === 'Acompañamientos' && '🍚'}
            {category === 'Postres' && '🍰'}
            {category === 'Ensaladas' && '🥗'}
            <span>{category}</span>
          </button>
        ))}
      </nav>

      {filteredItems.length === 0 ? (
        <div className="no-items">
          <h3>No hay productos disponibles en esta categoría</h3>
        </div>
      ) : (
        <main className="menu-display-main">
          {/* Producto principal destacado */}
          {currentItem && (
            <section className="featured-item">
              <div className="item-image-container">
                <div className="item-image">
                  <img 
                    src={currentItem.image} 
                    alt={currentItem.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="image-placeholder" style={{display: 'none'}}>
                    {currentItem.category === 'Pollos' ? '🍗' : 
                     currentItem.category === 'Bebidas' ? '🥤' : '🍽️'}
                  </div>
                </div>
              <div className="item-overlay">
                <div className="price-badge">
                  <span className="currency">S/.</span>
                  <span className="amount">{currentItem.price.toFixed(2)}</span>
                </div>
              </div>
              </div>
              <div className="item-details">
                <h2 className="item-name">{currentItem.name}</h2>
                <p className="item-description">{currentItem.description}</p>
                <div className="item-meta">
                  <span className="item-category">{currentItem.category}</span>
                  <span className="item-status">✅ Disponible</span>
                </div>
              </div>
            </section>
          )}

          {/* Productos siguientes en preview */}
          {nextItems.length > 0 && (
            <section className="upcoming-items">
              <h3>Próximamente...</h3>
              <div className="upcoming-grid">
                {nextItems.map((item, index) => (
                  <div 
                    key={item._id} 
                    className="upcoming-item" 
                    data-category={item.category}
                    style={{animationDelay: `${index * 0.2}s`}}
                  >
                    <div className="upcoming-image">
                      <img 
                        src={item.image} 
                        alt={item.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="image-placeholder" style={{display: 'none'}}>
                        {item.category === 'Pollos' ? '🍗' : 
                         item.category === 'Bebidas' ? '🥤' : '🍽️'}
                      </div>
                    </div>
                    <div className="upcoming-info">
                      <h4>{item.name}</h4>
                      <div className="upcoming-price">
                        <span>S/.</span>
                        <span>{item.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      )}

      {/* Footer con información adicional */}
      <footer className="menu-display-footer">
        <div className="footer-content">
          <div className="contact-info">
            <span>📞 Delivery: (01) 123-4567</span>
            <span>🏠 Av. Principal 123, Lima</span>
          </div>
          <div className="promo-info">
            <span className="promo-text">🎉 Promociones especiales todos los días</span>
          </div>
        </div>
      </footer>

      {/* Indicador de progreso */}
      <div className="progress-indicator">
        {filteredItems.map((_, index) => (
          <div 
            key={index}
            className={`progress-dot ${index === currentIndex ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
};

export default MenuDisplayPage;