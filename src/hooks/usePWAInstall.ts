import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkStandalone = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsInstalled(checkStandalone());

    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (ua.includes('mac') && 'ontouchend' in document);
    const mobileDevice =
      iosDevice ||
      /android|mobile|tablet/.test(ua) ||
      window.matchMedia('(max-width: 1024px) and (pointer: coarse)').matches;

    setIsIOS(iosDevice);
    setIsMobile(mobileDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const mq = window.matchMedia('(display-mode: standalone)');
    const handleDisplayChange = () => setIsInstalled(checkStandalone());

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mq.addEventListener?.('change', handleDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mq.removeEventListener?.('change', handleDisplayChange);
    };
  }, []);

  const install = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
    return outcome;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isMobile,
    isMobilePWA: isInstalled && isMobile,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
