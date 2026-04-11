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
  Eye,
  FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { BURMESE_LABELS, formatCurrency, cn, formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { uploadFile } from '@/lib/storage';
import { FileText as FileIcon, ExternalLink } from 'lucide-react';

export default function RealEstate() {
  const [activeTab, setActiveTab] = useState<'properties' | 'tenants' | 'contracts' | 'payments' | 'deposits' | 'meter-readings'>('properties');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCommonMeterModalOpen, setIsCommonMeterModalOpen] = useState(false);
  const [globalCommonCharge, setGlobalCommonCharge] = useState<number>(0);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingRefund, setEditingRefund] = useState<any>(null);
  const [isEPCModalOpen, setIsEPCModalOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
    if (activeTab === 'contracts' || activeTab === 'payments' || activeTab === 'deposits' || activeTab === 'meter-readings') {
      fetchDropdownData();
    }
    if (activeTab === 'meter-readings') {
      fetchLatestCommonCharge();
    }
  }, [activeTab, filterMonth, filterYear]);

  async function fetchLatestCommonCharge() {
    const startDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(filterYear, filterMonth, 0).getDate();
    const endDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${lastDay}`;

    const { data } = await supabase
      .from('re_common_meter_readings')
      .select('common_charge_per_room')
      .gte('reading_date', startDate)
      .lte('reading_date', endDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setGlobalCommonCharge(data.common_charge_per_room);
    } else {
      // If no reading for this month, maybe fetch the latest overall but don't force it?
      // For now, let's keep it 0 if not calculated for this month.
      setGlobalCommonCharge(0);
    }
  }

  async function fetchDropdownData() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data: props } = await supabase.from('re_properties').select('id, name, room_number, status, deposit_amount').eq('user_id', user.id).order('room_number');
    const { data: tens } = await supabase.from('re_tenants').select('id, name').eq('user_id', user.id).order('name');
    const { data: conts } = await supabase.from('re_contracts').select('id, re_properties(name, room_number), re_tenants(name)').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false });
    setProperties(props || []);
    setTenants(tens || []);
    setContracts(conts || []);
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
    if (activeTab === 'properties') {
      query = supabase.from('re_properties').select('*').eq('user_id', user.id).order('room_number');
    } else if (activeTab === 'tenants') {
      query = supabase.from('re_tenants').select('*').eq('user_id', user.id).order('name').order('created_at', { ascending: true });
    } else if (activeTab === 'contracts') {
      query = supabase.from('re_contracts').select('*, re_properties(name, room_number), re_tenants(name)').eq('user_id', user.id).order('created_at', { ascending: false });
    } else if (activeTab === 'payments') {
      query = supabase.from('re_payments').select('*, re_contracts(*, re_properties(name, room_number), re_tenants(name))').eq('user_id', user.id).order('payment_date', { ascending: false }).order('created_at', { ascending: false });
    } else if (activeTab === 'deposits') {
      query = supabase.from('re_deposits').select('*, re_contracts(*, re_properties(name, room_number), re_tenants(name)), re_refunds(*)').eq('user_id', user.id).order('created_at', { ascending: false });
    } else if (activeTab === 'meter-readings') {
      const startDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(filterYear, filterMonth, 0).getDate();
      const endDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${lastDay}`;
      
      const { data: props } = await supabase.from('re_properties').select('*').eq('user_id', user.id).order('room_number');
      const { data: readings } = await supabase.from('re_meter_readings').select('*')
        .eq('user_id', user.id)
        .gte('reading_date', startDate)
        .lte('reading_date', endDate);
      
      // Get the single latest reading before this month for EACH property
      // We'll fetch all previous readings and then pick the latest for each in JS
      const { data: allPrevReadings } = await supabase.from('re_meter_readings')
        .select('property_id, current_reading, reading_date')
        .eq('user_id', user.id)
        .lt('reading_date', startDate)
        .order('reading_date', { ascending: false });

      const combined = (props || []).map(p => {
        const reading = (readings || []).find(r => r.property_id === p.id);
        const lastReading = (allPrevReadings || []).find(r => r.property_id === p.id);
        return {
          ...p,
          reading,
          last_meter_from_prev: lastReading?.current_reading || 0
        };
      });
      setData(combined);
      setLoading(false);
      return;
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');

      const newProperty = {
      name: formData.get('name'),
      room_number: formData.get('room_number'),
      floor_number: formData.get('floor_number'),
      monthly_rent: Number(formData.get('monthly_rent')),
      deposit_amount: Number(formData.get('deposit_amount')),
      status: editingItem ? editingItem.status : 'vacant',
      user_id: user.id
    };

      const { error } = editingItem 
        ? await supabase.from('re_properties').update(newProperty).eq('id', editingItem.id)
        : await supabase.from('re_properties').insert([newProperty]);

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

  async function handleAddTenant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');
      const newTenant = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        nrc: formData.get('nrc'),
        user_id: user.id
      };

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
    
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.user) {
        throw new Error('Authentication error: ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');
      }
      const user = session.user;

      const propertyId = formData.get('property_id') as string;
      const contractFile = formData.get('contract_file') as File;
      let fileUrl = null;

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
        user_id: user.id
      };

      const { error: contractError, data: contractData } = editingItem 
        ? await supabase.from('re_contracts').update(newContract).eq('id', editingItem.id).select()
        : await supabase.from('re_contracts').insert([newContract]).select();
        
      if (contractError) throw contractError;
      if (!contractData || contractData.length === 0) {
        throw new Error('စာချုပ်သိမ်းဆည်းရာတွင် အမှားအယွင်းရှိပါသည်။ (No data returned)');
      }

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
          status: 'pending',
          user_id: user.id
        }]);

        // Create deposit entry
        const property = properties.find(p => p.id === propertyId);
        if (property) {
          await supabase.from('re_deposits').insert([{
            contract_id: contractData[0].id,
            amount: property.deposit_amount,
            payment_date: newContract.start_date,
            status: 'held',
            user_id: user.id
          }]);
        }

        // Update property status to occupied
        const { error: propUpdateError } = await supabase.from('re_properties')
          .update({ status: 'occupied' })
          .eq('id', propertyId)
          .eq('user_id', user.id);
        
        if (propUpdateError) {
          console.error('Error updating property status:', propUpdateError);
        }
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

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');
      }
      const screenshotFile = formData.get('screenshot') as File;
      let screenshotUrl = null;

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
        user_id: user.id
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

  async function handleAddDeposit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');
      }
      const newDeposit = {
        contract_id: formData.get('contract_id'),
        amount: Number(formData.get('amount')),
        payment_date: formData.get('payment_date'),
        status: editingItem ? editingItem.status : 'held',
        user_id: user.id
      };

      if (editingItem) {
        const { error } = await supabase.from('re_deposits').update(newDeposit).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('re_deposits').insert([newDeposit]);
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

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');
      }

      const screenshotFile = formData.get('screenshot') as File;
      let screenshotUrl = null;

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
        const { error: refundError } = await supabase.from('re_refunds').update(newRefund).eq('id', editingRefund.id);
        if (refundError) throw refundError;
      } else {
        const { error: refundError } = await supabase.from('re_refunds').insert([newRefund]);
        if (refundError) throw refundError;
      }

      // Update deposit status if fully refunded (or just mark as refunded if any refund is made)
      await supabase.from('re_deposits').update({ status: 'refunded' }).eq('id', selectedDeposit.id);

      setIsRefundModalOpen(false);
      setEditingRefund(null);
      fetchData();
    } catch (error: any) {
      alert('Error adding refund: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddMeterReading(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');

      const meterReading = {
        property_id: formData.get('property_id'),
        reading_date: formData.get('reading_date'),
        previous_reading: Number(formData.get('previous_reading')),
        current_reading: Number(formData.get('current_reading')),
        unit_price: 550,
        water_charge: Number(formData.get('water_charge')),
        service_charge: Number(formData.get('service_charge')),
        common_charge: Number(formData.get('common_charge')),
        total_amount: Number(formData.get('total_amount')),
        user_id: user.id
      };

      const { error } = editingItem 
        ? await supabase.from('re_meter_readings').update(meterReading).eq('id', editingItem.id)
        : await supabase.from('re_meter_readings').insert([meterReading]);

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

  async function handleOpenComparison(epcData: any) {
    const startDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(filterYear, filterMonth, 0).getDate();
    const endDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${lastDay}`;

    // Fetch the latest common reading for this month
    const { data: commonData } = await supabase
      .from('re_common_meter_readings')
      .select('*')
      .gte('reading_date', startDate)
      .lte('reading_date', endDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setComparisonData({
      common: commonData,
      epc: epcData,
      month: filterMonth,
      year: filterYear
    });
    setIsComparisonModalOpen(true);
  }

  const tabs = [
    { id: 'properties', label: BURMESE_LABELS.realEstate.properties, icon: Building2 },
    { id: 'tenants', label: BURMESE_LABELS.realEstate.tenants, icon: Users },
    { id: 'contracts', label: BURMESE_LABELS.realEstate.contracts, icon: FileText },
    { id: 'payments', label: BURMESE_LABELS.realEstate.payments, icon: CreditCard },
    { id: 'deposits', label: 'စပေါ်ငွေနှင့် ပြန်အမ်းငွေ', icon: CreditCard },
    { id: 'meter-readings', label: BURMESE_LABELS.realEstate.meterReadings, icon: FileText },
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
           activeTab === 'payments' ? 'ငွေပေးချေမှုအသစ်ထည့်မည်' :
           activeTab === 'meter-readings' ? 'မီတာခအသစ်ထည့်မည်' :
           'စပေါ်ငွေအသစ်ထည့်မည်'}
        </Button>
      </header>

      {activeTab === 'meter-readings' && (
        <div className="flex justify-start mb-4">
          <Button 
            variant="secondary"
            onClick={() => setIsCommonMeterModalOpen(true)}
            icon={<CreditCard size={18} />}
          >
            ဘုံမီတာတွက်ရန်
          </Button>

          <Button 
            variant="secondary"
            onClick={() => setIsEPCModalOpen(true)}
            icon={<CreditCard size={18} />}
          >
            EPC Meter နှိုင်းယှဉ်ရန်
          </Button>
          
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 border rounded-lg shadow-sm">
            <select 
              value={filterMonth} 
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="outline-none bg-transparent text-sm font-medium"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Intl.DateTimeFormat('my-MM', { month: 'long' }).format(new Date(2000, i))}
                </option>
              ))}
            </select>
            <select 
              value={filterYear} 
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="outline-none bg-transparent text-sm font-medium border-l pl-2"
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
        <div className="flex min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 lg:px-6 py-3 font-medium transition-colors border-b-2 whitespace-nowrap",
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
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={BURMESE_LABELS.common.search}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          {activeTab === 'meter-readings' && (
            <div className="flex gap-2">
              <select 
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} လ</option>
                ))}
              </select>
              <select 
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year} ခုနှစ်</option>;
                })}
              </select>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">{BURMESE_LABELS.common.loading}</div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Building2 className="mx-auto mb-4 text-slate-300" size={48} />
            {BURMESE_LABELS.common.noData}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-0">
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
              {activeTab === 'meter-readings' && (
                <tr>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.meterReading.roomNo}</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.meterReading.meterNow}</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.meterReading.meterLast}</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.meterReading.totalUnit}</th>
                  <th className="px-6 py-3 font-semibold">{BURMESE_LABELS.meterReading.totalAmount}</th>
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
                          <button 
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            onClick={() => handleDeleteItem('re_properties', item.id)}
                            title="ဖျက်မည်"
                          >
                            <Trash2 size={18} />
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
                          <button 
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            onClick={() => handleDeleteItem('re_tenants', item.id)}
                            title="ဖျက်မည်"
                          >
                            <Trash2 size={18} />
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
                          <button 
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            onClick={() => handleDeleteItem('re_contracts', item.id)}
                            title="ဖျက်မည်"
                          >
                            <Trash2 size={18} />
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
                          <button 
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            onClick={() => handleDeleteItem('re_payments', item.id)}
                            title="ဖျက်မည်"
                          >
                            <Trash2 size={18} />
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
                       <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
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
                          <div className="flex items-center gap-2">
                            <button 
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors"
                              title="စပေါ်ငွေ ပြင်ဆင်မည်"
                              onClick={() => {
                                setEditingItem(item);
                                setIsModalOpen(true);
                              }}
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                              title="ဖျက်မည်"
                              onClick={() => handleDeleteItem('re_deposits', item.id)}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </>
                  )}
                  {activeTab === 'meter-readings' && (
                    <>
                      <td className="px-6 py-4 font-medium">
                        {item.name} ({item.room_number})
                        {item.reading && <div className="text-xs text-slate-500">{formatDate(item.reading.reading_date)}</div>}
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {item.reading ? (
                          <span className="text-amber-600">{item.reading.current_reading}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {item.reading ? item.reading.previous_reading : item.last_meter_from_prev}
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-600">
                        {item.reading ? `${item.reading.current_reading - item.reading.previous_reading} Units` : '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600">
                        {item.reading ? formatCurrency(item.reading.total_amount) : (
                          <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-700 rounded-full">မထည့်ရသေးပါ</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.reading ? (
                            <>
                              <button 
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-colors"
                                onClick={() => {
                                  setEditingItem(item.reading);
                                  setIsModalOpen(true);
                                }}
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                onClick={() => handleDeleteItem('re_meter_readings', item.reading.id)}
                                title="ဖျက်မည်"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="secondary"
                              onClick={() => {
                                setEditingItem({ property_id: item.id, previous_reading: item.last_meter_from_prev });
                                setIsModalOpen(true);
                              }}
                            >
                              အသစ်ထည့်မည်
                            </Button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
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
              {properties.filter((p: any) => p.status === 'vacant' || p.id === editingItem?.property_id).map(p => (
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
        isOpen={isModalOpen && activeTab === 'deposits'} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "စပေါ်ငွေအချက်အလက်ပြင်မည်" : "စပေါ်ငွေအသစ်ထည့်မည်"}
      >
        <form onSubmit={handleAddDeposit} className="space-y-4">
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
            <label className="block text-sm font-medium text-slate-700 mb-1">စပေါ်ငွေပမာဏ (ကျပ်)</label>
            <input name="amount" type="number" defaultValue={editingItem?.amount} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="1000000" />
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
        isOpen={isRefundModalOpen} 
        onClose={() => {
          setIsRefundModalOpen(false);
          setEditingRefund(null);
        }}
        title={editingRefund ? "စပေါ်ငွေ ပြန်အမ်းငွေ ပြင်ဆင်မည်" : "စပေါ်ငွေ ပြန်အမ်းမည်"}
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
              defaultValue={editingRefund?.amount} 
              max={selectedDeposit?.amount}
              required 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ပြန်အမ်းသည့်ရက်စွဲ</label>
            <input 
              name="refund_date" 
              type="date" 
              defaultValue={editingRefund?.refund_date || new Date().toISOString().split('T')[0]} 
              required 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အကြောင်းပြချက်</label>
            <textarea 
              name="reason" 
              defaultValue={editingRefund?.reason}
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
            <Button type="button" variant="secondary" className="flex-1" onClick={() => {
              setIsRefundModalOpen(false);
              setEditingRefund(null);
            }}>ပယ်ဖျက်မည်</Button>
            <Button type="submit" className="flex-1" loading={isSubmitting}>သိမ်းဆည်းမည်</Button>
          </div>
        </form>
      </Modal>
      <Modal 
        isOpen={isModalOpen && activeTab === 'meter-readings'} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        title={editingItem ? "မီတာခအချက်အလက်ပြင်မည်" : "မီတာခအသစ်ထည့်မည်"}
      >
        <MeterReadingForm 
          editingItem={editingItem}
          properties={properties}
          onSubmit={handleAddMeterReading}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          isSubmitting={isSubmitting}
          globalCommonCharge={globalCommonCharge}
          selectedMonth={filterMonth}
          selectedYear={filterYear}
        />
      </Modal>

      <Modal
        isOpen={isCommonMeterModalOpen}
        onClose={() => setIsCommonMeterModalOpen(false)}
        title="ဘုံမီတာတွက်ရန်"
      >
        <CommonMeterModal 
          mode="common"
          onSave={(value: number) => {
            setGlobalCommonCharge(value);
            setIsCommonMeterModalOpen(false);
          }}
          onCancel={() => setIsCommonMeterModalOpen(false)}
          selectedMonth={filterMonth}
          selectedYear={filterYear}
        />
      </Modal>

      <Modal
        isOpen={isEPCModalOpen}
        onClose={() => setIsEPCModalOpen(false)}
        title="EPC Meter နှိုင်းယှဉ်ရန်"
      >
        <CommonMeterModal 
          mode="epc"
          onSave={(epcData: any) => {
            handleOpenComparison(epcData);
            setIsEPCModalOpen(false);
          }}
          onCancel={() => setIsEPCModalOpen(false)}
          selectedMonth={filterMonth}
          selectedYear={filterYear}
        />
      </Modal>

      <Modal
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
        title="မီတာနှိုင်းယှဉ်ချက်"
      >
        {comparisonData && (
          <EPCComparisonModal 
            data={comparisonData} 
            onClose={() => setIsComparisonModalOpen(false)} 
          />
        )}
      </Modal>
    </div>
  );
}

function MeterReadingForm({ editingItem, properties, onSubmit, onCancel, isSubmitting, globalCommonCharge, selectedMonth, selectedYear }: any) {
  const defaultDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const [formData, setFormData] = useState({
    property_id: editingItem?.property_id || '',
    reading_date: editingItem?.reading_date || defaultDate,
    previous_reading: editingItem?.previous_reading || 0,
    current_reading: editingItem?.current_reading || 0,
    water_charge: editingItem?.water_charge || 0,
    service_charge: editingItem?.service_charge || 0,
    common_charge: editingItem?.common_charge || globalCommonCharge || 0,
    total_amount: editingItem?.total_amount || 0
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        property_id: editingItem.property_id || '',
        reading_date: editingItem.reading_date || defaultDate,
        previous_reading: editingItem.previous_reading || 0,
        current_reading: editingItem.current_reading || 0,
        water_charge: editingItem.water_charge || 0,
        service_charge: editingItem.service_charge || 0,
        common_charge: editingItem.common_charge || 0,
        total_amount: editingItem.total_amount || 0
      });
    } else {
      setFormData({
        property_id: '',
        reading_date: defaultDate,
        previous_reading: 0,
        current_reading: 0,
        water_charge: 0,
        service_charge: 0,
        common_charge: globalCommonCharge || 0,
        total_amount: 0
      });
    }
  }, [editingItem, globalCommonCharge, defaultDate]);

  useEffect(() => {
    if (!editingItem && formData.property_id) {
      fetchPreviousReading(formData.property_id);
    }
  }, [formData.property_id]);

  async function fetchPreviousReading(propertyId: string) {
    const { data, error } = await supabase
      .from('re_meter_readings')
      .select('current_reading')
      .eq('property_id', propertyId)
      .order('reading_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (data && !error) {
      setFormData(prev => ({ ...prev, previous_reading: data.current_reading }));
    } else {
      setFormData(prev => ({ ...prev, previous_reading: 0 }));
    }
  }

  useEffect(() => {
    const units = Math.max(0, formData.current_reading - formData.previous_reading);
    const total = (units * 550) + Number(formData.water_charge) + Number(formData.service_charge) + Number(formData.common_charge);
    setFormData(prev => ({ ...prev, total_amount: total }));
  }, [formData.previous_reading, formData.current_reading, formData.water_charge, formData.service_charge, formData.common_charge]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{BURMESE_LABELS.meterReading.roomNo}</label>
        <select 
          name="property_id" 
          value={formData.property_id}
          onChange={(e) => setFormData({...formData, property_id: e.target.value})}
          required 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
        >
          <option value="">အခန်းရွေးချယ်ပါ</option>
          {properties.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name} ({p.room_number})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">ရက်စွဲ</label>
        <input 
          type="date" 
          name="reading_date" 
          value={formData.reading_date}
          onChange={(e) => setFormData({...formData, reading_date: e.target.value})}
          required 
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{BURMESE_LABELS.meterReading.meterLast}</label>
          <input 
            type="number" 
            name="previous_reading" 
            value={formData.previous_reading}
            onChange={(e) => setFormData({...formData, previous_reading: Number(e.target.value)})}
            required 
            className="w-full px-4 py-2 border rounded-lg bg-slate-50 outline-none" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{BURMESE_LABELS.meterReading.meterNow}</label>
          <input 
            type="number" 
            name="current_reading" 
            value={formData.current_reading}
            onChange={(e) => setFormData({...formData, current_reading: Number(e.target.value)})}
            required 
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" 
          />
        </div>
      </div>
      <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center text-blue-700 font-bold mb-4">
        <span>{BURMESE_LABELS.meterReading.totalUnit}</span>
        <span>{Math.max(0, formData.current_reading - formData.previous_reading)} Units</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{BURMESE_LABELS.meterReading.waterCharge}</label>
          <input 
            type="number" 
            name="water_charge" 
            value={formData.water_charge}
            onChange={(e) => setFormData({...formData, water_charge: Number(e.target.value)})}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{BURMESE_LABELS.meterReading.serviceCharge}</label>
          <input 
            type="number" 
            name="service_charge" 
            value={formData.service_charge}
            onChange={(e) => setFormData({...formData, service_charge: Number(e.target.value)})}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{BURMESE_LABELS.meterReading.commonCharge}</label>
          <input 
            type="number" 
            name="common_charge" 
            value={formData.common_charge}
            onChange={(e) => setFormData({...formData, common_charge: Number(e.target.value)})}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" 
          />
        </div>
      </div>
      <div className="pt-2 border-t mt-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-600 font-medium">{BURMESE_LABELS.meterReading.totalAmount}</span>
          <span className="text-xl font-bold text-emerald-600">{formatCurrency(formData.total_amount)}</span>
          <input type="hidden" name="total_amount" value={formData.total_amount} />
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>ပယ်ဖျက်မည်</Button>
          <Button type="submit" className="flex-1" loading={isSubmitting}>သိမ်းဆည်းမည်</Button>
        </div>
      </div>
    </form>
  );
}

function CommonMeterModal({ onSave, onCancel, selectedMonth, selectedYear, mode = 'common' }: any) {
  const selectedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const tableName = mode === 'common' ? 're_common_meter_readings' : 're_epc_meter_readings';
  
  const [readings, setReadings] = useState([
    { building: 'A', floor: 'Floor 1', last: 0, now: 0 },
    { building: 'A', floor: 'Floor 2', last: 0, now: 0 },
    { building: 'A', floor: 'Floor 3', last: 0, now: 0 },
    { building: 'B', floor: 'Floor 1', last: 0, now: 0 },
    { building: 'B', floor: 'Floor 2', last: 0, now: 0 },
    { building: 'B', floor: 'Floor 3', last: 0, now: 0 },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchLastReadings();
  }, [mode, selectedMonth, selectedYear]);

  async function fetchLastReadings() {
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;

    // 1. Try to fetch the entry for the SELECTED month
    const { data: currentMonth } = await supabase
      .from(tableName)
      .select('*')
      .gte('reading_date', startDate)
      .lte('reading_date', endDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentMonth) {
      setReadings([
        { building: 'A', floor: 'Floor 1', last: currentMonth.a_f1_last, now: currentMonth.a_f1_now },
        { building: 'A', floor: 'Floor 2', last: currentMonth.a_f2_last, now: currentMonth.a_f2_now },
        { building: 'A', floor: 'Floor 3', last: currentMonth.a_f3_last, now: currentMonth.a_f3_now },
        { building: 'B', floor: 'Floor 1', last: currentMonth.b_f1_last, now: currentMonth.b_f1_now },
        { building: 'B', floor: 'Floor 2', last: currentMonth.b_f2_last, now: currentMonth.b_f2_now },
        { building: 'B', floor: 'Floor 3', last: currentMonth.b_f3_last, now: currentMonth.b_f3_now },
      ]);
      return;
    }

    // 2. If no entry for this month, find the LATEST entry BEFORE this month to pre-fill "last" fields
    const { data: previous } = await supabase
      .from(tableName)
      .select('*')
      .lt('reading_date', startDate)
      .order('reading_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previous) {
      setReadings([
        { building: 'A', floor: 'Floor 1', last: previous.a_f1_now, now: 0 },
        { building: 'A', floor: 'Floor 2', last: previous.a_f2_now, now: 0 },
        { building: 'A', floor: 'Floor 3', last: previous.a_f3_now, now: 0 },
        { building: 'B', floor: 'Floor 1', last: previous.b_f1_now, now: 0 },
        { building: 'B', floor: 'Floor 2', last: previous.b_f2_now, now: 0 },
        { building: 'B', floor: 'Floor 3', last: previous.b_f3_now, now: 0 },
      ]);
    } else {
      // Reset if no history at all
      setReadings([
        { building: 'A', floor: 'Floor 1', last: 0, now: 0 },
        { building: 'A', floor: 'Floor 2', last: 0, now: 0 },
        { building: 'A', floor: 'Floor 3', last: 0, now: 0 },
        { building: 'B', floor: 'Floor 1', last: 0, now: 0 },
        { building: 'B', floor: 'Floor 2', last: 0, now: 0 },
        { building: 'B', floor: 'Floor 3', last: 0, now: 0 },
      ]);
    }
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');

      const totalUnits = readings.reduce((acc, r) => acc + Math.max(0, r.now - r.last), 0);
      const totalCost = totalUnits * 550;
      
      const record: any = {
        user_id: user.id,
        reading_date: selectedDate,
        a_f1_last: readings[0].last, a_f1_now: readings[0].now,
        a_f2_last: readings[1].last, a_f2_now: readings[1].now,
        a_f3_last: readings[2].last, a_f3_now: readings[2].now,
        b_f1_last: readings[3].last, b_f1_now: readings[3].now,
        b_f2_last: readings[4].last, b_f2_now: readings[4].now,
        b_f3_last: readings[5].last, b_f3_now: readings[5].now,
        total_units: totalUnits,
        total_cost: totalCost
      };

      if (mode === 'common') {
        record.common_charge_per_room = Math.round(totalCost / 21);
      }

      const { data: savedData, error } = await supabase.from(tableName).insert([record]).select().single();
      if (error) throw error;
      
      onSave(mode === 'common' ? record.common_charge_per_room : savedData);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalUnits = readings.reduce((acc, r) => acc + Math.max(0, r.now - r.last), 0);
  const totalCost = totalUnits * 550;
  const commonCharge = Math.round(totalCost / 21);

  const handleUpdate = (index: number, field: 'last' | 'now', value: number) => {
    const newReadings = [...readings];
    newReadings[index][field] = value;
    setReadings(newReadings);
  };

  return (
    <div className="space-y-4">
      <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
        {readings.map((r, i) => (
          <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-2">
            <div className="font-bold text-slate-700">Building {r.building} - {r.floor}</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">ပြီးခဲ့သည့်လမီတာ</label>
                <input 
                  type="number" 
                  value={r.last || ''} 
                  onChange={(e) => handleUpdate(i, 'last', Number(e.target.value))}
                  className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">ယခုလမီတာ</label>
                <input 
                  type="number" 
                  value={r.now || ''} 
                  onChange={(e) => handleUpdate(i, 'now', Number(e.target.value))}
                  className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 outline-none" 
                />
              </div>
            </div>
            <div className="text-xs text-blue-600 font-medium">
              ယူနစ်စုစုပေါင်း: {Math.max(0, r.now - r.last)}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-slate-600">
          <span>ယူနစ်စုစုပေါင်း:</span>
          <span className="font-bold">{totalUnits} Units</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>မီတာခစုစုပေါင်း:</span>
          <span className="font-bold text-blue-600">{formatCurrency(totalCost)}</span>
        </div>
        {mode === 'common' && (
          <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
            <span className="text-emerald-700 font-bold">ဘုံအသုံးစရိတ် (Price / 21):</span>
            <span className="text-xl font-bold text-emerald-600">{formatCurrency(commonCharge)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>ပယ်ဖျက်မည်</Button>
        <Button className="flex-1" onClick={handleSave} loading={isSaving}>
          {mode === 'common' ? 'သိမ်းဆည်းမည်' : 'နှိုင်းယှဉ်မည်'}
        </Button>
      </div>
    </div>
  );
}

function EPCComparisonModal({ data, onClose }: any) {
  const common = data.common;
  const epc = data.epc;

  const handleDownload = () => {
    const reportData = [
      { 'အကြောင်းအရာ': 'Building A - Floor 1', 'Common Units': common?.a_f1_now - common?.a_f1_last || 0, 'EPC Units': epc.a_f1_now - epc.a_f1_last },
      { 'အကြောင်းအရာ': 'Building A - Floor 2', 'Common Units': common?.a_f2_now - common?.a_f2_last || 0, 'EPC Units': epc.a_f2_now - epc.a_f2_last },
      { 'အကြောင်းအရာ': 'Building A - Floor 3', 'Common Units': common?.a_f3_now - common?.a_f3_last || 0, 'EPC Units': epc.a_f3_now - epc.a_f3_last },
      { 'အကြောင်းအရာ': 'Building B - Floor 1', 'Common Units': common?.b_f1_now - common?.b_f1_last || 0, 'EPC Units': epc.b_f1_now - epc.b_f1_last },
      { 'အကြောင်းအရာ': 'Building B - Floor 2', 'Common Units': common?.b_f2_now - common?.b_f2_last || 0, 'EPC Units': epc.b_f2_now - epc.b_f2_last },
      { 'အကြောင်းအရာ': 'Building B - Floor 3', 'Common Units': common?.b_f3_now - common?.b_f3_last || 0, 'EPC Units': epc.b_f3_now - epc.b_f3_last },
      { 'အကြောင်းအရာ': '---', 'Common Units': '---', 'EPC Units': '---' },
      { 
        'အကြောင်းအရာ': 'စုစုပေါင်း ယူနစ်', 
        'Common Units': common?.total_units || 0, 
        'EPC Units': epc.total_units 
      },
      { 
        'အကြောင်းအရာ': 'စုစုပေါင်း ကုန်ကျစရိတ်', 
        'Common Units': common?.total_cost || 0, 
        'EPC Units': epc.total_cost 
      },
      { 
        'အကြောင်းအရာ': 'ကွာခြားချက် (Loss/Gain)', 
        'Common Units': '', 
        'EPC Units': (epc.total_units - (common?.total_units || 0)) + ' Units' 
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comparison');
    XLSX.writeFile(workbook, `EPC_Comparison_${data.month}_${data.year}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {!common && (
        <div className="p-4 bg-amber-50 text-amber-700 rounded-lg flex items-start gap-3">
          <AlertCircle className="shrink-0" size={20} />
          <p className="text-sm">ဤလအတွက် ဘုံမီတာတွက်ချက်မှု မရှိသေးပါ။ EPC မီတာနှင့်သာ ပြသထားပါသည်။</p>
        </div>
      )}

      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-2 text-left">အကြောင်းအရာ</th>
              <th className="px-4 py-2 text-right">Building Meter</th>
              <th className="px-4 py-2 text-right">EPC Meter</th>
              <th className="px-4 py-2 text-right">ကွာခြားချက်</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="px-4 py-3 font-medium text-slate-700">ယူနစ်စုစုပေါင်း</td>
              <td className="px-4 py-3 text-right font-bold text-blue-600">{common?.total_units || 0}</td>
              <td className="px-4 py-3 text-right font-bold text-amber-600">{epc.total_units}</td>
              <td className="px-4 py-3 text-right font-bold text-rose-600">{epc.total_units - (common?.total_units || 0)}</td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-medium text-slate-700">ကုန်ကျစရိတ်စုစုပေါင်း</td>
              <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(common?.total_cost || 0)}</td>
              <td className="px-4 py-3 text-right font-bold text-amber-600">{formatCurrency(epc.total_cost)}</td>
              <td className="px-4 py-3 text-right font-bold text-rose-600">{formatCurrency(epc.total_cost - (common?.total_cost || 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose}>ပိတ်မည်</Button>
        <Button className="flex-1" onClick={handleDownload} icon={<FileDown size={18} />}>Excel ထုတ်ယူမည်</Button>
      </div>
    </div>
  );
}
