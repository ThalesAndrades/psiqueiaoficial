import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { aiService } from '../../services/aiService';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useTypingEffect } from '../../hooks/useTypingEffect';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  initialContext?: any;
  placeholder?: string;
  welcomeMessage?: string;
}

export function AIChat({ 
  initialContext, 
  placeholder = 'Digite sua mensagem...',
  welcomeMessage = 'Olá! 👋 Sou a PsiquèIA. Estou aqui para apoiar você entre as sessões. Como posso ajudar hoje?'
}: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: 'assistant',
    content: welcomeMessage,
    timestamp: new Date(),
  }]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // Animated values for loading dots
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;
  
  const { displayedText: typedStreamText, isTyping, skip } = useTypingEffect(streamingMessage, { 
    speed: 20,
    onComplete: () => {
      if (streamingMessage) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: streamingMessage,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setStreamingMessage('');
        setIsStreaming(false);
      }
    }
  });

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, typedStreamText]);

  // Animate loading dots
  useEffect(() => {
    if (isLoading && !isStreaming) {
      const createPulseAnimation = (animValue: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(animValue, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0.3,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const animations = Animated.parallel([
        createPulseAnimation(dot1Anim, 0),
        createPulseAnimation(dot2Anim, 200),
        createPulseAnimation(dot3Anim, 400),
      ]);

      animations.start();

      return () => {
        animations.stop();
        dot1Anim.setValue(0.3);
        dot2Anim.setValue(0.3);
        dot3Anim.setValue(0.3);
      };
    }
  }, [isLoading, isStreaming, dot1Anim, dot2Anim, dot3Anim]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Use streaming for better UX
      aiService.streamChat(
        userMessage.content,
        initialContext,
        (chunk) => {
          if (!mountedRef.current) return;
          setStreamingMessage(prev => prev + chunk);
        },
        () => {
          if (!mountedRef.current) return;
          setIsLoading(false);
          // Typing effect will handle message completion
        },
        (error) => {
          if (!mountedRef.current) return;
          console.error('Chat error:', error);
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Desculpe, ocorreu um erro. Por favor, tente novamente.',
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
          setStreamingMessage('');
          setIsStreaming(false);
          setIsLoading(false);
        },
        controller.signal,
      );
    } catch (error) {
      console.error('Send message error:', error);
      if (!mountedRef.current) return;
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessage('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            {message.role === 'assistant' && (
              <View style={styles.aiAvatar}>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.messageContent}>
              <Text
                style={[
                  styles.messageText,
                  message.role === 'user' ? styles.userText : styles.assistantText,
                ]}
              >
                {message.content}
              </Text>
            </View>
          </View>
        ))}

        {isStreaming && typedStreamText && (
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={isTyping ? skip : undefined}
            style={[styles.messageBubble, styles.assistantBubble]}
          >
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.messageContent}>
              <Text style={styles.assistantText}>
                {typedStreamText}
                {isTyping && <Text style={styles.cursor}>▌</Text>}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {isLoading && !isStreaming && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.loadingDots}>
              <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
              <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
              <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <LinearGradient
              colors={
                inputText.trim() && !isLoading
                  ? [theme.colors.primary, '#8B5CF6', '#14B8A6']
                  : ['#CBD5E1', '#94A3B8']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendGradient}
            >
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  messageContent: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
  },
  userText: {
    backgroundColor: theme.colors.primary,
    color: '#FFFFFF',
  },
  assistantText: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: theme.colors.foreground,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    borderRadius: 16,
    padding: 12,
  },
  cursor: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.foreground,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    marginBottom: 4,
  },
  sendGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
