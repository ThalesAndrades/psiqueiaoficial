import React, { memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';
import { theme } from '../../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton = memo(({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}: SkeletonProps) => {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.ease }),
        withTiming(0.3, { duration: 1000, easing: Easing.ease })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
});

interface SkeletonCardProps {
  showAvatar?: boolean;
  linesCount?: number;
}

export const SkeletonCard = memo(({ showAvatar = false, linesCount = 3 }: SkeletonCardProps) => {
  return (
    <View style={styles.card}>
      {showAvatar && (
        <Skeleton width={48} height={48} borderRadius={24} style={styles.avatar} />
      )}
      <View style={styles.content}>
        {Array.from({ length: linesCount }).map((_, index) => (
          <Skeleton
            key={index}
            width={index === linesCount - 1 ? '60%' : '100%'}
            height={16}
            style={styles.line}
          />
        ))}
      </View>
    </View>
  );
});

interface SkeletonListProps {
  count?: number;
  showAvatar?: boolean;
}

export const SkeletonList = memo(({ count = 5, showAvatar = true }: SkeletonListProps) => {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} showAvatar={showAvatar} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 16,
    marginBottom: 12,
  },
  avatar: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  line: {
    marginBottom: 8,
  },
  list: {
    padding: 16,
  },
});
