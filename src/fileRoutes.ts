import { join } from "path";
import { unlinkSync } from "fs";
import express from "express";
import {
  upload,
  requireAuth,
  validateBody,
  ValidationSchema,
  getResource,
  checkMimeType,
  sendFileInfo,
} from "./helpers";
import { Magic, MAGIC_MIME_TYPE } from "mmmagic";

const router = express.Router();

const uploadBodySchema: ValidationSchema = {
  resource: {
    type: "string",
    required: true,
    errorMessage: "The field 'resource' is required!",
  },
  isPublic: {
    type: "string",
    required: true,
    in: ["true", "false"],
    errorMessage: "The field 'isPublic' is required and must be a boolean!",
  },
  sharedWith: {
    type: "string[]",
    required: true,
    errorMessage: "The field 'sharedWith' is required and must be valid!",
  },
};

const fileUpload = upload.single("file");
router.post(
  "/upload",
  requireAuth,
  fileUpload,
  validateBody(uploadBodySchema),
  getResource,
  checkMimeType,
  async (req, res) => {
    const newFile = {
      originalName: req.file!.originalname,
      name: req.file!.filename,
      size: req.file!.size,
      mimeType: req.file!.mimetype,
      isPublic: req.body.isPublic === "true",
      owner: { id: req.currentUser!.userProfileId },
      sharedWith: req.body.sharedWith.map((id: string) => ({ id })),
      resource: { id: req.resource!.id },
      createdAt: new Date().toISOString(),
    };
    const responseBody = await sendFileInfo(newFile, req.currentUser!.authToken);
    if (responseBody.errors) {
      res.status(400).send({
        error:
          "At least one of the IDs specified in 'sharedWith' does not point to a known user profile!",
      });
    } else {
      const receivedFile = responseBody.data.addFile.file[0];
      console.log(
        `${new Date().toISOString()} - A file with the MIME type '${
          newFile.mimeType
        }' was successfully uploaded to the folder '${req.body.resource}'! ID: ${receivedFile.id}`
      );
      res.status(201).send({
        msg: "The file was successfully uploaded!",
        fileId: responseBody.data.addFile.file[0].id,
      });
    }
  }
);

export default router;
