'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BackgroundLines } from '@/components/ui/background-lines';
import { ArrowRight, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export default function CTA() {
  // Landing CTA Section completely removed per user request to fix layout shifts and accelerate initial page load
  return null;
}
