import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BURMESE_LABELS, formatDate, cn } from '@/lib/utils';

export default function Reminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReminders();
  }, []);

  async function fetchReminders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .order('due_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching reminders:', error);
    } else {
      setReminders(data || []);
    }
    setLoading(false);
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contract': return 'စာချုပ်သက်တမ်းကုန်ဆုံးရန်';
      case 'engine_oil': return 'အင်ဂျင်ဝိုင်လဲလှယ်ရန်';
      case 'gear_oil': return 'ဂီယာဝိုင်လဲလှယ်ရန်';
      case 'license_renewal': return 'လိုင်စင်သက်တမ်းတိုးရန်';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{BURMESE_LABELS.sidebar.reminders}</h1>
        <p className="text-slate-500">အရေးကြီးသော ရက်စွဲများ သတိပေးချက်</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500">{BURMESE_LABELS.common.loading}</div>
        ) : reminders.length === 0 ? (
          <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-100 text-center text-slate-500">
            <Bell className="mx-auto mb-4 text-slate-300" size={48} />
            သတိပေးချက် မရှိသေးပါ
          </div>
        ) : (
          reminders.map((reminder) => (
            <div key={reminder.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-full",
                  reminder.status === 'dismissed' ? "bg-slate-100 text-slate-400" : "bg-amber-100 text-amber-600"
                )}>
                  {reminder.status === 'dismissed' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div>
                  <h3 className={cn("font-bold", reminder.status === 'dismissed' && "text-slate-400 line-through")}>
                    {reminder.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatDate(reminder.due_date)}
                    </span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {getTypeLabel(reminder.type)}
                    </span>
                  </div>
                </div>
              </div>
              
              {reminder.status === 'pending' && (
                <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                  ပြီးစီးကြောင်းမှတ်သားမည်
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
