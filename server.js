const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
const { promisify } = require("util");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const sharp = require("sharp");
const heicConvert = require("heic-convert");
const { S3Client, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } = require("@aws-sdk/client-s3");
const canonicalBaziService = require("./apps/bazi/server/canonical-service.cjs");
const lineBot = require("./apps/bazi/server/line-bot.cjs");

const app = express();
const port = process.env.PORT || 8080;
const root = __dirname;
const photoStorageRoot = process.env.PHOTO_STORAGE_DIR || path.join(root, "_storage", "photo-cloud");
const photoMetadataPath = path.join(photoStorageRoot, "metadata.json");
const r2MetadataKey = "_metadata/photo-cloud.json";
const baziProfileStorageRoot = process.env.BAZI_PROFILE_STORAGE_DIR || path.join(root, "_storage", "bazi-profiles");
const baziAuthStorageRoot = process.env.BAZI_AUTH_STORAGE_DIR || path.join(root, "_storage", "bazi-auth");
const storageProvider = (process.env.PHOTO_STORAGE_PROVIDER || "local").toLowerCase();
const r2Bucket = process.env.R2_BUCKET || "";
const r2PublicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
const r2Client = createR2Client();
const activeStorageProvider = storageProvider === "r2" && r2Client ? "r2" : "local";
const webPhotoMaxBytes = 600 * 1024;
const webPhotoMaxEdge = 1800;
const baziSessionCookie = "louisko_bazi_session";
const baziSessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;
const baziVerificationTokenMaxAgeMs = 24 * 60 * 60 * 1000;
const baziResetTokenMaxAgeMs = 60 * 60 * 1000;
const baziEmailProvider = (process.env.BAZI_EMAIL_PROVIDER || "").toLowerCase();
const baziEmailApiToken = process.env.CLOUDFLARE_EMAIL_API_TOKEN || process.env.LOUISKO_CLOUDFLARE_EMAIL_TOKEN || "";
const baziEmailAccountId = process.env.CLOUDFLARE_EMAIL_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "";
const baziEmailFrom = process.env.BAZI_EMAIL_FROM || "no-reply@louisko.com";
const baziEmailFromName = process.env.BAZI_EMAIL_FROM_NAME || "Louisko 八字排盤";
const baziPublicUrl = (process.env.BAZI_PUBLIC_URL || "https://louisko.com").replace(/\/$/, "");
const baziLineOwnerEmail = String(process.env.BAZI_LINE_OWNER_EMAIL || "").trim().toLowerCase();
const baziLineChannelSecret = String(process.env.BAZI_LINE_CHANNEL_SECRET || "");
const baziLineChannelAccessToken = String(process.env.BAZI_LINE_CHANNEL_ACCESS_TOKEN || "");
const baziLineAllowedUserIds = lineBot.normalizeLineUserIds(process.env.BAZI_LINE_ALLOWED_USER_IDS);
const baziLineTextSafeLimit = Math.max(1000, Math.min(4900, Number(process.env.BAZI_LINE_TEXT_SAFE_LIMIT || lineBot.DEFAULT_LINE_TEXT_SAFE_LIMIT)));
const baziLineSessionTtlMs = Math.max(60_000, Number(process.env.BAZI_LINE_SESSION_TTL_MS || lineBot.DEFAULT_SESSION_TTL_MS));
const baziLineDownloadTtlMs = Math.max(60_000, Number(process.env.BAZI_LINE_DOWNLOAD_TTL_MS || 15 * 60 * 1000));
const baziLineRateLimitPerMinute = Math.max(1, Math.min(120, Number(process.env.BAZI_LINE_RATE_LIMIT_PER_MINUTE || 30)));
const baziLineEventLocks = new Map();
const baziLineGenerationLocks = new Map();
const baziLineRateLimits = new Map();
const scryptAsync = promisify(crypto.scrypt);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === "https://louisko.com" || origin === "https://www.louisko.com" || origin === "https://louisko-node-photo.zeabur.app" || /^https?:\/\/localhost(?::\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed."));
  },
  credentials: true,
}));
app.post("/api/line/webhook", express.raw({ type: "application/json", limit: "1mb" }), handleLineWebhook);
app.use(express.json({ limit: "1mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },
});

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 1,
  },
});

app.get("/api/bazi/auth/me", async (req, res) => {
  try {
    const user = await getBaziSessionUser(req, res);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, authenticated: Boolean(user), user: user ? publicBaziUser(user) : null });
  } catch (error) {
    res.status(500).json({ ok: false, error: "BAZI_AUTH_READ_FAILED", message: "Unable to read the Bazi account session." });
  }
});

app.get("/api/bazi/auth/status", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, emailConfigured: baziEmailProvider === "console" || (baziEmailProvider === "cloudflare" && Boolean(baziEmailApiToken && baziEmailAccountId && baziEmailFrom)) });
});

app.get("/api/bazi/line/download", async (req, res) => {
  try {
    const token = normalizeBaziToken(req.query?.token);
    const download = await consumeLineDownloadToken(token);
    const artifact = await readLineArtifact(download.ownerId, download.profileId);
    if (!artifact || artifact.artifactId !== download.artifactId) {
      throw createBaziProfileError(404, "ARTIFACT_NOT_FOUND", "Prompt 檔案不存在或已更新。");
    }
    const profile = (await readBaziProfiles(download.ownerId)).find((item) => item.id === download.profileId);
    const filename = `${lineBot.sanitizeFilename(profile?.name, "bazi-profile")}_終身八字_AI命理顧問檔案.md`;
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bazi-advisor.md"; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(artifact.content);
  } catch (error) {
    res.status(error.statusCode || 400).type("text/plain; charset=utf-8").send(error.message || "Markdown 下載失敗。");
  }
});

app.post("/api/bazi/auth/register", async (req, res) => {
  try {
    const email = normalizeBaziEmail(req.body?.email);
    const password = normalizeBaziPassword(req.body?.password);
    assertBaziEmailServiceConfigured();
    const userKey = baziUserStorageKey(email);
    const existing = await readBaziJson(userKey);
    if (existing) throw createBaziProfileError(409, "ACCOUNT_EXISTS", "此電子郵件已建立帳號，請直接登入。");

    const now = new Date().toISOString();
    const accountId = `acct_${hashBaziValue(email).slice(0, 32)}`;
    const passwordRecord = await hashBaziPassword(password);
    const user = {
      version: 1,
      accountId,
      email,
      passwordSalt: passwordRecord.salt,
      passwordHash: passwordRecord.hash,
      passwordVersion: 1,
      emailVerifiedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await writeBaziJson(userKey, user);

    let verificationToken = "";
    const legacyOwnerKey = normalizeLegacyOwnerKey(req.body?.legacyOwnerKey);
    if (legacyOwnerKey) {
      const legacyProfiles = await readLegacyBaziProfiles(legacyOwnerKey);
      if (legacyProfiles.length) await writeBaziProfiles(accountId, legacyProfiles);
    }

    try {
      verificationToken = await createBaziToken("verify", user, baziVerificationTokenMaxAgeMs);
      await sendBaziVerificationEmail(user, verificationToken);
    } catch (error) {
      await deleteBaziJson(userKey);
      if (verificationToken) await deleteBaziToken("verify", verificationToken);
      throw error;
    }

    res.setHeader("Cache-Control", "private, no-store");
    res.status(201).json({ ok: true, verificationRequired: true, email: user.email });
  } catch (error) {
    res.status(error.statusCode || 400).json({ ok: false, error: error.code || "BAZI_ACCOUNT_REGISTER_FAILED", message: error.message });
  }
});

app.get("/api/bazi/auth/verify-email", async (req, res) => {
  try {
    const token = normalizeBaziToken(req.query?.token);
    const record = await consumeBaziToken("verify", token);
    const user = await readBaziJson(baziUserStorageKey(record.email));
    if (!user || user.accountId !== record.accountId) throw createBaziProfileError(400, "INVALID_VERIFICATION_TOKEN", "驗證連結無效或已過期。");
    user.emailVerifiedAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    await writeBaziJson(baziUserStorageKey(user.email), user);
    res.redirect(`${baziPublicUrl}/apps/bazi/?email_verified=1`);
  } catch (error) {
    res.redirect(`${baziPublicUrl}/apps/bazi/?email_verified=0`);
  }
});

app.post("/api/bazi/auth/resend-verification", async (req, res) => {
  try {
    const email = normalizeBaziEmail(req.body?.email);
    const user = await readBaziJson(baziUserStorageKey(email));
    if (user && user.emailVerifiedAt === null) {
      assertBaziEmailServiceConfigured();
      const token = await createBaziToken("verify", user, baziVerificationTokenMaxAgeMs);
      try {
        await sendBaziVerificationEmail(user, token);
      } catch (error) {
        await deleteBaziToken("verify", token);
        throw error;
      }
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, message: "如果帳號存在且尚未驗證，新的驗證信已寄出。" });
  } catch (error) {
    res.status(error.statusCode || 400).json({ ok: false, error: error.code || "BAZI_VERIFICATION_RESEND_FAILED", message: error.message });
  }
});

