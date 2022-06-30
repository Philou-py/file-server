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
  getFileWithId,
  deleteFileInfoWithId,
} from "./helpers";

const router = express.Router();
const UPLOADS_DIR = process.env.UPLOADS_DIR || __dirname + "\\uploads";

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
        `${new Date().toISOString()} - The file with the MIME type '${
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

router.get("/:id", getFileWithId, (req, res) => {
  console.log(
    `${new Date().toISOString()} - The file of id ${req.requestedFile!.id} was downloaded!`
  );
  const filePath = join(UPLOADS_DIR, req.requestedFile!.name);
  // Allow caching for one year
  const headers: Record<string, string> = {
    "Content-Type": req.requestedFile!.mimeType,
    "Cache-Control": "public, max-age=31536000",
  };
  if (req.query.attachment === "true") {
    res.download(filePath, req.requestedFile!.originalName, { headers });
  } else {
    res.sendFile(filePath, { headers });
  }
});

router.get("/:id/info", getFileWithId, (req, res) => {
  console.log(
    `${new Date().toISOString()} - The info of the file of id ${
      req.requestedFile!.id
    } was requested!`
  );
  res.send({
    msg: "All right, here is all about the file you requested!",
    file: req.requestedFile,
  });
});

router.delete("/:id", requireAuth, deleteFileInfoWithId, (req, res) => {
  const filePath = join(UPLOADS_DIR, req.deletedFileName!);
  try {
    unlinkSync(filePath);
    console.log(
      `${new Date().toISOString()} - The file ${req.deletedFileName!} with the previous ID ${
        req.params.id
      } was successfully deleted!`
    );
    res.status(200).send({ msg: "The file was successfully deleted!" });
  } catch (err) {
    console.log(
      `${new Date().toISOString()} - The file ${req.deletedFileName!} was not deleted as it could not be found!`
    );
    res.status(200).send({
      msg: "You just deleted a file entry in the database pointing to a file that could not be found on the server! Congrats!",
    });
  }
});

export default router;
