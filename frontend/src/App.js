import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CajaPage from './pages/cajaPages/CajaPage';
import MozoPage from './pages/mozoPages/MozoPage';
import KitchenPage from './pages/kitchenPages/KitchenPage';
import AdminPage from './pages/adminPages/AdminPage';
import MenuDisplayPage from './pages/menuPages/MenuDisplayPage';
import NotificationSystem from './components/NotificationSystem';
import OfflineBanner from './components/OfflineBanner';
import ErrorBoundary from './components/ErrorBoundary';
import { getUser, isAuthenticated } from './auth';

function PrivateRoute({ children, role }) {
  const user = getUser();
  if (!isAuthenticated()) return <Navigate to="/" />;
  // Si el usuario es admin, puede acceder a cualquier ruta
  if (user?.role === 'admin') return children;
  // Si se especifica un rol y el usuario tiene ese rol, permitir acceso
  if (role && user?.role === role) return children;
  // Si no coincide el rol, denegar acceso
  if (role && user?.role !== role) return <Navigate to="/" />;
  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          {/* Banner de estado sin conexión */}
          <OfflineBanner />
          
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu-display" element={<MenuDisplayPage />} />
            <Route path="/caja" element={
              <PrivateRoute role="caja">
                <CajaPage />
              </PrivateRoute>
            } />
            <Route path="/mozo" element={
              <PrivateRoute role="mozo">
                <MozoPage />
              </PrivateRoute>
            } />
            <Route path="/cocina" element={
              <PrivateRoute role="cocina">
                <KitchenPage />
              </PrivateRoute>
            } />
            <Route path="/admin" element={
              <PrivateRoute role="admin">
                <AdminPage />
              </PrivateRoute>
            } />
          </Routes>
          
          {/* Sistema de notificaciones global */}
          {isAuthenticated() && <NotificationSystem />}
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
