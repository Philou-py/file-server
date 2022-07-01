import express from "express";
import { join } from "path";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { checkAuth } from "./helpers";
import fileRoutes from "./fileRoutes";

const DOMAIN1 = process.env.DOMAIN1 || "";
const DOMAIN2 = process.env.DOMAIN2 || "";
const PORT = process.env.APP_PORT || 3001;
const DGRAPH_URL = process.env.DB_URL || "https://dgraph.toccatech.com/graphql";
const UPLOADS_DIR = process.env.UPLOADS_DIR || join(__dirname, "uploads");
const AUTH_COOKIE = process.env.AUTH_COOKIE || "X-Toccatech-Auth";

const app = express();

app.use(cookieParser());
app.use(
  cors({
    origin: [/^(http|https):\/\/localhost:[0-9]{1,6}$/, DOMAIN1, DOMAIN2],
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

interface File {
  id: string;
  originalName: string;
  name: string;
  size: number;
  mimeType: string;
  isPublic: boolean;
  owner: { id: string; username: string };
  sharedWith: { id: string; username: string }[];
  resourceName: string;
  createdAt: string;
}

// See: https://stackoverflow.com/a/47448486/13846311
declare global {
  namespace Express {
    interface Request {
      currentUser?: User;
      resource?: Resource;
      requestedFile?: File;
      deletedFileName?: string;
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
  res.status(404).send({ error: "Cette route n'existe pas !" });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}!`);
  console.log(`App url: http://localhost:${PORT}`);
  console.log(`Database URL: ${DGRAPH_URL}`);
  console.log(`Destination folder for the file uploads: ${UPLOADS_DIR}`);
  console.log(`Using the following cookie name for authentication: ${AUTH_COOKIE}\n`);
  console.log(
    DOMAIN1 ? `CORS whitelisted domain(s): ${DOMAIN1}${DOMAIN2 ? `, ${DOMAIN2}` : ""}\n` : ""
  );
});
