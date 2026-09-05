-- Subscription metadata for digital account and activation-link products.
alter table public.products
  add column if not exists subscription_type text not null default 'none',
  add column if not exists delivery_payload text;

alter table public.products
  drop constraint if exists products_subscription_type_check;

alter table public.products
  add constraint products_subscription_type_check
  check (subscription_type in ('shared_account', 'private_profile', 'full_account', 'activation_link', 'none'));

-- Keep the delivery payload server/admin-only. Public clients receive only the subscription type.
revoke select on public.products from anon, authenticated;
grant select (
  id, name, slug, description, short_description, price, compare_price,
  category_id, file_name, file_type, file_size, version, tags, subscription_type,
  featured, published, sales_count, rating_avg, rating_count, created_at, updated_at
) on public.products to anon, authenticated;

insert into public.categories (id, name, slug, description, sort_order)
values
  ('11111111-1111-1111-1111-111111111111', 'Streaming', 'streaming', 'اشتراكات الترفيه والبث الرقمي: Netflix وShahid VIP وPrime Video وDisney+.', 11),
  ('11111111-1111-1111-1111-111111111112', 'AI & Digital Tools', 'ai-digital-tools', 'أدوات الذكاء الاصطناعي والإنتاجية مثل ChatGPT+ وCanva Pro.', 12)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.products (
  name, slug, description, short_description, price, category_id, file_type, version,
  tags, subscription_type, featured, published
)
values
  ('Netflix Premium', 'netflix-premium', 'اشتراك Netflix رقمي مع تسليم فوري وتعليمات استخدام واضحة.', 'Netflix Premium مع تسليم فوري.', 1200, '11111111-1111-1111-1111-111111111111', 'subscription', '1.0', array['Netflix', 'Streaming', 'ترفيه'], 'shared_account', true, true),
  ('Shahid VIP', 'shahid-vip', 'اشتراك Shahid VIP لمشاهدة المحتوى العربي والترفيهي.', 'Shahid VIP لمدة شهر.', 1000, '11111111-1111-1111-1111-111111111111', 'subscription', '1.0', array['Shahid VIP', 'Streaming', 'مسلسلات'], 'private_profile', true, true),
  ('Prime Video', 'prime-video', 'اشتراك Prime Video رقمي مع وصول سريع بعد تأكيد الدفع.', 'Prime Video مع وصول سريع.', 1100, '11111111-1111-1111-1111-111111111111', 'subscription', '1.0', array['Prime Video', 'Streaming'], 'shared_account', true, true),
  ('Disney+', 'disney-plus', 'اشتراك Disney+ لمحتوى العائلة والأفلام والمسلسلات.', 'Disney+ لمحتوى العائلة.', 1100, '11111111-1111-1111-1111-111111111111', 'subscription', '1.0', array['Disney+', 'Streaming'], 'private_profile', false, true),
  ('ChatGPT+', 'chatgpt-plus', 'اشتراك ChatGPT+ لأدوات الذكاء الاصطناعي والإنتاجية.', 'ChatGPT+ لتسريع العمل والإبداع.', 2500, '11111111-1111-1111-1111-111111111112', 'subscription', '1.0', array['ChatGPT+', 'AI', 'إنتاجية'], 'activation_link', true, true),
  ('Canva Pro', 'canva-pro', 'اشتراك Canva Pro للتصميم والقوالب والمواد التسويقية.', 'Canva Pro للتصميم الاحترافي.', 1800, '11111111-1111-1111-1111-111111111112', 'subscription', '1.0', array['Canva Pro', 'AI', 'تصميم'], 'private_profile', true, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  short_description = excluded.short_description,
  price = excluded.price,
  category_id = excluded.category_id,
  file_type = excluded.file_type,
  tags = excluded.tags,
  subscription_type = excluded.subscription_type,
  featured = excluded.featured,
  published = excluded.published;