app.post("/api/bazi/auth/forgot-password", async (req, res) => {
  try {
    const email = normalizeBaziEmail(req.body?.email);
    const user = await readBaziJson(baziUserStorageKey(email));
    // Legacy accounts created before email verification may not have this field.
    // They can already log in under the legacy-compatible rule, so allow a reset email.
    if (user && user.emailVerifiedAt !== null) {
      assertBaziEmailServiceConfigured();
      const token = await createBaziToken("reset", user, baziResetTokenMaxAgeMs);
      try {
        await sendBaziPasswordResetEmail(user, token);
      } catch (error) {
        await deleteBaziToken("reset", token);
        throw error;
      }
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, message: "如果帳號存在且已完成 Email 驗證，重設密碼信已寄出。" });
  } catch (error) {
    res.status(error.statusCode || 400).json({ ok: false, error: error.code || "BAZI_PASSWORD_RESET_REQUEST_FAILED", message: error.message });
  }
});

app.post("/api/bazi/auth/reset-password", async (req, res) => {
  try {
    const token = normalizeBaziToken(req.body?.token);
    const password = normalizeBaziPassword(req.body?.password);
    const record = await consumeBaziToken("reset", token);
    const userKey = baziUserStorageKey(record.email);
    const user = await readBaziJson(userKey);
    if (!user || user.accountId !== record.accountId) throw createBaziProfileError(400, "INVALID_RESET_TOKEN", "重設密碼連結無效或已過期。");
    const passwordRecord = await hashBaziPassword(password);
    user.passwordSalt = passwordRecord.salt;
    user.passwordHash = passwordRecord.hash;
    user.passwordVersion = (user.passwordVersion || 1) + 1;
    user.updatedAt = new Date().toISOString();
    await writeBaziJson(userKey, user);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, message: "密碼已更新，請使用新密碼登入。" });
  } catch (error) {
    res.status(error.statusCode || 400).json({ ok: false, error: error.code || "BAZI_PASSWORD_RESET_FAILED", message: error.message });
  }
});

app.post("/api/bazi/auth/login", async (req, res) => {
  try {
    const email = normalizeBaziEmail(req.body?.email);
    const password = normalizeBaziPassword(req.body?.password);
    const user = await readBaziJson(baziUserStorageKey(email));
    if (!user || !(await verifyBaziPassword(password, user))) {
      throw createBaziProfileError(401, "INVALID_CREDENTIALS", "電子郵件或密碼不正確。");
    }
    if (user.emailVerifiedAt === null) {
      throw createBaziProfileError(403, "EMAIL_NOT_VERIFIED", "請先完成 Email 驗證，再登入帳號。");
    }
    const token = await createBaziSession(user);
    setBaziSessionCookie(req, res, token);
    const profiles = await readBaziProfiles(user.accountId);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, user: publicBaziUser(user), profiles });
  } catch (error) {
    res.status(error.statusCode || 400).json({ ok: false, error: error.code || "BAZI_ACCOUNT_LOGIN_FAILED", message: error.message });
  }
});

app.post("/api/bazi/auth/logout", async (req, res) => {
  try {
    await deleteBaziSession(req);
    clearBaziSessionCookie(req, res);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: "BAZI_LOGOUT_FAILED", message: "Unable to end the Bazi account session." });
  }
});

app.delete("/api/bazi/auth/account", async (req, res) => {
  try {
    const user = await requireBaziSessionUser(req, res);
    const password = normalizeBaziPassword(req.body?.password);
    if (!(await verifyBaziPassword(password, user))) throw createBaziProfileError(401, "INVALID_CREDENTIALS", "密碼不正確，帳號未刪除。");
    await deleteBaziJson(baziUserStorageKey(user.email));
    await deleteBaziProfiles(user.accountId);
    await deleteBaziSession(req);
    clearBaziSessionCookie(req, res);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, message: "帳號與命主紀錄已刪除。" });
  } catch (error) {
    res.status(error.statusCode || 400).json({ ok: false, error: error.code || "BAZI_ACCOUNT_DELETE_FAILED", message: error.message });
  }
});

app.get("/api/bazi/profiles", async (req, res) => {
  try {
    const user = await requireBaziSessionUser(req, res);
    const profiles = await readBaziProfiles(user.accountId);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, profiles });
  } catch (error) {
    res.status(error.statusCode || 400).json({ ok: false, error: error.code || "BAZI_PROFILE_READ_FAILED", message: error.message });
  }
});

app.post("/api/bazi/profiles", async (req, res) => {
  try {
    const user = await requireBaziSessionUser(req, res);
    const profile = normalizeBaziProfile(req.body?.profile || req.body);
    const profiles = await readBaziProfiles(user.accountId);
    const identity = baziProfileIdentity(profile);
    const existingIndex = profiles.findIndex((item) => baziProfileIdentity(item) === identity);
    const now = new Date().toISOString();
    const record = {
      ...profile,
      id: existingIndex >= 0 ? profiles[existingIndex].id : profile.id,
      createdAt: existingIndex >= 0 ? profiles[existingIndex].createdAt : profile.createdAt || now,
      updatedAt: now,
      version: 1,
    };
    if (existingIndex >= 0) profiles[existingIndex] = record;
    else profiles.push(record);
    await writeBaziProfiles(user.accountId, profiles);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, profile: record, profiles });
  } catch (error) {
    res.status(error.statusCode || 400).json({ ok: false, error: error.code || "BAZI_PROFILE_WRITE_FAILED", message: error.message });
  }
});

app.delete("/api/bazi/profiles/:profileId", async (req, res) => {
  try {
    const user = await requireBaziSessionUser(req, res);
    const profileId = normalizeId(req.params.profileId);
    if (!profileId) throw createBaziProfileError(400, "INVALID_PROFILE_ID", "Invalid Bazi profile id.");
    const profiles = await readBaziProfiles(user.accountId);
    const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
    await writeBaziProfiles(user.accountId, nextProfiles);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, deletedProfileId: profileId, profiles: nextProfiles });
  } catch (error) {
    res.status(error.statusCode || 400).json({ ok: false, error: error.code || "BAZI_PROFILE_DELETE_FAILED", message: error.message });
  }
});

function isHeicFile(file) {
  const name = (file.originalname || "").toLowerCase();
  const mime = (file.mimetype || "").toLowerCase();
  return (
    mime === "image/heic" ||
    mime === "image/heif" ||
    ((mime === "application/octet-stream" || !mime) && /\.(heic|heif)$/.test(name)) ||
    /\.(heic|heif)$/.test(name)
  );
}

app.post("/api/convert-heic", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        error: "NO_FILE",
        message: "No file uploaded.",
      });
    }

    if (!isHeicFile(req.file)) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_FILE_TYPE",
        message: "Only HEIC / HEIF files are accepted by this endpoint.",
      });
    }

    const { buffer: outputBuffer, convertedBy } = await convertHeicBuffer(req.file.buffer);

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Converted-By", convertedBy);
    res.send(outputBuffer);
  } catch (error) {
    console.error("HEIC conversion failed:", error.message);
    res.status(422).json({
      ok: false,
      error: "HEIC_CONVERSION_FAILED",
      message: "Unable to convert this HEIC file. It may be ProRAW, HDR, Live Photo, or unsupported Apple HEIC variant.",
    });
  }
});

