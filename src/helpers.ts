import { basename, extname } from "path";
import { Request, Response, NextFunction } from "express";
import axios from "axios";
import multer from "multer";
import FileModel from "./models/File";

export const checkAuth = async (req: Request, res: Response, next: NextFunction) => {
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

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  req.context.requireAuth = true;
  if (!req.currentUser) {
    res.status(401).send({ error: "This route requires authentication!" });
  } else {
    next();
  }
};

export const getFileWithId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = await FileModel.findById(req.params.id);
    if (file === null) {
      res.status(404).send({ error: "This file does not exist!" });
    } else {
      req.context.fileInfo = file;
      next();
    }
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

const checkFileExists = (req: Request) => {
  if (!req.context.fileInfo) throw new Error("Information about the file could not be found!");
};

export const requireBeingOwner = (req: Request, res: Response, next: NextFunction) => {
  checkFileExists(req);
  requireAuth(req, res, () => {
    if (req.currentUser!.id != req.context.fileInfo!.owner) {
      res.status(403).send({ error: "You are not authorised to use this file!" });
    } else {
      next();
    }
  });
};

export const requireBeingOwnerIf = (...visibility: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    checkFileExists(req);
    if (visibility.includes(req.context.fileInfo!.visibility)) {
      requireBeingOwner(req, res, next);
    } else {
      next();
    }
  };
};

export const handleValidationErrors = (error: any, res: Response) => {
  if (error.message.includes("validation failed")) {
    const errors: Record<string, string> = {};
    Object.values(error.errors as object).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
    res.status(400).send({ validationErrors: errors });
  } else {
    res.status(500).send({ error });
  }
};

const storage = multer.diskStorage({
  destination: __dirname + "/uploads/",
  filename(req, file, callback) {
    let fileExtension = extname(file.originalname);
    callback(null, `${basename(file.originalname, fileExtension)}-${Date.now()}${fileExtension}`);
  },
});
export const upload = multer({ storage });
