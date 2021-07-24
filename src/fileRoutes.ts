import { join } from "path";
import { unlinkSync } from "fs";
import express from "express";
import { Types } from "mongoose";
import { requireAuth, getFileWithId, upload } from "./helpers";
import FileModel from "./models/File";

const router = express.Router();

const fileUpload = upload.single("file");
router.post("/upload", requireAuth, async (req, res) => {
  fileUpload(req, res, (error) => {
    if (error) {
      console.log(error);
      res.status(500).send({ error });
    } else {
      console.log(req.file);
      if (req.file === undefined) {
        res.status(400).send({ error: "No file was provided!" });
      } else {
        const id = Types.ObjectId();
        const newFile = new FileModel({
          _id: id,
          originalName: req.file.originalname,
          name: req.file.filename,
          downloadURL: `http://localhost:3000/files/${id}`,
          category: "avatar",
          size: req.file.size,
          owner: req.currentUser!.id,
          application: req.context.application,
        });
        try {
          newFile.save();
          res.status(201).send({ msg: "File uploaded successfully!", file: newFile });
        } catch (error) {
          res.status(500).send({ error });
        }
      }
    }
  });
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const files = await FileModel.find({ owner: req.currentUser!.id });
    res.send({ files });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error });
  }
});

router.get("/:id", requireAuth, getFileWithId, async (req, res) => {
  const filePath = `../uploads/${req.context.fileInfo!.name}`;
  res.sendFile(join(__dirname, filePath));
});

router.get("/:id/infos", requireAuth, getFileWithId, async (req, res) => {
  res.send({ file: req.context.fileInfo! });
});

router.delete("/:id", requireAuth, getFileWithId, async (req, res) => {
  const filePath = `../uploads/${req.context.fileInfo!.name}`;
  try {
    unlinkSync(join(__dirname, filePath));
    await req.context.fileInfo!.delete();
    res.status(200).send({ msg: "File deleted successfully!" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error });
  }
});

export default router;