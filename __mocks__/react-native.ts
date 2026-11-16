export const Platform = {
  OS: 'android',
  select: (obj: any) => obj.android || obj.default,
  Version: 33,
};

export const StyleSheet = {
  create: (styles: any) => styles,
};

export const Linking = {
  openURL: async (url: string) => Promise.resolve(),
  openSettings: async () => Promise.resolve(),
};

export const Dimensions = {
  get: () => ({ width: 375, height: 812 }),
};

export const Alert = {
  alert: (title: string, message?: string, buttons?: any[]) => {},
};

export const NativeModules = {
  SalahFlowWidgetModule: {
    updateWidgetData: jest.fn().mockResolvedValue(true),
    refreshWidget: jest.fn().mockResolvedValue(true),
  },
};

export const StatusBar = {
  currentHeight: 32,
  setBarStyle: jest.fn(),
  setTranslucent: jest.fn(),
  setBackgroundColor: jest.fn(),
};

export const View = 'View';
export const Text = 'Text';
export const TouchableOpacity = 'TouchableOpacity';
export const ScrollView = 'ScrollView';
export const ActivityIndicator = 'ActivityIndicator';
export const Switch = 'Switch';
export const SafeAreaView = 'SafeAreaView';
export const Modal = 'Modal';
export const TextInput = 'TextInput';
export default {
  Platform,
  StyleSheet,
  Linking,
  Dimensions,
  Alert,
};
