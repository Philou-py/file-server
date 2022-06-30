import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
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

interface User {
  id: string;
  userProfileId: string;
  email: string;
  username: string;
  avatarURL?: string;
  authToken: string;
}

interface Resource {
  id: string;
  acceptMimeTypes: string[];
}

// See: https://stackoverflow.com/a/47448486/13846311
declare global {
  namespace Express {
    interface Request {
      currentUser: User | null;
      resource?: Resource;
    }
  }
}

app.use(checkAuth);

app.get("/", (req, res) => {
  res.send({
    msg: "Welcome to File Server! This API enables applications to upload users' files to a secure storage, and manage them easily.",
  });
});

app.use("/files", fileRoutes);

app.use((req, res) => {
  res.status(404).send({ error: "This route does not exist!" });
});

app.listen(3001, () => {
  console.log("Server listening on port 3001! App url: http://localhost:3001");
});
