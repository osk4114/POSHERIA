// Datos del menú con imágenes
import pollo1Image from '../pages/menuPages/images/1pollo.webp';
import medioPolloImage from '../pages/menuPages/images/mediopollo.webp';
import cuartoPolloImage from '../pages/menuPages/images/cuartopollo.webp';
import octavoPolloImage from '../pages/menuPages/images/octavopollo.webp';
import chichaImage from '../pages/menuPages/images/chicha.webp';
import chicha1Image from '../pages/menuPages/images/chicha (1).webp';
import gaseosaImage from '../pages/menuPages/images/gaseosa.webp';
import gaseosa1Image from '../pages/menuPages/images/gaseosa (1).webp';
import gaseosaPersonalImage from '../pages/menuPages/images/gaseosas-personales.webp';
import gaseosaPersonal1Image from '../pages/menuPages/images/gaseosas-personales (1).webp';

export const menuData = [
  {
    _id: '650c1f2e2e8f4b2b8c8b4567',
    name: 'Pollo Entero',
    price: 45.00,
    category: 'Pollos',
    description: 'Pollo a la brasa entero, jugoso y dorado. Acompañado con papas fritas y ensalada.',
    image: pollo1Image,
    available: true
  },
  {
    _id: '650c1f2e2e8f4b2b8c8b4568',
    name: 'Medio Pollo',
    price: 25.00,
    category: 'Pollos',
    description: 'Medio pollo a la brasa, perfecto para 2 personas. Incluye papas fritas.',
    image: medioPolloImage,
    available: true
  },
  {
    _id: '650c1f2e2e8f4b2b8c8b4569',
    name: 'Cuarto de Pollo',
    price: 15.00,
    category: 'Pollos',
    description: 'Cuarto de pollo a la brasa con papas fritas y ensalada criolla.',
    image: cuartoPolloImage,
    available: true
  },
  {
    _id: '650c1f2e2e8f4b2b8c8b456a',
    name: 'Octavo de Pollo',
    price: 8.00,
    category: 'Pollos',
    description: 'Octavo de pollo a la brasa, ideal para niños. Incluye papas.',
    image: octavoPolloImage,
    available: true
  },
  {
    _id: '650c1f2e2e8f4b2b8c8b456b',
    name: 'Chicha Morada',
    price: 8.00,
    category: 'Bebidas',
    description: 'Refrescante chicha morada casera, preparada con maíz morado.',
    image: chichaImage,
    available: true
  },
  {
    _id: '650c1f2e2e8f4b2b8c8b456c',
    name: 'Gaseosa Personal',
    price: 5.00,
    category: 'Bebidas',
    description: 'Gaseosa personal de 500ml, varias opciones disponibles.',
    image: gaseosaPersonalImage,
    available: true
  },
  {
    _id: '650c1f2e2e8f4b2b8c8b456d',
    name: 'Gaseosa Familiar',
    price: 12.00,
    category: 'Bebidas',
    description: 'Gaseosa familiar de 1.5L, perfecta para compartir.',
    image: gaseosaImage,
    available: true
  },
  {
    _id: '650c1f2e2e8f4b2b8c8b456e',
    name: 'Chicha Morada Familiar',
    price: 12.00,
    category: 'Bebidas',
    description: 'Chicha morada en presentación familiar, rinde para 4 personas.',
    image: chicha1Image,
    available: true
  }
];

export const menuCategories = ['Todos', 'Pollos', 'Bebidas'];