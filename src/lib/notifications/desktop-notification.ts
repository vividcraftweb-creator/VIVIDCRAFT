export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return Promise.resolve('denied');
  }

  return Notification.requestPermission();
}

export function showDesktopNotification(params: {
  title: string;
  body: string;
  icon?: string;
  link?: string;
}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Only show if tab is hidden (not in focus)
  if (!document.hidden) return;

  const notification = new Notification(params.title, {
    body: params.body,
    icon: params.icon || '/jobhorizons-logo.webp',
    badge: '/favicon-32x32.png',
    tag: 'vivid-art-notification',
  });

  if (params.link) {
    const link = params.link;
    notification.onclick = () => {
      window.focus();
      window.location.href = link;
      notification.close();
    };
  }

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}

export function isDesktopNotificationSupported(): boolean {
  return 'Notification' in window;
}

export function getDesktopNotificationPermission(): NotificationPermission {
  if (!isDesktopNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}
