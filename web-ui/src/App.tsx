import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { Toaster } from 'sonner';

import AuthPage from './pages/AuthPage';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';

// Shipper pages
import MyLoads from './pages/shipper/MyLoads';
import CreateLoad from './pages/shipper/CreateLoad';
import LoadDetail from './pages/shipper/LoadDetail';

// Carrier pages
import AvailableLoads from './pages/carrier/AvailableLoads';
import MyBids from './pages/carrier/MyBids';
import CarrierProfile from './pages/carrier/CarrierProfile';

// Common pages
import Settings from './pages/common/Settings';
import NotFound from './pages/common/NotFound';

function App() {
  const checkAuth = useAuthStore(state => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      <Router>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Dashboard />} />

            {/* Shipper routes */}
            <Route path="/my-loads" element={<MyLoads />} />
            <Route path="/create-load" element={<CreateLoad />} />
            <Route path="/loads/:id" element={<LoadDetail />} />

            {/* Carrier routes */}
            <Route path="/available-loads" element={<AvailableLoads />} />
            <Route path="/my-bids" element={<MyBids />} />
            <Route path="/carrier-profile" element={<CarrierProfile />} />

            {/* Common routes */}
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster position="top-center" richColors closeButton theme="dark" />
    </>
  );
}

export default App;
