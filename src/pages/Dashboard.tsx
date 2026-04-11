import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  CarFront, 
  Users, 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  ChevronRight, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Calendar,
  Banknote
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BURMESE_LABELS, formatCurrency, cn } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [stats, setStats] = useState({
    properties: 0,
    tenants: 0,
    vehicles: 0,
    drivers: 0,
    income: 0,
    expense: 0,
    incomeBreakdown: [] as { name: string, value: number }[],
    expenseBreakdown: [] as { name: string, value: number }[]
  });
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<'income' | 'expense' | null>(null);

  useEffect(() => {
    fetchStats();
  }, [selectedMonth]);

  async function fetchStats() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(new Date(selectedMonth + "-01").setMonth(new Date(selectedMonth + "-01").getMonth() + 1)).toISOString().split('T')[0];

      const [
        { count: propCount },
        { count: tenantCount },
        { count: vehicleCount },
        { count: driverCount },
        { data: rePayments },
        { data: thFees },
        { data: reExpenses },
        { data: thMaintenance }
      ] = await Promise.all([
        supabase.from('re_properties').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('re_tenants').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('th_vehicles').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('th_drivers').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('re_payments').select('amount, payment_date').eq('user_id', user.id).gte('payment_date', startDate).lt('payment_date', endDate),
        supabase.from('th_fee_payments').select('amount, payment_date').eq('user_id', user.id).gte('payment_date', startDate).lt('payment_date', endDate),
        supabase.from('re_expenses').select('amount, date, re_expense_categories(name)').eq('user_id', user.id).gte('date', startDate).lt('date', endDate),
        supabase.from('th_maintenance').select('owner_share, date, type').eq('user_id', user.id).gte('date', startDate).lt('date', endDate)
      ]);

      const reIncome = rePayments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const thIncome = thFees?.reduce((sum, f) => sum + f.amount, 0) || 0;
      const totalIncome = reIncome + thIncome;

      const reExpenseTotal = reExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const thExpenseTotal = thMaintenance?.reduce((sum, m) => sum + m.owner_share, 0) || 0;
      const totalExpense = reExpenseTotal + thExpenseTotal;

      // Income Breakdown
      const incomeBreakdown = [
        { name: 'အိမ်ခြံမြေ ငှားရမ်းခ', value: reIncome },
        { name: 'တက္ကစီ/ဟိုက်ဂျက် ပိုင်ရှင်ကြေး', value: thIncome }
      ].filter(i => i.value > 0);

      // Expense Breakdown
      const expenseMap: Record<string, number> = {};
      reExpenses?.forEach(e => {
        const cat = e.re_expense_categories?.name || 'အထွေထွေ အသုံးစရိတ်';
        expenseMap[cat] = (expenseMap[cat] || 0) + e.amount;
      });
      thMaintenance?.forEach(m => {
        const type = m.type || 'ယာဉ်ပြုပြင်ထိန်းသိမ်းမှု';
        expenseMap[type] = (expenseMap[type] || 0) + m.owner_share;
      });

      const expenseBreakdown = Object.entries(expenseMap).map(([name, value]) => ({ name, value }));

      setStats({
        properties: propCount || 0,
        tenants: tenantCount || 0,
        vehicles: vehicleCount || 0,
        drivers: driverCount || 0,
        income: totalIncome,
        expense: totalExpense,
        incomeBreakdown,
        expenseBreakdown
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    setLoading(false);
  }

  const topStats = [
    { label: BURMESE_LABELS.realEstate.properties, value: stats.properties, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: BURMESE_LABELS.realEstate.tenants, value: stats.tenants, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: BURMESE_LABELS.taxiHijet.vehicles, value: stats.vehicles, icon: CarFront, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: BURMESE_LABELS.taxiHijet.drivers, value: stats.drivers, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{BURMESE_LABELS.sidebar.dashboard}</h1>
          <p className="text-slate-500">လုပ်ငန်းအခြေအနေ အနှစ်ချုပ်</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <Calendar size={18} className="text-slate-400 ml-2" />
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-none focus:ring-0 text-sm font-medium text-slate-700 outline-none"
          />
        </div>
      </header>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {topStats.map((card, index) => (
          <div key={index} className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`${card.bg} ${card.color} p-2.5 lg:p-3 rounded-xl`}>
                <card.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Financial Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Income Card */}
        <button 
          onClick={() => setDrillDown('income')}
          className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-left group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowUpCircle size={120} className="text-emerald-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                <ArrowUpCircle size={20} />
              </div>
              <span className="font-bold text-slate-600">စုစုပေါင်းဝင်ငွေ</span>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-2">
              {formatCurrency(stats.income)}
            </div>
            <div className="flex items-center text-sm text-emerald-600 font-medium">
              အသေးစိတ်ကြည့်ရန် နှိပ်ပါ <ChevronRight size={16} className="ml-1" />
            </div>
          </div>
        </button>

        {/* Total Expense Card */}
        <button 
          onClick={() => setDrillDown('expense')}
          className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all text-left group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowDownCircle size={120} className="text-rose-500" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-rose-100 text-rose-600 p-2 rounded-lg">
                <ArrowDownCircle size={20} />
              </div>
              <span className="font-bold text-slate-600">စုစုပေါင်းထွက်ငွေ</span>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-2">
              {formatCurrency(stats.expense)}
            </div>
            <div className="flex items-center text-sm text-rose-600 font-medium">
              အသေးစိတ်ကြည့်ရန် နှိပ်ပါ <ChevronRight size={16} className="ml-1" />
            </div>
          </div>
        </button>

        {/* Profit Card */}
        {(() => {
          const profit = stats.income - stats.expense;
          const isProfit = profit >= 0;
          return (
            <div className={`p-6 sm:p-8 rounded-2xl border shadow-sm relative overflow-hidden ${
              isProfit ? 'bg-blue-50 border-blue-200' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Banknote size={120} className={isProfit ? 'text-blue-500' : 'text-rose-500'} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${
                    isProfit ? 'bg-blue-100 text-blue-600' : 'bg-rose-100 text-rose-600'
                  }`}>
                    <Banknote size={20} />
                  </div>
                  <span className="font-bold text-slate-600">အမြတ်ငွေ</span>
                </div>
                <div className={`text-3xl font-black mb-2 ${
                  isProfit ? 'text-blue-700' : 'text-rose-700'
                }`}>
                  {isProfit ? '' : '-'}{formatCurrency(Math.abs(profit))}
                </div>
                <div className={`text-sm font-medium ${
                  isProfit ? 'text-blue-600' : 'text-rose-600'
                }`}>
                  {isProfit ? 'ဝင်ငွေ > ထွက်ငွေ ✓' : 'ထွက်ငွေ > ဝင်ငွေ ✗'}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Category Drill-down Modal */}
      <Modal
        isOpen={!!drillDown}
        onClose={() => setDrillDown(null)}
        title={drillDown === 'income' ? 'ဝင်ငွေ အမျိုးအစားအလိုက် ခွဲခြမ်းစိတ်ဖြာမှု' : 'အသုံးစရိတ် အမျိုးအစားအလိုက် ခွဲခြမ်းစိတ်ဖြာမှု'}
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-500 mb-4">
            {selectedMonth} လအတွက် {drillDown === 'income' ? 'ဝင်ငွေ' : 'ထွက်ငွေ'} စုစုပေါင်း - 
            <span className="font-bold text-slate-900 ml-1">
              {formatCurrency(drillDown === 'income' ? stats.income : stats.expense)}
            </span>
          </div>
          
          <div className="space-y-3">
            {(drillDown === 'income' ? stats.incomeBreakdown : stats.expenseBreakdown).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-medium text-slate-700">{item.name}</span>
                <span className={cn(
                  "font-bold",
                  drillDown === 'income' ? "text-emerald-600" : "text-rose-600"
                )}>
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
            {(drillDown === 'income' ? stats.incomeBreakdown : stats.expenseBreakdown).length === 0 && (
              <div className="text-center py-8 text-slate-400">
                ဤလအတွက် ဒေတာမရှိသေးပါ။
              </div>
            )}
          </div>
          
          <div className="pt-6">
            <Button className="w-full" onClick={() => setDrillDown(null)}>ပိတ်မည်</Button>
          </div>
        </div>
      </Modal>

      {/* Secondary Info Grid */}
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
