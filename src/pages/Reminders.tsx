import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, Clock, AlertTriangle, Plus, Trash2, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BURMESE_LABELS, formatDate, cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export default function Reminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchReminders();
  }, []);

  async function fetchReminders() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('status', { ascending: false }) // pending first
      .order('due_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching reminders:', error);
    } else {
      setReminders(data || []);
    }
    setLoading(false);
  }

  async function handleAddReminder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        throw new Error('ကျေးဇူးပြု၍ ပြန်လည် Log in ဝင်ပေးပါ။');
      }

      const newReminder = {
      title: formData.get('title'),
      description: formData.get('description'),
      due_date: formData.get('due_date'),
      type: formData.get('type'),
      status: 'pending',
      user_id: user.id
    };

      const { error } = await supabase.from('reminders').insert([newReminder]);
      if (error) throw error;
      
      setIsModalOpen(false);
      fetchReminders();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'pending' ? 'dismissed' : 'pending';
    const { error } = await supabase
      .from('reminders')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) alert('Error updating status: ' + error.message);
    else fetchReminders();
  }

  async function deleteReminder(id: string) {
    if (!confirm('ဤသတိပေးချက်ကို ဖျက်ပစ်ရန် သေချာပါသလား?')) return;
    
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id);
    
    if (error) alert('Error deleting reminder: ' + error.message);
    else fetchReminders();
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
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{BURMESE_LABELS.sidebar.reminders}</h1>
          <p className="text-slate-500">အရေးကြီးသော ရက်စွဲများ သတိပေးချက်</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          icon={<Plus size={20} />}
        >
          သတိပေးချက်အသစ်ထည့်မည်
        </Button>
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
            <div 
              key={reminder.id} 
              className={cn(
                "bg-white p-4 rounded-xl shadow-sm border transition-all flex items-center justify-between",
                reminder.status === 'dismissed' ? "border-slate-100 opacity-60" : "border-blue-100 bg-blue-50/30"
              )}
            >
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => toggleStatus(reminder.id, reminder.status)}
                  className={cn(
                    "p-3 rounded-full transition-colors",
                    reminder.status === 'dismissed' ? "bg-slate-100 text-slate-400" : "bg-amber-100 text-amber-600 hover:bg-amber-200"
                  )}
                >
                  {reminder.status === 'dismissed' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                </button>
                <div>
                  <h3 className={cn("font-bold text-slate-900", reminder.status === 'dismissed' && "text-slate-400 line-through")}>
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
                  {reminder.description && (
                    <p className="text-sm text-slate-500 mt-1">{reminder.description}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {reminder.status === 'pending' ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-600 hover:bg-blue-50"
                    onClick={() => toggleStatus(reminder.id, reminder.status)}
                  >
                    ပြီးစီးကြောင်းမှတ်သားမည်
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-slate-400 hover:bg-slate-100"
                    onClick={() => toggleStatus(reminder.id, reminder.status)}
                  >
                    ပြန်လည်ဖွင့်မည်
                  </Button>
                )}
                <button 
                  onClick={() => deleteReminder(reminder.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Reminder Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="သတိပေးချက်အသစ်ထည့်မည်"
      >
        <form onSubmit={handleAddReminder} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ခေါင်းစဉ်</label>
            <input name="title" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" placeholder="ဥပမာ - အင်ဂျင်ဝိုင်လဲရန်" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အမျိုးအစား</label>
            <select name="type" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none">
              <option value="contract">စာချုပ်သက်တမ်းကုန်ဆုံးရန်</option>
              <option value="engine_oil">အင်ဂျင်ဝိုင်လဲလှယ်ရန်</option>
              <option value="gear_oil">ဂီယာဝိုင်လဲလှယ်ရန်</option>
              <option value="license_renewal">လိုင်စင်သက်တမ်းတိုးရန်</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ရက်စွဲ</label>
            <input name="due_date" type="date" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">အသေးစိတ်အချက်အလက်</label>
            <textarea name="description" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none" rows={3} placeholder="အပိုဆောင်းအချက်အလက်များ (ရှိလျှင်)"></textarea>
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
