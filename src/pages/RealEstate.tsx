import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Building2, 
  Users, 
  FileText, 
  CreditCard, 
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BURMESE_LABELS, formatCurrency, cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export default function RealEstate() {
  const [activeTab, setActiveTab] = useState<'properties' | 'tenants' | 'contracts' | 'payments'>('properties');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    if (activeTab === 'contracts' || activeTab === 'payments') {
      fetchDropdownData();
    }
  }, [activeTab]);

  async function fetchDropdownData() {
    const { data: props } = await supabase.from('re_properties').select('id, name, room_number').eq('status', 'vacant');
    const { data: tens } = await supabase.from('re_tenants').select('id, name');
    const { data: conts } = await supabase.from('re_contracts').select('id, re_properties(name, room_number), re_tenants(name)').eq('status', 'active');
    setProperties(props || []);
    setTenants(tens || []);
    setContracts(conts || []);
  }

  async function fetchData() {
    setLoading(true);
    let query;
    if (activeTab === 'properties') {
      query = supabase.from('re_properties').select('*').order('name');
    } else if (activeTab === 'tenants') {
      query = supabase.from('re_tenants').select('*').order('name');
    } else if (activeTab === 'contracts') {
      query = supabase.from('re_contracts').select('*, re_properties(name, room_number), re_tenants(name)').order('created_at', { ascending: false });
    } else if (activeTab === 'payments') {
      query = supabase.from('re_payments').select('*, re_contracts(*, re_properties(name, room_number), re_tenants(name))').order('payment_date', { ascending: false });
    }

    if (query) {
      const { data, error } = await query;
      if (error) console.error(`Error fetching ${activeTab}:`, error);
      else setData(data || []);
    }
    setLoading(false);
  }

  async function handleAddProperty(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const newProperty = {
      name: formData.get('name'),
      room_number: formData.get('room_number'),
      floor_number: formData.get('floor_number'),
      monthly_rent: Number(formData.get('monthly_rent')),
      deposit_amount: Number(formData.get('deposit_amount')),
      status: 'vacant',
    };

    const { error } = await supabase.from('re_properties').insert([newProperty]);
    if (error) alert('Error adding property: ' + error.message);
    else {
      setIsModalOpen(false);
      fetchData();
    }
    setIsSubmitting(false);
  }

  async function handleAddTenant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const newTenant = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      nrc: formData.get('nrc'),
    };

    const { error } = await supabase.from('re_tenants').insert([newTenant]);
    if (error) alert('Error adding tenant: ' + error.message);
    else {
      setIsModalOpen(false);
      fetchData();
    }
    setIsSubmitting(false);
  }

  async function handleAddContract(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const propertyId = formData.get('property_id') as string;
    const newContract = {
      property_id: propertyId,
      tenant_id: formData.get('tenant_id'),
      type: formData.get('type'),
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      status: 'active',
    };

    const { error: contractError } = await supabase.from('re_contracts').insert([newContract]);
    if (contractError) alert('Error adding contract: ' + contractError.message);
    else {
      // Update property status to occupied
      await supabase.from('re_properties').update({ status: 'occupied' }).eq('id', propertyId);
      setIsModalOpen(false);
      fetchData();
    }
    setIsSubmitting(false);
  }

  async function handleAddPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const newPayment = {
      contract_id: formData.get('contract_id'),
      amount: Number(formData.get('amount')),
      payment_date: formData.get('payment_date'),
      method: formData.get('method'),
    };

    const { error } = await supabase.from('re_payments').insert([newPayment]);
    if (error) alert('Error adding payment: ' + error.message);
    else {
      setIsModalOpen(false);
      fetchData();
    }
    setIsSubmitting(false);
  }

  const tabs = [
    { id: 'properties', label: BURMESE_LABELS.realEstate.properties, icon: Building2 },
    { id: 'tenants', label: BURMESE_LABELS.realEstate.tenants, icon: Users },
    { id: 'contracts', label: BURMESE_LABELS.realEstate.contracts, icon: FileText },
    { id: 'payments', label: BURMESE_LABELS.realEstate.payments, icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{BURMESE_LABELS.sidebar.realEstate}</h1>
          <p className="text-slate-500">အိမ်ခြံမြေငှားရမ်းခြင်း စီမံခန့်ခွဲမှု</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          icon={<Plus size={20} />}
        >
          {activeTab === 'properties' ? 'အခန်းအသစ်ထည့်မည်' : 
           activeTab === 'tenants' ? 'အိမ်ငှားအသစ်ထည့်မည်' :
           activeTab === 'contracts' ? 'စာချုပ်အသစ်ချုပ်မည်' :
           'ငွေပေးချေမှုအသစ်ထည့်မည်'}
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
            <Building2 className="mx-auto mb-4 text-slate-300" size={48} />
            {BURMESE_LABELS.common.noData}
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm uppercase">
              {activeTab === 'properties' && (
                <tr>
                  <th className="px-6 py-3 font-semibold">အမည်</th>
                  <th className="px-6 py-3 font-semibold">အခန်းနံပါတ်</th>
                  <th className="px-6 py-3 font-semibold">လစဉ်လခ</th>
                  <th className="px-6 py-3 font-semibold">အခြေအနေ</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.common.actions}</th>
                </tr>
              )}
              {activeTab === 'tenants' && (
                <tr>
                  <th className="px-6 py-3 font-semibold">အမည်</th>
                  <th className="px-6 py-3 font-semibold">ဖုန်းနံပါတ်</th>
                  <th className="px-6 py-3 font-semibold">မှတ်ပုံတင်</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.common.actions}</th>
                </tr>
              )}
              {activeTab === 'contracts' && (
                <tr>
                  <th className="px-6 py-3 font-semibold">အိမ်ငှား</th>
                  <th className="px-6 py-3 font-semibold">အခန်း</th>
                  <th className="px-6 py-3 font-semibold">သက်တမ်း</th>
                  <th className="px-6 py-3 font-semibold">အခြေအနေ</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.common.actions}</th>
                </tr>
              )}
              {activeTab === 'payments' && (
                <tr>
                  <th className="px-6 py-3 font-semibold">ရက်စွဲ</th>
                  <th className="px-6 py-3 font-semibold">အိမ်ငှား / အခန်း</th>
                  <th className="px-6 py-3 font-semibold">ပမာဏ</th>
                  <th className="px-6 py-3 font-semibold">ပေးချေမှုပုံစံ</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.common.actions}</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  {activeTab === 'properties' && (
                    <>
                      <td className="px-6 py-4 font-medium">{item.name}</td>
                      <td className="px-6 py-4">{item.room_number}</td>
                      <td className="px-6 py-4 font-bold text-blue-600">{formatCurrency(item.monthly_rent)}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          item.status === 'occupied' ? "bg-emerald-100 text-emerald-700" :
                          item.status === 'vacant' ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-700"
                        )}>
                          {item.status === 'occupied' ? BURMESE_LABELS.realEstate.occupied :
                           item.status === 'vacant' ? BURMESE_LABELS.realEstate.vacant :
                           BURMESE_LABELS.realEstate.inactive}
                        </span>
                      </td>
                    </>
                  )}
                  {activeTab === 'tenants' && (
                    <>
                      <td className="px-6 py-4 font-medium">{item.name}</td>
                      <td className="px-6 py-4">{item.phone}</td>
                      <td className="px-6 py-4 text-slate-500">{item.nrc || '-'}</td>
                    </>
                  )}
                  {activeTab === 'contracts' && (
                    <>
                      <td className="px-6 py-4 font-medium">{item.re_tenants?.name}</td>
                      <td className="px-6 py-4">{item.re_properties?.name} ({item.re_properties?.room_number})</td>
                      <td className="px-6 py-4 text-sm">{item.start_date} မှ {item.end_date}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          item.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {item.status === 'active' ? 'သက်တမ်းရှိ' : 'သက်တမ်းကုန်'}
                        </span>
                      </td>
                    </>
                  )}
                  {activeTab === 'payments' && (
                    <>
                      <td className="px-6 py-4">{item.payment_date}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{item.re_contracts?.re_tenants?.name}</div>
                        <div className="text-xs text-slate-500">{item.re_contracts?.re_properties?.name} ({item.re_contracts?.re_properties?.room_number})</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(item.amount)}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                          {item.method === 'cash' ? 'လက်ငင်း' : 'ဘဏ်မှ'}
                        </span>
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                        <Eye size={18} />
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors">
                        <Edit size={18} />
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
        isOpen={isModalOpen && activeTab === 'properties'} 
        onClose={() => setIsModalOpen(false)}
        title="အခန်းအသစ်ထည့်မည်"
      >
        <form onSubmit={handleAddProperty} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အဆောက်အဦးအမည်</label>
            <input name="name" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="ဥပမာ - ရွှေဂုံတိုင်တိုက်ခန်း" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">အခန်းနံပါတ်</label>
              <input name="room_number" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="A-101" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">အလွှာ</label>
              <input name="floor_number" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="3rd Floor" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">လစဉ်လခ (ကျပ်)</label>
            <input name="monthly_rent" type="number" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="500000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">စပေါ်ငွေ (ကျပ်)</label>
            <input name="deposit_amount" type="number" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="1000000" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>ပယ်ဖျက်မည်</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>သိမ်းဆည်းမည်</Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isModalOpen && activeTab === 'tenants'} 
        onClose={() => setIsModalOpen(false)}
        title="အိမ်ငှားအသစ်ထည့်မည်"
      >
        <form onSubmit={handleAddTenant} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အမည်</label>
            <input name="name" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="ဦးဘ" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ဖုန်းနံပါတ်</label>
            <input name="phone" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="09xxxxxxxxx" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">မှတ်ပုံတင်အမှတ်</label>
            <input name="nrc" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="၁၂/မဂတ(နိုင်)xxxxxx" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>ပယ်ဖျက်မည်</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>သိမ်းဆည်းမည်</Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isModalOpen && activeTab === 'contracts'} 
        onClose={() => setIsModalOpen(false)}
        title="စာချုပ်အသစ်ချုပ်မည်"
      >
        <form onSubmit={handleAddContract} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အခန်းရွေးချယ်ရန်</label>
            <select name="property_id" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="">-- အခန်းရွေးပါ --</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.room_number})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အိမ်ငှားရွေးချယ်ရန်</label>
            <select name="tenant_id" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="">-- အိမ်ငှားရွေးပါ --</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">စာချုပ်အမျိုးအစား</label>
            <select name="type" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="monthly">လစဉ်</option>
              <option value="yearly">နှစ်ချုပ်</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">စတင်မည့်ရက်</label>
              <input name="start_date" type="date" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ကုန်ဆုံးမည့်ရက်</label>
              <input name="end_date" type="date" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>ပယ်ဖျက်မည်</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>သိမ်းဆည်းမည်</Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isModalOpen && activeTab === 'payments'} 
        onClose={() => setIsModalOpen(false)}
        title="ငွေပေးချေမှုအသစ်ထည့်မည်"
      >
        <form onSubmit={handleAddPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">စာချုပ်ရွေးချယ်ရန်</label>
            <select name="contract_id" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="">-- စာချုပ်ရွေးပါ --</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>{c.re_tenants?.name} - {c.re_properties?.name} ({c.re_properties?.room_number})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပမာဏ (ကျပ်)</label>
            <input name="amount" type="number" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="500000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပေးချေသည့်ရက်စွဲ</label>
            <input name="payment_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပေးချေမှုပုံစံ</label>
            <select name="method" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="cash">လက်ငင်း (Cash)</option>
              <option value="banking">ဘဏ်မှ (Mobile Banking)</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsModalOpen(false)}>ပယ်ဖျက်မည်</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>သိမ်းဆည်းမည်</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
