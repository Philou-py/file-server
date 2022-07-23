import { basename, extname } from "path";
import { Request, Response, NextFunction } from "express";
import axios from "axios";
import multer from "multer";
import { Magic, MAGIC_MIME_TYPE } from "mmmagic";
import { unlinkSync } from "fs";
import { sign } from "jsonwebtoken";
import fs from "fs";

const DGRAPH_URL = process.env.DB_URL || "https://dgraph.toccatech.com/graphql";
const UPLOADS_DIR = process.env.UPLOADS_DIR || __dirname + "\\uploads";
const AUTH_COOKIE = process.env.AUTH_COOKIE || "X-Toccatech-Auth";
const privateKey = fs.readFileSync("./rsa_1024_priv.pem", "utf-8");

const QUERY_USER = `
  query QueryUser {
    queryUser {
      id
      email
      userProfile {
        id
        username
        avatarURL
      }
    }
  }
`;

export const checkAuth = async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.cookies[AUTH_COOKIE]) {
    next();
  } else {
    const { data: responseBody } = await axios.post(
      DGRAPH_URL,
      { query: QUERY_USER },
      { headers: { [AUTH_COOKIE]: req.cookies[AUTH_COOKIE] } }
    );
    const usersFound = responseBody.data.queryUser;
    if (usersFound.length > 0) {
      const user = usersFound[0];
      req.currentUser = {
        id: user.id,
        userProfileId: user.userProfile.id,
        email: user.email,
        username: user.userProfile.username,
        avatarURL: user.userProfile.avatarURL,
        authToken: req.cookies[AUTH_COOKIE],
      };
    }
    next();
  }
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.currentUser) {
    res
      .clearCookie(AUTH_COOKIE)
      .status(401)
      .send({ error: "Cette route requiert que vous soyez connecté !" });
  } else {
    next();
  }
};

const QUERY_RESOURCE = `
  query QueryResource($queryResourceFilter: ResourceFilter) {
    queryResource(filter: $queryResourceFilter) {
      id
      acceptMimeTypes
    }
  }
`;

export const getResource = async (req: Request, res: Response, next: NextFunction) => {
  const { data: responseBody } = await axios.post(
    DGRAPH_URL,
    {
      query: QUERY_RESOURCE,
      variables: { queryResourceFilter: { name: { eq: req.body.resource } } },
    },
    { headers: { [AUTH_COOKIE]: req.currentUser!.authToken } }
  );
  const resources = responseBody.data.queryResource;
  if (resources.length == 0) {
    res.status(400).send({ error: "Cette resource n'existe pas !" });
  } else {
    req.resource = resources[0];
    next();
  }
};

export const checkMimeType = async (req: Request, res: Response, next: NextFunction) => {
  if (req.file === undefined) {
    res.status(400).send({ error: "Aucun fichier n'a été sélectionné !" });
  } else {
    let magic = new Magic(MAGIC_MIME_TYPE);
    magic.detectFile(req.file!.path, (err, mimeType) => {
      if (err) {
        unlinkSync(req.file!.path);
        res.status(500).send({
          error: "Désolé, nous n'avons pas pu détecter le type de contenu du fichier envoyé !",
        });
      } else {
        if (req.file!.mimetype !== mimeType) {
          unlinkSync(req.file!.path);
          console.log(
            `${new Date().toISOString()} - A file with the MIME type ${mimeType} was rejected!`
          );
          res.status(400).send({
            error:
              "Essayez-vous peut-être de pirater le serveur ?? L'extension du fichier envoyé ne correspond pas à son contenu !",
          });
        } else if (
          typeof mimeType == "string" &&
          !req.resource!.acceptMimeTypes.includes(mimeType)
        ) {
          unlinkSync(req.file!.path);
          console.log(
            `${new Date().toISOString()} - A file with the MIME type ${mimeType} was rejected!`
          );
          res.status(400).send({
            error:
              "Le fichier envoyé n'a pas un type de contenu approprié pour la resource indiquée !",
          });
        } else {
          req.file!.mimetype = mimeType as string;
          next();
        }
      }
    });
  }
};

const ADD_FILE = `
  mutation AddFile($addFileInput: [AddFileInput!]!) {
    addFile(input: $addFileInput) {
      file {
        id
      }
    }
  }
`;

export const sendFileInfo = async (newFile: any) => {
  const { data: responseBody } = await axios.post(
    DGRAPH_URL,
    { query: ADD_FILE, variables: { addFileInput: [newFile] } },
    { headers: { [AUTH_COOKIE]: genAdminJwt(privateKey) } }
  );
  return responseBody;
};

const QUERY_FILE = `
  query QueryFile($queryFileFilter: FileFilter) {
    queryFile(filter: $queryFileFilter) {
      id
      originalName
      name
      size
      mimeType
      isPublic
      owner {
        id
        username
      }
      sharedWith {
        id
        username
      }
      resource {
        name
      }
      createdAt
    }
  }
`;

