import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CajaPage from './pages/cajaPages/CajaPage';
import MozoPage from './pages/mozoPages/MozoPage';
import KitchenPage from './pages/kitchenPages/KitchenPage';
import AdminPage from './pages/adminPages/AdminPage';
import { getUser, isAuthenticated } from './auth';

function PrivateRoute({ children, role }) {
  const user = getUser();
  if (!isAuthenticated()) return <Navigate to="/" />;
  // Si el usuario es admin, puede acceder a cualquier ruta
  if (user?.role === 'admin') return children;
  if (role && user?.role !== role) return <Navigate to="/" />;
  return children;
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
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
      </div>
    </Router>
  );
}

export default App;
