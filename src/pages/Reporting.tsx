import React, { useState } from 'react';
import { FileDown, Building2, CarFront, Users, CreditCard } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { BURMESE_LABELS } from '../lib/utils';
import { Button } from '../components/ui/Button';

export default function Reporting() {
  const [loading, setLoading] = useState<string | null>(null);

  async function exportToExcel(tableName: string, fileName: string) {
    setLoading(tableName);
    try {
      let query = supabase.from(tableName);
      let selectQuery = '*';

      if (tableName === 're_contracts') {
        selectQuery = '*, re_properties(name, room_number), re_tenants(name)';
      } else if (tableName === 're_payments') {
        selectQuery = '*, re_contracts(re_tenants(name), re_properties(name, room_number))';
      } else if (tableName === 're_deposits') {
        selectQuery = '*, re_contracts(re_tenants(name), re_properties(name, room_number)), re_refunds(*)';
      } else if (tableName === 're_refunds') {
        selectQuery = '*, re_deposits(amount, re_contracts(re_tenants(name), re_properties(name, room_number)))';
      } else if (tableName === 'th_fee_payments') {
        selectQuery = '*, th_vehicles(name, car_number), th_drivers(name)';
      } else if (tableName === 'th_maintenance') {
        selectQuery = '*, th_vehicles(name, car_number)';
      } else if (tableName === 'th_deposits') {
        selectQuery = '*, th_vehicles(name, car_number), th_drivers(name), th_refunds(*)';
      } else if (tableName === 'th_refunds') {
        selectQuery = '*, th_deposits(amount, th_vehicles(name, car_number), th_drivers(name))';
      }

      const { data, error } = await query.select(selectQuery);
      if (error) throw error;

      let exportData = data || [];

      exportData = exportData.map(item => {
        if (tableName === 're_properties') {
          return {
            'အမည်': item.name,
            'အခန်းနံပါတ်': item.room_number,
            'ထပ်': item.floor_number || '',
            'လချင်းငှားရမ်းခ': item.monthly_rent,
            'စပေါ်ငွေ': item.deposit_amount,
            'အခြေအနေ': item.status === 'occupied' ? 'ငှားနေဆဲ' : item.status === 'vacant' ? 'ဗလာ' : 'ရပ်နားထား',
          };
        } else if (tableName === 're_tenants') {
          return {
            'အမည်': item.name,
            'ဖုန်းနံပါတ်': item.phone,
            'မှတ်ပုံတင်': item.nrc || '',
            'ဖန်တီးသောနေ့': item.created_at?.split('T')[0] || '',
          };
        } else if (tableName === 're_contracts') {
          const contract = item;
          return {
            'အိမ်ငှားအမည်': item.re_tenants?.name || '',
            'အခန်းအမည်': `${item.re_properties?.name || ''} (${item.re_properties?.room_number || ''})`,
            'စာချုပ်အမျိုးအစား': item.type === 'monthly' ? 'လစဉ်' : 'နှစ်တိုင်',
            'ငှားရမ်းစတင်': item.start_date,
            'ငှားရမ်းကုန်': item.end_date,
            'အခြေအနေ': item.status === 'active' ? 'သက်ရှိ' : item.status === 'expired' ? 'သက်တမ်းကုန်' : 'ရပ်ဆိုင်း',
          };
        } else if (tableName === 're_payments') {
          const contract = item.re_contracts;
          return {
            'အိမ်ငှားအမည်': contract?.re_tenants?.name || '',
            'အခန်းအမည်': `${contract?.re_properties?.name || ''} (${contract?.re_properties?.room_number || ''})`,
            'ပမာဏ': item.amount,
            'ပေးချေသည့်ရက်': item.payment_date,
            'ငွေပေးနည်း': item.method === 'cash' ? 'မင်ဂျင်' : 'ဘဏ်',
          };
        } else if (tableName === 'th_vehicles') {
          return {
            'ယာဉ်အမှတ်': item.car_number,
            'အမျိုးအစား': item.type === 'taxi' ? 'တက္ကစီ' : 'ဟိုက်ဂျက်',
            'အမည်/မော်ဒယ်': `${item.name}${item.model ? ` (${item.model})` : ''}`,
            'လိုင်စင်သက်တမ်းကုန်': item.license_expiry || '',
            'အခြေအနေ': item.status === 'active' ? 'အသုံးပြုဆဲ' : 'ရပ်နားထား',
          };
        } else if (tableName === 'th_drivers') {
          return {
            'အမည်': item.name,
            'ဖုန်းနံပါတ်': item.phone,
            'လိုင်စင်အမှတ်': item.license_no || '',
            'မှတ်ပုံတင်': item.nrc || '',
            'နေရပ်လိပ်စာ': item.address || '',
          };
        } else if (tableName === 'th_fee_payments') {
          return {
            'ယာဉ်အမည်': `${item.th_vehicles?.name || ''} (${item.th_vehicles?.car_number || ''})`,
            'ယာဉ်မောင်းအမည်': item.th_drivers?.name || '',
            'ပမာဏ': item.amount,
            'ပေးချေသည့်ရက်': item.payment_date,
            'ကာလစတင်': item.cycle_start || '',
            'ကာလကုန်': item.cycle_end || '',
          };
        } else if (tableName === 'th_maintenance') {
          return {
            'ယာဉ်အမည်': `${item.th_vehicles?.name || ''} (${item.th_vehicles?.car_number || ''})`,
            'ရက်စွဲ': item.date,
            'ပြုပြင်မှုအမျိုးအစား': item.type,
            'စုစုပေါင်းကုန်ကျ': item.total_cost,
            'ပိုင်ရှင်ကျခံ': item.owner_share || '',
          };
        }
        // Fallback for unhandled tables
        return item;
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
      XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error(`Error exporting ${tableName}:`, error);
      alert('Export failed. Please try again.');
    }
    setLoading(null);
  }

  async function exportCombinedDeposits(type: 're' | 'th', fileName: string) {
    const key = `${type}_combined_deposits`;
    setLoading(key);
    try {
      let data: any[] = [];
      let error: any = null;

      if (type === 're') {
        const result = await supabase
          .from('re_deposits')
          .select('*, re_contracts(re_tenants(name), re_properties(name, room_number)), re_refunds(*)')
          .order('payment_date', { ascending: false });
        data = result.data || [];
        error = result.error;
      } else {
        const result = await supabase
          .from('th_deposits')
          .select('*, th_vehicles(name, car_number), th_drivers(name), th_refunds(*)')
          .order('payment_date', { ascending: false });
        data = result.data || [];
        error = result.error;
      }

      if (error) throw error;

      const exportData = data.map(dep => {
        const refund = dep[`${type}_refunds`]?.[0] || null;
        if (type === 're') {
          const contract = dep.re_contracts;
          return {
            'အိမ်င်း': contract?.re_tenants?.name || '',
            'အခြန်အမှတ်': `${contract?.re_properties?.name || ''} (${contract?.re_properties?.room_number || ''})`,
            'စပေါ်ငွေ': dep.amount,
            'စပေါ်ငွေ ရက်စွဲ': dep.payment_date,
            'ပြန်အမ်းငွေ': refund?.amount || '',
            'ပြန်အမ်းငွေ ရက်စွဲ': refund?.refund_date || '',
          };
        } else {
          return {
            'ယာဉ်အမှတ်': `${dep.th_vehicles?.name || ''} (${dep.th_vehicles?.car_number || ''})`,
            'ယာဉ်မောင်း': dep.th_drivers?.name || '',
            'စပေါ်ငွေ': dep.amount,
            'စပေါ်ငွေ ရက်စွဲ': dep.payment_date,
            'ပြန်အမ်းငွေ': refund?.amount || '',
            'ပြန်အမ်းငွေ ရက်စွဲ': refund?.refund_date || '',
          };
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
      XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting combined deposits:', error);
      alert('Export failed. Please try again.');
    }
    setLoading(null);
  }

  const reports = [
    { 
      title: 'အိမ်ခြံမြေ အစီရင်ခံစာများ', 
      items: [
        { label: 'အခန်းများစာရင်း', table: 're_properties', icon: Building2 },
        { label: 'အိမ်ငှားများစာရင်း', table: 're_tenants', icon: Users },
        { label: 'စာချုပ်များစာရင်း', table: 're_contracts', icon: CreditCard },
        { label: 'ငွေပေးချေမှုမှတ်တမ်း', table: 're_payments', icon: CreditCard },
        { label: 'စပေါ်ငွေနှင့် ပြန်အမ်းငွေမှတ်တမ်း', table: 're_combined', icon: CreditCard },
      ]
    },
    { 
      title: 'တက္ကစီနှင့် ဟိုက်ဂျက် အစီရင်ခံစာများ', 
      items: [
        { label: 'ယာဉ်များစာရင်း', table: 'th_vehicles', icon: CarFront },
        { label: 'ယာဉ်မောင်းများစာရင်း', table: 'th_drivers', icon: Users },
        { label: 'ပိုင်ရှင်ကြေးမှတ်တမ်း', table: 'th_fee_payments', icon: CreditCard },
        { label: 'ပြုပြင်ထိန်းသိမ်းမှုမှတ်တမ်း', table: 'th_maintenance', icon: CreditCard },
        { label: 'စပေါ်ငွေနှင့် ပြန်အမ်းငွေမှတ်တမ်း', table: 'th_combined', icon: CreditCard },
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{BURMESE_LABELS.sidebar.reports}</h1>
        <p className="text-slate-500">Excel ဖိုင်များအဖြစ် ထုတ်ယူနိုင်ပါသည်</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {reports.map((section, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-6">{section.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} className="p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors flex flex-col gap-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <item.icon size={20} />
                    <span className="font-medium text-sm">{item.label}</span>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      if (item.table === 're_combined') {
                        exportCombinedDeposits('re', item.label);
                      } else if (item.table === 'th_combined') {
                        exportCombinedDeposits('th', item.label);
                      } else {
                        exportToExcel(item.table, item.label);
                      }
                    }}
                    loading={loading === item.table || loading === `${item.table.split('_')[0]}_combined_deposits`}
                    icon={<FileDown size={16} />}
                  >
                    Excel ထုတ်မည်
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
