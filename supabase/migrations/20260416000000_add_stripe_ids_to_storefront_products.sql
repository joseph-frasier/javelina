-- Add Stripe product and price IDs to storefront products
UPDATE public.storefront_products
SET stripe_product_id = 'prod_ULafV9yW6WDGiX',
    stripe_price_id = 'price_1TMtU8A8kaNOs7ry5ullsdvX'
WHERE code = 'business_starter';

UPDATE public.storefront_products
SET stripe_product_id = 'prod_ULafe1twEgo78B',
    stripe_price_id = 'price_1TMtUWA8kaNOs7rywKdXi6AA'
WHERE code = 'business_pro';
