import type { RouteContext, Store } from "@api-emulator/core";
import { ascId, jsonApiResource, jsonApiError } from "../jsonapi.js";
import { getASCStore } from "../store.js";

interface UploadRecord {
  id: string;
  app_id: string;
  file_name: string;
  file_size: number;
  version: string;
  build_number: string;
  platform: string;
  uploaded_at: string;
}

interface BuildUploadRecord {
  id: string;
  app_id: string;
  version: string;
  build_number: string;
  platform: string;
  created_at: string;
}

interface BuildUploadFileRecord {
  id: string;
  build_upload_id: string;
  file_name: string;
  file_size: number;
  uploaded: boolean;
  upload_operations: Array<{ method: string; url: string; length: number; offset: number }>;
}

function getUploads(store: Store): UploadRecord[] {
  return store.getData<UploadRecord[]>("asc.uploads") ?? [];
}

function setUploads(store: Store, uploads: UploadRecord[]): void {
  store.setData("asc.uploads", uploads);
}

function getBuildUploads(store: Store): BuildUploadRecord[] {
  return store.getData<BuildUploadRecord[]>("asc.build_uploads") ?? [];
}

function setBuildUploads(store: Store, uploads: BuildUploadRecord[]): void {
  store.setData("asc.build_uploads", uploads);
}

function getBuildUploadFiles(store: Store): BuildUploadFileRecord[] {
  return store.getData<BuildUploadFileRecord[]>("asc.build_upload_files") ?? [];
}

function setBuildUploadFiles(store: Store, files: BuildUploadFileRecord[]): void {
  store.setData("asc.build_upload_files", files);
}

export function uploadRoutes({ app, store, baseUrl }: RouteContext): void {
  const asc = getASCStore(store);

  app.post("/v1/buildUploads", async (c) => {
    const body = await c.req.json().catch(() => ({})) as any;
    const attrs = body?.data?.attributes ?? {};
    const appId = body?.data?.relationships?.app?.data?.id ?? "";
    const upload: BuildUploadRecord = {
      id: ascId(),
      app_id: appId,
      version: attrs.cfBundleShortVersionString ?? attrs.version ?? "1.0.0",
      build_number: attrs.cfBundleVersion ?? attrs.buildNumber ?? "1",
      platform: attrs.platform ?? "IOS",
      created_at: new Date().toISOString(),
    };
    setBuildUploads(store, [...getBuildUploads(store), upload]);
    return c.json(jsonApiResource(baseUrl, "buildUploads", upload.id, {
      cfBundleShortVersionString: upload.version,
      cfBundleVersion: upload.build_number,
      platform: upload.platform,
      uploadedDate: upload.created_at,
    }), 201);
  });

  app.post("/v1/buildUploadFiles", async (c) => {
    const body = await c.req.json().catch(() => ({})) as any;
    const attrs = body?.data?.attributes ?? {};
    const buildUploadId = body?.data?.relationships?.buildUpload?.data?.id ?? "";
    const fileSize = Number(attrs.fileSize ?? 0);
    const id = ascId();
    const file: BuildUploadFileRecord = {
      id,
      build_upload_id: buildUploadId,
      file_name: attrs.fileName ?? "App.ipa",
      file_size: fileSize,
      uploaded: false,
      upload_operations: [{
        method: "PUT",
        url: `${baseUrl}/asc/uploads/${id}/0`,
        length: fileSize,
        offset: 0,
      }],
    };
    setBuildUploadFiles(store, [...getBuildUploadFiles(store), file]);
    return c.json(jsonApiResource(baseUrl, "buildUploadFiles", file.id, {
      fileName: file.file_name,
      fileSize: file.file_size,
      uploaded: file.uploaded,
      uploadOperations: file.upload_operations,
    }), 201);
  });

  app.put("/asc/uploads/:fileId/:operationIndex", async (c) => {
    const fileId = c.req.param("fileId");
    const operationIndex = c.req.param("operationIndex");
    const bytes = await c.req.arrayBuffer().catch(() => new ArrayBuffer(0));
    const chunks = store.getData<Record<string, number>>("asc.upload_chunks") ?? {};
    chunks[`${fileId}:${operationIndex}`] = bytes.byteLength;
    store.setData("asc.upload_chunks", chunks);
    return c.json({ fileId, operationIndex, receivedBytes: bytes.byteLength });
  });

  app.patch("/v1/buildUploadFiles/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({})) as any;
    const files = getBuildUploadFiles(store);
    const index = files.findIndex((file) => file.id === id);
    if (index < 0) return c.json(jsonApiError(404, "NOT_FOUND", "Not Found", `Build upload file ${id} not found`), 404);
    const attrs = body?.data?.attributes ?? {};
    files[index] = { ...files[index], uploaded: attrs.uploaded ?? files[index].uploaded };
    setBuildUploadFiles(store, files);

    if (files[index].uploaded) {
      const upload = getBuildUploads(store).find((item) => item.id === files[index].build_upload_id);
      if (upload && !asc.builds.findOneBy("asc_id", `build-${upload.id}`)) {
        asc.builds.insert({
          asc_id: `build-${upload.id}`,
          app_id: upload.app_id,
          version: upload.build_number,
          processing_state: "PROCESSING",
          is_expired: false,
        });
      }
    }

    return c.json(jsonApiResource(baseUrl, "buildUploadFiles", files[index].id, {
      fileName: files[index].file_name,
      fileSize: files[index].file_size,
      uploaded: files[index].uploaded,
      uploadOperations: files[index].upload_operations,
    }));
  });

  app.post("/asc/control/advance-builds", async (c) => {
    const body = await c.req.json().catch(() => ({})) as any;
    const processingState = body?.processingState ?? "VALID";
    const builds = asc.builds.all().map((build) => asc.builds.update(build.id, { processing_state: processingState }) ?? build);
    return c.json({
      builds: builds.map((build) => ({
        type: "builds",
        id: build.asc_id,
        attributes: {
          version: build.version,
          buildNumber: build.version,
          processingState: build.processing_state,
          expired: build.is_expired,
        },
      })),
    });
  });

  // IPA upload — simplified endpoint that records the upload
  app.post("/v1/builds/upload", async (c) => {
    const body = await c.req.json();
    const appId = body?.appId ?? "";
    const fileName = body?.fileName ?? "App.ipa";
    const fileSize = body?.fileSize ?? 0;
    const version = body?.version ?? "1.0.0";
    const buildNumber = body?.buildNumber ?? "1";
    const platform = body?.platform ?? "IOS";

    const upload: UploadRecord = {
      id: ascId(),
      app_id: appId,
      file_name: fileName,
      file_size: fileSize,
      version,
      build_number: buildNumber,
      platform,
      uploaded_at: new Date().toISOString(),
    };

    const uploads = getUploads(store);
    uploads.push(upload);
    setUploads(store, uploads);

    return c.json({
      uploadID: upload.id,
      fileID: `file-${upload.id}`,
      fileName: upload.file_name,
      fileSize: upload.file_size,
      version: upload.version,
      buildNumber: upload.build_number,
      platform: upload.platform,
    }, 201);
  });

  // List recorded uploads (diagnostic)
  app.get("/v1/builds/uploads", (c) => {
    const uploads = getUploads(store);
    return c.json({ data: uploads });
  });
}
