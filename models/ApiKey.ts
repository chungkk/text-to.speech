import mongoose, { Schema, Document } from 'mongoose';

export interface IApiKey extends Document {
  key: string;
  name: string;
  remainingTokens: number;
  totalTokens: number;
  isActive: boolean;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema: Schema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    remainingTokens: {
      type: Number,
      default: 10000,
    },
    totalTokens: {
      type: Number,
      default: 10000,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsed: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema);
