import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connect } from "mongoose";
import { FileDocument } from "./models/File";
import cookieParser from "cookie-parser";
import { checkAuth } from "./helpers";
import fileRoutes from "./fileRoutes";

dotenv.config();

const app = express();

app.use(cookieParser());
app.use(
  cors({
    origin: [
      /^https:\/\/.*toccatech.com$/,
      /^(http|https):\/\/localhost:[0-9]{1,6}$/,
      /^(http|https):\/\/127.0.0.1:[0-9]{1,6}$/,
    ],
  })
);
app.use(helmet());
app.use(express.json());

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

app.use(checkAuth);

app.get("/", (req, res) => {
  res.send({
    msg: "The application is currently under active development!",
  });
});

app.use("/files", fileRoutes);

app.use((req, res) => {
  res.status(404).send({ error: "This route does not exist!" });
});
