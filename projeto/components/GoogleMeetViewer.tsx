import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface GoogleMeetViewerProps {
  meetLink: string;
  onError?: (error: any) => void;
}

export function GoogleMeetViewer({ meetLink, onError }: GoogleMeetViewerProps) {
  if (Platform.OS === 'web') {
    // For web, use iframe
    return (
      <View style={styles.container}>
        <iframe
          src={meetLink}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 16,
          }}
          allow="camera; microphone; fullscreen; display-capture"
          title="Google Meet Session"
        />
      </View>
    );
  }

  // For mobile, use WebView
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: meetLink }}
        style={styles.webview}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          onError?.(nativeEvent);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
  },
});
