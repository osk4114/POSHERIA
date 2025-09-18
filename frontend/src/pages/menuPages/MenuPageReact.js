import React, { useState, useEffect } from 'react';
import api from '../../api';
import { menuData, menuCategories } from '../../data/menuData';
import './MenuPageReact.css';

const MenuPageReact = () => {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Usar datos locales con imágenes si no hay conexión con el backend
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/menu');
      
      // Si tenemos datos del backend, los usamos
      if (response.data && response.data.length > 0) {
        setMenuItems(response.data);
      } else {
        // Si no, usamos los datos locales con imágenes
        setMenuItems(menuData);
      }
    } catch (error) {
      console.log('Usando datos locales del menú');
      // En caso de error, usar datos locales
      setMenuItems(menuData);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = selectedCategory === 'Todos' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem._id === item._id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem._id === item._id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item._id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(cart.map(item =>
      item._id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleOrder = async () => {
    if (cart.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    try {
      setLoading(true);
      // Aquí se implementaría la lógica para enviar el pedido
      console.log('Pedido:', cart);
      alert('Pedido realizado con éxito!');
      setCart([]);
      setShowCart(false);
    } catch (error) {
      console.error('Error al realizar pedido:', error);
      alert('Error al realizar el pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="menu-page-react">
      <div className="menu-header">
        <h1>🍗 Nuestro Menú 🍗</h1>
        <p>Deliciosos pollos a la brasa y bebidas refrescantes</p>
        <button 
          className={`cart-button ${cart.length > 0 ? 'has-items' : ''}`}
          onClick={() => setShowCart(true)}
        >
          🛒 Carrito ({cart.length})
        </button>
      </div>

      <div className="category-filters">
        {menuCategories.map(category => (
          <button
            key={category}
            className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category === 'Pollos' ? '🍗' : category === 'Bebidas' ? '🥤' : '🍽️'} {category}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando menú...</p>
        </div>
      ) : (
        <div className="menu-grid">
          {filteredItems.map(item => (
            <div key={item._id} className="menu-item-card">
              <div className="item-image">
                <img 
                  src={item.image} 
                  alt={item.name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="image-placeholder" style={{display: 'none'}}>
                  {item.category === 'Pollos' ? '🍗' : '🥤'}
                </div>
              </div>
              <div className="item-info">
                <h3>{item.name}</h3>
                <p className="description">{item.description}</p>
                <div className="item-footer">
                  <span className="price">S/. {item.price.toFixed(2)}</span>
                  <button 
                    className="add-btn"
                    onClick={() => addToCart(item)}
                    disabled={!item.available}
                  >
                    {item.available ? '+ Agregar' : 'No disponible'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal del Carrito */}
      {showCart && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🛒 Tu Pedido</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCart(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <p>🛒 El carrito está vacío</p>
                  <p>¡Agrega algunos productos deliciosos!</p>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {cart.map(item => (
                      <div key={item._id} className="cart-item">
                        <div className="cart-item-info">
                          <h4>{item.name}</h4>
                          <p>S/. {item.price.toFixed(2)} c/u</p>
                        </div>
                        <div className="quantity-controls">
                          <button onClick={() => updateQuantity(item._id, item.quantity - 1)}>
                            -
                          </button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item._id, item.quantity + 1)}>
                            +
                          </button>
                        </div>
                        <div className="item-total">
                          S/. {(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button 
                          className="remove-btn"
                          onClick={() => removeFromCart(item._id)}
                          title="Eliminar del carrito"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="cart-total">
                    <strong>💰 Total: S/. {calculateTotal().toFixed(2)}</strong>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCart(false)}
              >
                Seguir comprando
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleOrder}
                disabled={cart.length === 0 || loading}
              >
                {loading ? 'Procesando...' : '🚀 Realizar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuPageReact;