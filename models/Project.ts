import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description?: string;
  originalText: string;
  chunks: Array<{
    chunk: string;
    suggestedApiKey: string;
    maxTokens: number;
    audioUrl?: string;
    audioSize?: number;
    audioDuration?: number;
  }>;
  voiceId?: string;
  voiceSettings?: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    originalText: {
      type: String,
      required: true,
    },
    chunks: [
      {
        chunk: {
          type: String,
          required: true,
        },
        suggestedApiKey: {
          type: String,
          required: true,
        },
        maxTokens: {
          type: Number,
          required: true,
        },
        audioUrl: {
          type: String,
        },
        audioSize: {
          type: Number,
        },
        audioDuration: {
          type: Number,
        },
      },
    ],
    voiceId: {
      type: String,
    },
    voiceSettings: {
      stability: {
        type: Number,
        default: 0.3,
      },
      similarity_boost: {
        type: Number,
        default: 0.85,
      },
      style: {
        type: Number,
        default: 0.5,
      },
      use_speaker_boost: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
