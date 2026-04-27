import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './router/ProtectedRoute';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import RestaurantsPage from './pages/Restaurants/RestaurantsPage';
import RestaurantPage from './pages/Restaurant/RestaurantPage';
import ProfilePage from './pages/Profile/ProfilePage';
import ReservationsPage from './pages/Reservations/ReservationsPage';
import AdminPage from './pages/Admin/AdminPage';
import OwnerPage from './pages/Owner/OwnerPage';
import NotFoundPage from './pages/NotFoundPage';

const App = () => (
  <AuthProvider>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/restaurants" element={<RestaurantsPage />} />
      <Route path="/restaurants/:id" element={<RestaurantPage />} />

      <Route
        path="/profile"
        element={
          <ProtectedRoute roles={['CLIENT', 'OWNER', 'ADMIN']}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reservations"
        element={
          <ProtectedRoute roles={['CLIENT']}>
            <ReservationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/owner"
        element={
          <ProtectedRoute roles={['OWNER']}>
            <OwnerPage />
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<Navigate to="/restaurants" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </AuthProvider>
);

export default App;
