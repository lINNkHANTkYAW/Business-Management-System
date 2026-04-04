import React from 'react';
import { AlertCircle, Key, ExternalLink } from 'lucide-react';

export function ConfigRequired() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
        <div className="inline-flex p-4 bg-amber-50 rounded-2xl mb-6">
          <AlertCircle className="text-amber-600" size={40} />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Supabase ချိတ်ဆက်ရန် လိုအပ်သည်</h1>
        
        <p className="text-slate-600 mb-8 leading-relaxed">
          ဤစနစ်ကို အသုံးပြုရန်အတွက် သင်၏ Supabase Project မှ URL နှင့် API Key တို့ကို ထည့်သွင်းပေးရန် လိုအပ်ပါသည်။
        </p>

        <div className="bg-slate-50 rounded-xl p-6 text-left mb-8 space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Key size={18} className="text-blue-600" />
            ထည့်သွင်းရမည့် အချက်အလက်များ
          </h3>
          <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
          </ul>
          <p className="text-xs text-slate-500 italic">
            * ဤအချက်အလက်များကို AI Studio ၏ <b>Secrets</b> panel တွင် ထည့်သွင်းပေးပါ။
          </p>
        </div>

        <a 
          href="https://supabase.com/dashboard" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          Supabase Dashboard သို့သွားရန်
          <ExternalLink size={18} />
        </a>
      </div>
    </div>
  );
}