app.get("/api/photo-cloud/albums", async (req, res) => {
  const db = await readPhotoDb();
  res.json({ ok: true, albums: db.albums, photos: db.photos });
});

app.post("/api/photo-cloud/albums", async (req, res) => {
  const id = normalizeId(req.body?.id) || crypto.randomUUID();
  const name = String(req.body?.name || "Photo Album").trim().slice(0, 80) || "Photo Album";
  const now = new Date().toISOString();
  const db = await readPhotoDb();
  const existing = db.albums.find((album) => album.id === id);
  if (existing) {
    existing.name = name;
    existing.updatedAt = now;
  } else {
    db.albums.push({ id, name, createdAt: now, updatedAt: now });
  }
  await writePhotoDb(db);
  res.json({ ok: true, album: db.albums.find((album) => album.id === id) });
});

app.get("/api/photo-cloud/albums/:albumId/photos", async (req, res) => {
  const albumId = normalizeId(req.params.albumId);
  const db = await readPhotoDb();
  res.json({ ok: true, photos: db.photos.filter((photo) => photo.albumId === albumId) });
});

app.get("/api/photo-cloud/object", async (req, res) => {
  try {
    const key = normalizeObjectKey(req.query.key);
    if (!key) return res.status(400).json({ ok: false, error: "INVALID_OBJECT", message: "Invalid object key." });
    const fileName = String(req.query.name || path.basename(key)).replace(/[^\w.\-()\u4e00-\u9fff]/g, "_").slice(0, 180);
    const object = await readPhotoObject(key);
    const download = req.query.download === "1";
    res.setHeader("Content-Type", object.contentType || "image/jpeg");
    res.setHeader("Cache-Control", download ? "private, no-store" : "private, max-age=86400");
    res.setHeader("Content-Disposition", `${download ? "attachment" : "inline"}; filename="${encodeURIComponent(fileName)}"`);
    res.send(object.buffer);
  } catch (error) {
    console.error("Photo object download failed:", error.message);
    res.status(404).json({ ok: false, error: "OBJECT_NOT_FOUND", message: "Photo object not found." });
  }
});

app.delete("/api/photo-cloud/albums/:albumId", async (req, res) => {
  const albumId = normalizeId(req.params.albumId);
  if (!albumId) return res.status(400).json({ ok: false, error: "INVALID_ALBUM", message: "Invalid album id." });

  const db = await readPhotoDb();
  const photos = db.photos.filter((photo) => photo.albumId === albumId);
  for (const photo of photos) await deletePhotoObjects(photo);
  await deleteAlbumObjects(albumId);
  db.photos = db.photos.filter((photo) => photo.albumId !== albumId);
  db.albums = db.albums.filter((album) => album.id !== albumId);
  await writePhotoDb(db);
  res.json({ ok: true, deletedAlbumId: albumId, deletedPhotos: photos.length });
});

app.delete("/api/photo-cloud/albums/:albumId/photos/:photoId", async (req, res) => {
  const albumId = normalizeId(req.params.albumId);
  const photoId = normalizeId(req.params.photoId);
  if (!albumId || !photoId) return res.status(400).json({ ok: false, error: "INVALID_PHOTO", message: "Invalid photo id." });

  const db = await readPhotoDb();
  const photo = db.photos.find((item) => item.albumId === albumId && item.id === photoId);
  await deletePhotoObjects(photo, { albumId, photoId });
  db.photos = db.photos.filter((item) => !(item.albumId === albumId && item.id === photoId));
  const album = db.albums.find((item) => item.id === albumId);
  if (album) album.updatedAt = new Date().toISOString();
  await writePhotoDb(db);
  res.json({ ok: true, deletedPhotoId: photoId, found: Boolean(photo) });
});

app.post("/api/photo-cloud/albums/:albumId/photos", photoUpload.single("file"), async (req, res) => {
  try {
    const albumId = normalizeId(req.params.albumId);
    if (!albumId) {
      return res.status(400).json({ ok: false, error: "INVALID_ALBUM", message: "Invalid album id." });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, error: "NO_FILE", message: "No file uploaded." });
    }

    const now = new Date().toISOString();
    const photoId = normalizeId(req.body.photoId) || crypto.randomUUID();
    const displayBuffer = await compressPhotoForWeb(req.file.buffer);

    const displayName = `${photoId}.jpg`;
    const storageKey = `albums/${albumId}/${displayName}`;
    const storedDisplay = await savePhotoObject(storageKey, displayBuffer, "image/jpeg");

    const metadata = safeJson(req.body.metadata, {});
    const dimensions = await sharp(displayBuffer).metadata();
    const db = await readPhotoDb();
    const albumName = String(req.body.albumName || "Photo Album").trim().slice(0, 80) || "Photo Album";
    const existingAlbum = db.albums.find((item) => item.id === albumId);
    if (existingAlbum) {
      existingAlbum.name = albumName || existingAlbum.name;
      existingAlbum.updatedAt = now;
    } else {
      db.albums.push({ id: albumId, name: albumName, createdAt: now, updatedAt: now });
    }
    const existingIndex = db.photos.findIndex((photo) => photo.id === photoId);
    if (existingIndex >= 0) await deletePhotoObjects(db.photos[existingIndex], {}, new Set([storageKey]));
    const record = {
      id: photoId,
      albumId,
      originalName: String(req.body.originalName || req.file.originalname || "photo.jpg").slice(0, 180),
      outputName: String(req.body.outputName || displayName).slice(0, 180),
      storageProvider: activeStorageProvider,
      storageKey,
      url: storedDisplay.url,
      width: dimensions.width,
      height: dimensions.height,
      sizeBytes: displayBuffer.length,
      metadata,
      updatedAt: now,
      createdAt: now,
    };
    if (existingIndex >= 0) {
      record.createdAt = db.photos[existingIndex].createdAt || now;
      db.photos[existingIndex] = record;
    } else {
      db.photos.push(record);
    }
    await writePhotoDb(db);
    res.json({ ok: true, photo: record });
  } catch (error) {
    console.error("Photo cloud upload failed:", error.message);
    res.status(422).json({
      ok: false,
      error: "PHOTO_UPLOAD_FAILED",
      message: "Unable to save this photo for cloud album storage.",
    });
  }
});

async function convertHeicBuffer(inputBuffer) {
  try {
    const buffer = await sharp(inputBuffer, { limitInputPixels: false })
      .rotate()
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
    return { buffer, convertedBy: "sharp" };
  } catch (sharpError) {
    console.warn("Sharp HEIC conversion failed, using heic-convert fallback:", sharpError.message);
    const buffer = await heicConvert({
      buffer: inputBuffer,
      format: "JPEG",
      quality: 0.92,
    });
    return { buffer: Buffer.from(buffer), convertedBy: "heic-convert" };
  }
}

async function compressPhotoForWeb(inputBuffer) {
  let source = sharp(inputBuffer, { limitInputPixels: false }).rotate();
  const sourceMeta = await source.metadata();
  let maxEdge = Math.min(webPhotoMaxEdge, Math.max(sourceMeta.width || webPhotoMaxEdge, sourceMeta.height || webPhotoMaxEdge));
  let lastBuffer = null;

  for (let edgeAttempt = 0; edgeAttempt < 7; edgeAttempt += 1) {
    for (const quality of [86, 82, 78, 74, 70, 66, 62, 58, 54]) {
      const buffer = await sharp(inputBuffer, { limitInputPixels: false })
        .rotate()
        .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      lastBuffer = buffer;
      if (buffer.length <= webPhotoMaxBytes) return buffer;
    }
    maxEdge = Math.max(900, Math.round(maxEdge * 0.84));
  }

  return lastBuffer;
}

function createR2Client() {
  if (storageProvider !== "r2") return null;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey || !r2Bucket) {
    console.warn("PHOTO_STORAGE_PROVIDER=r2 is set, but R2 env vars are incomplete. Falling back to local storage.");
    return null;
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function savePhotoObject(key, buffer, contentType) {
  if (activeStorageProvider === "r2") {
    await r2Client.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=2592000, immutable",
    }));
    return {
      key,
      url: r2PublicBaseUrl ? `${r2PublicBaseUrl}/${key}` : `/media/photo-cloud/${key}`,
    };
  }

  const target = path.join(photoStorageRoot, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  return {
    key,
    url: `/media/photo-cloud/${key}`,
  };
}

