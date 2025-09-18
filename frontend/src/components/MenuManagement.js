import React, { useState, useEffect } from 'react';
import api from '../api';
import './MenuManagement.css';

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    image: '',
    available: true
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const categories = ['Pollos', 'Bebidas', 'Acompañamientos', 'Postres', 'Ensaladas'];

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/menu');
      setMenuItems(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError('Error al cargar el menú');
      console.error('Error fetching menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      // Crear preview de la imagen
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await api.post('/api/menu/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.imagePath;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Error al subir la imagen');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let imagePath = formData.image;

      // Si hay una nueva imagen, subirla primero
      if (imageFile) {
        imagePath = await uploadImage(imageFile);
      }

      const dataToSend = {
        ...formData,
        price: parseFloat(formData.price),
        image: imagePath
      };

      if (editingItem) {
        await api.put(`/api/menu/${editingItem._id}`, dataToSend);
        setSuccess('Producto actualizado exitosamente');
      } else {
        await api.post('/api/menu', dataToSend);
        setSuccess('Producto creado exitosamente');
      }

      setFormData({ name: '', price: '', category: '', description: '', image: '', available: true });
      setImageFile(null);
      setImagePreview(null);
      setShowForm(false);
      setEditingItem(null);
      fetchMenuItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      category: item.category,
      description: item.description || '',
      image: item.image || '',
      available: item.available
    });
    setImagePreview(item.image);
    setImageFile(null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    try {
      await api.delete(`/api/menu/${id}`);
      setSuccess('Producto eliminado exitosamente');
      fetchMenuItems();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar el producto');
    }
  };

  const toggleAvailability = async (item) => {
    try {
      await api.put(`/api/menu/${item._id}`, {
        ...item,
        available: !item.available
      });
      setSuccess(`Producto ${!item.available ? 'activado' : 'desactivado'}`);
      fetchMenuItems();
    } catch (err) {
      setError('Error al actualizar disponibilidad');
    }
  };

  if (loading && menuItems.length === 0) {
    return <div className="loading">Cargando menú...</div>;
  }

  return (
    <div className="menu-management">
      <div className="menu-header">
        <h2>Gestión del Menú</h2>
        <button 
          className="btn btn-primary"
          onClick={() => {
            setShowForm(true);
            setEditingItem(null);
            setFormData({ name: '', price: '', category: '', description: '', available: true });
          }}
        >
          + Agregar Producto
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingItem ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowForm(false);
                  setEditingItem(null);
                  setError(null);
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="menu-form">
              <div className="form-group">
                <label>Nombre del Producto *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: Pollo a la brasa"
                />
              </div>

              <div className="form-group">
                <label>Precio (S/.) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.50"
                  min="0"
                  required
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Categoría</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="">Seleccionar categoría</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descripción del producto..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Imagen del Producto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="file-input"
                />
                {imagePreview && (
                  <div className="image-preview">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      style={{maxWidth: '200px', maxHeight: '150px', marginTop: '10px'}}
                    />
                  </div>
                )}
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    name="available"
                    checked={formData.available}
                    onChange={handleInputChange}
                  />
                  Disponible
                </label>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingItem(null);
                  }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : (editingItem ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="menu-grid">
        {menuItems.length === 0 ? (
          <div className="empty-state">
            <p>No hay productos en el menú</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              Agregar primer producto
            </button>
          </div>
        ) : (
          menuItems.map(item => (
            <div key={item._id} className={`menu-card ${!item.available ? 'unavailable' : ''}`}>
              {item.image && (
                <div className="menu-card-image">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="menu-card-header">
                <h3>{item.name}</h3>
                <div className="card-actions">
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => handleEdit(item)}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn btn-sm btn-outline"
                    onClick={() => toggleAvailability(item)}
                    title={item.available ? 'Desactivar' : 'Activar'}
                  >
                    {item.available ? '👁️' : '🚫'}
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(item._id)}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="menu-card-content">
                <div className="price">S/. {item.price.toFixed(2)}</div>
                {item.category && <div className="category">{item.category}</div>}
                {item.description && <div className="description">{item.description}</div>}
                <div className={`status ${item.available ? 'available' : 'unavailable'}`}>
                  {item.available ? 'Disponible' : 'No disponible'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MenuManagement;