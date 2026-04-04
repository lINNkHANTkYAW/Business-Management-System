import React, { useEffect, useState } from 'react';
import { Building2, CarFront, Users, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BURMESE_LABELS } from '../lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState({
    properties: 0,
    tenants: 0,
    vehicles: 0,
    drivers: 0,
    totalRevenue: 0,
    pendingMaintenance: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const [
        { count: propCount },
        { count: tenantCount },
        { count: vehicleCount },
        { count: driverCount },
        { data: rePayments },
        { data: thFees }
      ] = await Promise.all([
        supabase.from('re_properties').select('*', { count: 'exact', head: true }),
        supabase.from('re_tenants').select('*', { count: 'exact', head: true }),
        supabase.from('th_vehicles').select('*', { count: 'exact', head: true }),
        supabase.from('th_drivers').select('*', { count: 'exact', head: true }),
        supabase.from('re_payments').select('amount'),
        supabase.from('th_fee_payments').select('amount')
      ]);

      const totalRevenue = (rePayments?.reduce((sum, p) => sum + p.amount, 0) || 0) +
                           (thFees?.reduce((sum, f) => sum + f.amount, 0) || 0);

      setStats({
        properties: propCount || 0,
        tenants: tenantCount || 0,
        vehicles: vehicleCount || 0,
        drivers: driverCount || 0,
        totalRevenue,
        pendingMaintenance: 0 // Placeholder
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    setLoading(false);
  }

  const statCards = [
    { label: BURMESE_LABELS.realEstate.properties, value: stats.properties, icon: Building2, color: 'bg-blue-500' },
    { label: BURMESE_LABELS.realEstate.tenants, value: stats.tenants, icon: Users, color: 'bg-indigo-500' },
    { label: BURMESE_LABELS.taxiHijet.vehicles, value: stats.vehicles, icon: CarFront, color: 'bg-emerald-500' },
    { label: BURMESE_LABELS.taxiHijet.drivers, value: stats.drivers, icon: Users, color: 'bg-teal-500' },
    { label: 'စုစုပေါင်းဝင်ငွေ', value: `${stats.totalRevenue.toLocaleString()} ကျပ်`, icon: CreditCard, color: 'bg-amber-500' },
    { label: 'ပြုပြင်ရန်လိုအပ်မှု', value: stats.pendingMaintenance, icon: AlertCircle, color: 'bg-rose-500' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">ဒေတာများ ရယူနေပါသည်...</div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{BURMESE_LABELS.sidebar.dashboard}</h1>
        <p className="text-slate-500">လုပ်ငန်းအခြေအနေ အနှစ်ချုပ်</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`${card.color} p-3 rounded-xl text-white`}>
                <card.icon size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            လတ်တလော လုပ်ဆောင်ချက်များ
          </h3>
          <div className="space-y-4">
            <p className="text-slate-500 text-sm">လုပ်ဆောင်ချက်အသစ်များ မရှိသေးပါ။</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-500" />
            သတိပေးချက်များ
          </h3>
          <div className="space-y-4">
            <p className="text-slate-500 text-sm">သတိပေးချက်အသစ်များ မရှိသေးပါ။</p>
          </div>
        </div>
      </div>
    </div>
  );
}