async function deletePhotoObjects(photo, fallback = {}, keepKeys = new Set()) {
  const keys = new Set([photo?.storageKey, photo?.thumbnailKey].filter(Boolean));
  const albumId = normalizeId(photo?.albumId || fallback.albumId);
  const photoId = normalizeId(photo?.id || fallback.photoId);
  if (albumId && photoId) {
    keys.add(`albums/${albumId}/${photoId}.jpg`);
    keys.add(`albums/${albumId}/${photoId}_thumb.jpg`);
  }
  for (const key of keys) {
    if (!keepKeys.has(key)) await deletePhotoObject(key);
  }
}

async function deletePhotoObject(key) {
  if (!key) return;
  if (activeStorageProvider === "r2") {
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }));
    return;
  }
  await fs.rm(path.join(photoStorageRoot, key), { force: true });
}

async function deleteAlbumObjects(albumId) {
  const safeAlbumId = normalizeId(albumId);
  if (!safeAlbumId) return;
  const prefix = `albums/${safeAlbumId}/`;

  if (activeStorageProvider === "r2") {
    let ContinuationToken;
    do {
      const page = await r2Client.send(new ListObjectsV2Command({
        Bucket: r2Bucket,
        Prefix: prefix,
        ContinuationToken,
      }));
      for (const object of page.Contents || []) {
        if (object.Key) await deletePhotoObject(object.Key);
      }
      ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (ContinuationToken);
    return;
  }

  await fs.rm(path.join(photoStorageRoot, prefix), { recursive: true, force: true });
}

function createBaziProfileError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function createLineError(statusCode, code, message) {
  return createBaziProfileError(statusCode, code, message);
}

function enforceLineRateLimit(userId) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const recent = (baziLineRateLimits.get(userId) || []).filter((timestamp) => timestamp > windowStart);
  if (recent.length >= baziLineRateLimitPerMinute) throw createLineError(429, "RATE_LIMITED", "操作太頻繁，請稍後再試。");
  recent.push(now);
  baziLineRateLimits.set(userId, recent);
}

function assertLineConfiguration() {
  if (!baziLineChannelSecret || !baziLineChannelAccessToken) {
    throw createLineError(503, "LINE_NOT_CONFIGURED", "LINE Bot 尚未完成 channel secret 或 access token 設定。");
  }
  if (!baziLineOwnerEmail) throw createLineError(503, "OWNER_NOT_CONFIGURED", "LINE Bot 尚未設定資料 owner。");
  if (!baziLineAllowedUserIds.size) throw createLineError(503, "LINE_ALLOWLIST_EMPTY", "LINE Bot 尚未設定允許操作的 User ID。");
}

async function resolveLineOwnerIdentity() {
  if (!baziLineOwnerEmail) throw createLineError(503, "OWNER_NOT_CONFIGURED", "LINE Bot 尚未設定資料 owner。");
  const user = await readBaziJson(baziUserStorageKey(normalizeBaziEmail(baziLineOwnerEmail)));
  if (!user?.accountId) throw createLineError(404, "OWNER_NOT_FOUND", "找不到 LINE Bot 指定的網站帳號 owner。");
  return user;
}

function lineRecordKey(namespace, value) {
  const safeNamespace = String(namespace || "").replace(/[^a-zA-Z0-9_/-]/g, "").replace(/^\/+|\/+$/g, "");
  const safeValue = String(value || "").replace(/[^a-zA-Z0-9_.-]/g, "");
  if (!safeNamespace || !safeValue) throw new Error("Invalid LINE record key.");
  return `line/${safeNamespace}/${safeValue}.json`;
}

async function readLineRecord(namespace, value) {
  return readBaziJson(lineRecordKey(namespace, value));
}

async function writeLineRecord(namespace, value, record) {
  return writeBaziJson(lineRecordKey(namespace, value), record);
}

async function deleteLineRecord(namespace, value) {
  return deleteBaziJson(lineRecordKey(namespace, value));
}

function lineUserRecordId(userId) {
  return crypto.createHash("sha256").update(String(userId), "utf8").digest("hex");
}

function lineProfileRecordId(ownerId, profileId) {
  return `${normalizeId(ownerId)}_${normalizeId(profileId)}`;
}

async function readLineSession(userId) {
  const record = await readLineRecord("sessions", lineUserRecordId(userId));
  if (!record || !record.expiresAt || Date.parse(record.expiresAt) <= Date.now()) {
    if (record) await deleteLineRecord("sessions", lineUserRecordId(userId));
    return null;
  }
  return record;
}

async function writeLineSession(userId, state) {
  const now = new Date().toISOString();
  const record = {
    version: 1,
    lineUserId: userId,
    ...state,
    createdAt: state.createdAt || now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + baziLineSessionTtlMs).toISOString(),
  };
  await writeLineRecord("sessions", lineUserRecordId(userId), record);
  return record;
}

async function clearLineSession(userId) {
  await deleteLineRecord("sessions", lineUserRecordId(userId));
}

function lineArtifactKey(ownerId, profileId, artifactId = "latest") {
  return `line/artifacts/${normalizeId(ownerId)}/${normalizeId(profileId)}/${normalizeId(artifactId) || "latest"}.json`;
}

function lineGenerationKey(ownerId, profileId, fingerprint) {
  return `line/generations/${normalizeId(ownerId)}/${normalizeId(profileId)}/${normalizeId(fingerprint)}.json`;
}

async function readLineArtifact(ownerId, profileId) {
  const key = lineArtifactKey(ownerId, profileId);
  return readBaziJson(key);
}

async function writeLineArtifact(ownerId, profileId, artifact) {
  await writeBaziJson(lineArtifactKey(ownerId, profileId, artifact.artifactId), artifact);
  await writeBaziJson(lineArtifactKey(ownerId, profileId), artifact);
}

async function writeLineGeneration(ownerId, profileId, generation) {
  await writeBaziJson(lineGenerationKey(ownerId, profileId, generation.inputFingerprint), generation);
}

async function createLineDownloadToken(ownerId, profileId, artifactId) {
  const token = crypto.randomBytes(32).toString("hex");
  await writeLineRecord("downloads", token, {
    version: 1,
    ownerId,
    profileId,
    artifactId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + baziLineDownloadTtlMs).toISOString(),
  });
  return token;
}

async function consumeLineDownloadToken(token) {
  const record = await readLineRecord("downloads", token);
  await deleteLineRecord("downloads", token);
  if (!record || !record.expiresAt || Date.parse(record.expiresAt) <= Date.now()) {
    throw createLineError(410, "SESSION_EXPIRED", "Markdown 下載連結已過期，請從 LINE 重新取得。");
  }
  return record;
}

function lineDownloadUrl(token) {
  const url = new URL(`${baziPublicUrl}/api/bazi/line/download`);
  url.searchParams.set("token", token);
  return url.toString();
}

async function upsertLineProfile(ownerId, sourceProfile) {
  const profiles = await readBaziProfiles(ownerId);
  const profile = normalizeBaziProfile({
    ...sourceProfile,
    id: sourceProfile.id || crypto.randomUUID(),
    createdAt: sourceProfile.createdAt || new Date().toISOString(),
  });
  const identity = baziProfileIdentity(profile);
  const existingIndex = profiles.findIndex((item) => baziProfileIdentity(item) === identity);
  const now = new Date().toISOString();
  const record = {
    ...profile,
    id: existingIndex >= 0 ? profiles[existingIndex].id : profile.id,
    createdAt: existingIndex >= 0 ? profiles[existingIndex].createdAt : profile.createdAt || now,
    updatedAt: now,
    version: 1,
  };
  if (existingIndex >= 0) profiles[existingIndex] = record;
  else profiles.push(record);
  await writeBaziProfiles(ownerId, profiles);
  return record;
}

