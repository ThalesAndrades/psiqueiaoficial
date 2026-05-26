import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  ctaIndex?: number; // Index of the CTA (Call-to-Action) tab to highlight
  visibleTabs?: string[]; // Array of tab names that should be visible
}

export function AnimatedTabBar({ state, descriptors, navigation, ctaIndex, visibleTabs }: TabBarProps) {
  const insets = useSafeAreaInsets();
  
  // P0: Logging for debug
  console.log('[AnimatedTabBar] Visible tabs config:', visibleTabs);
  console.log('[AnimatedTabBar] All routes:', state.routes.map((r: any) => r.name));
  
  // Default visible tabs if not provided
  const defaultVisibleTabs = ['index', 'diario', 'agenda', 'perfil', 'pacientes'];
  const allowedTabs = visibleTabs || defaultVisibleTabs;
  
  // P0: Extra validation - ensure diario never in psychologist tabs
  if (process.env.NODE_ENV === 'development' && visibleTabs) {
    if (visibleTabs.includes('diario') && visibleTabs.includes('pacientes')) {
      console.error('[AnimatedTabBar] WARNING: diario should not coexist with pacientes tab!');
    }
  }

  // P0: Filter routes and log
  const filteredRoutes = state.routes.filter((route: any) => {
    const isAllowed = allowedTabs.includes(route.name);
    if (!isAllowed) {
      console.log('[AnimatedTabBar] Filtering out tab:', route.name);
    }
    return isAllowed;
  });
  
  console.log('[AnimatedTabBar] Final filtered routes:', filteredRoutes.map((r: any) => r.name));

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Background with blur */}
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      
      {/* Top border */}
      <LinearGradient
        colors={['#6B46C1', '#8B5CF6', '#06B6D4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topBorder}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {filteredRoutes
          .map((route: any, originalIndex: number) => {
            const { options } = descriptors[route.key];

            const label = options.tabBarLabel ?? options.title ?? route.name;
            // Use route.key instead of index for focus detection (more reliable)
            const isFocused = state.routes[state.index]?.key === route.key;
            const isCTA = ctaIndex !== undefined && originalIndex === ctaIndex;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                onPress={onPress}
                style={[styles.tab, isCTA && styles.ctaTab]}
                activeOpacity={0.7}
              >
                {/* Active indicator */}
                {isFocused && (
                  <View style={styles.activeIndicator}>
                    <LinearGradient
                      colors={['#6B46C1', '#8B5CF6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.activeIndicatorGradient}
                    />
                  </View>
                )}

                {/* Icon */}
                <View style={[
                  styles.iconContainer,
                  isFocused && styles.iconContainerActive,
                  isCTA && styles.iconContainerCTA,
                  isCTA && isFocused && styles.iconContainerCTAActive
                ]}>
                  {options.tabBarIcon && options.tabBarIcon({ 
                    focused: isFocused, 
                    color: isCTA && isFocused ? '#FFFFFF' : isFocused ? theme.colors.primary : theme.colors.muted, 
                    size: isCTA ? 28 : 24 
                  })}
                </View>

                {/* Label */}
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused && styles.tabLabelActive,
                    isCTA && styles.tabLabelCTA,
                    isCTA && isFocused && styles.tabLabelCTAActive
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>

                {/* Badge (if provided) */}
                {options.tabBarBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{options.tabBarBadge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#6B46C1',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: 'relative',
    minHeight: 60,
  },
  ctaTab: {
    flex: 1.2, // 20% wider for emphasis
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  activeIndicatorGradient: {
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(107, 70, 193, 0.1)',
  },
  iconContainerCTA: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(107, 70, 193, 0.15)',
  },
  iconContainerCTAActive: {
    backgroundColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.muted,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  tabLabelCTA: {
    fontWeight: '600',
  },
  tabLabelCTAActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: '25%',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
