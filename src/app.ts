import { basename, extname } from "path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connect } from "mongodb";
import multer from "multer";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [/^https:\/\/.*toccatech.com$/, /^(http|https):\/\/localhost:[0-9]{1,6}$/],
  })
);
app.use(helmet());
app.use(express.json());

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
  `mongodb://${process.env.DB_USER}:${process.env.DB_PWD}@${process.env.DB_HOST}/storage?authSource=admin`,
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

app.get("/home", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