async function generateLineArtifact(ownerId, profile, targetYear = new Date().getFullYear()) {
  const lockKey = `${ownerId}:${profile.id}:${targetYear}`;
  if (baziLineGenerationLocks.has(lockKey)) throw createLineError(409, "GENERATION_IN_PROGRESS", "這份命盤正在產生中，請稍候再試。");
  const task = (async () => {
    const generated = canonicalBaziService.generateBaziProfile(profile, targetYear);
    const generation = {
      version: 1,
      profileId: profile.id,
      inputFingerprint: generated.inputFingerprint,
      calendarRuleVersion: generated.versions.calendarRuleVersion,
      baziCoreVersion: generated.versions.baziCoreVersion,
      canonicalResult: generated.canonicalResult,
      generatedAt: generated.generatedAt,
    };
    const artifact = {
      version: 1,
      profileId: profile.id,
      generationFingerprint: generated.inputFingerprint,
      generationArtifactId: generated.artifactId,
      artifactId: generated.artifactId,
      advisorSchemaVersion: generated.versions.advisorSchemaVersion,
      promptTemplateVersion: generated.versions.promptTemplateVersion,
      title: generated.advisorPrompt.title,
      content: generated.advisorPrompt.content,
      contentHash: generated.advisorPrompt.contentHash,
      chars: generated.advisorPrompt.chars,
      generatedAt: generated.generatedAt,
      qualityReport: generated.advisorPrompt.qualityReport,
    };
    await writeLineGeneration(ownerId, profile.id, generation);
    await writeLineArtifact(ownerId, profile.id, artifact);
    return { generated, generation, artifact };
  })().finally(() => baziLineGenerationLocks.delete(lockKey));
  baziLineGenerationLocks.set(lockKey, task);
  return task;
}

function getPromptPillars(generated) {
  return Object.values(generated.canonicalResult?.pillars || {}).map((pillar) => pillar.pillar).join("｜");
}

function buildGeneratedSummary(profile, generated, ownerId) {
  const currentLuck = generated.analysis.currentLuck?.pillar || "待定";
  const annual = generated.analysis.annualLuck ? `${generated.analysis.annualLuck.year} ${generated.analysis.annualLuck.pillar}` : "待定";
  return lineBot.buildTextMessage([
    "✅ 終身 AI 命理顧問檔案已產生",
    "",
    `命主：${profile.name}`,
    `四柱：${getPromptPillars(generated)}`,
    `目前大運：${currentLuck}`,
    `流年：${annual}`,
    `Prompt 版本：${generated.versions.promptTemplateVersion}`,
    `全文：約 ${generated.advisorPrompt.chars} 字`,
  ].join("\n"), [
    lineBot.postbackItem("查看全文", `action=view-prompt&profileId=${encodeURIComponent(profile.id)}`),
    lineBot.postbackItem("取得 Markdown", `action=download-markdown&profileId=${encodeURIComponent(profile.id)}`),
    lineBot.postbackItem("重新產生", `action=regenerate&profileId=${encodeURIComponent(profile.id)}`),
  ]);
}

async function replyLineMessages(replyToken, messages) {
  if (!replyToken) return;
  assertLineConfiguration();
  if (!Array.isArray(messages) || messages.length > 5) throw createLineError(422, "LINE_MESSAGE_LIMIT", "LINE 回覆訊息超過單次上限。");
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${baziLineChannelAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw createLineError(502, "LINE_REPLY_FAILED", payload.message || "LINE 回覆訊息失敗。");
  }
}

async function replyLinePrompt(replyToken, content) {
  const chunks = lineBot.chunkPrompt(content, baziLineTextSafeLimit);
  if (chunks.length > 5) throw createLineError(422, "LINE_PROMPT_TOO_LONG", "Prompt 過長，請使用 Markdown 下載連結取得完整內容。");
  await replyLineMessages(replyToken, chunks.map((chunk) => lineBot.buildTextMessage(chunk)));
}

async function getSingleLineProfile(ownerId, userId) {
  const session = await readLineSession(userId);
  const profiles = await readBaziProfiles(ownerId);
  const selectedId = session?.selectedProfileId;
  if (selectedId) {
    const selected = profiles.find((profile) => profile.id === selectedId);
    if (selected) return selected;
  }
  return profiles.length === 1 ? profiles[0] : null;
}

async function requireLineProfile(ownerId, userId, profileId) {
  const profiles = await readBaziProfiles(ownerId);
  const profile = profiles.find((item) => item.id === profileId);
  if (!profile) throw createLineError(404, "PROFILE_NOT_FOUND", "找不到這位命主資料，或資料不屬於目前 owner。");
  await writeLineSession(userId, { selectedProfileId: profile.id, state: "selected-profile" });
  return profile;
}

async function sendCurrentLinePrompt(replyToken, ownerId, profile) {
  const artifact = await readLineArtifact(ownerId, profile.id);
  if (!artifact?.content) throw createLineError(404, "ARTIFACT_NOT_FOUND", "目前尚未保存 Prompt，請先選擇重新產生 Prompt。");
  await replyLinePrompt(replyToken, artifact.content);
}

async function sendLineMarkdownLink(replyToken, ownerId, profile) {
  const artifact = await readLineArtifact(ownerId, profile.id);
  if (!artifact?.content) throw createLineError(404, "ARTIFACT_NOT_FOUND", "目前尚未保存 Prompt，請先選擇重新產生 Prompt。");
  const token = await createLineDownloadToken(ownerId, profile.id, artifact.artifactId);
  await replyLineMessages(replyToken, [lineBot.buildTextMessage([
    "Markdown 已準備完成。",
    "",
    `命主：${profile.name}`,
    "下載連結 15 分鐘內有效，且只對目前這份 Prompt 有效：",
    lineDownloadUrl(token),
  ].join("\n"))]);
}

async function sendLineProfiles(replyToken, ownerId, userId) {
  const profiles = await readBaziProfiles(ownerId);
  if (!profiles.length) {
    await replyLineMessages(replyToken, [lineBot.buildTextMessage("目前尚未建立命主。請使用：\n排盤 姓名 YYYY/MM/DD HH:MM 男／女")]);
    return;
  }
  const selectable = profiles.slice(0, 12);
  await writeLineSession(userId, { state: "select-profile", profileIds: selectable.map((profile) => profile.id) });
  const lines = ["我的命主", "", ...selectable.map((profile, index) => `${index + 1}. ${lineBot.formatProfileSummary(profile)}`)];
  const items = selectable.map((profile, index) => lineBot.postbackItem(`${index + 1} ${profile.name || "未命名"}`.slice(0, 20), `action=select-profile&profileId=${encodeURIComponent(profile.id)}`));
  await replyLineMessages(replyToken, [lineBot.buildTextMessage(lines.join("\n"), items)]);
}

async function sendSelectedProfile(replyToken, userId, profile) {
  await replyLineMessages(replyToken, [lineBot.buildTextMessage([
    "已選擇命主",
    "",
    lineBot.formatProfileSummary(profile),
    "",
    "請選擇下一步。",
  ].join("\n"), [
    lineBot.postbackItem("查看 Prompt", `action=view-prompt&profileId=${encodeURIComponent(profile.id)}`),
    lineBot.postbackItem("取得 Markdown", `action=download-markdown&profileId=${encodeURIComponent(profile.id)}`),
    lineBot.postbackItem("重新排盤", `action=regenerate&profileId=${encodeURIComponent(profile.id)}`),
  ])]);
  await writeLineSession(userId, { state: "selected-profile", selectedProfileId: profile.id });
}

async function handleLineQuickChart(replyToken, userId, parsed) {
  if (parsed.status === "invalid") {
    await replyLineMessages(replyToken, [lineBot.buildTextMessage(parsed.message)]);
    return;
  }
  if (parsed.status === "needs-fields") {
    await replyLineMessages(replyToken, [lineBot.buildTextMessage(`還缺少：${parsed.missing.join("、")}。\n例如：排盤 柯耿誌 1975/12/27 00:20 男`)]);
    return;
  }
  const sessionId = crypto.randomBytes(16).toString("hex");
  await writeLineSession(userId, { state: "ready-to-confirm", sessionId, pendingProfile: parsed.profile });
  await replyLineMessages(replyToken, [lineBot.buildConfirmationMessage(sessionId, parsed.profile)]);
}

