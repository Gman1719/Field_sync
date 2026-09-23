// hooks/useVerification.js
// FIRST: 30 seconds → THEN: random 2–8 minutes (unpredictable)

import { useState, useEffect, useCallback, useRef } from 'react';
import { db, checkRealInternet, syncQueue } from '../services/database';
import { uid } from '../utils/helpers';
import { API_BASE as API_BASE_URL } from '../config/api';

const VERIFICATION_QUESTIONS = [
  { id: 'q1', question: 'What is your current location?', options: ['Office', 'Field', 'Home', 'Other'] },
  { id: 'q2', question: 'How many citizens did you register today?', options: ['0-5', '6-10', '11-15', '16+'] },
  { id: 'q3', question: 'What is your current task?', options: ['Field Visit', 'Report Writing', 'Data Entry', 'Meeting'] },
  { id: 'q4', question: 'How many reports did you submit today?', options: ['0-2', '3-5', '6-8', '9+'] },
  { id: 'q5', question: 'What is your estimated work completion?', options: ['0-25%', '26-50%', '51-75%', '76-100%'] }
];

export function useVerification(officerId, officerName) {
  const [showPopup, setShowPopup] = useState(false);
  const [verificationScore, setVerificationScore] = useState(100);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [lastVerified, setLastVerified] = useState(null);

  const timerRef = useRef(null);
  const isMounted = useRef(true);
  const isPopupOpen = useRef(false);

  // ============================================================
  // LOAD DATA (unchanged)
  // ============================================================
  useEffect(() => {
    if (!officerId) return;
    const loadData = async () => {
      try {
        const saved = localStorage.getItem(`verification_${officerId}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setVerificationScore(parsed.score || 100);
          const syncedHistory = (parsed.history || []).filter(h => h.synced !== false);
          setVerificationHistory(syncedHistory);
          setLastVerified(parsed.lastVerified || null);
        }
        if (db && db.verification_history) {
          const history = await db.verification_history
            .where('officerId')
            .equals(officerId)
            .toArray();
          if (history.length > 0) {
            const synced = history.filter(h => h.synced !== false);
            if (synced.length > 0) {
              setVerificationHistory(synced);
              setLastVerified(synced[0]?.timestamp || null);
            }
          }
        }
      } catch (e) { console.error('Error loading verification data:', e); }
    };
    loadData();

    const handleUpdate = (event) => {
      if (event.detail?.officerId === officerId) loadData();
    };
    window.addEventListener('verification-update', handleUpdate);
    return () => window.removeEventListener('verification-update', handleUpdate);
  }, [officerId]);

  // ============================================================
  // SAVE STATE (unchanged)
  // ============================================================
  const saveState = useCallback(async (score, history, lastVerifiedTime) => {
    if (!officerId || !isMounted.current) return;
    try {
      const storedHistory = history.filter(h => h.synced !== false);
      const state = { score, history: storedHistory.slice(0, 50), lastVerified: lastVerifiedTime };
      localStorage.setItem(`verification_${officerId}`, JSON.stringify(state));
      if (db && db.verification_history) {
        for (const entry of history) {
          await db.verification_history.put({ 
            ...entry, 
            officerId, 
            officerName,
            synced: entry.synced !== false
          });
        }
      }
      window.dispatchEvent(new CustomEvent('verification-update', { detail: { officerId, score, history: storedHistory } }));
    } catch (e) { console.error('Error saving verification state:', e); }
  }, [officerId, officerName]);

  // ============================================================
  // MARK AS SYNCED (unchanged)
  // ============================================================
  const markAsSynced = useCallback(async (recordId) => {
    if (!officerId || !isMounted.current) return;
    try {
      const saved = localStorage.getItem(`verification_${officerId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.history) {
          parsed.history = parsed.history.map(h =>
            h.id === recordId ? { ...h, synced: true } : h
          );
          localStorage.setItem(`verification_${officerId}`, JSON.stringify(parsed));
        }
      }
      if (db && db.verification_history) {
        await db.verification_history.update(recordId, { synced: true });
      }
      setVerificationHistory(prev =>
        prev.map(h => h.id === recordId ? { ...h, synced: true } : h)
      );
    } catch (e) { console.error('Error marking record as synced:', e); }
  }, [officerId]);

  // ============================================================
  // CALCULATE TRUST SCORE (unchanged)
  // ============================================================
  const calculateTrustScore = useCallback((answers, responseTime) => {
    let score = 100;
    const penalties = [];
    if (responseTime > 30) {
      const penalty = Math.min(20, Math.floor((responseTime - 30) / 5) * 2);
      penalties.push(`Slow response: -${penalty}%`);
      score -= penalty;
    }
    const suspiciousPatterns = [
      { pattern: /0-5/i, penalty: 5 },
      { pattern: /field/i, penalty: 3 },
      { pattern: /0-25%/i, penalty: 5 }
    ];
    answers.forEach(answer => {
      suspiciousPatterns.forEach(({ pattern, penalty }) => {
        if (pattern.test(answer)) {
          penalties.push(`Suspicious answer: -${penalty}%`);
          score -= penalty;
        }
      });
    });
    const randomFactor = Math.floor(Math.random() * 5) - 2;
    if (randomFactor !== 0) {
      penalties.push(`Random variation: ${randomFactor > 0 ? '+' : ''}${randomFactor}%`);
      score += randomFactor;
    }
    score = Math.max(0, Math.min(100, score));
    return { score, penalties };
  }, []);

  // ============================================================
  // GET RANDOM QUESTION (unchanged)
  // ============================================================
  const getRandomQuestion = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * VERIFICATION_QUESTIONS.length);
    return VERIFICATION_QUESTIONS[randomIndex];
  }, []);

  // ============================================================
  // SHOW POPUP NOW
  // ============================================================
  const showPopupNow = useCallback(() => {
    if (isPopupOpen.current || !isMounted.current || !officerId) return;
    const question = getRandomQuestion();
    setCurrentQuestion({ ...question, timestamp: Date.now() });
    setShowPopup(true);
    isPopupOpen.current = true;
  }, [officerId, getRandomQuestion]);

  // ============================================================
  // GET RANDOM DELAY (2–8 minutes)
  // ============================================================
  const getRandomDelay = useCallback(() => {
    const minMinutes = 2;
    const maxMinutes = 8;
    return (Math.random() * (maxMinutes - minMinutes) + minMinutes) * 60 * 1000;
  }, []);

  // ============================================================
  // SCHEDULE NEXT POPUP
  // ============================================================
  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isMounted.current || !officerId) return;

    const delay = getRandomDelay();

    timerRef.current = setTimeout(() => {
      if (isPopupOpen.current) {
        // If popup is still open, check again in 30 seconds
        scheduleNext();
        return;
      }
      if (isMounted.current && officerId) {
        showPopupNow();
      }
    }, delay);
  }, [officerId, showPopupNow, getRandomDelay]);

  // ============================================================
  // HANDLE ANSWER
  // ============================================================
  const handleAnswer = useCallback(async (answerData) => {
    if (!currentQuestion || !officerId || !isMounted.current) return;
    
    const responseTime = (Date.now() - currentQuestion.timestamp) / 1000;
    const { score: trustScore, penalties } = calculateTrustScore(
      [answerData.answer || answerData], 
      responseTime
    );

    const historyEntry = {
      id: uid(),
      officerId,
      officerName,
      question: currentQuestion.question,
      answer: answerData.answer || answerData,
      timestamp: new Date().toISOString(),
      responseTime: Math.round(responseTime),
      score: trustScore,
      penalties,
      questionId: currentQuestion.id,
      success: trustScore >= 60,
      message: trustScore >= 60 ? '✅ Verification passed!' : '⚠️ Verification warning',
      synced: false
    };

    const updatedHistory = [historyEntry, ...verificationHistory].slice(0, 50);
    const updatedScore = Math.round((verificationScore + trustScore) / 2);
    const now = new Date().toISOString();

    setVerificationHistory(updatedHistory);
    setVerificationScore(updatedScore);
    setLastVerified(now);
    setShowPopup(false);
    setCurrentQuestion(null);
    isPopupOpen.current = false;

    await saveState(updatedScore, updatedHistory, now);

    // Sync to server (offline support)
    const online = await checkRealInternet();
    if (online) {
      try {
        const response = await fetch(`${API_BASE_URL}/verification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(historyEntry),
        });
        if (response.ok) {
          await markAsSynced(historyEntry.id);
          console.log('✅ Verification synced to server');
        } else {
          throw new Error('Server error');
        }
      } catch (error) {
        console.warn('Failed to sync verification, queueing:', error.message);
        syncQueue.add({ type: 'verification', id: historyEntry.id, data: historyEntry });
      }
    } else {
      console.log('📡 Offline, queuing verification for later sync');
      syncQueue.add({ type: 'verification', id: historyEntry.id, data: historyEntry });
    }

    // Schedule next popup with random delay (2–8 min)
    scheduleNext();
  }, [currentQuestion, officerId, officerName, verificationHistory, verificationScore, 
      calculateTrustScore, saveState, markAsSynced, scheduleNext]);

  // ============================================================
  // HANDLE CLOSE / SKIP
  // ============================================================
  const handleClose = useCallback(async () => {
    if (!isMounted.current || !isPopupOpen.current) return;
    setShowPopup(false);
    setCurrentQuestion(null);
    isPopupOpen.current = false;

    const penalty = 5;
    const updatedScore = Math.max(0, verificationScore - penalty);
    setVerificationScore(updatedScore);
    const now = new Date().toISOString();
    await saveState(updatedScore, verificationHistory, lastVerified || now);
    
    // Schedule next popup with random delay (2–8 min)
    scheduleNext();
  }, [verificationScore, verificationHistory, lastVerified, saveState, scheduleNext]);

  // ============================================================
  // INITIAL SETUP – first popup after 30 seconds
  // ============================================================
  useEffect(() => {
    isMounted.current = true;
    isPopupOpen.current = false;
    if (!officerId) return;

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Schedule first popup after 30 seconds
    timerRef.current = setTimeout(() => {
      if (isMounted.current && officerId && !isPopupOpen.current) {
        showPopupNow();
      }
    }, 30 * 1000); // 30 seconds

    return () => {
      isMounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [officerId, showPopupNow]);

  // ============================================================
  // EXPOSE API
  // ============================================================
  return {
    showPopup,
    verificationScore,
    verificationHistory,
    currentQuestion,
    lastVerified,
    handleAnswer,
    handleClose
  };
}