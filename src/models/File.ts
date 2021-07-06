import { Schema, model, Document, SchemaTimestampsConfig } from "mongoose";

interface FileDocument extends Document, SchemaTimestampsConfig {
  path: string;
  category: string;
  size: number;
  owner: string;
  application: string;
}

const FileSchema = new Schema(
  {
    path: { type: String, required: true },
    category: { type: String, required: true },
    size: { type: Number, required: true },
    owner: { type: String, required: true },
    application: { type: String, required: true },
  },
  { timestamps: true }
);

export default model<FileDocument>("File", FileSchema);
