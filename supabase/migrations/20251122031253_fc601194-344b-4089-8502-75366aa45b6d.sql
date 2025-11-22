-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Create warehouses table
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id),
  unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
  reorder_level INTEGER DEFAULT 10,
  current_stock DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Create product_warehouse_stock table (stock per warehouse)
CREATE TABLE public.product_warehouse_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  quantity DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, warehouse_id)
);

-- Create receipts table (incoming stock)
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number TEXT NOT NULL UNIQUE,
  warehouse_id UUID REFERENCES public.warehouses(id),
  supplier_name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'waiting', 'ready', 'done', 'canceled')),
  notes TEXT,
  receipt_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES public.profiles(id)
);

-- Create receipt_items table
CREATE TABLE public.receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity DECIMAL(12,2) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create deliveries table (outgoing stock)
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_number TEXT NOT NULL UNIQUE,
  warehouse_id UUID REFERENCES public.warehouses(id),
  customer_name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'waiting', 'ready', 'done', 'canceled')),
  notes TEXT,
  delivery_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES public.profiles(id)
);

-- Create delivery_items table
CREATE TABLE public.delivery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity DECIMAL(12,2) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transfers table (internal transfers)
CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_number TEXT NOT NULL UNIQUE,
  from_warehouse_id UUID REFERENCES public.warehouses(id),
  to_warehouse_id UUID REFERENCES public.warehouses(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'waiting', 'ready', 'done', 'canceled')),
  notes TEXT,
  transfer_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES public.profiles(id),
  CHECK (from_warehouse_id != to_warehouse_id)
);

-- Create transfer_items table
CREATE TABLE public.transfer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES public.transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity DECIMAL(12,2) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create adjustments table (stock adjustments)
CREATE TABLE public.adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adjustment_number TEXT NOT NULL UNIQUE,
  warehouse_id UUID REFERENCES public.warehouses(id),
  product_id UUID REFERENCES public.products(id),
  counted_quantity DECIMAL(12,2) NOT NULL,
  system_quantity DECIMAL(12,2) NOT NULL,
  difference DECIMAL(12,2) NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'done', 'canceled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES public.profiles(id)
);

-- Create stock_ledger table (all stock movements)
CREATE TABLE public.stock_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('receipt', 'delivery', 'transfer_in', 'transfer_out', 'adjustment')),
  reference_id UUID NOT NULL,
  reference_number TEXT,
  quantity_change DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_warehouse_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for categories (all authenticated users can view, admins can modify)
CREATE POLICY "Authenticated users can view categories" ON public.categories FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update categories" ON public.categories FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete categories" ON public.categories FOR DELETE TO authenticated USING (TRUE);

-- RLS Policies for warehouses
CREATE POLICY "Authenticated users can view warehouses" ON public.warehouses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert warehouses" ON public.warehouses FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update warehouses" ON public.warehouses FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete warehouses" ON public.warehouses FOR DELETE TO authenticated USING (TRUE);

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update products" ON public.products FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete products" ON public.products FOR DELETE TO authenticated USING (TRUE);

-- RLS Policies for product_warehouse_stock
CREATE POLICY "Authenticated users can view stock" ON public.product_warehouse_stock FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert stock" ON public.product_warehouse_stock FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update stock" ON public.product_warehouse_stock FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete stock" ON public.product_warehouse_stock FOR DELETE TO authenticated USING (TRUE);

-- RLS Policies for receipts
CREATE POLICY "Authenticated users can view receipts" ON public.receipts FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert receipts" ON public.receipts FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update receipts" ON public.receipts FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete receipts" ON public.receipts FOR DELETE TO authenticated USING (TRUE);

-- RLS Policies for receipt_items
CREATE POLICY "Authenticated users can view receipt items" ON public.receipt_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert receipt items" ON public.receipt_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update receipt items" ON public.receipt_items FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete receipt items" ON public.receipt_items FOR DELETE TO authenticated USING (TRUE);

-- RLS Policies for deliveries
CREATE POLICY "Authenticated users can view deliveries" ON public.deliveries FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert deliveries" ON public.deliveries FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update deliveries" ON public.deliveries FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete deliveries" ON public.deliveries FOR DELETE TO authenticated USING (TRUE);

-- RLS Policies for delivery_items
CREATE POLICY "Authenticated users can view delivery items" ON public.delivery_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert delivery items" ON public.delivery_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update delivery items" ON public.delivery_items FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete delivery items" ON public.delivery_items FOR DELETE TO authenticated USING (TRUE);

-- RLS Policies for transfers
CREATE POLICY "Authenticated users can view transfers" ON public.transfers FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert transfers" ON public.transfers FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update transfers" ON public.transfers FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete transfers" ON public.transfers FOR DELETE TO authenticated USING (TRUE);

-- RLS Policies for transfer_items
CREATE POLICY "Authenticated users can view transfer items" ON public.transfer_items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert transfer items" ON public.transfer_items FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update transfer items" ON public.transfer_items FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete transfer items" ON public.transfer_items FOR DELETE TO authenticated USING (TRUE);

-- RLS Policies for adjustments
CREATE POLICY "Authenticated users can view adjustments" ON public.adjustments FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert adjustments" ON public.adjustments FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Authenticated users can update adjustments" ON public.adjustments FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can delete adjustments" ON public.adjustments FOR DELETE TO authenticated USING (TRUE);

-- RLS Policies for stock_ledger
CREATE POLICY "Authenticated users can view ledger" ON public.stock_ledger FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert ledger" ON public.stock_ledger FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'staff'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update product total stock
CREATE OR REPLACE FUNCTION public.update_product_total_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.products
  SET current_stock = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM public.product_warehouse_stock
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update product stock when warehouse stock changes
CREATE TRIGGER update_product_stock_on_warehouse_change
  AFTER INSERT OR UPDATE OR DELETE ON public.product_warehouse_stock
  FOR EACH ROW EXECUTE FUNCTION public.update_product_total_stock();

-- Create indexes for performance
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_stock ON public.products(current_stock);
CREATE INDEX idx_receipts_status ON public.receipts(status);
CREATE INDEX idx_receipts_warehouse ON public.receipts(warehouse_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_warehouse ON public.deliveries(warehouse_id);
CREATE INDEX idx_transfers_status ON public.transfers(status);
CREATE INDEX idx_stock_ledger_product ON public.stock_ledger(product_id);
CREATE INDEX idx_stock_ledger_warehouse ON public.stock_ledger(warehouse_id);
CREATE INDEX idx_stock_ledger_created ON public.stock_ledger(created_at DESC);