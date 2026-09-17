'use server';

import { createClient } from '@/lib/supabase/server';

export interface UploadArtworkFormData {
  title: string;
  description?: string | null;
  category?: string | null;
  medium?: string | string[] | null;
  technique?: string | string[] | null;
  tags?: string[] | string | null;
  pricingType?: 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE';
  pricing_type?: 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE';
  selling_mode?: 'FIXED_PRICE' | 'BIDDING' | 'NOT_FOR_SALE';
  price?: number | string | null;
  amount?: number | string | null;
  price_amount?: number | string | null;
  priceAmount?: number | string | null;
  startingBid?: number | string | null;
  starting_bid?: number | string | null;
  file?: File | null;
  imageUrl?: string | null;
  image_url?: string | null;
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
  let medium = '';
  let technique = '';
  let tags: string[] = [];
  let pricingType = 'FIXED_PRICE';
  let priceVal: number | null = null;
  let startingBidVal: number | null = null;
  let file: File | null = null;
  let imageUrl: string | null = null;

  let payload: any = {};

  if (formData instanceof FormData) {
    payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      medium: formData.get('medium'),
      technique: formData.get('technique'),
      tags: formData.get('tags'),
      pricing_type: formData.get('pricing_type') || formData.get('pricingType') || formData.get('selling_mode') || formData.get('selling_type'),
      price: formData.get('price'),
      amount: formData.get('amount') || formData.get('priceAmount') || formData.get('price_amount'),
      starting_bid: formData.get('starting_bid') || formData.get('startingBid') || formData.get('bid_amount'),
    };
    title = String(payload.title || '').trim();
    description = String(payload.description || '').trim();
    category = String(payload.category || '').trim();
    medium = String(payload.medium || '').trim();
    technique = String(payload.technique || '').trim();
    const formTags = payload.tags;
    if (typeof formTags === 'string') {
      tags = formTags.split(',').map((t) => t.trim()).filter(Boolean);
    } else if (Array.isArray(formTags)) {
      tags = formTags.map((t) => String(t).trim()).filter(Boolean);
    }

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
    payload = formData as any;
    title = String(payload.title || '').trim();
    description = String(payload.description || '').trim();
    category = String(payload.category || '').trim();
    medium = Array.isArray(payload.medium) ? payload.medium.join(', ').trim() : String(payload.medium || '').trim();
    technique = Array.isArray(payload.technique) ? payload.technique.join(', ').trim() : String(payload.technique || '').trim();
    if (Array.isArray(payload.tags)) {
      tags = payload.tags.map((t: any) => String(t).trim()).filter(Boolean);
    } else if (typeof payload.tags === 'string') {
      tags = payload.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
    }

    pricingType = String(payload.pricing_type || payload.pricingType || payload.selling_mode || 'FIXED_PRICE').toUpperCase().trim();
    priceVal = payload.price ? parseFloat(String(payload.price)) : 0;
    startingBidVal = (payload.starting_bid ?? payload.startingBid) ? parseFloat(String(payload.starting_bid ?? payload.startingBid)) : null;

    file = formData.file || null;
    imageUrl = formData.imageUrl || (formData as any).image_url || null;
  }

  // Extract price strictly per user specification
  const priceValue = parseFloat((formData as any).price || (formData as any).amount || payload.price || payload.amount || 0);

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

  // In Supabase insert object, send BOTH price and amount gracefully:
  const insertData: Record<string, any> = {
    title,
    description: description || '',
    image_url: uploadedImageUrl,
    pricing_type: pricingType || 'FIXED_PRICE',
    user_id: currentUserId,
    category: category || null,
    medium: medium || null,
    technique: technique || null,
    tags,
  };
  if (priceValue > 0) {
    insertData.price = priceValue;
    insertData.amount = priceValue;
  }

  // Graceful fallback candidates if 'price', 'amount', or 'technique' fails in schema cache:
  const candidatePayloads: any[] = [
    // 1. Comprehensive payload with BOTH price and amount, id, art_code, user_id, artist_id, medium, technique, tags
    {
      id,
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType || 'FIXED_PRICE',
      selling_mode: pricingType || 'FIXED_PRICE',
      user_id: currentUserId,
      artist_id: currentUserId,
      category: category || null,
      medium: medium || null,
      technique: technique || null,
      tags,
      art_code: randomCode,
      starting_bid: startingBidVal,
      created_at: new Date().toISOString(),
      ...(priceValue > 0 ? { price: priceValue, amount: priceValue } : {}),
    },
    // 2. Strict user insertData sending BOTH price and amount
    insertData,
    // 3. User insertData with artist_id
    {
      ...insertData,
      artist_id: currentUserId,
    },
    // 4. Fallback without technique (in case technique column is pending schema reload)
    {
      id,
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType || 'FIXED_PRICE',
      selling_mode: pricingType || 'FIXED_PRICE',
      user_id: currentUserId,
      artist_id: currentUserId,
      category: category || null,
      medium: medium || null,
      tags,
      art_code: randomCode,
      starting_bid: startingBidVal,
      created_at: new Date().toISOString(),
      ...(priceValue > 0 ? { price: priceValue, amount: priceValue } : {}),
    },
    // 5. Fallback if 'amount' column doesn't exist in schema cache: use 'price' only
    {
      id,
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType || 'FIXED_PRICE',
      selling_mode: pricingType || 'FIXED_PRICE',
      price: priceValue > 0 ? priceValue : null,
      starting_bid: startingBidVal,
      user_id: currentUserId,
      artist_id: currentUserId,
      category: category || null,
      medium: medium || null,
      technique: technique || null,
      tags,
      art_code: randomCode,
      created_at: new Date().toISOString(),
    },
    // 6. Fallback if 'price' column schema cache error: use 'amount' only
    {
      id,
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType || 'FIXED_PRICE',
      selling_mode: pricingType || 'FIXED_PRICE',
      amount: priceValue > 0 ? priceValue : null,
      starting_bid: startingBidVal,
      user_id: currentUserId,
      artist_id: currentUserId,
      category: category || null,
      medium: medium || null,
      technique: technique || null,
      tags,
      art_code: randomCode,
      created_at: new Date().toISOString(),
    },
    // 6. Fallback if 'price' fails: use 'price_amount'
    {
      id,
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType || 'FIXED_PRICE',
      price_amount: priceValue > 0 ? priceValue : null,
      user_id: currentUserId,
      artist_id: currentUserId,
      created_at: new Date().toISOString(),
    },
    // 7. Fallback with artist_id and price
    {
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType || 'FIXED_PRICE',
      price: priceValue > 0 ? priceValue : null,
      artist_id: currentUserId,
    },
    // 8. Fallback with artist_id and amount
    {
      title,
      description: description || '',
      image_url: uploadedImageUrl,
      pricing_type: pricingType || 'FIXED_PRICE',
      amount: priceValue > 0 ? priceValue : null,
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
