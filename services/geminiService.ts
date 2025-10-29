

// FIX: The `LiveSession` type is not exported from '@google/genai'. It has been removed from imports.
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are an AI assistant representing a job applicant named Alex. Your goal is to call an HR representative to follow up on a recent job application for a Software Engineer position.

Your personality is professional, polite, and concise.

Your conversation flow should be:
1.  Greet the HR representative.
2.  Introduce yourself as Alex's assistant.
3.  State that you are following up on the Software Engineer application.
4.  Ask if there are any updates on the application status.
5.  Politely ask about the next steps in the hiring process.
6.  Thank the representative for their time and end the call.

Keep your responses brief and to the point. Be prepared to handle variations in the conversation gracefully.
`;

interface ConnectCallbacks {
  onOpen: () => void;
  onMessage: (message: LiveServerMessage) => void;
  onError: (error: ErrorEvent | CloseEvent) => void;
  onClose: () => void;
}

// FIX: Removed the explicit `Promise<LiveSession>` return type annotation. The return type is now correctly inferred by TypeScript.
export const connectToLiveSession = (callbacks: ConnectCallbacks) => {
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: callbacks.onOpen,
      onmessage: callbacks.onMessage,
      onerror: callbacks.onError,
      onclose: callbacks.onClose,
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction: SYSTEM_INSTRUCTION,
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
  });
};

export const generateCallSummary = async (transcript: string): Promise<string> => {
    if (!transcript) return "No conversation to summarize.";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Please summarize the following conversation between an AI Agent and an HR representative. Extract key information like the outcome of the follow-up, any mentioned next steps, and the overall tone of the conversation.

            Transcript:
            ${transcript}`,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating summary with Gemini:", error);
        return "Could not generate a summary for this conversation.";
    }
};
