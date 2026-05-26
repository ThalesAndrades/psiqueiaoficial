import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  type: ToastType;
  message: string;
  duration?: number;
  onDismiss?: () => void;
}

const ICON_MAP: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
  warning: 'warning',
};

const COLOR_MAP: Record<ToastType, string> = {
  success: '#10B981',
  error: '#EF4444',
  info: '#3B82F6',
  warning: '#F59E0B',
};

export const Toast = memo(function Toast({
  type,
  message,
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Show animation
    translateY.value = withSpring(0, {
      damping: 15,
      stiffness: 100,
    });
    opacity.value = withTiming(1, { duration: 300 });

    // Auto dismiss
    const timer = setTimeout(() => {
      // Hide animation
      translateY.value = withTiming(-100, { duration: 300 });
      opacity.value = withTiming(0, { duration: 300 }, () => {
        if (onDismiss) {
          runOnJS(onDismiss)();
        }
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[styles.toast, { borderLeftColor: COLOR_MAP[type] }]}>
        <Ionicons name={ICON_MAP[type]} size={24} color={COLOR_MAP[type]} />
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.select({ ios: 60, android: 48, default: 60 }),
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.foreground,
  },
});

/**
 * Toast Manager
 * 
 * Usage:
 * toastManager.show({ type: 'success', message: 'Salvo com sucesso!' });
 */

interface ToastConfig {
  type: ToastType;
  message: string;
  duration?: number;
}

class ToastManager {
  private listeners: Array<(config: ToastConfig | null) => void> = [];

  subscribe(callback: (config: ToastConfig | null) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  show(config: ToastConfig) {
    this.listeners.forEach(listener => listener(config));
  }

  hide() {
    this.listeners.forEach(listener => listener(null));
  }
}

export const toastManager = new ToastManager();

/**
 * ToastContainer Component
 * 
 * Add this to your root layout (_layout.tsx)
 */

export const ToastContainer = memo(function ToastContainer() {
  const [config, setConfig] = React.useState<ToastConfig | null>(null);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setConfig);
    return unsubscribe;
  }, []);

  if (!config) return null;

  return (
    <Toast
      type={config.type}
      message={config.message}
      duration={config.duration}
      onDismiss={() => setConfig(null)}
    />
  );
});
