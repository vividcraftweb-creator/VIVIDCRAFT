/**
 * Migration Script: Update existing uploaded test artworks in database
 * Run: node scripts/migrate-artworks-pricing.js
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
if (fs.existsSync('.env.local')) {
  fs.readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
    const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = (serviceKey && !serviceKey.startsWith('sb_secret_')) ? serviceKey : anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Starting artworks pricing_type and metadata migration...');

  // Fetch current artworks
  const { data: artworks, error } = await supabase.from('artworks').select('*');
  if (error) {
    console.error('Error fetching artworks:', error.message);
    return;
  }

  console.log(`Found ${artworks.length} existing artworks.`);

  for (const art of artworks) {
    const titleLower = (art.title || '').toLowerCase();
    let updates = {};

    if (titleLower.includes('sale') || art.id === '207b3975-7710-4adc-9770-8eb8e341042a' || art.id === 'e79b8fce-9c09-43fb-b721-e3a882f9f11e') {
      updates = {
        pricing_type: 'FIXED_PRICE',
        selling_mode: 'FIXED_PRICE',
        price: 85000,
        starting_bid: null,
        category: 'Painting',
        medium: 'Oil on Canvas',
        description: 'An evocative original oil on canvas artwork showcasing vibrant contrasts, rich palette knife textures, and contemporary impressionism.',
      };
    } else if (titleLower.includes('bid') || art.id === '44b950d2-5346-44b1-a510-9d8b5a885aa2') {
      updates = {
        pricing_type: 'BIDDING',
        selling_mode: 'BIDDING',
        price: null,
        starting_bid: 45000,
        category: 'Digital Art',
        medium: 'Digital Illustration',
        description: 'Exclusive auction piece featuring celestial aesthetics and dramatic ambient lighting, available for collector bidding.',
      };
    } else {
      updates = {
        pricing_type: 'NOT_FOR_SALE',
        selling_mode: 'NOT_FOR_SALE',
        price: null,
        starting_bid: null,
        category: 'Sculpture',
        medium: 'Mixed Media',
        description: 'A curated master study created exclusively for exhibition display and portfolio representation.',
      };
    }

    // Try full update
    let { error: updateError } = await supabase
      .from('artworks')
      .update(updates)
      .eq('id', art.id);

    if (updateError) {
      // Try with pricing_type and price/bid only
      const fallbackUpdates = {
        pricing_type: updates.pricing_type,
        selling_mode: updates.selling_mode,
        price: updates.price,
        starting_bid: updates.starting_bid,
        description: updates.description,
      };
      const res = await supabase.from('artworks').update(fallbackUpdates).eq('id', art.id);
      if (res.error) {
        console.warn(`Note for artwork ${art.id} (${art.title}): ${res.error.message}`);
      } else {
        console.log(`Updated artwork ${art.id} (${art.title}) -> ${updates.pricing_type}`);
      }
    } else {
      console.log(`Successfully updated artwork ${art.id} (${art.title}) -> ${updates.pricing_type}`);
    }
  }

  console.log('\nMigration complete.');
  console.log('To apply full schema columns to Supabase database, execute SQL in:');
  console.log('supabase/migrations/20260915000004_fix_artworks_schema_and_pricing_type.sql');
}

migrate().catch(console.error);
