import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { theme } from '../../constants/theme';
import { appointmentService, videoService } from '../../services';
import type { Appointment } from '../../services/appointmentService';

// Daily.co's React Native SDK is mobile-only. On web we render an iframe
// fallback against the same room URL; on native we import the SDK lazily so
// the bundle doesn't pull native modules on web.
let DailyIframe: any = null;
let DailyMediaView: any = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const daily = require('@daily-co/react-native-daily-js');
    DailyIframe = daily.default ?? daily;
    DailyMediaView = daily.DailyMediaView;
  } catch (err) {
    // Module not installed yet — the screen will surface a friendly error.
    console.warn('[session] @daily-co/react-native-daily-js not available:', err);
  }
}

type AppointmentWithParties = Appointment & { patient?: any; psychologist?: any };

export default function SessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ appointmentId: string }>();
  const appointmentId = params.appointmentId;

  const [appointment, setAppointment] = useState<AppointmentWithParties | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joinedUrl, setJoinedUrl] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [participants, setParticipants] = useState<Record<string, any>>({});

  const callObjectRef = useRef<any>(null);

  const meetLink = useMemo(
    () => appointment?.meet_link || appointment?.google_meet_link || null,
    [appointment],
  );

  // --- Load the appointment up front. ---
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!appointmentId) {
        setLoading(false);
        return;
      }
      const { data, error } = await appointmentService.getAppointmentById(appointmentId);
      if (cancelled) return;
      if (error || !data) {
        Alert.alert('Erro', error || 'Sessão não encontrada');
        router.back();
        return;
      }
      setAppointment(data as AppointmentWithParties);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, router]);

  // --- Tear the call down on unmount. We DON'T destroy the room itself —
  // the other participant may still need it. The room expires server-side
  // (Daily room.exp covers duration + 30min grace). ---
  useEffect(() => {
    return () => {
      const obj = callObjectRef.current;
      if (obj) {
        try {
          obj.leave?.();
          obj.destroy?.();
        } catch (err) {
          console.warn('[session] cleanup failed:', err);
        }
      }
    };
  }, []);

  const handleGenerateRoom = useCallback(async () => {
    if (!appointmentId) return;
    setCreatingRoom(true);
    const { data, error } = await videoService.createRoom(appointmentId);
    setCreatingRoom(false);
    if (error || !data?.url) {
      Alert.alert('Erro', error || 'Não foi possível gerar a sala');
      return;
    }
    // Refresh the appointment to pick up the meet_link the server just wrote.
    const { data: refreshed } = await appointmentService.getAppointmentById(appointmentId);
    if (refreshed) setAppointment(refreshed as AppointmentWithParties);
  }, [appointmentId]);

  const handleJoin = useCallback(async () => {
    if (!meetLink) return;
    if (Platform.OS === 'web') {
      // Web fallback — Daily ships a hosted prefab at the room URL.
      setJoinedUrl(meetLink);
      return;
    }
    if (!DailyIframe) {
      Alert.alert(
        'Vídeo indisponível',
        'O módulo de vídeo não foi instalado neste build. Reinstale o app ou contate o suporte.',
      );
      return;
    }
    try {
      const callObject = DailyIframe.createCallObject?.() ?? DailyIframe({ url: meetLink });
      callObjectRef.current = callObject;
      callObject.on?.('participant-joined', (event: any) => {
        setParticipants((prev) => ({ ...prev, [event.participant.session_id]: event.participant }));
      });
      callObject.on?.('participant-updated', (event: any) => {
        setParticipants((prev) => ({ ...prev, [event.participant.session_id]: event.participant }));
      });
      callObject.on?.('participant-left', (event: any) => {
        setParticipants((prev) => {
          const next = { ...prev };
          delete next[event.participant.session_id];
          return next;
        });
      });
      callObject.on?.('left-meeting', () => {
        setJoinedUrl(null);
      });
      await callObject.join({ url: meetLink });
      setJoinedUrl(meetLink);
    } catch (err: any) {
      console.error('[session] join failed:', err);
      Alert.alert('Erro', err?.message || 'Não foi possível entrar na sala');
    }
  }, [meetLink]);

  const handleLeave = useCallback(async () => {
    const obj = callObjectRef.current;
    if (obj) {
      try {
        await obj.leave?.();
        obj.destroy?.();
      } catch (err) {
        console.warn('[session] leave failed:', err);
      }
    }
    callObjectRef.current = null;
    setJoinedUrl(null);
    setParticipants({});
    router.back();
  }, [router]);

  const handleToggleMic = useCallback(() => {
    const obj = callObjectRef.current;
    if (!obj) return;
    const next = !micOn;
    try {
      obj.setLocalAudio?.(next);
      setMicOn(next);
    } catch (err) {
      console.warn('[session] toggle mic failed:', err);
    }
  }, [micOn]);

  const handleToggleCam = useCallback(() => {
    const obj = callObjectRef.current;
    if (!obj) return;
    const next = !camOn;
    try {
      obj.setLocalVideo?.(next);
      setCamOn(next);
    } catch (err) {
      console.warn('[session] toggle cam failed:', err);
    }
  }, [camOn]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.muted}>Carregando sessão…</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.muted}>Sessão não encontrada</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- In-call view (native) ---
  if (joinedUrl && Platform.OS !== 'web' && DailyMediaView) {
    const list = Object.values(participants);
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.videoStage}>
          {list.length === 0 ? (
            <Text style={styles.mutedLight}>Aguardando outro participante…</Text>
          ) : (
            list.map((p: any) => (
              <View key={p.session_id} style={styles.tile}>
                <DailyMediaView
                  videoTrack={p.tracks?.video?.persistentTrack ?? null}
                  audioTrack={p.tracks?.audio?.persistentTrack ?? null}
                  mirror={p.local}
                  zOrder={p.local ? 1 : 0}
                  style={styles.media}
                />
                <Text style={styles.tileLabel}>{p.user_name || (p.local ? 'Você' : 'Participante')}</Text>
              </View>
            ))
          )}
        </View>
        <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity onPress={handleToggleMic} style={[styles.controlButton, !micOn && styles.controlButtonOff]}>
            <Ionicons name={micOn ? 'mic' : 'mic-off'} size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleCam} style={[styles.controlButton, !camOn && styles.controlButtonOff]}>
            <Ionicons name={camOn ? 'videocam' : 'videocam-off'} size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLeave} style={[styles.controlButton, styles.leaveButton]}>
            <Ionicons name="call" size={26} color="#FFFFFF" />
            <Text style={styles.leaveLabel}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- In-call view (web fallback — Daily hosted prefab in an iframe). ---
  if (joinedUrl && Platform.OS === 'web') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.webHeader}>
          <TouchableOpacity onPress={handleLeave}>
            <Ionicons name="close" size={28} color={theme.colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Sessão ao Vivo</Text>
          <View style={{ width: 28 }} />
        </View>
        {/* @ts-ignore - native iframe on web only */}
        <iframe
          src={joinedUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          style={{ flex: 1, width: '100%', height: '100%', border: 'none' } as any}
          title="PsiquèIA — sessão"
        />
      </View>
    );
  }

  // --- Pre-call view ---
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F3F0FF', '#EBF3FF', '#E8F6F8']} style={styles.background}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.foreground} />
          </TouchableOpacity>
          <Text style={styles.title}>Sessão de Terapia</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          <View style={styles.card}>
            <Ionicons name="videocam-outline" size={48} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>
              {new Date(appointment.scheduled_at).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </Text>
            <Text style={styles.cardSubtitle}>
              Duração prevista: {appointment.duration_minutes ?? 50} minutos
            </Text>
          </View>

          {meetLink ? (
            <TouchableOpacity onPress={handleJoin} style={styles.primaryButton}>
              <Ionicons name="videocam" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Entrar na sessão</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleGenerateRoom}
              style={styles.primaryButton}
              disabled={creatingRoom}
            >
              {creatingRoom ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Gerar sala</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <Text style={styles.helper}>
            A sala é criptografada e expira automaticamente após o término da sessão.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  background: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FFFFFF' },
  muted: { color: '#64748B', fontSize: 14, fontWeight: '500' },
  mutedLight: { color: '#CBD5E1', fontSize: 14, fontWeight: '500' },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  webHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.foreground },
  body: { flex: 1, padding: 24, gap: 20 },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.foreground, marginTop: 8 },
  cardSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  helper: { fontSize: 12, color: '#64748B', textAlign: 'center', paddingHorizontal: 24 },

  videoStage: {
    flex: 1,
    backgroundColor: '#000000',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  tile: { flex: 1, minWidth: '45%', minHeight: 220, backgroundColor: '#0F172A', borderRadius: 16, overflow: 'hidden' },
  media: { flex: 1, width: '100%', height: '100%' },
  tileLabel: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    backgroundColor: '#0B1220',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonOff: { backgroundColor: '#475569' },
  leaveButton: { backgroundColor: '#DC2626', flexDirection: 'row', paddingHorizontal: 20, width: undefined, gap: 6 },
  leaveLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
