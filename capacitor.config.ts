import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.urapages.app',
  appName: 'URA Pages',
  webDir: 'out',
  server: {
    // In production, load from the hosted site instead of local files
    url: process.env.CAPACITOR_SERVER_URL || 'https://urapages.com',
    cleartext: false,
  },
  ios: {
    scheme: 'URA Pages',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    backgroundColor: '#E8E4DC',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#E8E4DC',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      splashImmersive: true,
      splashFullScreen: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#F5F2EC',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
