-- Migration: App Version Control
-- Description: Create table to manage minimum required app versions for force updates

-- Create app_version_control table
CREATE TABLE IF NOT EXISTS public.app_version_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  minimum_version TEXT NOT NULL,
  current_version TEXT NOT NULL,
  force_update_enabled BOOLEAN DEFAULT true,
  update_message TEXT,
  store_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform)
);

-- Add RLS policies
ALTER TABLE public.app_version_control ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read version requirements (needed for app startup)
CREATE POLICY "Allow public read access to version control"
  ON public.app_version_control
  FOR SELECT
  TO public
  USING (true);

-- Only authenticated users can update (for admin portal)
CREATE POLICY "Allow authenticated users to update version control"
  ON public.app_version_control
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert initial values
INSERT INTO public.app_version_control (platform, minimum_version, current_version, force_update_enabled, update_message, store_url)
VALUES 
  (
    'ios', 
    '1.2.5', 
    '1.2.5',
    false,
    'A new version of SmarterTracks is available! Please update to continue using the app.',
    'https://apps.apple.com/us/app/smarter-tracks/id6748660773'
  ),
  (
    'android',
    '1.2.5',
    '1.2.5',
    false,
    'A new version of SmarterTracks is available! Please update to continue using the app.',
    'https://play.google.com/store/apps/details?id=com.bactech.smartertracks&pcampaignid=web_share'
  )
ON CONFLICT (platform) DO NOTHING;

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_app_version_control_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_app_version_control_timestamp
  BEFORE UPDATE ON public.app_version_control
  FOR EACH ROW
  EXECUTE FUNCTION update_app_version_control_updated_at();

-- Add comment
COMMENT ON TABLE public.app_version_control IS 'Controls minimum app version requirements for force updates';
