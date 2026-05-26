import { useState, useEffect, useCallback } from 'react';

interface UseTypingEffectOptions {
  speed?: number; // ms por caractere
  onComplete?: () => void;
}

export function useTypingEffect(
  text: string, 
  options: UseTypingEffectOptions = {}
) {
  const { speed = 30, onComplete } = options;
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setCurrentIndex(0);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    setCurrentIndex(0);
    setDisplayedText('');
  }, [text]);

  useEffect(() => {
    if (!isTyping || currentIndex >= text.length) {
      if (currentIndex >= text.length && isTyping) {
        setIsTyping(false);
        onComplete?.();
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText(text.slice(0, currentIndex + 1));
      setCurrentIndex(currentIndex + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [currentIndex, isTyping, text, speed, onComplete]);

  const skip = useCallback(() => {
    setDisplayedText(text);
    setCurrentIndex(text.length);
    setIsTyping(false);
    onComplete?.();
  }, [text, onComplete]);

  return { displayedText, isTyping, skip };
}
