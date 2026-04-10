import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('my-MM', {
    style: 'currency',
    currency: 'MMK',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return format(d, 'dd/MM/yyyy');
}

export const BURMESE_LABELS = {
  common: {
    save: 'သိမ်းဆည်းမည်',
    cancel: 'ပယ်ဖျက်မည်',
    delete: 'ဖျက်မည်',
    edit: 'ပြင်ဆင်မည်',
    view: 'ကြည့်ရှုမည်',
    search: 'ရှာဖွေရန်',
    actions: 'လုပ်ဆောင်ချက်များ',
    status: 'အခြေအနေ',
    date: 'ရက်စွဲ',
    amount: 'ပမာဏ',
    description: 'အကြောင်းအရာ',
    loading: 'ခေတ္တစောင့်ဆိုင်းပေးပါ...',
    noData: 'ဒေတာမရှိပါ',
  },
  sidebar: {
    dashboard: 'ပင်မစာမျက်နှာ',
    realEstate: 'အိမ်ခြံမြေ',
    taxiHijet: 'တက္ကစီနှင့် ဟိုက်ဂျက်',
    reminders: 'သတိပေးချက်များ',
    reports: 'အစီရင်ခံစာများ',
    settings: 'ဆက်တင်များ',
    logout: 'ထွက်ရန်',
  },
  realEstate: {
    properties: 'အခန်းများ',
    tenants: 'အိမ်ငှားများ',
    contracts: 'စာချုပ်များ',
    payments: 'ငွေပေးချေမှုများ',
    expenses: 'အသုံးစရိတ်များ',
    meterReadings: 'မီတာခနှင့် အထွေထွေအသုံးစရိတ်',
    occupied: 'ငှားထားသည်',
    vacant: 'အားသည်',
    inactive: 'ရပ်ဆိုင်းထားသည်',
  },
  taxiHijet: {
    vehicles: 'ယာဉ်များ',
    drivers: 'ယာဉ်မောင်းများ',
    assignments: 'ယာဉ်တာဝန်ပေးမှု',
    fees: 'ပိုင်ရှင်ကြေး',
    maintenance: 'ပြုပြင်ထိန်းသိမ်းမှု',
    taxi: 'တက္ကစီ',
    hijet: 'ဟိုက်ဂျက်',
  },
  meterReading: {
    roomNo: 'အခန်းနံပါတ်',
    meterNow: 'ယခုလမီတာ',
    meterLast: 'ပြီးခဲ့သည့်လမီတာ',
    totalUnit: 'မီတာယူနစ်စုစုပေါင်း',
    unitCharge: 'မီတာခ (၅၅၀ ကျပ်)',
    commonCharge: 'ဘုံအသုံးစရိတ်',
    waterCharge: 'ရေဖိုး',
    serviceCharge: 'ဝန်ဆောင်ခ',
    totalAmount: 'စုစုပေါင်း ကျသင့်ငွေ',
  },
};
