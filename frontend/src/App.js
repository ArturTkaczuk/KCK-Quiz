import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import SubjectSelection from './pages/SubjectSelection';
import WikampLogin from './pages/WikampLogin';

import AdminDashboard from './pages/AdminDashboard';
import Game from './pages/Game';

const ProtectedRoute = ({ children, roleRequired }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  // If not logged in, show SubjectSelection but maybe restricted? 
  // Actually, for MVP, if no user, we stay on Landing/SubjectSelection where Login Sim is.
  if (!user) return <Navigate to="/" />;

  if (roleRequired && user.role !== roleRequired) {
    return <div className="p-5 text-center"><h1>403 Forbidden</h1><p>You need {roleRequired} access.</p></div>;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/wikamp" element={<WikampLogin />} />
            <Route path="/" element={<SubjectSelection />} />

            <Route path="/admin/*" element={
              <ProtectedRoute roleRequired="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/:slug" element={
              <ProtectedRoute>
                <Game />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