async function handleLineConfirm(replyToken, userId, sessionId) {
  const session = await readLineSession(userId);
  if (!session || session.state !== "ready-to-confirm" || session.sessionId !== sessionId || !session.pendingProfile) {
    throw createLineError(409, "SESSION_EXPIRED", "排盤確認已過期，請重新輸入排盤資料。");
  }
  const owner = await resolveLineOwnerIdentity();
  const profile = await upsertLineProfile(owner.accountId, session.pendingProfile);
  await clearLineSession(userId);
  const generated = await generateLineArtifact(owner.accountId, profile, new Date().getFullYear());
  await writeLineSession(userId, { state: "selected-profile", selectedProfileId: profile.id });
  await replyLineMessages(replyToken, [buildGeneratedSummary(profile, generated.generated, owner.accountId)]);
}

async function handleLineProfileAction(replyToken, userId, ownerId, action, profileId) {
  const profile = await requireLineProfile(ownerId, userId, profileId);
  if (action === "view-prompt") {
    await sendCurrentLinePrompt(replyToken, ownerId, profile);
    return;
  }
  if (action === "download-markdown") {
    await sendLineMarkdownLink(replyToken, ownerId, profile);
    return;
  }
  if (action === "regenerate") {
    const generated = await generateLineArtifact(ownerId, profile, new Date().getFullYear());
    await replyLineMessages(replyToken, [buildGeneratedSummary(profile, generated.generated, ownerId)]);
    return;
  }
  await sendSelectedProfile(replyToken, userId, profile);
}

async function handleLinePostback(replyToken, userId, postback) {
  const data = lineBot.parsePostbackData(postback?.data);
  if (data.action === "cancel") {
    await clearLineSession(userId);
    await replyLineMessages(replyToken, [lineBot.buildTextMessage("已取消目前操作。")]);
    return;
  }
  if (data.action === "confirm") {
    await handleLineConfirm(replyToken, userId, data.sessionId);
    return;
  }
  const owner = await resolveLineOwnerIdentity();
  if (data.action === "select-profile") {
    const profile = await requireLineProfile(owner.accountId, userId, data.profileId);
    await sendSelectedProfile(replyToken, userId, profile);
    return;
  }
  if (["view-prompt", "download-markdown", "regenerate"].includes(data.action)) {
    await handleLineProfileAction(replyToken, userId, owner.accountId, data.action, data.profileId);
  }
}

async function handleLineNumericSelection(replyToken, userId, ownerId, text, session) {
  if (session?.state !== "select-profile") return false;
  const index = Number(String(text).trim()) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= (session.profileIds || []).length) return false;
  const profile = await requireLineProfile(ownerId, userId, session.profileIds[index]);
  await sendSelectedProfile(replyToken, userId, profile);
  return true;
}

async function handleLineMessage(replyToken, userId, text) {
  const owner = await resolveLineOwnerIdentity();
  const session = await readLineSession(userId);
  if (session?.state === "select-profile" && /^\d+$/.test(String(text).trim())) {
    if (await handleLineNumericSelection(replyToken, userId, owner.accountId, text, session)) return;
  }
  const parsed = lineBot.parseLineCommand(text);
  if (!parsed) {
    await replyLineMessages(replyToken, [lineBot.buildHelpMessage()]);
    return;
  }
  if (parsed.command === "help") {
    await replyLineMessages(replyToken, [lineBot.buildHelpMessage()]);
  } else if (parsed.command === "cancel") {
    await clearLineSession(userId);
    await replyLineMessages(replyToken, [lineBot.buildTextMessage("已取消目前操作。")]);
  } else if (parsed.command === "profiles") {
    await sendLineProfiles(replyToken, owner.accountId, userId);
  } else if (parsed.command === "quick-chart") {
    await handleLineQuickChart(replyToken, userId, parsed);
  } else if (parsed.command === "view-prompt" || parsed.command === "download-markdown") {
    const profile = await getSingleLineProfile(owner.accountId, userId);
    if (!profile) {
      await sendLineProfiles(replyToken, owner.accountId, userId);
      return;
    }
    if (parsed.command === "view-prompt") await sendCurrentLinePrompt(replyToken, owner.accountId, profile);
    else await sendLineMarkdownLink(replyToken, owner.accountId, profile);
  }
}

async function withLineEventIdempotency(fingerprint, handler) {
  if (baziLineEventLocks.has(fingerprint)) return baziLineEventLocks.get(fingerprint);
  const task = (async () => {
    const existing = await readLineRecord("events", fingerprint);
    if (existing?.status === "done") return { duplicate: true };
    await writeLineRecord("events", fingerprint, { version: 1, status: "processing", startedAt: new Date().toISOString() });
    try {
      const result = await handler();
      await writeLineRecord("events", fingerprint, { version: 1, status: "done", completedAt: new Date().toISOString() });
      return result;
    } catch (error) {
      await deleteLineRecord("events", fingerprint);
      throw error;
    }
  })().finally(() => baziLineEventLocks.delete(fingerprint));
  baziLineEventLocks.set(fingerprint, task);
  return task;
}

async function processLineEvent(event, destination) {
  const userId = event?.source?.userId || "";
  const fingerprint = lineBot.eventFingerprint(event, destination);
  return withLineEventIdempotency(fingerprint, async () => {
    if (!lineBot.isAllowedLineUser(userId, baziLineAllowedUserIds)) {
      console.warn(`LINE user denied: ${fingerprint}`);
      return { denied: true };
    }
    enforceLineRateLimit(userId);
    if (event.type === "postback") {
      await handleLinePostback(event.replyToken, userId, event.postback);
      return { handled: true };
    }
    if (event.type === "message" && event.message?.type === "text") {
      await handleLineMessage(event.replyToken, userId, event.message.text);
      return { handled: true };
    }
    return { ignored: true };
  });
}

async function handleLineWebhook(req, res) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "", "utf8");
  if (!lineBot.verifyLineSignature(rawBody, req.get("x-line-signature"), baziLineChannelSecret)) {
    res.status(401).json({ ok: false, error: "LINE_SIGNATURE_INVALID" });
    return;
  }
  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    res.status(400).json({ ok: false, error: "INVALID_INPUT" });
    return;
  }
  if (!Array.isArray(payload.events) || payload.events.length === 0) {
    res.status(200).json({ ok: true, events: 0 });
    return;
  }
  try {
    assertLineConfiguration();
    await Promise.all(payload.events.map((event) => processLineEvent(event, payload.destination)));
    res.status(200).json({ ok: true, events: payload.events.length });
  } catch (error) {
    const traceId = crypto.randomUUID();
    console.error("LINE webhook failed:", { traceId, code: error.code || "LINE_WEBHOOK_FAILED", fingerprintCount: payload.events.length });
    res.status(error.statusCode || 500).json({ ok: false, error: error.code || "LINE_WEBHOOK_FAILED", traceId });
  }
}

function hashBaziValue(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function normalizeBaziEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw createBaziProfileError(422, "INVALID_EMAIL", "請輸入有效的電子郵件地址。");
  }
  return email;
}

function normalizeBaziPassword(value) {
  const password = String(value || "");
  if (password.length < 8 || password.length > 128) {
    throw createBaziProfileError(422, "INVALID_PASSWORD", "密碼長度必須為 8 至 128 個字元。");
  }
  return password;
}

function normalizeBaziToken(value) {
  const token = String(value || "").trim();
  if (!/^[a-f0-9]{64}$/.test(token)) throw createBaziProfileError(400, "INVALID_TOKEN", "連結無效或已過期。");
  return token;
}

function baziTokenStorageKey(type, token) {
  if (!/^(verify|reset)$/.test(type)) throw new Error("Invalid Bazi token type.");
  return `tokens/${type}/${hashBaziValue(token)}.json`;
}

function assertBaziEmailServiceConfigured() {
  if (baziEmailProvider === "console") return;
  if (baziEmailProvider === "cloudflare" && baziEmailApiToken && baziEmailAccountId && baziEmailFrom) return;
  throw createBaziProfileError(503, "EMAIL_SERVICE_NOT_CONFIGURED", "Email 寄送服務尚未設定，請稍後再試。");
}

async function createBaziToken(type, user, maxAgeMs) {
  const token = crypto.randomBytes(32).toString("hex");
  await writeBaziJson(baziTokenStorageKey(type, token), {
    version: 1,
    type,
    accountId: user.accountId,
    email: user.email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + maxAgeMs).toISOString(),
  });
  return token;
}

