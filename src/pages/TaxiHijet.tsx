import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  CarFront, 
  Users, 
  History, 
  CreditCard, 
  Wrench,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BURMESE_LABELS, formatCurrency, cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { uploadFile } from '@/lib/storage';
import { ExternalLink } from 'lucide-react';

export default function TaxiHijet() {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers' | 'fees' | 'maintenance' | 'deposits'>('vehicles');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
  const [editingRefund, setEditingRefund] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    if (activeTab === 'fees' || activeTab === 'maintenance' || activeTab === 'deposits') {
      fetchDropdownData();
    }
  }, [activeTab]);

  async function handleDeleteItem(table: string, id: string) {
    if (!confirm('ဤအချက်အလက်ကို ဖျက်ပစ်ရန် သေချာပါသလား?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }

  async function fetchDropdownData() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data: vehs } = await supabase.from('th_vehicles').select('id, car_number, type').eq('user_id', user.id).eq('status', 'active');
    const { data: drivs } = await supabase.from('th_drivers').select('id, name').eq('user_id', user.id);
    setVehicles(vehs || []);
    setDrivers(drivs || []);
  }

  async function fetchData() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    let query;
    if (activeTab === 'vehicles') {
      query = supabase.from('th_vehicles').select('*').eq('user_id', user.id).order('car_number');
    } else if (activeTab === 'drivers') {
      query = supabase.from('th_drivers').select('*').eq('user_id', user.id).order('name');
    } else if (activeTab === 'fees') {
      query = supabase.from('th_fee_payments').select('*, th_vehicles(car_number), th_drivers(name)').eq('user_id', user.id).order('payment_date', { ascending: false });
    } else if (activeTab === 'maintenance') {
      query = supabase.from('th_maintenance').select('*, th_vehicles(car_number)').eq('user_id', user.id).order('date', { ascending: false });
    } else if (activeTab === 'deposits') {
      query = supabase.from('th_deposits').select('*, th_vehicles(car_number), th_drivers(name), th_refunds(*)').eq('user_id', user.id).order('payment_date', { ascending: false });
    }

    if (query) {
      const { data, error } = await query;
      if (error) console.error(`Error fetching ${activeTab}:`, error);
      else setData(data || []);
    }
    setLoading(false);
  }

  async function handleAddVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');
      const newVehicle = {
        type: formData.get('type'),
        car_number: formData.get('car_number'),
        name: formData.get('name'),
        model: formData.get('model'),
        license_expiry: formData.get('license_expiry') || null,
        status: editingItem ? editingItem.status : 'active',
        user_id: user.id
      };

      const { error } = editingItem 
      ? await supabase.from('th_vehicles').update(newVehicle).eq('id', editingItem.id)
      : await supabase.from('th_vehicles').insert([newVehicle]);

      if (error) throw error;
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddDriver(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');
      const newDriver = {
        name: formData.get('name'),
        nrc: formData.get('nrc'),
        license_no: formData.get('license_no'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        user_id: user.id
      };

      const { error } = editingItem
      ? await supabase.from('th_drivers').update(newDriver).eq('id', editingItem.id)
      : await supabase.from('th_drivers').insert([newDriver]);

      if (error) throw error;
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddFee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const screenshotFile = formData.get('screenshot') as File;
    let screenshotUrl = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');

      if (screenshotFile && screenshotFile.size > 0) {
        const fileName = `${Date.now()}_${screenshotFile.name}`;
        screenshotUrl = await uploadFile('screenshots', `fees/${fileName}`, screenshotFile);
      }

      const newFee = {
        vehicle_id: formData.get('vehicle_id'),
        driver_id: formData.get('driver_id'),
        amount: Number(formData.get('amount')),
        payment_date: formData.get('payment_date'),
        cycle_start: formData.get('cycle_start'),
        cycle_end: formData.get('cycle_end'),
        status: editingItem ? editingItem.status : 'paid',
        screenshot_url: screenshotUrl || (editingItem ? editingItem.screenshot_url : null),
        user_id: user.id
      };

      const { error } = editingItem
        ? await supabase.from('th_fee_payments').update(newFee).eq('id', editingItem.id)
        : await supabase.from('th_fee_payments').insert([newFee]);

      if (error) throw error;

      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddMaintenance(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');
      const totalCost = Number(formData.get('total_cost'));
      const ownerShare = Number(formData.get('owner_share'));
      const driverShare = totalCost - ownerShare;

      const newMaintenance = {
        vehicle_id: formData.get('vehicle_id'),
        date: formData.get('date'),
        type: formData.get('type'),
        total_cost: totalCost,
        owner_share: ownerShare,
        driver_share: driverShare,
        user_id: user.id
      };

      const { error } = editingItem
        ? await supabase.from('th_maintenance').update(newMaintenance).eq('id', editingItem.id)
        : await supabase.from('th_maintenance').insert([newMaintenance]);

      if (error) throw error;
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddDeposit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');
      const newDeposit = {
        vehicle_id: formData.get('vehicle_id'),
        driver_id: formData.get('driver_id'),
        amount: Number(formData.get('amount')),
        payment_date: formData.get('payment_date'),
        status: editingItem ? editingItem.status : 'held',
        user_id: user.id
      };

      if (editingItem) {
        const { error } = await supabase.from('th_deposits').update(newDeposit).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('th_deposits').insert([newDeposit]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddRefund(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const screenshotFile = formData.get('screenshot') as File;
    let screenshotUrl = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');

      if (screenshotFile && screenshotFile.size > 0) {
        const fileName = `${Date.now()}_${screenshotFile.name}`;
        screenshotUrl = await uploadFile('screenshots', `refunds/${fileName}`, screenshotFile);
      }

      const refundAmount = Number(formData.get('amount'));
      const newRefund = {
        deposit_id: selectedDeposit.id,
        amount: refundAmount,
        refund_date: formData.get('refund_date'),
        reason: formData.get('reason'),
        screenshot_url: screenshotUrl || (editingRefund ? editingRefund.screenshot_url : null),
        user_id: user.id
      };

      if (editingRefund) {
        const { error: refundError } = await supabase.from('th_refunds').update(newRefund).eq('id', editingRefund.id);
        if (refundError) throw refundError;
      } else {
        const { error: refundError } = await supabase.from('th_refunds').insert([newRefund]);
        if (refundError) throw refundError;
      }

      // Mark deposit as refunded
      await supabase.from('th_deposits').update({ status: 'refunded' }).eq('id', selectedDeposit.id);

      setIsRefundModalOpen(false);
      setEditingRefund(null);
      fetchData();
    } catch (error: any) {
      alert('Error adding refund: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const tabs = [
    { id: 'vehicles', label: BURMESE_LABELS.taxiHijet.vehicles, icon: CarFront },
    { id: 'drivers', label: BURMESE_LABELS.taxiHijet.drivers, icon: Users },
    { id: 'fees', label: BURMESE_LABELS.taxiHijet.fees, icon: CreditCard },
    { id: 'maintenance', label: BURMESE_LABELS.taxiHijet.maintenance, icon: Wrench },
    { id: 'deposits', label: 'စပေါ်ငွေနှင့် ပြန်အမ်းငွေ', icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{BURMESE_LABELS.sidebar.taxiHijet}</h1>
          <p className="text-slate-500">တက္ကစီနှင့် ဟိုက်ဂျက် စီမံခန့်ခွဲမှု</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          icon={<Plus size={20} />}
        >
          {activeTab === 'vehicles' ? 'ယာဉ်အသစ်ထည့်မည်' : 
           activeTab === 'drivers' ? 'ယာဉ်မောင်းအသစ်ထည့်မည်' :
           activeTab === 'fees' ? 'ပိုင်ရှင်ကြေးအသစ်ထည့်မည်' :
           activeTab === 'deposits' ? 'စပေါ်ငွေအသစ်ထည့်မည်' :
           'ပြုပြင်ထိန်းသိမ်းမှုအသစ်ထည့်မည်'}
        </Button>
      </header>

      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 font-medium transition-colors border-b-2",
              activeTab === tab.id 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={BURMESE_LABELS.common.search}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">{BURMESE_LABELS.common.loading}</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CarFront className="mx-auto mb-4 text-slate-300" size={48} />
            {BURMESE_LABELS.common.noData}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm uppercase">
              {activeTab === 'vehicles' && (
                <tr>
                  <th className="px-6 py-3 font-semibold">ယာဉ်အမှတ်</th>
                  <th className="px-6 py-3 font-semibold">အမျိုးအစား</th>
                  <th className="px-6 py-3 font-semibold">အမည်/မော်ဒယ်</th>
                  <th className="px-6 py-3 font-semibold">အခြေအနေ</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.common.actions}</th>
                </tr>
              )}
              {activeTab === 'drivers' && (
                <tr>
                  <th className="px-6 py-3 font-semibold">အမည်</th>
                  <th className="px-6 py-3 font-semibold">ဖုန်းနံပါတ်</th>
                  <th className="px-6 py-3 font-semibold">လိုင်စင်အမှတ်</th>
                  <th className="px-6 py-3 font-semibold">မှတ်ပုံတင်အမှတ်</th>
                  <th className="px-6 py-3 font-semibold">နေရပ်လိပ်စာ</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.common.actions}</th>
                </tr>
              )}
              {activeTab === 'fees' && (
                <tr>
                  <th className="px-6 py-3 font-semibold">ရက်စွဲ</th>
                  <th className="px-6 py-3 font-semibold">ယာဉ် / ယာဉ်မောင်း</th>
                  <th className="px-6 py-3 font-semibold">ပမာဏ</th>
                  <th className="px-6 py-3 font-semibold">ကာလ</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.common.actions}</th>
                </tr>
              )}
              {activeTab === 'maintenance' && (
                <tr>
                  <th className="px-6 py-3 font-semibold">ရက်စွဲ</th>
                  <th className="px-6 py-3 font-semibold">ယာဉ်အမှတ်</th>
                  <th className="px-6 py-3 font-semibold">အမျိုးအစား</th>
                  <th className="px-6 py-3 font-semibold">ကုန်ကျစရိတ်</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.common.actions}</th>
                </tr>
              )}
              {activeTab === 'deposits' && (
                <tr>
                  <th className="px-6 py-3 font-semibold">ရက်စွဲ</th>
                  <th className="px-6 py-3 font-semibold">ယာဉ် / ယာဉ်မောင်း</th>
                  <th className="px-6 py-3 font-semibold">စပေါ်ငွေ</th>
                  <th className="px-6 py-3 font-semibold">အခြေအနေ</th>
                  <th className="px-6 py-3 font-semibold">ပြန်အမ်းငွေ</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.common.actions}</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  {activeTab === 'vehicles' && (
                    <>
                      <td className="px-6 py-4 font-medium">{item.car_number}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          item.type === 'taxi' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        )}>
                          {item.type === 'taxi' ? BURMESE_LABELS.taxiHijet.taxi : BURMESE_LABELS.taxiHijet.hijet}
                        </span>
                      </td>
                      <td className="px-6 py-4">{item.name} {item.model && `(${item.model})`}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          item.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                        )}>
                          {item.status === 'active' ? 'အသုံးပြုဆဲ' : 'ရပ်နားထား'}
                        </span>
                      </td>
                    </>
                  )}
                  {activeTab === 'drivers' && (
                    <>
                      <td className="px-6 py-4 font-medium">{item.name}</td>
                      <td className="px-6 py-4">{item.phone}</td>
                      <td className="px-6 py-4 text-slate-500">{item.license_no}</td>
                      <td className="px-6 py-4 text-slate-500">{item.nrc || '-'}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={item.address}>{item.address || '-'}</td>
                    </>
                  )}
                  {activeTab === 'fees' && (
                    <>
                      <td className="px-6 py-4">{item.payment_date}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{item.th_vehicles?.car_number}</div>
                        <div className="text-xs text-slate-500">{item.th_drivers?.name}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(item.amount)}</td>
                      <td className="px-6 py-4 text-xs">
                        {item.cycle_start} မှ {item.cycle_end}
                      </td>
                      <td className="px-6 py-4">
                        {item.screenshot_url ? (
                          <a 
                            href={item.screenshot_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                          >
                            <ExternalLink size={14} />
                            ကြည့်မည်
                          </a>
                        ) : '-'}
                      </td>
                    </>
                  )}
                  {activeTab === 'maintenance' && (
                    <>
                      <td className="px-6 py-4">{item.date}</td>
                      <td className="px-6 py-4 font-medium">{item.th_vehicles?.car_number}</td>
                      <td className="px-6 py-4">{item.type}</td>
                      <td className="px-6 py-4 font-bold text-rose-600">{formatCurrency(item.total_cost)}</td>
                    </>
                  )}
                  {activeTab === 'deposits' && (
                    <>
                      <td className="px-6 py-4">{item.payment_date}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{item.th_vehicles?.car_number}</div>
                        <div className="text-xs text-slate-500">{item.th_drivers?.name}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-600">{formatCurrency(item.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          item.status === 'held' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {item.status === 'held' ? 'ထိန်းသိမ်းထား' : 'ပြန်အမ်းပြီး'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.th_refunds && item.th_refunds.length > 0 ? (
                          <div className="space-y-1">
                            {item.th_refunds.map((r: any) => (
                              <div key={r.id} className="text-xs text-rose-600 font-bold flex items-center justify-between gap-1">
                                <span>-{formatCurrency(r.amount)} ({r.refund_date})</span>
                                <button
                                  className="text-slate-400 hover:text-amber-600 transition-colors"
                                  title="ပြန်အမ်းငွေ ပြင်ဆင်မည်"
                                  onClick={() => {
                                    setSelectedDeposit(item);
                                    setEditingRefund(r);
                                    setIsRefundModalOpen(true);
                                  }}
                                >
                                  <Edit size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {activeTab === 'deposits' && item.status === 'held' && (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => {
                            setSelectedDeposit(item);
                            setIsRefundModalOpen(true);
                          }}
                        >
                          ပြန်အမ်းမည်
                        </Button>
                      )}
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                        <Eye size={18} />
                      </button>
                      <button 
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors"
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                        onClick={() => {
                          const tableMap: Record<string, string> = {
                            vehicles: 'th_vehicles',
                            drivers: 'th_drivers',
                            fees: 'th_fee_payments',
                            maintenance: 'th_maintenance',
                            deposits: 'th_deposits'
                          };
                          handleDeleteItem(tableMap[activeTab], item.id);
                        }}
                        title="ဖျက်မည်"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <Modal 
        isOpen={isModalOpen && activeTab === 'vehicles'} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "ယာဉ်အချက်အလက်ပြင်မည်" : "ယာဉ်အသစ်ထည့်မည်"}
      >
        <form onSubmit={handleAddVehicle} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ယာဉ်အမျိုးအစား</label>
            <select name="type" defaultValue={editingItem?.type} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="taxi">Taxi</option>
              <option value="hijet">Hijet</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ယာဉ်အမှတ်</label>
            <input name="car_number" defaultValue={editingItem?.car_number} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="YGN 1A-1234" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ယာဉ်အမည်</label>
            <input name="name" defaultValue={editingItem?.name} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="Toyota Probox" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">မော်ဒယ်</label>
            <input name="model" defaultValue={editingItem?.model} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="2015" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">လိုင်စင်သက်တမ်းကုန်ဆုံးရက်</label>
            <input name="license_expiry" type="date" defaultValue={editingItem?.license_expiry} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => {
              setIsModalOpen(false);
              setEditingItem(null);
            }}>ပယ်ဖျက်မည်</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>သိမ်းဆည်းမည်</Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isModalOpen && activeTab === 'drivers'} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "ယာဉ်မောင်းအချက်အလက်ပြင်မည်" : "ယာဉ်မောင်းအသစ်ထည့်မည်"}
      >
        <form onSubmit={handleAddDriver} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အမည်</label>
            <input name="name" defaultValue={editingItem?.name} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="ဦးမောင်" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">မှတ်ပုံတင်အမှတ်</label>
            <input name="nrc" defaultValue={editingItem?.nrc} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="၁၂/မဂတ(နိုင်)xxxxxx" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">လိုင်စင်အမှတ်</label>
            <input name="license_no" defaultValue={editingItem?.license_no} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="B/12345/15" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ဖုန်းနံပါတ်</label>
            <input name="phone" defaultValue={editingItem?.phone} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="09xxxxxxxxx" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">နေရပ်လိပ်စာ</label>
            <textarea name="address" defaultValue={editingItem?.address} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" rows={2} placeholder="ရန်ကုန်မြို့"></textarea>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => {
              setIsModalOpen(false);
              setEditingItem(null);
            }}>ပယ်ဖျက်မည်</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>သိမ်းဆည်းမည်</Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isModalOpen && activeTab === 'fees'} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "ပိုင်ရှင်ကြေးအချက်အလက်ပြင်မည်" : "ပိုင်ရှင်ကြေးအသစ်ထည့်မည်"}
      >
        <form onSubmit={handleAddFee} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ယာဉ်ရွေးချယ်ရန်</label>
            <select name="vehicle_id" defaultValue={editingItem?.vehicle_id} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="">-- ယာဉ်ရွေးပါ --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.car_number} ({v.type})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ယာဉ်မောင်းရွေးချယ်ရန်</label>
            <select name="driver_id" defaultValue={editingItem?.driver_id} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="">-- ယာဉ်မောင်းရွေးပါ --</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပမာဏ (ကျပ်)</label>
            <input name="amount" type="number" defaultValue={editingItem?.amount} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="15000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပေးချေသည့်ရက်စွဲ</label>
            <input name="payment_date" type="date" defaultValue={editingItem?.payment_date || new Date().toISOString().split('T')[0]} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ငွေလွှဲပြေစာ (Screenshot)</label>
            <input name="screenshot" type="file" accept="image/*" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">စတင်သည့်ရက်</label>
              <input name="cycle_start" type="date" defaultValue={editingItem?.cycle_start} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ကုန်ဆုံးသည့်ရက်</label>
              <input name="cycle_end" type="date" defaultValue={editingItem?.cycle_end} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => {
              setIsModalOpen(false);
              setEditingItem(null);
            }}>ပယ်ဖျက်မည်</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>သိမ်းဆည်းမည်</Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isModalOpen && activeTab === 'maintenance'} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "ပြုပြင်ထိန်းသိမ်းမှုအချက်အလက်ပြင်မည်" : "ပြုပြင်ထိန်းသိမ်းမှုအသစ်ထည့်မည်"}
      >
        <form onSubmit={handleAddMaintenance} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ယာဉ်ရွေးချယ်ရန်</label>
            <select name="vehicle_id" defaultValue={editingItem?.vehicle_id} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="">-- ယာဉ်ရွေးပါ --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.car_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ရက်စွဲ</label>
            <input name="date" type="date" defaultValue={editingItem?.date || new Date().toISOString().split('T')[0]} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပြုပြင်မှုအမျိုးအစား</label>
            <input name="type" defaultValue={editingItem?.type} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="ဥပမာ - အင်ဂျင်ဝိုင်လဲခြင်း" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">စုစုပေါင်းကုန်ကျစရိတ်</label>
              <input name="total_cost" type="number" defaultValue={editingItem?.total_cost} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="50000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ပိုင်ရှင်ကျခံငွေ</label>
              <input name="owner_share" type="number" defaultValue={editingItem?.owner_share} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="25000" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => {
              setIsModalOpen(false);
              setEditingItem(null);
            }}>ပယ်ဖျက်မည်</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>သိမ်းဆည်းမည်</Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isModalOpen && activeTab === 'deposits'} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "စပေါ်ငွေအချက်အလက်ပြင်မည်" : "စပေါ်ငွေအသစ်ထည့်မည်"}
      >
        <form onSubmit={handleAddDeposit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ယာဉ်ရွေးချယ်ရန်</label>
            <select name="vehicle_id" defaultValue={editingItem?.vehicle_id} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="">-- ယာဉ်ရွေးပါ --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.car_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ယာဉ်မောင်းရွေးချယ်ရန်</label>
            <select name="driver_id" defaultValue={editingItem?.driver_id} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="">-- ယာဉ်မောင်းရွေးပါ --</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">စပေါ်ငွေ (ကျပ်)</label>
            <input name="amount" type="number" defaultValue={editingItem?.amount} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="100000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ရက်စွဲ</label>
            <input name="payment_date" type="date" defaultValue={editingItem?.payment_date || new Date().toISOString().split('T')[0]} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => {
              setIsModalOpen(false);
              setEditingItem(null);
            }}>ပယ်ဖျက်မည်</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>သိမ်းဆည်းမည်</Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isRefundModalOpen && activeTab === 'deposits'} 
        onClose={() => {
          setIsRefundModalOpen(false);
          setEditingRefund(null);
        }}
        title="စပေါ်ငွေပြန်အမ်းမည်"
      >
        <form onSubmit={handleAddRefund} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပြန်အမ်းမည့်ပမာဏ (ကျပ်)</label>
            <input name="amount" type="number" defaultValue={editingRefund?.amount} max={selectedDeposit?.amount} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="100000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ရက်စွဲ</label>
            <input name="refund_date" type="date" defaultValue={editingRefund?.refund_date || new Date().toISOString().split('T')[0]} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အကြောင်းပြချက်</label>
            <textarea name="reason" defaultValue={editingRefund?.reason} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" rows={2} placeholder="ဥပမာ - ယာဉ်မောင်းနားသောကြောင့်"></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ငွေလွှဲပြေစာ (Screenshot)</label>
            <input name="screenshot" type="file" accept="image/*" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => {
              setIsRefundModalOpen(false);
              setEditingRefund(null);
            }}>ပယ်ဖျက်မည်</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>သိမ်းဆည်းမည်</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
