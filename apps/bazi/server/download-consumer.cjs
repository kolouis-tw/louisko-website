const fs = require("node:fs/promises");
const path = require("node:path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

// A retained receipt prevents two Node processes from sending the same one-time file.
// R2 evaluates If-None-Match atomically; local storage uses the filesystem's exclusive create.
function createDownloadConsumer({ provider, client, bucket, objectKey, filePath }) {
  return async function consume(token, expiresAt) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Invalid download token");
    const body = JSON.stringify({ consumedAt: new Date().toISOString(), expiresAt });
    try {
      if (provider === "r2") {
        await client.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey(token), Body: body,
          ContentType: "application/json; charset=utf-8", CacheControl: "private, no-store", IfNoneMatch: "*" }));
      } else {
        const target = filePath(token);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, body, { flag: "wx" });
      }
      return true;
    } catch (error) {
      if (error.code === "EEXIST" || error.name === "PreconditionFailed" || error.$metadata?.httpStatusCode === 412) return false;
      const failure = new Error("下載權限暫時無法確認，請稍後重試。");
      failure.statusCode = 503;
      throw failure;
    }
  };
}
module.exports = { createDownloadConsumer };
