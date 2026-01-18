-- ============================================================
-- TavvY Admin Portal - Cities and Universes Tables Migration
-- ============================================================
-- This migration creates the tavvy_cities table and ensures
-- atlas_universes and atlas_categories tables exist with proper structure.
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- ============ CITIES TABLE ============
-- Create tavvy_cities table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.tavvy_cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'USA',
    population INTEGER,
    cover_image_url TEXT,
    description TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_tavvy_cities_slug ON public.tavvy_cities(slug);
CREATE INDEX IF NOT EXISTS idx_tavvy_cities_country ON public.tavvy_cities(country);
CREATE INDEX IF NOT EXISTS idx_tavvy_cities_is_active ON public.tavvy_cities(is_active);

-- ============ UNIVERSES TABLE ============
-- Ensure atlas_universes table exists with proper structure
CREATE TABLE IF NOT EXISTS public.atlas_universes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    cover_image_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#3B82F6',
    secondary_color VARCHAR(20) DEFAULT '#1D4ED8',
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_atlas_universes_slug ON public.atlas_universes(slug);
CREATE INDEX IF NOT EXISTS idx_atlas_universes_is_active ON public.atlas_universes(is_active);
CREATE INDEX IF NOT EXISTS idx_atlas_universes_sort_order ON public.atlas_universes(sort_order);

-- ============ CATEGORIES TABLE ============
-- Ensure atlas_categories table exists with proper structure
CREATE TABLE IF NOT EXISTS public.atlas_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_atlas_categories_slug ON public.atlas_categories(slug);

-- ============ ARTICLES TABLE ============
-- Ensure atlas_articles table exists with proper structure
CREATE TABLE IF NOT EXISTS public.atlas_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT,
    cover_image_url TEXT,
    author_name VARCHAR(255),
    author_avatar_url TEXT,
    category_id UUID REFERENCES public.atlas_categories(id) ON DELETE SET NULL,
    universe_id UUID REFERENCES public.atlas_universes(id) ON DELETE SET NULL,
    read_time_minutes INTEGER DEFAULT 5,
    is_featured BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_atlas_articles_slug ON public.atlas_articles(slug);
CREATE INDEX IF NOT EXISTS idx_atlas_articles_status ON public.atlas_articles(status);
CREATE INDEX IF NOT EXISTS idx_atlas_articles_category_id ON public.atlas_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_atlas_articles_universe_id ON public.atlas_articles(universe_id);
CREATE INDEX IF NOT EXISTS idx_atlas_articles_is_featured ON public.atlas_articles(is_featured);

-- ============ SEED DEFAULT CATEGORIES ============
-- Insert default article categories if they don't exist
INSERT INTO public.atlas_categories (name, slug, sort_order) VALUES
    ('Airports', 'airports', 1),
    ('Cities', 'cities', 2),
    ('Theme Parks', 'theme-parks', 3),
    ('Hotels', 'hotels', 4),
    ('Restaurants', 'restaurants', 5),
    ('Travel Tips', 'travel-tips', 6),
    ('Events', 'events', 7),
    ('Guides', 'guides', 8)
ON CONFLICT (slug) DO NOTHING;

-- ============ ENABLE ROW LEVEL SECURITY ============
-- Enable RLS on all tables (but allow all operations for now)
ALTER TABLE public.tavvy_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_universes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atlas_articles ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (adjust as needed for your security model)
CREATE POLICY IF NOT EXISTS "Allow all operations on tavvy_cities" ON public.tavvy_cities FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on atlas_universes" ON public.atlas_universes FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on atlas_categories" ON public.atlas_categories FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all operations on atlas_articles" ON public.atlas_articles FOR ALL USING (true);

-- ============ GRANT PERMISSIONS ============
GRANT ALL ON public.tavvy_cities TO authenticated;
GRANT ALL ON public.atlas_universes TO authenticated;
GRANT ALL ON public.atlas_categories TO authenticated;
GRANT ALL ON public.atlas_articles TO authenticated;

GRANT SELECT ON public.tavvy_cities TO anon;
GRANT SELECT ON public.atlas_universes TO anon;
GRANT SELECT ON public.atlas_categories TO anon;
GRANT SELECT ON public.atlas_articles TO anon;

-- ============ SUCCESS MESSAGE ============
DO $$
BEGIN
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Created tables: tavvy_cities, atlas_universes, atlas_categories, atlas_articles';
    RAISE NOTICE 'Default categories have been seeded.';
END $$;
