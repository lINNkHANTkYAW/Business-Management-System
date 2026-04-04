import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('အီးမေးလ် သို့မဟုတ် လျှို့ဝှက်နံပါတ် မှားယွင်းနေပါသည်။');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 bg-blue-50 rounded-2xl mb-4">
            <Building2 className="text-blue-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">BMS Myanmar</h1>
          <p className="text-slate-500 mt-2">လုပ်ငန်းစီမံခန့်ခွဲမှုစနစ်သို့ ဝင်ရောက်ရန်</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">အီးမေးလ်</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">လျှို့ဝှက်နံပါတ်</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'ခေတ္တစောင့်ဆိုင်းပေးပါ...' : 'ဝင်ရောက်မည်'}
          </button>
        </form>
      </div>
    </div>
  );
}