async function deleteBaziToken(type, token) {
  await deleteBaziJson(baziTokenStorageKey(type, token));
}

async function consumeBaziToken(type, token) {
  const record = await readBaziJson(baziTokenStorageKey(type, token));
  if (!record || record.type !== type || !record.expiresAt || Date.parse(record.expiresAt) <= Date.now()) {
    await deleteBaziToken(type, token);
    throw createBaziProfileError(400, type === "verify" ? "INVALID_VERIFICATION_TOKEN" : "INVALID_RESET_TOKEN", "連結無效或已過期。");
  }
  await deleteBaziToken(type, token);
  return record;
}

function escapeBaziHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function baziActionUrl(queryName, token) {
  const pathname = queryName === "verify" ? "/api/bazi/auth/verify-email" : "/apps/bazi/";
  const url = new URL(`${baziPublicUrl}${pathname}`);
  url.searchParams.set(queryName === "verify" ? "token" : "reset", token);
  return url.toString();
}

async function sendBaziEmail({ to, subject, text, html }) {
  assertBaziEmailServiceConfigured();
  if (baziEmailProvider === "console") {
    console.log(`[Bazi email console] to=${to} subject=${subject}\n${text}`);
    return;
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(baziEmailAccountId)}/email/sending/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${baziEmailApiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { address: baziEmailFrom, name: baziEmailFromName },
      to: [to],
      subject,
      text,
      html,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    console.error("Bazi email delivery failed:", response.status, payload.errors || payload.messages || "unknown error");
    throw createBaziProfileError(502, "EMAIL_DELIVERY_FAILED", "Email 寄送失敗，請稍後再試。");
  }
}

async function sendBaziVerificationEmail(user, token) {
  const url = baziActionUrl("verify", token);
  const safeUrl = escapeBaziHtml(url);
  await sendBaziEmail({
    to: user.email,
    subject: "請驗證你的 Louisko 八字排盤帳號",
    text: `請開啟以下連結完成 Email 驗證：\n${url}\n\n此連結 24 小時內有效。`,
    html: `<p>您好，</p><p>請點擊以下連結完成 Louisko 八字排盤帳號的 Email 驗證：</p><p><a href="${safeUrl}">${safeUrl}</a></p><p>此連結 24 小時內有效。</p>`,
  });
}

async function sendBaziPasswordResetEmail(user, token) {
  const url = baziActionUrl("reset", token);
  const safeUrl = escapeBaziHtml(url);
  await sendBaziEmail({
    to: user.email,
    subject: "重設你的 Louisko 八字排盤密碼",
    text: `請開啟以下連結重設密碼：\n${url}\n\n此連結 1 小時內有效，且只能使用一次。`,
    html: `<p>您好，</p><p>請點擊以下連結重設 Louisko 八字排盤密碼：</p><p><a href="${safeUrl}">${safeUrl}</a></p><p>此連結 1 小時內有效，且只能使用一次。</p>`,
  });
}

function normalizeLegacyOwnerKey(value) {
  const ownerKey = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{16,100}$/.test(ownerKey) ? ownerKey : "";
}

function baziAuthStorageKey(relativeKey) {
  return `_metadata/bazi-auth/${relativeKey}`;
}

function baziAuthFilePath(relativeKey) {
  if (!/^[a-zA-Z0-9_/-]+\.json$/.test(relativeKey)) throw new Error("Invalid Bazi auth storage key.");
  return path.join(baziAuthStorageRoot, relativeKey);
}

function baziUserStorageKey(email) {
  return `users/${hashBaziValue(email)}.json`;
}

function baziSessionStorageKey(token) {
  return `sessions/${hashBaziValue(token)}.json`;
}

function baziProfileStorageKey(accountId) {
  return `_metadata/bazi-profiles/accounts/${accountId}.json`;
}

async function readBaziJson(relativeKey) {
  if (activeStorageProvider === "r2") {
    try {
      const response = await r2Client.send(new GetObjectCommand({ Bucket: r2Bucket, Key: baziAuthStorageKey(relativeKey) }));
      return JSON.parse(await streamToString(response.Body));
    } catch (error) {
      const code = error?.name || error?.Code || error?.$metadata?.httpStatusCode;
      if (code !== "NoSuchKey" && code !== 404) console.warn("R2 Bazi auth read failed:", error.message);
      return null;
    }
  }

  try {
    return JSON.parse(await fs.readFile(baziAuthFilePath(relativeKey), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Bazi auth read failed:", error.message);
    return null;
  }
}

async function writeBaziJson(relativeKey, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  if (activeStorageProvider === "r2") {
    await r2Client.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: baziAuthStorageKey(relativeKey),
      Body: body,
      ContentType: "application/json; charset=utf-8",
      CacheControl: "private, no-store",
    }));
    return;
  }
  const filePath = baziAuthFilePath(relativeKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, body);
}

async function deleteBaziJson(relativeKey) {
  if (activeStorageProvider === "r2") {
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: baziAuthStorageKey(relativeKey) }));
    return;
  }
  await fs.rm(baziAuthFilePath(relativeKey), { force: true });
}

async function hashBaziPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derivedKey = await scryptAsync(password, salt, 32, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { salt, hash: Buffer.from(derivedKey).toString("hex") };
}

async function verifyBaziPassword(password, user) {
  if (!user?.passwordSalt || !user?.passwordHash) return false;
  const derived = await hashBaziPassword(password, user.passwordSalt);
  const expected = Buffer.from(user.passwordHash, "hex");
  const actual = Buffer.from(derived.hash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function publicBaziUser(user) {
  return { accountId: user.accountId, email: user.email, emailVerifiedAt: user.emailVerifiedAt || null, createdAt: user.createdAt };
}

function getCookieValue(req, name) {
  const cookies = String(req.headers.cookie || "").split(";");
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;
    const key = cookie.slice(0, separator).trim();
    if (key === name) return decodeURIComponent(cookie.slice(separator + 1).trim());
  }
  return "";
}

async function createBaziSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  await writeBaziJson(baziSessionStorageKey(token), {
    version: 1,
    accountId: user.accountId,
    email: user.email,
    passwordVersion: user.passwordVersion || 1,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + baziSessionMaxAgeMs).toISOString(),
  });
  return token;
}

function setBaziSessionCookie(req, res, token) {
  res.cookie(baziSessionCookie, token, {
    httpOnly: true,
    secure: process.env.BAZI_COOKIE_SECURE !== "false",
    sameSite: "lax",
    maxAge: baziSessionMaxAgeMs,
    path: "/",
  });
}

function clearBaziSessionCookie(req, res) {
  res.clearCookie(baziSessionCookie, {
    httpOnly: true,
    secure: process.env.BAZI_COOKIE_SECURE !== "false",
    sameSite: "lax",
    path: "/",
  });
}

async function deleteBaziSession(req) {
  const token = getCookieValue(req, baziSessionCookie);
  if (/^[a-f0-9]{64}$/.test(token)) await deleteBaziJson(baziSessionStorageKey(token));
}

async function getBaziSessionUser(req, res) {
  const token = getCookieValue(req, baziSessionCookie);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await readBaziJson(baziSessionStorageKey(token));
  if (!session || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) {
    await deleteBaziJson(baziSessionStorageKey(token));
    clearBaziSessionCookie(req, res);
    return null;
  }
  const user = await readBaziJson(baziUserStorageKey(session.email));
  if (!user || user.accountId !== session.accountId || (user.passwordVersion || 1) !== (session.passwordVersion || 1)) {
    await deleteBaziJson(baziSessionStorageKey(token));
    clearBaziSessionCookie(req, res);
    return null;
  }
  return user;
}

async function requireBaziSessionUser(req, res) {
  const user = await getBaziSessionUser(req, res);
  if (!user) throw createBaziProfileError(401, "AUTHENTICATION_REQUIRED", "請先登入 Bazi 命主帳號。");
  return user;
}

function baziProfileIdentity(profile) {
  const solar = profile.birthSolar || {};
  return [
    profile.name || "",
    solar.year,
    solar.month,
    solar.day,
    solar.hour,
    solar.minute,
    profile.gender,
    profile.hemisphere,
    profile.dayChangeRule,
    profile.birthPlace || "",
    profile.timezone || "Asia/Taipei",
  ].join("|");
}

