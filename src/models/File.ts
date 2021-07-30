import { Schema, model, Document, SchemaTimestampsConfig } from "mongoose";

export interface FileDocument extends Document, SchemaTimestampsConfig {
  name: string;
  originalName: string;
  downloadURL: string;
  category: string;
  size: number;
  owner: string;
  application: string;
  isPublic: boolean;
}

const FileSchema = new Schema(
  {
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    downloadURL: { type: String, required: true },
    category: { type: String, required: true },
    size: { type: Number, required: true },
    owner: { type: String, required: true },
    application: { type: String, required: true },
    isPublic: { type: Boolean, required: true },
  },
  { timestamps: true }
);

export default model<FileDocument>("File", FileSchema);
