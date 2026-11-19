import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waventura.minijuego',
  appName: 'Carlos y Mateo',
  webDir: 'dist',
  android: {
    backgroundColor: '#1E88E5',
    allowMixedContent: false,
  },
};

export default config;
