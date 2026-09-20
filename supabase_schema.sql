-- Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_accuracy DOUBLE PRECISION,
  address TEXT,
  status TEXT DEFAULT 'reported' NOT NULL,
  severity TEXT,
  ai_category TEXT,
  ai_confidence DOUBLE PRECISION,
  ai_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports are viewable by everyone." ON public.reports FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reports." ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reports." ON public.reports FOR UPDATE USING (auth.uid() = user_id);

-- Create Report Images Table
CREATE TABLE IF NOT EXISTS public.report_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for report images
ALTER TABLE public.report_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Report images are viewable by everyone." ON public.report_images FOR SELECT USING (true);
CREATE POLICY "Users can insert report images for their reports." ON public.report_images FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.reports WHERE id = report_images.report_id AND user_id = auth.uid())
);

-- Supabase Storage Bucket Setup for 'environmental-reports'
INSERT INTO storage.buckets (id, name, public) VALUES ('environmental-reports', 'environmental-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Images are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'environmental-reports');
CREATE POLICY "Users can upload images." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'environmental-reports' AND auth.role() = 'authenticated');
