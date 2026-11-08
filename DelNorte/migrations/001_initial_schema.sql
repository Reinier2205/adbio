-- DelNorte Camino Training Tracker
-- Initial Database Schema for Supabase

-- Users / Travelers Table
CREATE TABLE travelers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    email TEXT,
    weight_goal_kg DECIMAL(5,2), -- Optional weight loss goal
    starting_weight_kg DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Types: walk, pilates, cycle, swim, hike
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('walk', 'pilates', 'cycle', 'swim', 'hike', 'dance', 'sauna')),
    distance_km DECIMAL(6,2), -- Optional for pilates
    duration_min INTEGER NOT NULL,
    elevation_gain_m INTEGER DEFAULT 0,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Wellness checks
    stretched_after BOOLEAN DEFAULT FALSE,
    conversation_test BOOLEAN DEFAULT FALSE, -- Could maintain conversation for 2 hours
    wore_camino_boots BOOLEAN DEFAULT FALSE,
    
    -- Notes for injuries, discomfort, hotspots
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_distance CHECK (distance_km IS NULL OR distance_km >= 0),
    CONSTRAINT valid_duration CHECK (duration_min > 0)
);

-- Weight Check-ins
CREATE TABLE weight_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
    weight_kg DECIMAL(5,2) NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_weight CHECK (weight_kg > 0 AND weight_kg < 300)
);

-- Gear / Equipment Tracking
CREATE TABLE gear_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES travelers(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    item_type TEXT DEFAULT 'boots', -- boots, backpack, poles, etc
    total_km DECIMAL(8,2) DEFAULT 0,
    comfort_rating INTEGER CHECK (comfort_rating BETWEEN 1 AND 5),
    first_used DATE,
    last_used DATE,
    is_trail_ready BOOLEAN DEFAULT FALSE, -- Becomes true at 100km for boots
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pilates Video Library (5 slots, repeatable routine)
CREATE TABLE pilates_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_number INTEGER NOT NULL UNIQUE CHECK (slot_number BETWEEN 1 AND 5),
    title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    category TEXT, -- e.g., "Full body", "Lower body", "Mobility & hips"
    duration_min INTEGER,
    added_by UUID REFERENCES travelers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_activities_user_date ON activities(user_id, activity_date DESC);
CREATE INDEX idx_activities_date ON activities(activity_date DESC);
CREATE INDEX idx_weight_entries_user_date ON weight_entries(user_id, entry_date DESC);
CREATE INDEX idx_gear_items_user ON gear_items(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_travelers_updated_at BEFORE UPDATE ON travelers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gear_items_updated_at BEFORE UPDATE ON gear_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample travelers (4 friends)
-- Note: In production, these would be created through the app
INSERT INTO travelers (name, email, weight_goal_kg, starting_weight_kg) VALUES
('Reinier', 'reinier@example.com', 15.0, NULL), -- Will set starting weight on first entry
('Annelié', NULL, NULL, NULL),
('Drikkie', NULL, NULL, NULL),
('Lettie', NULL, NULL, NULL);

-- Insert default Pilates video slots (empty, to be filled by users)
INSERT INTO pilates_videos (slot_number, title, video_url, category, duration_min) VALUES
(1, 'Full body Pilates', 'https://youtube.com/placeholder1', 'Full body', 60),
(2, 'Lower body strength', 'https://youtube.com/placeholder2', 'Lower body', 60),
(3, 'Mobility & hips', 'https://youtube.com/placeholder3', 'Mobility', 60),
(4, 'Core & balance', 'https://youtube.com/placeholder4', 'Core', 60),
(5, 'Recovery & stretch', 'https://youtube.com/placeholder5', 'Recovery', 60);

-- Add RLS (Row Level Security) policies
-- For now, keep it simple - users can read all, but only update their own data

ALTER TABLE travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilates_videos ENABLE ROW LEVEL SECURITY;

-- Everyone can read all data (for group visibility)
CREATE POLICY "Allow read access to all travelers" ON travelers FOR SELECT USING (true);
CREATE POLICY "Allow read access to all activities" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow read access to all weight entries" ON weight_entries FOR SELECT USING (true);
CREATE POLICY "Allow read access to all gear" ON gear_items FOR SELECT USING (true);
CREATE POLICY "Allow read access to all videos" ON pilates_videos FOR SELECT USING (true);

-- Users can only insert/update their own data
-- Note: In a real app, we'd use Supabase auth. For simple name-based auth,
-- the Worker will handle authorization before calling Supabase

CREATE POLICY "Allow users to update own profile" ON travelers FOR UPDATE USING (true);
CREATE POLICY "Allow users to insert activities" ON activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users to update own activities" ON activities FOR UPDATE USING (true);
CREATE POLICY "Allow users to delete own activities" ON activities FOR DELETE USING (true);
CREATE POLICY "Allow users to insert weight entries" ON weight_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users to insert gear" ON gear_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users to update own gear" ON gear_items FOR UPDATE USING (true);

COMMENT ON TABLE travelers IS 'The 4 friends training for Camino del Norte';
COMMENT ON TABLE activities IS 'All training activities: walking, pilates, cycling, swimming, hiking';
COMMENT ON TABLE weight_entries IS 'Optional weight tracking for each traveler';
COMMENT ON TABLE gear_items IS 'Equipment tracking, especially boots break-in (100km target)';
COMMENT ON TABLE pilates_videos IS 'Curated MadFit video routine (5 slots)';
