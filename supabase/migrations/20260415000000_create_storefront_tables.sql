-- Storefront products (admin-managed)
CREATE TABLE public.storefront_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  stripe_product_id text,
  stripe_price_id text,
  price numeric NOT NULL,
  billing_interval text NOT NULL DEFAULT 'month',
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Storefront subscriptions (customer purchases)
CREATE TABLE public.storefront_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  product_id uuid NOT NULL REFERENCES public.storefront_products(id),
  customer_name text,
  customer_email text,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX ON public.storefront_subscriptions(user_id);
CREATE INDEX ON public.storefront_subscriptions(stripe_subscription_id);
CREATE INDEX ON public.storefront_products(code);

-- updated_at triggers
CREATE TRIGGER handle_updated_at_storefront_products
  BEFORE UPDATE ON public.storefront_products
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER handle_updated_at_storefront_subscriptions
  BEFORE UPDATE ON public.storefront_subscriptions
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

-- Enable RLS
ALTER TABLE public.storefront_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies: storefront_products
CREATE POLICY "Authenticated users can view storefront products"
  ON public.storefront_products
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS policies: storefront_subscriptions
CREATE POLICY "Users can view their own storefront subscriptions"
  ON public.storefront_subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own storefront subscriptions"
  ON public.storefront_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Seed products
INSERT INTO public.storefront_products (code, name, description, price, billing_interval, features) VALUES
  (
    'business_starter',
    'Javelina Business Starter',
    'Everything you need to get your business online with a fully managed website.',
    99.88,
    'month',
    '["Domain Registration", "SSL Certificates", "Javelina DNS", "Website Hosting (1–3 page site)", "Business Email", "Fully Managed Business Website"]'::jsonb
  ),
  (
    'business_pro',
    'Javelina Business Pro',
    'Premium business package with Microsoft 365 email and a custom AI agent.',
    157.77,
    'month',
    '["Domain Registration", "SSL Certificates", "Javelina DNS", "Microsoft 365 Email", "Business Website (1–5 pages)", "Custom AI Agent"]'::jsonb
  );
