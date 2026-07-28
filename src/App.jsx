import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import BasicForm from './pages/MindSync/BasicForm';
import Chatbot from './pages/MindSync/Chatbot';
import './index.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center" style={{ height: '100vh' }}>Carregando...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/mind-sync" />} />
        
        {/* Rotas Privadas */}
        <Route path="/mind-sync" element={session ? <BasicForm /> : <Navigate to="/login" />} />
        <Route path="/mind-sync/chat" element={session ? <Chatbot /> : <Navigate to="/login" />} />
        
        <Route path="/" element={<Navigate to={session ? "/mind-sync" : "/login"} />} />
      </Routes>
    </Router>
  );
}
