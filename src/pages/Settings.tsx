import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Shield, Save, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BURMESE_LABELS, cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export default function Settings() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) console.error('Error fetching profile:', error);
      else setProfile({ ...data, email: user.email });
    }
    setLoading(false);
  }

  async function handleUpdateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('full_name') as string;

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    if (error) alert('Error updating profile: ' + error.message);
    else {
      alert('ကိုယ်ရေးအချက်အလက်များကို သိမ်းဆည်းပြီးပါပြီ။');
      fetchProfile();
    }
    setIsSubmitting(false);
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('စကားဝှက်များ တူညီမှုမရှိပါ။');
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword
    });

    if (error) alert('Error updating password: ' + error.message);
    else {
      alert('စကားဝှက်ကို အောင်မြင်စွာ ပြောင်းလဲပြီးပါပြီ။');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    }
    setIsSubmitting(false);
  }

  if (loading) return <div className="p-12 text-center text-slate-500">{BURMESE_LABELS.common.loading}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{BURMESE_LABELS.sidebar.settings}</h1>
        <p className="text-slate-500">အကောင့်နှင့် စနစ်ဆိုင်ရာ ဆက်တင်များ</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={40} />
            </div>
            <h3 className="font-bold text-lg text-slate-900">{profile?.full_name || 'အမည်မရှိ'}</h3>
            <p className="text-sm text-slate-500 mb-4">{profile?.email}</p>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
              {profile?.role === 'admin' ? 'Administrator' : 'Staff'}
            </span>
          </div>

          <button 
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center justify-center gap-2 p-4 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold transition-colors"
          >
            <LogOut size={20} />
            စနစ်မှထွက်မည်
          </button>
        </div>

        {/* Forms */}
        <div className="md:col-span-2 space-y-8">
          {/* Profile Form */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <User size={20} className="text-blue-600" />
              ကိုယ်ရေးအချက်အလက် ပြင်ဆင်ရန်
            </h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">အမည်အပြည့်အစုံ</label>
                <input 
                  name="full_name" 
                  defaultValue={profile?.full_name} 
                  required 
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">အီးမေးလ် (ပြောင်းလဲ၍မရပါ)</label>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500">
                  <Mail size={16} />
                  {profile?.email}
                </div>
              </div>
              <Button type="submit" loading={isSubmitting} icon={<Save size={18} />}>
                အချက်အလက်များသိမ်းမည်
              </Button>
            </form>
          </section>

          {/* Password Form */}
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Lock size={20} className="text-amber-600" />
              စကားဝှက် ပြောင်းလဲရန်
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">စကားဝှက်အသစ်</label>
                <input 
                  type="password" 
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required 
                  minLength={6}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">စကားဝှက်အသစ်ကို ထပ်မံရိုက်ထည့်ပါ</label>
                <input 
                  type="password" 
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required 
                  minLength={6}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none" 
                />
              </div>
              <Button type="submit" variant="secondary" loading={isSubmitting} icon={<Shield size={18} />}>
                စကားဝှက်အသစ်လဲမည်
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
