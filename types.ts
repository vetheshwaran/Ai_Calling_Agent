export enum CallStatus {
  IDLE = 'IDLE',
  DIALING = 'DIALING',
  RINGING = 'RINGING',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  ENDING = 'ENDING',
  ENDED = 'ENDED',
}

export interface TranscriptEntry {
  speaker: 'AI Agent' | 'HR (You)';
  text: string;
}