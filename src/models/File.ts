import { Schema, model, Document, SchemaTimestampsConfig } from "mongoose";

export interface FileDocument extends Document, SchemaTimestampsConfig {
  name: string;
  originalName: string;
  downloadURL: string;
  category: string;
  size: number;
  owner: string;
  application: string;
  visibility: "public" | "unlisted" | "private" | "application";
}

const FileSchema = new Schema(
  {
    name: { type: String, required: [true, "Please specify the name of the file!"] },
    originalName: {
      type: String,
      required: [true, "Please specify the original name of the file!"],
    },
    downloadURL: { type: String, required: [true, "Please specify the download URL of the file!"] },
    category: { type: String, required: [true, "Please specify the category of the file!"] },
    size: { type: Number, required: [true, "Please specify the size of the file!"] },
    owner: { type: String, required: [true, "Please specify the owner of the file!"] },
    application: {
      type: String,
      required: [true, "Please specify thanks to which application you are interacting!"],
    },
    visibility: {
      type: String,
      required: [true, "Please specify the visibility of the file!"],
      validate: [
        (value: string) => {
          if (!["private", "public", "unlisted", "application"].includes(value)) {
            return false;
          }
          return true;
        },
        'The visibility must either be "private", "public", "unlisted" or "application"!',
      ],
    },
  },
  { timestamps: true }
);

export default model<FileDocument>("File", FileSchema);
