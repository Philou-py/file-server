import { basename, extname } from "path";
import express from "express";
import axios from "axios";
import multer from "multer";
import FileModel from "./models/File";

export const checkAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const { data } = await axios.get("https://jsonplaceholder.typicode.com/users/1");
    req.currentUser = {
      id: data.id,
      name: data.name,
      username: data.username,
      birthdate: new Date("2006-03-01"),
      email: data.email,
    };
    req.context.application = "Toccatech";
    next();
  } catch (error) {
    console.log(error);
    res.status(500).send({ error });
  }
};

export const requireAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  req.context.requireAuth = true;
  if (!req.currentUser) {
    res.status(401).send({ error: "This route requires authentication!" });
  } else {
    next();
  }
};

export const getFileWithId = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const file = await FileModel.findById(req.params.id);
    if (file === null) {
      res.status(404).send({ error: "This file does not exist!" });
    } else if (req.context.requireAuth && req.currentUser!.id != file.owner) {
      res.status(403).send({ error: "You are not authorised to use this file!" });
    } else {
      req.context.fileInfo = file;
      next();
    }
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

export const storage = multer.diskStorage({
  destination: "uploads/",
  filename(req, file, callback) {
    let fileExtension = extname(file.originalname);
    callback(null, `${basename(file.originalname, fileExtension)}-${Date.now()}${fileExtension}`);
  },
});
export const upload = multer({ storage });
