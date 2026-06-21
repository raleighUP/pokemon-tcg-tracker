import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.topcut.app',
  appName: 'Top Cut',
  webDir: 'out',
  backgroundColor: '#0B0B0D',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B0B0D',
      overlaysWebView: false,
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 500,
      launchFadeOutDuration: 150,
      backgroundColor: '#0B0B0D',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    Keyboard: {
      resize: 'native',
      style: 'DARK',
      resizeOnFullScreen: true,
      autoBackdropColor: 'auto',
    },
  },
};

export default config;
