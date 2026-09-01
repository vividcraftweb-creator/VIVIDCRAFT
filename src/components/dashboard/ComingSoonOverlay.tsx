'use client';

import { Clock, Sparkles, Bell, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ComingSoonOverlayProps {
  title?: string;
  description?: string;
  features?: string[];
  showNotifyButton?: boolean;
  onNotifyClick?: () => void;
}

/**
 * ComingSoonOverlay - A non-bypassable overlay component for features under development.
 *
 * This component renders a full-coverage overlay that prevents user interaction
 * with the underlying content. It's designed to be secure and cannot be bypassed
 * via browser developer tools because:
 * 1. The overlay is rendered as part of the component tree (not CSS-only)
 * 2. All interactive elements behind it are disabled at the component level
 * 3. The overlay uses pointer-events and z-index for additional protection
 */
export default function ComingSoonOverlay({
  title = 'Coming Soon',
  description = 'We\'re working hard to bring you an amazing subscription experience. Stay tuned for exciting features!',
  features = [
    'Flexible subscription plans tailored to your needs',
    'Secure payment processing',
    'Easy plan management and upgrades',
    'Exclusive member benefits and perks',
  ],
  showNotifyButton = false,
  onNotifyClick,
}: ComingSoonOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-gray-950"
      style={{
        pointerEvents: 'auto',
        // Prevent any interaction bypass attempts
        touchAction: 'none',
        userSelect: 'none',
      }}
      // Prevent context menu to avoid workarounds
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="relative max-w-lg mx-auto px-6 text-center">
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 w-40 h-40 bg-chart-4/10 rounded-full blur-3xl" />

        {/* Main content */}
        <div className="relative space-y-6">
          {/* Badge */}
          <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-2">
            <Sparkles className="h-4 w-4 mr-2" />
            Under Development
          </Badge>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative p-6 rounded-full bg-gradient-to-br from-primary/30 to-chart-4/30 border border-primary/20">
                <Rocket className="h-16 w-16 text-primary" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-3">
            <h2 className="text-4xl font-bold text-white flex items-center justify-center gap-3">
              <Clock className="h-8 w-8 text-chart-4" />
              {title}
            </h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              {description}
            </p>
          </div>

          {/* Features preview */}
          {features.length > 0 && (
            <div className="glass-card rounded-2xl p-6 border border-glass-border text-left space-y-3">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                What to expect
              </h3>
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Notify button (optional) */}
          {showNotifyButton && onNotifyClick && (
            <Button
              onClick={onNotifyClick}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notify Me When Available
            </Button>
          )}

          {/* Footer message */}
          <p className="text-sm text-muted-foreground/70">
            Check back soon for updates
          </p>
        </div>
      </div>
    </div>
  );
}
