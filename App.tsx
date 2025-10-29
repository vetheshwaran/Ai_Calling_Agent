import React, { useState, useRef, useCallback, useEffect } from 'react';
// FIX: The `LiveSession` type is not exported from '@google/genai'. It has been removed from imports.
import type { LiveServerMessage } from '@google/genai';
import { connectToLiveSession, generateCallSummary } from './services/geminiService';
import { CallStatus } from './types';
import type { TranscriptEntry } from './types';
import CallControl from './components/CallControl';
import TranscriptDisplay from './components/TranscriptDisplay';
import ReportDisplay from './components/ReportDisplay';
// FIX: Import encode function for audio processing.
import { decode, decodePCMAudioData, encode, playRingtone } from './utils/audioUtils';

const App: React.FC = () => {
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // FIX: Replaced the non-exported `LiveSession` type by inferring the type from `connectToLiveSession` using `ReturnType`.
  const sessionPromiseRef = useRef<ReturnType<typeof connectToLiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const ringtoneSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const callSequenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  let currentInputTranscription = '';
  let currentOutputTranscription = '';

  const cleanupAudio = useCallback(() => {
    if (ringtoneSourceRef.current) {
        ringtoneSourceRef.current.stop();
        ringtoneSourceRef.current = null;
    }
    if (callSequenceTimeoutRef.current) {
        clearTimeout(callSequenceTimeoutRef.current);
        callSequenceTimeoutRef.current = null;
    }

    if (scriptProcessorRef.current && mediaStreamSourceRef.current && audioContextRef.current) {
        mediaStreamSourceRef.current.disconnect();
        scriptProcessorRef.current.disconnect();
    }
    if(mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    if(outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
    }
    scriptProcessorRef.current = null;
    mediaStreamSourceRef.current = null;
    audioContextRef.current = null;
    outputAudioContextRef.current = null;
    sessionPromiseRef.current = null;
  }, []);

  const handleMessage = async (message: LiveServerMessage) => {
    if (message.serverContent) {
        if(message.serverContent.inputTranscription) {
            currentInputTranscription += message.serverContent.inputTranscription.text;
        }
        if(message.serverContent.outputTranscription) {
            currentOutputTranscription += message.serverContent.outputTranscription.text;
        }

        if (message.serverContent.turnComplete) {
            if(currentInputTranscription.trim()){
                setTranscript(prev => [...prev, { speaker: 'HR (You)', text: currentInputTranscription.trim() }]);
            }
            if(currentOutputTranscription.trim()){
                setTranscript(prev => [...prev, { speaker: 'AI Agent', text: currentOutputTranscription.trim() }]);
            }
            currentInputTranscription = '';
            currentOutputTranscription = '';
        }
    }
    
    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio && outputAudioContextRef.current) {
      const outputAudioContext = outputAudioContextRef.current;
      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
      const audioBuffer = await decodePCMAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputAudioContext.destination);
      source.addEventListener('ended', () => {
        audioSourcesRef.current.delete(source);
      });
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      audioSourcesRef.current.add(source);
    }
    
    if (message.serverContent?.interrupted) {
        for (const source of audioSourcesRef.current.values()) {
            source.stop();
        }
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }
  };

  // FIX: Updated the type of 'e' to 'ErrorEvent | CloseEvent' to match the expected callback signature from the Gemini service wrapper. This resolves the TypeScript compilation error.
  const handleError = (e: ErrorEvent | CloseEvent) => {
    console.error(e);
    setError('An error occurred during the call. Please try again.');
    setCallStatus(CallStatus.IDLE);
    cleanupAudio();
  };

  const handleClose = () => {
    console.log('Session closed.');
    if (callStatus !== CallStatus.ENDING && callStatus !== CallStatus.ENDED) {
        setCallStatus(CallStatus.IDLE);
        cleanupAudio();
    }
  };

  const connectToGemini = async () => {
      setCallStatus(CallStatus.CONNECTING);
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;

          sessionPromiseRef.current = connectToLiveSession({
              onMessage: handleMessage,
              onError: handleError,
              onClose: handleClose,
              onOpen: () => {
                setCallStatus(CallStatus.ACTIVE);
                const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                audioContextRef.current = inputAudioContext;
                const source = inputAudioContext.createMediaStreamSource(stream);
                mediaStreamSourceRef.current = source;
                const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                scriptProcessorRef.current = scriptProcessor;

                scriptProcessor.onaudioprocess = (event) => {
                  const inputData = event.inputBuffer.getChannelData(0);
                  const l = inputData.length;
                  const int16 = new Int16Array(l);
                  for (let i = 0; i < l; i++) {
                    int16[i] = inputData[i] * 32768;
                  }
                  const base64Data = encode(new Uint8Array(int16.buffer));

                  sessionPromiseRef.current?.then((session) => {
                      session.sendRealtimeInput({
                          media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                      });
                  });
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContext.destination);
              },
          });

      } catch (err) {
        console.error('Failed to start call:', err);
        setError('Could not access microphone. Please check permissions and try again.');
        setCallStatus(CallStatus.IDLE);
        cleanupAudio();
      }
  };


  const startCall = async () => {
    setError(null);
    setTranscript([]);
    setSummary('');

    try {
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTimeRef.current = 0;
        audioSourcesRef.current = new Set();
        
        setCallStatus(CallStatus.DIALING);
        await new Promise(resolve => setTimeout(resolve, 1500));

        setCallStatus(CallStatus.RINGING);
        const ringtoneSource = await playRingtone(outputAudioContextRef.current);
        ringtoneSourceRef.current = ringtoneSource;

        const connectTimeout = setTimeout(() => {
            if (ringtoneSourceRef.current) {
                ringtoneSourceRef.current.stop();
                ringtoneSourceRef.current = null;
            }
            connectToGemini();
        }, 7000); 
        callSequenceTimeoutRef.current = connectTimeout;

    } catch (err) {
      console.error('Failed to start call sequence:', err);
      setError('An error occurred while trying to start the call.');
      setCallStatus(CallStatus.IDLE);
      cleanupAudio();
    }
  };

  const endCall = async () => {
    setCallStatus(CallStatus.ENDING);

    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error("Error closing session:", e);
      }
    }
    cleanupAudio();

    if (transcript.length > 0) {
        try {
            const finalTranscript = transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
            const summaryText = await generateCallSummary(finalTranscript);
            setSummary(summaryText);
        } catch (e) {
            console.error("Error generating summary:", e);
            setError("Failed to generate call summary.");
        }
    }

    setCallStatus(CallStatus.ENDED);
  };

  useEffect(() => {
    return () => {
        if(sessionPromiseRef.current){
            sessionPromiseRef.current.then(session => session.close());
        }
        cleanupAudio();
    };
  }, [cleanupAudio]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-cyan-400">AI Calling Agent</h1>
          <p className="text-gray-400 mt-2 text-lg">Simulating intelligent outbound calls to HR representatives.</p>
        </header>
        
        <main className="bg-gray-800/50 rounded-2xl shadow-2xl shadow-cyan-500/10 p-6 backdrop-blur-sm border border-cyan-400/20">
            <CallControl status={callStatus} onStart={startCall} onEnd={endCall} />

            {error && <div className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</div>}

            <div className="mt-6 space-y-6">
                {(callStatus === CallStatus.ACTIVE || callStatus === CallStatus.CONNECTING || callStatus === CallStatus.DIALING || callStatus === CallStatus.RINGING) && <TranscriptDisplay transcript={transcript} />}
                {(callStatus === CallStatus.ENDED || callStatus === CallStatus.ENDING) && <ReportDisplay summary={summary} transcript={transcript} isLoadingSummary={callStatus === CallStatus.ENDING && summary === ''} />}
                {callStatus === CallStatus.IDLE && (
                    <div className="text-center py-16 px-4 bg-gray-900/40 rounded-lg">
                        <h2 className="text-2xl font-semibold text-gray-300">Start a New Call Simulation</h2>
                        <p className="text-gray-500 mt-2">Enter a phone number above and press "Start Call" to begin.</p>
                    </div>
                )}
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;