function normalizeBaziSolarDate(value) {
  const source = value && typeof value === "object" ? value : {};
  const solar = {
    year: Number(source.year),
    month: Number(source.month),
    day: Number(source.day),
    hour: Number(source.hour),
    minute: Number(source.minute),
  };
  const valid = Number.isInteger(solar.year) && solar.year >= 1 && solar.year <= 9999 &&
    Number.isInteger(solar.month) && solar.month >= 1 && solar.month <= 12 &&
    Number.isInteger(solar.day) && solar.day >= 1 && solar.day <= 31 &&
    Number.isInteger(solar.hour) && solar.hour >= 0 && solar.hour <= 23 &&
    Number.isInteger(solar.minute) && solar.minute >= 0 && solar.minute <= 59;
  if (!valid) throw createBaziProfileError(422, "INVALID_BIRTH_SOLAR", "Invalid standard solar birth date.");
  return solar;
}

function normalizeBaziLunarDate(value) {
  const source = value && typeof value === "object" ? value : {};
  const lunar = {
    year: Number(source.year),
    month: Number(source.month),
    day: Number(source.day),
    isLeap: Boolean(source.isLeap),
    ganzhiYear: String(source.ganzhiYear || "").slice(0, 12),
  };
  const valid = Number.isInteger(lunar.year) && lunar.year >= 1 && lunar.year <= 9999 &&
    Number.isInteger(lunar.month) && lunar.month >= 1 && lunar.month <= 12 &&
    Number.isInteger(lunar.day) && lunar.day >= 1 && lunar.day <= 30;
  if (!valid) throw createBaziProfileError(422, "INVALID_BIRTH_LUNAR", "Invalid standard lunar birth date.");
  return lunar;
}

function normalizeBaziProfile(value) {
  const source = value && typeof value === "object" ? value : {};
  const birthSolar = normalizeBaziSolarDate(source.birthSolar);
  const birthLunar = normalizeBaziLunarDate(source.birthLunar);
  const profile = {
    id: normalizeId(source.id) || crypto.randomUUID(),
    name: String(source.name || "").trim().slice(0, 100),
    inputCalendarType: source.inputCalendarType === "lunar" ? "lunar" : "solar",
    birthSolar,
    birthLunar,
    gender: source.gender === "female" ? "female" : "male",
    hemisphere: source.hemisphere === "south" ? "south" : "north",
    dayChangeRule: source.dayChangeRule === "midnight" ? "midnight" : "lateZiHour",
    birthPlace: String(source.birthPlace || "").trim().slice(0, 100),
    timezone: String(source.timezone || "Asia/Taipei").trim().slice(0, 80),
    timezoneOffset: Number.isFinite(Number(source.timezoneOffset)) ? Number(source.timezoneOffset) : 8,
    createdAt: String(source.createdAt || "").slice(0, 40),
    updatedAt: String(source.updatedAt || "").slice(0, 40),
    version: 1,
  };
  return profile;
}

async function readBaziProfiles(ownerKey) {
  return readBaziProfileFile(baziProfileStorageKey(ownerKey), `${ownerKey}.json`);
}

async function readLegacyBaziProfiles(ownerKey) {
  return readBaziProfileFile(`_metadata/bazi-profiles/${ownerKey}.json`, `${ownerKey}.json`);
}

async function readBaziProfileFile(storageKey, localFileName) {
  if (activeStorageProvider === "r2") {
    try {
      const response = await r2Client.send(new GetObjectCommand({
        Bucket: r2Bucket,
        Key: storageKey,
      }));
      const parsed = JSON.parse(await streamToString(response.Body));
      return Array.isArray(parsed.profiles) ? parsed.profiles.map(normalizeBaziProfile) : [];
    } catch (error) {
      const code = error?.name || error?.Code || error?.$metadata?.httpStatusCode;
      if (code !== "NoSuchKey" && code !== 404) console.warn("R2 Bazi profile read failed:", error.message);
      return [];
    }
  }

  const filePath = path.join(baziProfileStorageRoot, localFileName);
  await fs.mkdir(baziProfileStorageRoot, { recursive: true });
  try {
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    return Array.isArray(parsed.profiles) ? parsed.profiles.map(normalizeBaziProfile) : [];
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Bazi profile read failed:", error.message);
    return [];
  }
}

async function writeBaziProfiles(ownerKey, profiles) {
  const body = `${JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), profiles }, null, 2)}\n`;
  if (activeStorageProvider === "r2") {
    await r2Client.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: baziProfileStorageKey(ownerKey),
      Body: body,
      ContentType: "application/json; charset=utf-8",
      CacheControl: "private, no-store",
    }));
    return;
  }

  await fs.mkdir(baziProfileStorageRoot, { recursive: true });
  await fs.writeFile(path.join(baziProfileStorageRoot, `${ownerKey}.json`), body);
}

async function deleteBaziProfiles(accountId) {
  if (activeStorageProvider === "r2") {
    await r2Client.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: baziProfileStorageKey(accountId) }));
    return;
  }
  await fs.rm(path.join(baziProfileStorageRoot, `${accountId}.json`), { force: true });
}

async function readPhotoObject(key) {
  if (activeStorageProvider === "r2") {
    const response = await r2Client.send(new GetObjectCommand({ Bucket: r2Bucket, Key: key }));
    return {
      buffer: await streamToBuffer(response.Body),
      contentType: response.ContentType || "image/jpeg",
    };
  }
  return {
    buffer: await fs.readFile(path.join(photoStorageRoot, key)),
    contentType: "image/jpeg",
  };
}

async function readPhotoDb() {
  if (activeStorageProvider === "r2") {
    try {
      const response = await r2Client.send(new GetObjectCommand({
        Bucket: r2Bucket,
        Key: r2MetadataKey,
      }));
      const raw = await streamToString(response.Body);
      const parsed = JSON.parse(raw);
      return {
        albums: Array.isArray(parsed.albums) ? parsed.albums : [],
        photos: Array.isArray(parsed.photos) ? parsed.photos : [],
      };
    } catch (error) {
      const code = error?.name || error?.Code || error?.$metadata?.httpStatusCode;
      if (code !== "NoSuchKey" && code !== 404) console.warn("R2 photo metadata read failed:", error.message);
      return { albums: [], photos: [] };
    }
  }

  await fs.mkdir(photoStorageRoot, { recursive: true });
  try {
    const raw = await fs.readFile(photoMetadataPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      albums: Array.isArray(parsed.albums) ? parsed.albums : [],
      photos: Array.isArray(parsed.photos) ? parsed.photos : [],
    };
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("Photo metadata read failed:", error.message);
    return { albums: [], photos: [] };
  }
}

async function writePhotoDb(db) {
  if (activeStorageProvider === "r2") {
    await r2Client.send(new PutObjectCommand({
      Bucket: r2Bucket,
      Key: r2MetadataKey,
      Body: `${JSON.stringify(db, null, 2)}\n`,
      ContentType: "application/json; charset=utf-8",
      CacheControl: "no-store",
    }));
    return;
  }

  await fs.mkdir(photoStorageRoot, { recursive: true });
  await fs.writeFile(photoMetadataPath, `${JSON.stringify(db, null, 2)}\n`);
}

async function streamToString(stream) {
  if (!stream) return "";
  return (await streamToBuffer(stream)).toString("utf8");
}

async function streamToBuffer(stream) {
  if (!stream) return Buffer.alloc(0);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function normalizeId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function normalizeObjectKey(value) {
  const key = String(value || "").replace(/^\/+/, "");
  if (!/^albums\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(key)) return "";
  if (key.includes("..")) return "";
  return key;
}

function safeJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

app.use("/media/photo-cloud", express.static(photoStorageRoot, {
  immutable: true,
  maxAge: "30d",
}));

app.use(express.static(root, {
  extensions: ["html"],
  setHeaders(res, filePath) {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache");
    }
  },
}));

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      ok: false,
      error: "FILE_TOO_LARGE",
      message: "This upload exceeds the current file size limit.",
    });
  }
  return next(error);
});

app.use((req, res) => {
  res.status(404).type("text/plain; charset=utf-8").send("Not found");
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`louisko.com listening on ${port}`);
  });
}

module.exports = { app, handleLineWebhook };