export const getFileWithId = async (req: Request, res: Response, next: NextFunction) => {
  const { data: responseBody } = await axios.post(
    DGRAPH_URL,
    {
      query: QUERY_FILE,
      variables: { queryFileFilter: { id: req.params.id } },
    },
    { headers: { [AUTH_COOKIE]: req.currentUser ? req.currentUser.authToken : "" } }
  );
  const filesFound = responseBody.data.queryFile;
  if (filesFound.length == 0) {
    res.status(400).send({
      error:
        "Navré, le fichier demandé n'existe pas, ou bien vous n'êtes pas autorisé à interagir avec !",
    });
  } else {
    const file = filesFound[0];
    req.requestedFile = {
      id: file.id,
      originalName: file.originalName,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType,
      isPublic: file.isPublic,
      owner: file.owner,
      sharedWith: file.sharedWith,
      resourceName: file.resource.name,
      createdAt: file.createdAt,
    };
    next();
  }
};

const DELETE_FILE = `
  mutation DeleteFile($deleteFileFilter: FileFilter!) {
    deleteFile(filter: $deleteFileFilter) {
      file {
        name
      }
    }
  }
`;

export const deleteFileInfoWithId = async (req: Request, res: Response, next: NextFunction) => {
  const { data: responseBody } = await axios.post(
    DGRAPH_URL,
    {
      query: DELETE_FILE,
      variables: { deleteFileFilter: { id: req.params.id } },
    },
    { headers: { [AUTH_COOKIE]: req.currentUser ? req.currentUser.authToken : "" } }
  );
  const filesDeleted = responseBody.data.deleteFile.file;
  if (filesDeleted.length == 0) {
    res.status(400).send({
      error:
        "Navré, mais le fichier à supprimer soit n'existe pas, ou bien vous n'avez pas l'autorisation de le supprimer !",
    });
  } else {
    req.deletedFileName = filesDeleted[0].name;
    next();
  }
};

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename(_req, file, callback) {
    let fileExtension = extname(file.originalname);
    callback(null, `${basename(file.originalname, fileExtension)}-${Date.now()}${fileExtension}`);
  },
});

export const upload = multer({ storage });

export interface ValidationSchema {
  [key: string]: {
    type: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    regExp?: RegExp;
    in?: any[];
    errorMessage: string;
  };
}

export const validateBody = (validationSchema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let isValid = true;
    let errors: Record<string, string> = {};

    // Test if the body contains extra fields
    let schemaKeys = Object.keys(validationSchema);
    let bodyKeys = Object.keys(req.body);
    bodyKeys.forEach((bodyKey) => {
      if (!schemaKeys.includes(bodyKey)) {
        isValid = false;
        errors[bodyKey] = "This field is not accepted for this route!";
      }
    });

    for (let key in validationSchema) {
      let fieldValid = true;
      const rules = validationSchema[key];
      const shouldBeArray = rules.type.endsWith("[]");
      const sentValue = req.body[key];

      const validateField = (val: any, expectedType: string) => {
        if (val) {
          if (expectedType !== typeof val) fieldValid = false;
          if (rules.minLength && val.length < rules.minLength) fieldValid = false;
          if (rules.maxLength && val.length > rules.maxLength) fieldValid = false;
          if (rules.regExp && !rules.regExp.test(val)) fieldValid = false;
          if (rules.in && !rules.in.includes(val)) fieldValid = false;
        } else if (rules.required) fieldValid = false;
      };

      if (!shouldBeArray) {
        validateField(sentValue, rules.type);
      } else if (rules.required) {
        try {
          const sentArray = JSON.parse(sentValue);
          req.body[key] = sentArray;
          const isArray = Array.isArray(sentArray);
          if (!isArray) {
            fieldValid = false;
          } else if (sentArray.length > 0) {
            sentArray.forEach((value: any) => validateField(value, rules.type.slice(0, -2)));
          }
        } catch (error) {
          fieldValid = false;
        }
      }

      if (!fieldValid) {
        isValid = false;
        errors[key] = rules.errorMessage;
      }
    }

    if (!isValid) {
      if (req.file) {
        unlinkSync(req.file!.path);
      }
      res.status(400).send({ validationErrors: errors });
    } else next();
  };
};

const genAdminJwt = (privateKey: string) => {
  return sign(
    {
      "https://toccatech.com/jwt/claims": {
        ROLE: "ADMIN",
      },
    },
    privateKey,
    {
      issuer: "Toccatech Corporation",
      subject: "Toccatech Users",
      audience: "https://toccatech.com",
      expiresIn: 60, // One minute
      algorithm: "RS256",
    }
  );
};
