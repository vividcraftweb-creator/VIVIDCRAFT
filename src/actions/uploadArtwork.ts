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
  let pricingType = 'FIXED_PRICE';
  let priceVal: number | null = null;
  let startingBidVal: number | null = null;
  let file: File | null = null;
  let imageUrl: string | null = null;

  if (formData instanceof FormData) {
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      pricing_type: formData.get('pricing_type') || formData.get('pricingType') || formData.get('selling_mode') || formData.get('selling_type'),
      price: formData.get('price') || formData.get('priceAmount') || formData.get('price_amount') || formData.get('amount'),
      starting_bid: formData.get('starting_bid') || formData.get('startingBid') || formData.get('bid_amount'),
    };
    title = String(payload.title || '').trim();
    description = String(payload.description || '').trim();
    category = String(payload.category || '').trim();

    pricingType = String(payload.pricing_type || 'FIXED_PRICE').toUpperCase().trim();
    priceVal = payload.price ? parseFloat(String(payload.price)) : 0;
    startingBidVal = payload.starting_bid ? parseFloat(String(payload.starting_bid)) : null;

    const formFile = formData.get('file');
    if (formFile instanceof File && formFile.size > 0) {
      file = formFile;
    }
    const formUrl = formData.get('imageUrl') || formData.get('image_url');
    if (formUrl) imageUrl = String(formUrl);
  } else {
    const payload = formData as any;
    title = String(payload.title || '').trim();
    description = String(payload.description || '').trim();
    category = String(payload.category || '').trim();

    pricingType = String(payload.pricing_type || payload.pricingType || payload.selling_mode || 'FIXED_PRICE').toUpperCase().trim();
    priceVal = payload.price ? parseFloat(String(payload.price)) : 0;
    startingBidVal = (payload.starting_bid ?? payload.startingBid) ? parseFloat(String(payload.starting_bid ?? payload.startingBid)) : null;

    file = formData.file || null;
    imageUrl = formData.imageUrl || (formData as any).image_url || null;
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

  // Strict primary payload per user instruction
  const insertPayload = {
    title,
    description: description || '',
    image_url: uploadedImageUrl,
    pricing_type: pricingType || 'FIXED_PRICE',
    price: priceVal,
    user_id: currentUserId,
  };

  // Graceful fallback candidates if 'price' or other columns fail in schema cache:
  const candidatePayloads: any[] = [
    // 1. Strict primary mapping with id and art_code
    {
      id,
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType || 'FIXED_PRICE',
      selling_mode: pricingType || 'FIXED_PRICE',
      price: priceVal,
      starting_bid: startingBidVal,
      user_id: currentUserId,
      artist_id: currentUserId,
      category: category || null,
      art_code: randomCode,
      created_at: new Date().toISOString(),
    },
    // 2. Strict primary mapping requested by user
    insertPayload,
    // 3. User request mapping + artist_id
    {
      ...insertPayload,
      artist_id: currentUserId,
    },
    // 4. Fallback if 'price' column schema cache error: use 'amount'
    {
      id,
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType || 'FIXED_PRICE',
      selling_mode: pricingType || 'FIXED_PRICE',
      amount: priceVal,
      starting_bid: startingBidVal,
      user_id: currentUserId,
      artist_id: currentUserId,
      category: category || null,
      art_code: randomCode,
      created_at: new Date().toISOString(),
    },
    // 5. Fallback if 'price' fails: use 'price_amount'
    {
      id,
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType || 'FIXED_PRICE',
      price_amount: priceVal,
      user_id: currentUserId,
      artist_id: currentUserId,
      created_at: new Date().toISOString(),
    },
    // 6. Fallback if 'user_id' fails in schema cache: use 'artist_id' with 'price'
    {
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType || 'FIXED_PRICE',
      price: priceVal,
      artist_id: currentUserId,
    },
    // 7. Fallback if both 'price' and 'user_id' fail: use 'artist_id' + 'amount'
    {
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType || 'FIXED_PRICE',
      amount: priceVal,
      artist_id: currentUserId,
    },
  ];

  let inserted = null;
  let insertError = null;

  for (const candidate of candidatePayloads) {
    const res = await supabase.from('artworks').insert(candidate).select().single();
    if (!res.error) {
      inserted = res.data;
      insertError = null;
      break;
    } else {
      insertError = res.error;
      console.warn('Supabase insert candidate failed, trying next schema cache fallback:', {
        keys: Object.keys(candidate),
        error: res.error.message,
      });
    }
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
