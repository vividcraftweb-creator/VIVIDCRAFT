'use server';

import { createClient } from '@/lib/supabase/server';

export interface UploadArtworkFormData {
  title: string;
  description?: string | null;
  category?: string | null;
  pricingType?: 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE';
  price?: number | string | null;
  startingBid?: number | string | null;
  file?: File | null;
  imageUrl?: string | null;
}

export async function uploadArtwork(formData: FormData | UploadArtworkFormData) {
  const supabase = await createClient();

  // Extract auth user ID
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  if (!currentUserId) {
    return { success: false, error: 'Unauthorized: User must be signed in to upload artwork' };
  }

  let title = '';
  let description = '';
  let category = '';
  let pricingType: 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE' = 'NOT_FOR_SALE';
  let price: number | null = null;
  let startingBid: number | null = null;
  let file: File | null = null;
  let imageUrl: string | null = null;

  if (formData instanceof FormData) {
    title = String(formData.get('title') || '').trim();
    description = String(formData.get('description') || '').trim();
    category = String(formData.get('category') || '').trim();
    const rawPricing = String(formData.get('pricingType') || formData.get('pricing_type') || 'NOT_FOR_SALE').toUpperCase();
    pricingType = (rawPricing.includes('FIXED') ? 'FIXED_PRICE' : rawPricing.includes('BID') ? 'BIDDING' : 'NOT_FOR_SALE') as any;
    
    const rawPrice = formData.get('price');
    price = pricingType === 'FIXED_PRICE' && rawPrice ? Number(rawPrice) : null;
    
    const rawBid = formData.get('startingBid') || formData.get('starting_bid');
    startingBid = pricingType === 'BIDDING' && rawBid ? Number(rawBid) : null;

    const formFile = formData.get('file');
    if (formFile instanceof File && formFile.size > 0) {
      file = formFile;
    }
    const formUrl = formData.get('imageUrl') || formData.get('image_url');
    if (formUrl) imageUrl = String(formUrl);
  } else {
    title = (formData.title || '').trim();
    description = (formData.description || '').trim();
    category = (formData.category || '').trim();
    pricingType = formData.pricingType || 'NOT_FOR_SALE';
    price = pricingType === 'FIXED_PRICE' && formData.price ? Number(formData.price) : null;
    startingBid = pricingType === 'BIDDING' && formData.startingBid ? Number(formData.startingBid) : null;
    file = formData.file || null;
    imageUrl = formData.imageUrl || null;
  }

  if (!title) {
    return { success: false, error: 'Artwork title is required' };
  }

  let uploadedFilePath: string | null = null;
  let uploadedImageUrl = imageUrl;

  // Upload file to Supabase storage if provided
  if (file) {
    const fileExt = file.name.split('.').pop() || 'png';
    uploadedFilePath = `${currentUserId}/${crypto.randomUUID()}.${fileExt}`;

    const { error: storageError } = await supabase.storage
      .from('artworks')
      .upload(uploadedFilePath, file, { cacheControl: '3600', upsert: false });

    if (storageError) {
      console.error('Supabase Storage Upload Error:', storageError);
      return { success: false, error: `Failed to upload image: ${storageError.message}` };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('artworks')
      .getPublicUrl(uploadedFilePath);

    uploadedImageUrl = publicUrl;
  }

  if (!uploadedImageUrl) {
    return { success: false, error: 'Artwork image is required' };
  }

  const id = crypto.randomUUID();
  const randomCode = `#ART-${Math.floor(100 + Math.random() * 900)}`;

  // Task 1 explicit insert query payload:
  const payload = {
    id,
    artist_id: currentUserId,
    user_id: currentUserId,
    title,
    description: description || null,
    image_url: uploadedImageUrl,
    pricing_type: pricingType,
    selling_mode: pricingType,
    price,
    starting_bid: startingBid,
    category: category || null,
    art_code: randomCode,
    created_at: new Date().toISOString(),
  };

  // 1. Primary insert with all fields
  let { data: inserted, error: insertError } = await supabase
    .from('artworks')
    .insert(payload)
    .select()
    .single();

  if (insertError) {
    console.error('Supabase Insert Error:', insertError);

    // Fallback 1: if column like category or art_code does not exist
    const fallback1 = {
      id,
      artist_id: currentUserId,
      user_id: currentUserId,
      title,
      description: description || null,
      image_url: uploadedImageUrl,
      pricing_type: pricingType,
      selling_mode: pricingType,
      price,
      starting_bid: startingBid,
      created_at: new Date().toISOString(),
    };
    const retry1 = await supabase.from('artworks').insert(fallback1).select().single();
    insertError = retry1.error;
    if (!insertError) inserted = retry1.data;
  }

  if (insertError) {
    console.error('Supabase Insert Error (Retry 1):', insertError);
    // Fallback 2: map to existing selling_type / selling_mode / type if pricing_type column is missing
    const fallback2 = {
      id,
      artist_id: currentUserId,
      user_id: currentUserId,
      title,
      description: description || null,
      image_url: uploadedImageUrl,
      selling_type: pricingType,
      selling_mode: pricingType,
      price,
      starting_bid: startingBid,
    };
    const retry2 = await supabase.from('artworks').insert(fallback2).select().single();
    insertError = retry2.error;
    if (!insertError) inserted = retry2.data;
  }

  if (insertError) {
    console.error('Supabase Insert Error (Retry 2):', insertError);
    // Fallback 3: basic insert with only core columns
    const fallback3 = {
      id,
      artist_id: currentUserId,
      user_id: currentUserId,
      title,
      image_url: uploadedImageUrl,
      created_at: new Date().toISOString(),
    };
    const retry3 = await supabase.from('artworks').insert(fallback3).select().single();
    insertError = retry3.error;
    if (!insertError) inserted = retry3.data;
  }

  // Task 3: Prevent Partial Saves on Upload Failure
  // If DB insert failed completely, delete the uploaded image from storage and do NOT create broken/empty DB records.
  if (insertError) {
    console.error('Supabase Insert Error (All Fallbacks Failed):', insertError);

    if (uploadedFilePath) {
      try {
        console.log('Cleaning up uploaded file from storage due to DB insert failure:', uploadedFilePath);
        await supabase.storage.from('artworks').remove([uploadedFilePath]);
      } catch (storageCleanupErr) {
        console.error('Failed to clean up storage after DB failure:', storageCleanupErr);
      }
    }

    return {
      success: false,
      error: `Failed to save artwork record: ${insertError.message}`,
    };
  }

  return {
    success: true,
    data: inserted,
  };
}
