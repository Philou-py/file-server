import { join } from "path";
import { unlinkSync } from "fs";
import express from "express";
import { Types } from "mongoose";
import {
  upload,
  requireAuth,
  requireBeingOwner,
  getFileWithId,
  requireBeingOwnerIf,
  handleValidationErrors,
} from "./helpers";
import FileModel from "./models/File";

const router = express.Router();

const fileUpload = upload.single("file");
router.post("/upload", requireAuth, fileUpload, async (req, res) => {
  console.log(req.file);
  if (req.file === undefined) {
    res.status(400).send({ error: "No file was provided!" });
  } else {
    const id = Types.ObjectId();
    try {
      const newFile = await FileModel.create({
        _id: id,
        originalName: req.file.originalname,
        name: req.file.filename,
        downloadURL: `http://localhost:3000/files/${id}`,
        category: req.body.category,
        size: req.file.size,
        owner: req.currentUser!.id,
        application: req.context.application,
        visibility: req.body.visibility,
      });
      res.status(201).send({ msg: "File uploaded successfully!", file: newFile });
    } catch (error) {
      handleValidationErrors(error, res);
    }
  }
});

router.get("/current-user", requireAuth, async (req, res) => {
  try {
    const files = await FileModel.find({ owner: req.currentUser!.id });
    res.send({ files });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error });
  }
});

router.get("/:id", getFileWithId, requireBeingOwnerIf("private"), async (req, res) => {
  const filePath = `../uploads/${req.context.fileInfo!.name}`;
  const headers: Record<string, string> = { "Cache-Control": "private, max-age=604800" };
  if (req.query.attachment === "true") {
    res.download(join(__dirname, filePath), req.file!.originalname, { headers });
  } else {
    res.sendFile(join(__dirname, filePath), { headers });
  }
});

router.get("/:id/info", getFileWithId, requireBeingOwnerIf("private"), (req, res) => {
  res.send({ file: req.context.fileInfo! });
});

router.patch(
  "/:id/info",
  getFileWithId,
  requireBeingOwnerIf("private", "public", "unlisted"),
  async (req, res) => {
    console.log(req.body);
    if (
      Object.keys(req.body).some((key) => {
        return !!(key != "category" && key != "visibility");
      })
    )
      res.send('Only the "category" and "visibility" fields can be modified!');
    else {
      const updatedFile = req.context.fileInfo!;
      if (req.body.category) updatedFile.category = req.body.category;
      if (req.body.visibility) updatedFile.visibility = req.body.visibility;
      try {
        await updatedFile.save();
        res.send(updatedFile);
      } catch (error) {
        handleValidationErrors(error, res);
      }
    }
  }
);

router.delete(
  "/:id",
  getFileWithId,
  requireBeingOwnerIf("private", "public", "unlisted"),
  async (req, res) => {
    const filePath = `../uploads/${req.context.fileInfo!.name}`;
    try {
      unlinkSync(join(__dirname, filePath));
      await req.context.fileInfo!.delete();
      res.status(200).send({ msg: "File deleted successfully!" });
    } catch (error) {
      console.log(error);
      res.status(500).send({ error });
    }
  }
);

export default router;
