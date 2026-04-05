-- SQL Schema for BMS Myanmar

-- 1. Profiles (Shared)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'staff')) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Real Estate Module
CREATE TABLE re_properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  floor_number TEXT,
  monthly_rent NUMERIC NOT NULL,
  deposit_amount NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('occupied', 'vacant', 'inactive')) DEFAULT 'vacant',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE re_tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  nrc TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE re_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES re_properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES re_tenants(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('monthly', 'yearly')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  file_url TEXT,
  status TEXT CHECK (status IN ('active', 'expired', 'terminated')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE re_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES re_contracts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  method TEXT CHECK (method IN ('cash', 'banking')) NOT NULL,
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE re_deposits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES re_contracts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('held', 'refunded')) DEFAULT 'held',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE re_refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deposit_id UUID REFERENCES re_deposits(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  refund_date DATE DEFAULT CURRENT_DATE,
  reason TEXT,
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE re_expense_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE re_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES re_expense_categories(id),
  amount NUMERIC NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Taxi & Hijet Module
CREATE TABLE th_vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT CHECK (type IN ('taxi', 'hijet')) NOT NULL,
  car_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  model TEXT,
  license_expiry DATE,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE th_drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  nrc TEXT NOT NULL UNIQUE,
  license_no TEXT NOT NULL,
  address TEXT,
  phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE th_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES th_vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES th_drivers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE th_fee_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES th_vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES th_drivers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  cycle_start DATE NOT NULL,
  cycle_end DATE NOT NULL,
  status TEXT CHECK (status IN ('paid', 'unpaid')) DEFAULT 'paid',
  screenshot_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE th_maintenance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES th_vehicles(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  type TEXT NOT NULL,
  total_cost NUMERIC NOT NULL,
  owner_share NUMERIC NOT NULL,
  driver_share NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Reminders (Shared)
CREATE TABLE reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  type TEXT CHECK (type IN ('contract', 'engine_oil', 'gear_oil', 'license_renewal')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'dismissed')) DEFAULT 'pending',
  related_id UUID, -- ID of the related contract or vehicle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
