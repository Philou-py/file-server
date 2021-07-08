import { basename, extname, join } from "path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connect, Types } from "mongoose";
import multer from "multer";
import axios from "axios";
import FileModel, { FileDocument } from "./models/File";
import { unlinkSync } from "fs";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [/^https:\/\/.*toccatech.com$/, /^(http|https):\/\/localhost:[0-9]{1,6}$/],
  })
);
app.use(helmet());
app.use(express.json());
app.use("/test", express.static(__dirname + "/test"));

const storage = multer.diskStorage({
  destination: "uploads/",
  filename(req, file, callback) {
    let fileExtension = extname(file.originalname);
    callback(null, `${basename(file.originalname, fileExtension)}-${Date.now()}${fileExtension}`);
  },
});
const upload = multer({ storage });

// Connect to MongoDB
connect(
  `mongodb://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_HOST}/raspistorage?authSource=admin`,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)
  .then(() => {
    app.listen(3000, () => {
      console.log("Server listening on port 3000! App url: http://localhost:3000");
    });
  })
  .catch((error) => {
    console.log(error);
  });

interface User {
  id: string;
  name: string;
  username: string;
  birthdate: Date;
  email: string;
}

// See: https://stackoverflow.com/a/47448486/13846311
declare global {
  namespace Express {
    interface Request {
      currentUser: User | null;
      context: {
        application: string;
        requireAuth: boolean;
        fileInfo?: FileDocument;
      };
    }
  }
}

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.context = { application: "", requireAuth: false };
  next();
});

const checkAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const response = await axios.get("https://jsonplaceholder.typicode.com/users/1");
    const data = response.data;
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
    res.send({ error });
  }
};

app.use(checkAuth);

const requireAuth = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  req.context.requireAuth = true;
  if (!req.currentUser) {
    res.send({ error: "This route requires authentication!" });
  } else {
    next();
  }
};

const getFileWithId = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const file = await FileModel.findById(req.params.id);
    if (file === null) {
      res.status(404).send({ error: "This file does not exist!" });
    } else if (req.context.requireAuth && req.currentUser!.id != file.owner) {
      res.status(401).send({ error: "You are not authorised to use this file!" });
    } else {
      req.context.fileInfo = file;
      next();
    }
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

app.get("/", (req, res) => {
  res.send({
    msg: "The application is currently under active development!",
  });
});

const fileUpload = upload.single("file");
app.post("/upload", requireAuth, async (req, res) => {
  fileUpload(req, res, (error) => {
    if (error) {
      console.log(error);
      res.send({ error });
    } else {
      console.log(req.file);
      if (req.file === undefined) {
        res.send({ error: "No file was provided!" });
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

app.get("/files-info", requireAuth, async (req, res) => {
  try {
    const files = await FileModel.find({ owner: req.currentUser!.id });
    res.send({ files });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error });
  }
});

app.get("/files/:id", requireAuth, getFileWithId, async (req, res) => {
  const filePath = `../uploads/${req.context.fileInfo!.name}`;
  res.sendFile(join(__dirname, filePath));
});

app.get("/files/:id/infos", requireAuth, getFileWithId, async (req, res) => {
  res.send({ file: req.context.fileInfo! });
});

app.delete("/files/:id", requireAuth, getFileWithId, async (req, res) => {
  const filePath = `../uploads/${req.context.fileInfo!.name}`;
  try {
    unlinkSync(join(__dirname, filePath));
    await req.context.fileInfo!.delete();
    res.status(204).send({ msg: "File deleted successfully!" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error });
  }
});
