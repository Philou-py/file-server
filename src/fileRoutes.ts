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
const UPLOADS_DIR = process.env.UPLOADS_DIR || join(__dirname, "uploads");

const uploadBodySchema: ValidationSchema = {
  resource: {
    type: "string",
    required: true,
    errorMessage: "Le champ 'resource' est requis !",
  },
  isPublic: {
    type: "string",
    required: true,
    in: ["true", "false"],
    errorMessage: "Le champ 'isPublic' est requis et doit être à 'true' ou à 'false' !",
  },
  sharedWith: {
    type: "string[]",
    required: true,
    errorMessage:
      "Le champ 'sharedWith' est requis et doit être une liste de chaînes de caractères !",
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
          "Au moins l'un des IDs listés dans 'sharedWith' ne revoie pas à un profile d'utilisateur connu !",
      });
    } else {
      const receivedFile = responseBody.data.addFile.file[0];
      console.log(
        `${new Date().toISOString()} - The file with the MIME type '${
          newFile.mimeType
        }' was successfully uploaded to the folder '${req.body.resource}'! ID: ${receivedFile.id}`
      );
      res.status(201).send({
        msg: "Le fichier a bien été téléversé !",
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
    msg: "D'accord, voici toutes les informations à propos du fichier demandé !",
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
    res.status(200).send({ msg: "Le fichier a bien été supprimé !" });
  } catch (err) {
    console.log(
      `${new Date().toISOString()} - The file ${req.deletedFileName!} was not deleted as it could not be found!`
    );
    res.status(200).send({
      msg: "Vous venez de supprimer l'entrée dans la base de données d'un fichier qui n'existe pas sur le serveur ! Bravo et surtout merci !",
    });
  }
});

export default router;
