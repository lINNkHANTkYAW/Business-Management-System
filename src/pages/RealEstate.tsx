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
import { uploadFile } from '@/lib/storage';
import { FileText as FileIcon, ExternalLink } from 'lucide-react';

export default function RealEstate() {
  const [activeTab, setActiveTab] = useState<'properties' | 'tenants' | 'contracts' | 'payments' | 'deposits'>('properties');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    fetchData();
    if (activeTab === 'contracts' || activeTab === 'payments' || activeTab === 'deposits') {
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
    } else if (activeTab === 'deposits') {
      query = supabase.from('re_deposits').select('*, re_contracts(*, re_properties(name, room_number), re_tenants(name)), re_refunds(*)').order('created_at', { ascending: false });
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
      status: editingItem ? editingItem.status : 'vacant',
    };

    try {
      if (editingItem) {
        const { error } = await supabase.from('re_properties').update(newProperty).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('re_properties').insert([newProperty]);
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

  async function handleAddTenant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const newTenant = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      nrc: formData.get('nrc'),
    };

    try {
      if (editingItem) {
        const { error } = await supabase.from('re_tenants').update(newTenant).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('re_tenants').insert([newTenant]);
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

  async function handleAddContract(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const propertyId = formData.get('property_id') as string;
    const contractFile = formData.get('contract_file') as File;
    let fileUrl = null;

    try {
      if (contractFile && contractFile.size > 0) {
        const fileName = `${Date.now()}_${contractFile.name}`;
        fileUrl = await uploadFile('screenshots', `contracts/${fileName}`, contractFile);
      }

      const newContract = {
        property_id: propertyId,
        tenant_id: formData.get('tenant_id') as string,
        type: formData.get('type') as string,
        start_date: formData.get('start_date') as string,
        end_date: formData.get('end_date') as string,
        file_url: fileUrl,
        status: 'active',
      };

      const { error: contractError, data: contractData } = editingItem 
        ? await supabase.from('re_contracts').update(newContract).eq('id', editingItem.id).select()
        : await supabase.from('re_contracts').insert([newContract]).select();
        
      if (contractError) throw contractError;

      if (!editingItem) {
        // Create reminder (7 days before end_date)
        const endDate = new Date(newContract.end_date);
        const reminderDate = new Date(endDate);
        reminderDate.setDate(endDate.getDate() - 7);

        const { data: tenantData } = await supabase.from('re_tenants').select('name').eq('id', newContract.tenant_id).single();
        const { data: propData } = await supabase.from('re_properties').select('name, room_number').eq('id', propertyId).single();

        await supabase.from('reminders').insert([{
          title: `စာချုပ်သက်တမ်းကုန်ဆုံးတော့မည် - ${tenantData?.name}`,
          description: `${propData?.name} (${propData?.room_number}) ၏ စာချုပ်သည် ${newContract.end_date} တွင် သက်တမ်းကုန်ဆုံးပါမည်။`,
          due_date: reminderDate.toISOString().split('T')[0],
          type: 'contract',
          related_id: contractData[0].id,
          status: 'pending'
        }]);

        // Create deposit entry
        const property = properties.find(p => p.id === propertyId);
        if (property) {
          await supabase.from('re_deposits').insert([{
            contract_id: contractData[0].id,
            amount: property.deposit_amount,
            payment_date: newContract.start_date,
            status: 'held'
          }]);
        }

        // Update property status to occupied
        await supabase.from('re_properties').update({ status: 'occupied' }).eq('id', propertyId);
      }
      
      setIsModalOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      alert('Error adding contract: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const screenshotFile = formData.get('screenshot') as File;
    let screenshotUrl = null;

    try {
      if (screenshotFile && screenshotFile.size > 0) {
        const fileName = `${Date.now()}_${screenshotFile.name}`;
        screenshotUrl = await uploadFile('screenshots', `payments/${fileName}`, screenshotFile);
      }

      const newPayment = {
        contract_id: formData.get('contract_id'),
        amount: Number(formData.get('amount')),
        payment_date: formData.get('payment_date'),
        method: formData.get('method'),
        screenshot_url: screenshotUrl || (editingItem ? editingItem.screenshot_url : null),
      };

      if (editingItem) {
        const { error } = await supabase.from('re_payments').update(newPayment).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('re_payments').insert([newPayment]);
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
        screenshot_url: screenshotUrl,
      };

      const { error: refundError } = await supabase.from('re_refunds').insert([newRefund]);
      if (refundError) throw refundError;

      // Update deposit status if fully refunded (or just mark as refunded if any refund is made)
      await supabase.from('re_deposits').update({ status: 'refunded' }).eq('id', selectedDeposit.id);

      setIsRefundModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert('Error adding refund: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const tabs = [
    { id: 'properties', label: BURMESE_LABELS.realEstate.properties, icon: Building2 },
    { id: 'tenants', label: BURMESE_LABELS.realEstate.tenants, icon: Users },
    { id: 'contracts', label: BURMESE_LABELS.realEstate.contracts, icon: FileText },
    { id: 'payments', label: BURMESE_LABELS.realEstate.payments, icon: CreditCard },
    { id: 'deposits', label: 'စပေါ်ငွေနှင့် ပြန်အမ်းငွေ', icon: CreditCard },
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
              {activeTab === 'deposits' && (
                <tr>
                  <th className="px-6 py-3 font-semibold">ရက်စွဲ</th>
                  <th className="px-6 py-3 font-semibold">အိမ်ငှား / အခန်း</th>
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors"
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                  {activeTab === 'tenants' && (
                    <>
                      <td className="px-6 py-4 font-medium">{item.name}</td>
                      <td className="px-6 py-4">{item.phone}</td>
                      <td className="px-6 py-4 text-slate-500">{item.nrc || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors"
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                  {activeTab === 'contracts' && (
                    <>
            <td className="px-6 py-4 font-medium">{item.re_tenants?.name}</td>
            <td className="px-6 py-4">{item.re_properties?.name} ({item.re_properties?.room_number})</td>
            <td className="px-6 py-4 text-sm">
              <div>{item.start_date} မှ {item.end_date}</div>
              {item.file_url && (
                <a 
                  href={item.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs mt-1"
                >
                  <ExternalLink size={12} />
                  စာချုပ်ဖိုင်ကြည့်မည်
                </a>
              )}
            </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          item.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {item.status === 'active' ? 'သက်တမ်းရှိ' : 'သက်တမ်းကုန်'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors"
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit size={18} />
                          </button>
                        </div>
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.screenshot_url && (
                            <a 
                              href={item.screenshot_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <ExternalLink size={18} />
                            </a>
                          )}
                          <button 
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors"
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                  {activeTab === 'deposits' && (
                    <>
                      <td className="px-6 py-4">{item.payment_date}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{item.re_contracts?.re_tenants?.name}</div>
                        <div className="text-xs text-slate-500">{item.re_contracts?.re_properties?.name} ({item.re_contracts?.re_properties?.room_number})</div>
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
                        {item.re_refunds && item.re_refunds.length > 0 ? (
                          <div className="space-y-1">
                            {item.re_refunds.map((r: any) => (
                              <div key={r.id} className="text-xs text-rose-600 font-bold">
                                -{formatCurrency(r.amount)} ({r.refund_date})
                              </div>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {item.status === 'held' && (
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
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <Modal 
        isOpen={isModalOpen && activeTab === 'properties'} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "အခန်းအချက်အလက်ပြင်မည်" : "အခန်းအသစ်ထည့်မည်"}
      >
        <form onSubmit={handleAddProperty} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အဆောက်အဦးအမည်</label>
            <input name="name" defaultValue={editingItem?.name} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="ဥပမာ - ရွှေဂုံတိုင်တိုက်ခန်း" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">အခန်းနံပါတ်</label>
              <input name="room_number" defaultValue={editingItem?.room_number} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="A-101" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">အလွှာ</label>
              <input name="floor_number" defaultValue={editingItem?.floor_number} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="3rd Floor" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">လစဉ်လခ (ကျပ်)</label>
            <input name="monthly_rent" type="number" defaultValue={editingItem?.monthly_rent} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="500000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">စပေါ်ငွေ (ကျပ်)</label>
            <input name="deposit_amount" type="number" defaultValue={editingItem?.deposit_amount} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="1000000" />
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
        isOpen={isModalOpen && activeTab === 'tenants'} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "အိမ်ငှားအချက်အလက်ပြင်မည်" : "အိမ်ငှားအသစ်ထည့်မည်"}
      >
        <form onSubmit={handleAddTenant} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အမည်</label>
            <input name="name" defaultValue={editingItem?.name} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="ဦးဘ" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ဖုန်းနံပါတ်</label>
            <input name="phone" defaultValue={editingItem?.phone} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="09xxxxxxxxx" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">မှတ်ပုံတင်အမှတ်</label>
            <input name="nrc" defaultValue={editingItem?.nrc} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="၁၂/မဂတ(နိုင်)xxxxxx" />
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
        isOpen={isModalOpen && activeTab === 'contracts'} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "စာချုပ်အချက်အလက်ပြင်မည်" : "စာချုပ်အသစ်ချုပ်မည်"}
      >
        <form onSubmit={handleAddContract} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အခန်းရွေးချယ်ရန်</label>
            <select name="property_id" defaultValue={editingItem?.property_id} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="">-- အခန်းရွေးပါ --</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.room_number})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အိမ်ငှားရွေးချယ်ရန်</label>
            <select name="tenant_id" defaultValue={editingItem?.tenant_id} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="">-- အိမ်ငှားရွေးပါ --</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">စာချုပ်အမျိုးအစား</label>
            <select name="type" defaultValue={editingItem?.type} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="monthly">လစဉ်</option>
              <option value="yearly">နှစ်ချုပ်</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">စတင်မည့်ရက်</label>
              <input name="start_date" type="date" defaultValue={editingItem?.start_date} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ကုန်ဆုံးမည့်ရက်</label>
              <input name="end_date" type="date" defaultValue={editingItem?.end_date} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">စာချုပ်ဖိုင် (Photo/PDF)</label>
            <input name="contract_file" type="file" accept="image/*,.pdf" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
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
        isOpen={isModalOpen && activeTab === 'payments'} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "ပေးချေမှုအချက်အလက်ပြင်မည်" : "ငွေပေးချေမှုအသစ်ထည့်မည်"}
      >
        <form onSubmit={handleAddPayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">စာချုပ်ရွေးချယ်ရန်</label>
            <select name="contract_id" defaultValue={editingItem?.contract_id} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="">-- စာချုပ်ရွေးပါ --</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>{c.re_tenants?.name} - {c.re_properties?.name} ({c.re_properties?.room_number})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပမာဏ (ကျပ်)</label>
            <input name="amount" type="number" defaultValue={editingItem?.amount} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="500000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပေးချေသည့်ရက်စွဲ</label>
            <input name="payment_date" type="date" defaultValue={editingItem?.payment_date || new Date().toISOString().split('T')[0]} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပေးချေမှုပုံစံ</label>
            <select name="method" defaultValue={editingItem?.method} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="cash">လက်ငင်း (Cash)</option>
              <option value="banking">ဘဏ်မှ (Mobile Banking)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ငွေလွှဲပြေစာ (Screenshot)</label>
            <input name="screenshot" type="file" accept="image/*" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
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
        isOpen={isRefundModalOpen} 
        onClose={() => setIsRefundModalOpen(false)}
        title="စပေါ်ငွေ ပြန်အမ်းမည်"
      >
        <form onSubmit={handleAddRefund} className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="text-sm text-blue-700">မူလစပေါ်ငွေ</div>
            <div className="text-xl font-bold text-blue-900">{formatCurrency(selectedDeposit?.amount || 0)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပြန်အမ်းမည့်ပမာဏ (ကျပ်)</label>
            <input 
              name="amount" 
              type="number" 
              defaultValue={selectedDeposit?.amount} 
              required 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပြန်အမ်းသည့်ရက်စွဲ</label>
            <input 
              name="refund_date" 
              type="date" 
              defaultValue={new Date().toISOString().split('T')[0]} 
              required 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အကြောင်းပြချက်</label>
            <textarea 
              name="reason" 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" 
              rows={3} 
              placeholder="ဥပမာ - အခန်းပျက်စီးမှုကြောင့် နှုတ်ယူခြင်း"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ငွေလွှဲပြေစာ (Screenshot)</label>
            <input name="screenshot" type="file" accept="image/*" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsRefundModalOpen(false)}>ပယ်ဖျက်မည်</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>ပြန်အမ်းမည်</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
