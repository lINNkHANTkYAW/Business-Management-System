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
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) throw error;

      const worksheet = XLSX.utils.json_to_sheet(data || []);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
      XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error(`Error exporting ${tableName}:`, error);
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
      ]
    },
    { 
      title: 'တက္ကစီနှင့် ဟိုက်ဂျက် အစီရင်ခံစာများ', 
      items: [
        { label: 'ယာဉ်များစာရင်း', table: 'th_vehicles', icon: CarFront },
        { label: 'ယာဉ်မောင်းများစာရင်း', table: 'th_drivers', icon: Users },
        { label: 'ပိုင်ရှင်ကြေးမှတ်တမ်း', table: 'th_fee_payments', icon: CreditCard },
        { label: 'ပြုပြင်ထိန်းသိမ်းမှုမှတ်တမ်း', table: 'th_maintenance', icon: CreditCard },
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
                    onClick={() => exportToExcel(item.table, item.label)}
                    loading={loading === item.table}
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
