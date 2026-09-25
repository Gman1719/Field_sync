// src/components/verification/VerificationPopup.jsx
// Enterprise Random Verification Modal for Field Officers

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { ShieldAlert, ShieldCheck, Clock, FastForward, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';

function VerificationPopup({ officerId, officerName, onAnswer, onClose }) {
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [question, setQuestion] = useState({
    question: 'What is your current location?',
    options: ['Office', 'Field', 'Home', 'Other']
  });
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [appearTime, setAppearTime] = useState(null);

  const verificationCountRef = useRef(0);
  const countdownRef = useRef(null);
  const popupTimeoutRef = useRef(null);
  const isAnsweredRef = useRef(false);

  const getRandomIntervalSeconds = () => {
    const min = 2 * 60;
    const max = 15 * 60;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const getNextIntervalSeconds = (count) => {
    if (count === 0) return 30;
    return getRandomIntervalSeconds();
  };

  const startCountdown = () => {
    const totalSeconds = getNextIntervalSeconds(verificationCountRef.current);
    let remaining = totalSeconds;
    setCountdown(remaining);

    if (countdownRef.current) clearInterval(countdownRef.current);

    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current);
        showPopup();
      }
    }, 1000);
  };

  const showPopup = () => {
    setIsVisible(true);
    setAppearTime(Date.now());

    const questions = [
      { question: 'What is your current location?', options: ['Office', 'Field', 'Home', 'Other'] },
      { question: 'How many citizens did you register today?', options: ['0-5', '6-10', '11-15', '16+'] },
      { question: 'What is your current task?', options: ['Field Visit', 'Report Writing', 'Data Entry', 'Meeting'] },
      { question: 'How many reports did you submit today?', options: ['0-2', '3-5', '6-8', '9+'] },
      { question: 'What is your estimated work completion?', options: ['0-25%', '26-50%', '51-75%', '76-100%'] }
    ];
    const randomIndex = Math.floor(Math.random() * questions.length);
    setQuestion(questions[randomIndex]);
    setSelectedAnswer('');
    isAnsweredRef.current = false;

    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    popupTimeoutRef.current = setTimeout(() => {
      if (!isAnsweredRef.current && isVisible) {
        const responseTime = Math.round((Date.now() - appearTime) / 1000);
        const result = {
          success: false,
          question: question.question,
          answer: 'Timeout',
          responseTime,
          officerId,
          officerName,
          message: 'Verification timed out'
        };
        isAnsweredRef.current = true;
        setIsVisible(false);
        onAnswer(result);
        verificationCountRef.current += 1;
        startCountdown();
      }
    }, 60000);
  };

  useEffect(() => {
    startCountdown();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    };
  }, []);

  const handleSubmit = () => {
    if (!selectedAnswer) {
      toast.error('Please select an answer to verify');
      return;
    }
    if (isAnsweredRef.current) return;

    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);

    const responseTime = Math.round((Date.now() - appearTime) / 1000);
    const result = {
      success: true,
      question: question.question,
      answer: selectedAnswer,
      responseTime,
      officerId,
      officerName,
      message: 'Verification passed successfully'
    };

    isAnsweredRef.current = true;
    setIsVisible(false);
    toast.success('Verification passed!');
    onAnswer(result);

    verificationCountRef.current += 1;
    startCountdown();
  };

  const handleSkip = () => {
    if (isAnsweredRef.current) return;

    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);

    const responseTime = Math.round((Date.now() - appearTime) / 1000);
    const result = {
      success: false,
      question: question.question,
      answer: 'Skipped',
      responseTime,
      officerId,
      officerName,
      message: 'Verification skipped'
    };

    isAnsweredRef.current = true;
    setIsVisible(false);
    toast('Verification check skipped', { icon: '⏭️' });
    onAnswer(result);

    verificationCountRef.current += 1;
    startCountdown();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <>
      {/* Floating Verification Countdown Indicator */}
      <div className="fixed bottom-5 right-5 z-40 bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-2 rounded-xl shadow-lg border border-slate-700/50 flex items-center gap-2.5 text-xs">
        <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
        <span className="text-slate-300">Next check in:</span>
        <span className="font-mono font-bold text-amber-400">{formatTime(countdown)}</span>
      </div>

      {/* Verification Modal Dialog */}
      {isVisible && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-[#334155] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 dark:border-[#334155] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1E3A8A] dark:text-blue-400 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-[#1E3A8A] dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-[#F8FAFC]">Security Check</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Field Activity Verification</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-[#1E3A8A] dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                Random Audit
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Officer: <span className="text-slate-800 dark:text-slate-200 font-semibold">{officerName}</span>
              </div>

              <div className="text-sm font-semibold text-slate-900 dark:text-[#F8FAFC]">
                {question.question}
              </div>

              <div className="space-y-2">
                {question.options.map((option, index) => {
                  const isChecked = selectedAnswer === option;
                  return (
                    <label
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        isChecked
                          ? 'border-[#1E3A8A] dark:border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-[#1E3A8A] dark:text-blue-300'
                          : 'border-slate-200 dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="verification_opt"
                        value={option}
                        checked={isChecked}
                        onChange={() => setSelectedAnswer(option)}
                        className="w-4 h-4 text-[#1E3A8A] focus:ring-[#1E3A8A]"
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 px-6 bg-slate-50 dark:bg-[#182234] border-t border-slate-100 dark:border-[#334155] flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <FastForward className="w-4 h-4 mr-1.5" />
                Skip Check
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                disabled={!selectedAnswer}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Submit Verification
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VerificationPopup;