import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@project/components/ui/sonner';
import { BrandProvider } from './components/Brand';
import Landing from './pages/Landing';
import SampleReport from './pages/SampleReport';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import NewScan from './pages/NewScan';
import Reports from './pages/Reports';
import ScanResults from './pages/ScanResults';
import Calculator from './pages/Calculator';
import Admin from './pages/Admin';

export default function App() {
  return (
    <BrandProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/sample" element={<SampleReport />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="scan" element={<NewScan />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/:id" element={<ScanResults />} />
            <Route path="calculator" element={<Calculator />} />
            <Route path="admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </BrandProvider>
  );
}
