-- =====================================================================
-- Seed: Sample Registered Organizations
-- Run this in Supabase SQL Editor to populate public.organizations
-- with real rows so they appear live in EarthForward & Officer Dashboard.
-- =====================================================================

INSERT INTO public.organizations (name, email, member_count)
VALUES 
  ('Global Earth Forward Initiative', 'contact@earthforward.org', 45),
  ('Clean Air Action Network', 'info@cleanair.org', 28),
  ('Himalayan Forest Guardians', 'team@himalayaguardians.org', 35),
  ('Clean River & Water Patrol', 'patrol@cleanriver.org', 19),
  ('Urban EcoWarriors Foundation', 'action@ecowarriors.org', 52),
  ('Coastal & Ocean Conservation NGO', 'saveoceans@conservation.org', 40),
  ('Delhi-NCR Pollution Response Team', 'delhi.response@cleanair.in', 30),
  ('Green Canopy Biodiversity Trust', 'trees@greencanopy.org', 22),
  ('Renewable Earth Youth Collective', 'youth@renewableearth.org', 65),
  ('Zero Waste Community Alliance', 'hello@zerowaste.org', 18)
ON CONFLICT (name) DO NOTHING;

NOTIFY pgrst, 'reload schema';
