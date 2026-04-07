import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Layout } from './components/Layout';
import { ConfigRequired } from './components/ConfigRequired';
import Dashboard from './pages/Dashboard';
import RealEstate from './pages/RealEstate';
import TaxiHijet from './pages/TaxiHijet';
import Reminders from './pages/Reminders';
import Reporting from './pages/Reporting';
import Settings from './pages/Settings';
import Login from './pages/Login';

// Placeholder pages
export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return <ConfigRequired />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        ခေတ္တစောင့်ဆိုင်းပေးပါ...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        
        <Route element={session ? <Layout /> : <Navigate to="/login" />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/real-estate" element={<RealEstate />} />
          <Route path="/taxi-hijet" element={<TaxiHijet />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/reports" element={<Reporting />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
