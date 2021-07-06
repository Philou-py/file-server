import { basename, extname } from "path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connect } from "mongoose";
import multer from "multer";
import FileModel from "./models/File";

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

app.get("/", (req, res) => {
  res.send({
    ok: true,
    message: "The application is currently under active development!",
  });
});

const fileUpload = upload.single("file");
app.post("/upload", async (req, res) => {
  fileUpload(req, res, (error) => {
    if (error) {
      console.log(req.file);
      res.send({ error });
    } else {
      console.log(req.file);
      if (req.file === undefined) {
        res.send({ error: "No file was provided!" });
      } else {
        const newFile = new FileModel({
          path: req.file.path,
          category: "divers",
          size: req.file.size,
          owner: "5d6ede6a0ba62570afcedd3a",
          application: "AgendaSanté",
        });
        try {
          newFile.save();
          res.send({ msg: "File uploaded successfully!" });
        } catch (error) {
          res.send({ error });
        }
      }
    }
  });
});
