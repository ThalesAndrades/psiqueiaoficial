import React, { createContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  appointmentService,
  treatmentService,
  financialService,
  patientPsychologistService,
  diaryService,
} from '../services';

interface AppDataContextType {
  // Common
  appointments: any[];
  loading: boolean;
  error: string | null;
  
  // Patient-only data
  patientAppointments: any[];
  nextPatientSession: any | null;
  activeTreatmentPlan: any | null;
  carePlanProgress: number;
  myPsychologist: any | null;
  diaryEntries: any[];
  
  // Psychologist-only data
  psychologistAppointments: any[];
  todaySessions: any[];
  myPatients: any[];
  activePatients: number;
  monthlyRevenue: number;
  attendanceRate: number;
  
  // Actions
  refreshAll: () => Promise<void>;
  refreshAppointments: () => Promise<void>;
}

const defaultContext: AppDataContextType = {
  appointments: [],
  loading: true,
  error: null,
  patientAppointments: [],
  nextPatientSession: null,
  activeTreatmentPlan: null,
  carePlanProgress: 0,
  myPsychologist: null,
  diaryEntries: [],
  psychologistAppointments: [],
  todaySessions: [],
  myPatients: [],
  activePatients: 0,
  monthlyRevenue: 0,
  attendanceRate: 100,
  refreshAll: async () => {},
  refreshAppointments: async () => {},
};

export const AppDataContext = createContext<AppDataContextType>(defaultContext);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Patient-only states
  const [activeTreatmentPlan, setActiveTreatmentPlan] = useState<any | null>(null);
  const [myPsychologist, setMyPsychologist] = useState<any | null>(null);
  const [diaryEntries, setDiaryEntries] = useState<any[]>([]);
  
  // Psychologist-only states
  const [myPatients, setMyPatients] = useState<any[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  const loadAllData = async () => {
    if (!userProfile?.id || !userProfile?.user_type) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load appointments first (fast)
      const { data: appts, error: apptsError } = await appointmentService.getAppointments(
        userProfile.id,
        userProfile.user_type
      );
      
      if (apptsError) {
        setError('Erro ao carregar dados');
        setLoading(false);
        return;
      }
      
      setAppointments(appts || []);
      setLoading(false);

      // Load rest in background based on user type
      if (userProfile.user_type === 'patient') {
        loadPatientData();
      } else if (userProfile.user_type === 'psychologist') {
        loadPsychologistData();
      }
    } catch (err) {
      console.error('[AppDataContext] Load error:', err);
      setError('Erro ao carregar dados');
      setLoading(false);
    }
  };

  const loadPatientData = async () => {
    if (!userProfile?.id) return;

    try {
      const [psychResult, diaryResult] = await Promise.all([
        patientPsychologistService.getMyPsychologist(userProfile.id),
        diaryService.getDiaryEntries(userProfile.id),
      ]);

      if (psychResult.data) {
        setMyPsychologist(psychResult.data);
        
        // Load treatment plan if has psychologist
        const planResult = await treatmentService.getActiveTreatmentPlan(
          userProfile.id,
          psychResult.data.psychologist_id
        );
        if (planResult.data) {
          setActiveTreatmentPlan(planResult.data);
        }
      }

      if (diaryResult.data) {
        setDiaryEntries(diaryResult.data);
      }
    } catch (err) {
      console.error('[AppDataContext] Patient data error:', err);
    }
  };

  const loadPsychologistData = async () => {
    if (!userProfile?.id) return;

    try {
      const [patientsResult, statsResult] = await Promise.all([
        patientPsychologistService.getMyPatients(userProfile.id),
        financialService.getFinancialStats(userProfile.id),
      ]);

      if (patientsResult.data) {
        setMyPatients(patientsResult.data);
      }

      if (statsResult.data) {
        setMonthlyRevenue(statsResult.data.monthlyRevenue || 0);
      }
    } catch (err) {
      console.error('[AppDataContext] Psychologist data error:', err);
    }
  };

  useEffect(() => {
    if (user && userProfile?.id && userProfile?.user_type) {
      loadAllData();
    } else {
      setLoading(false);
    }
  }, [user, userProfile?.id, userProfile?.user_type]);

  const refreshAppointments = async () => {
    if (!userProfile?.id || !userProfile?.user_type) return;
    const { data } = await appointmentService.getAppointments(
      userProfile.id,
      userProfile.user_type
    );
    setAppointments(data || []);
  };

  // Computed values based on user type
  const isPatient = userProfile?.user_type === 'patient';
  const isPsychologist = userProfile?.user_type === 'psychologist';

  // Patient computed values
  const patientAppointments = isPatient
    ? appointments
        .filter(apt => apt.status !== 'cancelled')
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    : [];

  const nextPatientSession = isPatient
    ? patientAppointments.find(apt => new Date(apt.scheduled_at) >= new Date()) || null
    : null;

  const carePlanProgress = isPatient && activeTreatmentPlan
    ? Math.min(
        Math.round(
          (appointments.filter(a => a.status === 'completed').length / 
          (activeTreatmentPlan.duration_weeks || 8)) * 100
        ),
        100
      )
    : 0;

  // Psychologist computed values
  const psychologistAppointments = isPsychologist
    ? appointments
        .filter(apt => apt.status !== 'cancelled')
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todaySessions = isPsychologist
    ? psychologistAppointments.filter(apt => {
        const aptDate = new Date(apt.scheduled_at);
        return aptDate >= today && aptDate < tomorrow;
      })
    : [];

  const activePatients = isPsychologist
    ? myPatients.filter(p => p.status === 'active').length
    : 0;
  
  const totalScheduled = isPsychologist
    ? appointments.filter(a => ['confirmed', 'completed', 'no_show'].includes(a.status)).length
    : 0;
    
  const attendanceRate = isPsychologist && totalScheduled > 0
    ? Math.round((appointments.filter(a => a.status === 'completed').length / totalScheduled) * 100)
    : 100;

  const value: AppDataContextType = {
    appointments,
    loading,
    error,
    // Patient data
    patientAppointments,
    nextPatientSession,
    activeTreatmentPlan,
    carePlanProgress,
    myPsychologist,
    diaryEntries: isPatient ? diaryEntries : [], // Only expose diary to patients
    // Psychologist data
    psychologistAppointments,
    todaySessions,
    myPatients,
    activePatients,
    monthlyRevenue,
    attendanceRate,
    // Actions
    refreshAll: loadAllData,
    refreshAppointments,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}
