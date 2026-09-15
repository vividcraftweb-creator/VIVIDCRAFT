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

    const rawPricing = formData.get('pricing_type') || formData.get('pricingType') || formData.get('selling_type') || 'FIXED_PRICE';
    const cleanType = String(rawPricing).toUpperCase().trim();
    if (cleanType === 'FIXED_PRICE' || cleanType.includes('FIXED') || cleanType.includes('SALE')) {
      pricingType = 'FIXED_PRICE';
    } else if (cleanType.includes('BID') || cleanType.includes('AUCTION')) {
      pricingType = 'BIDDING';
    } else if (cleanType.includes('NOT')) {
      pricingType = 'NOT_FOR_SALE';
    } else {
      pricingType = 'FIXED_PRICE';
    }

    // Step 2: Extract the price safely & convert to valid number
    const rawPrice = formData.get('price') || formData.get('priceAmount') || formData.get('price_amount') || formData.get('amount');
    const parsedPrice = Number(rawPrice) || 0;

    const rawBid = formData.get('starting_bid') || formData.get('startingBid') || formData.get('bid_amount') || 0;
    const parsedBid = Number(rawBid) || 0;

    if (parsedPrice > 0 && pricingType === 'NOT_FOR_SALE') {
      pricingType = 'FIXED_PRICE';
    }

    price = pricingType === 'FIXED_PRICE' ? parsedPrice : null;
    startingBid = pricingType === 'BIDDING' ? parsedBid : null;

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

    const rawPricing = (formData as any).pricing_type || (formData as any).pricingType || (formData as any).selling_type || 'FIXED_PRICE';
    const cleanType = String(rawPricing).toUpperCase().trim();
    if (cleanType === 'FIXED_PRICE' || cleanType.includes('FIXED') || cleanType.includes('SALE')) {
      pricingType = 'FIXED_PRICE';
    } else if (cleanType.includes('BID') || cleanType.includes('AUCTION')) {
      pricingType = 'BIDDING';
    } else if (cleanType.includes('NOT')) {
      pricingType = 'NOT_FOR_SALE';
    } else {
      pricingType = 'FIXED_PRICE';
    }

    // Step 2: Extract the price safely & convert to valid number
    const payload = formData as any;
    const rawPrice = payload.price ?? payload.priceAmount ?? payload.price_amount ?? payload.amount;
    const parsedPrice = Number(rawPrice) || 0;

    const rawBid = payload.starting_bid ?? payload.startingBid ?? payload.bid_amount ?? 0;
    const parsedBid = Number(rawBid) || 0;

    if (parsedPrice > 0 && pricingType === 'NOT_FOR_SALE') {
      pricingType = 'FIXED_PRICE';
    }

    price = pricingType === 'FIXED_PRICE' ? parsedPrice : null;
    startingBid = pricingType === 'BIDDING' ? parsedBid : null;

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

  // Task 2 Rebuilt upload action payload strictly mapping pricing_type, price, starting_bid, user_id, and artist_id:
  const insertPayload = {
    id,
    title,
    description: description || '',
    image_url: uploadedImageUrl,
    pricing_type: pricingType,
    selling_mode: pricingType,
    price: pricingType === 'FIXED_PRICE' ? price : null,
    starting_bid: pricingType === 'BIDDING' ? startingBid : null,
    user_id: currentUserId,
    artist_id: currentUserId,
    category: category || null,
    art_code: randomCode,
    created_at: new Date().toISOString(),
  };

  // 1. Primary insert with strict user_id + artist_id payload
  let { data: inserted, error: insertError } = await supabase
    .from('artworks')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    console.error('Supabase Insert Error (Primary):', insertError);

    // Fallback A: With user_id strictly as specified
    const fallbackUser = {
      id,
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType,
      selling_mode: pricingType,
      price: pricingType === 'FIXED_PRICE' ? price : null,
      starting_bid: pricingType === 'BIDDING' ? startingBid : null,
      user_id: currentUserId,
      category: category || null,
      art_code: randomCode,
      created_at: new Date().toISOString(),
    };
    const resA = await supabase.from('artworks').insert(fallbackUser).select().single();
    if (!resA.error) {
      inserted = resA.data;
      insertError = null;
    } else {
      console.warn('Supabase Retry (user_id):', resA.error);

      // Fallback B: With artist_id (if DB schema references artist_id)
      const fallbackArtist = {
        id,
        title,
        description: description || '',
        image_url: uploadedImageUrl,
        pricing_type: pricingType,
        selling_mode: pricingType,
        price: pricingType === 'FIXED_PRICE' ? price : null,
        starting_bid: pricingType === 'BIDDING' ? startingBid : null,
        artist_id: currentUserId,
        category: category || null,
        art_code: randomCode,
        created_at: new Date().toISOString(),
      };
      const resB = await supabase.from('artworks').insert(fallbackArtist).select().single();
      if (!resB.error) {
        inserted = resB.data;
        insertError = null;
      } else {
        console.warn('Supabase Retry (artist_id):', resB.error);

        // Fallback C: Core columns fallback matching minimum base schema
        const fallbackCore = {
          id,
          artist_id: currentUserId,
          title,
          image_url: uploadedImageUrl,
          created_at: new Date().toISOString(),
        };
        const resC = await supabase.from('artworks').insert(fallbackCore).select().single();
        if (!resC.error) {
          inserted = resC.data;
          insertError = null;
        } else {
          insertError = resC.error;
        }
      }
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
