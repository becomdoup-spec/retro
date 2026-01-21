/* ============================================
   RETRO CAM ARCHIVE — script.js
   - Supabase init (JS v2 CDN)
   - Camera access + preview
   - Explicit capture -> upload to bucket "photos"
   - Runner animation trigger after upload
   - Unlock archive code 8899 -> load all images
   - Debug logs + graceful error handling
   ============================================ */

/** ============================
 *  1) SUPABASE CONFIG
 *  ============================ */
// IMPORTANT: Put your real values here.
const SUPABASE_URL = "https://edafkomypijighnizyee.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pR7et-ooMnmBQus4X5vHRg_-1O4_OSi";

// Bucket and optional folder prefix inside bucket.
const BUCKET_NAME = "photos";
const BUCKET_PREFIX = "snapshots"; // "" or e.g. "snapshots"

/** ============================
 *  2) DOM ELEMENTS
 *  ============================ */
const statusText = document.getElementById("statusText");
const galleryStatus = document.getElementById("galleryStatus");

const enableBtn = document.getElementById("enableBtn");
const captureBtn = document.getElementById("captureBtn");
const stopBtn = document.getElementById("stopBtn");

const videoEl = document.getElementById("video");
const canvasEl = document.getElementById("canvas");
const codeInput = document.getElementById("codeInput");
const unlockBtn = document.getElementById("unlockBtn");
const galleryEl = document.getElementById("gallery");

const runnerEl = document.querySelector(".runner");

/** ============================
 *  3) STATE
 *  ============================ */
let supabase = null;
let mediaStream = null;

/** ============================
 *  4) UTILITIES
 *  ============================ */
function log(...args) {
  console.log("[RETRO-ARCHIVE]", ...args);
}

function setStatus(text) {
  statusText.textContent = `STATUS: ${text}`;
}

function setGalleryStatus(text) {
  galleryStatus.textContent = text;
}

function safeError(context, err) {
  console.error(`[RETRO-ARCHIVE] ${context}`, err);
  setStatus("ERROR");
}

/** Make a safe file path in bucket */
function makeObjectPath(filename) {
  const prefix = (BUCKET_PREFIX || "").trim().replace(/^\/+|\/+$/g, "");
  return prefix ? `${prefix}/${filename}` : filename;
}

/** Convert a Blob to ArrayBuffer */
async function blobToArrayBuffer(blob) {
  return await blob.arrayBuffer();
}

/** Trigger a brief runner "jump" */
function triggerRunnerJump() {
  if (!runnerEl) return;
  runnerEl.classList.remove("jump");
  // force reflow so re-adding restarts animation
  void runnerEl.offsetWidth;
  runnerEl.classList.add("jump");
  setTimeout(() => runnerEl.classList.remove("jump"), 1200);
}

/** ============================
 *  5) SUPABASE INIT
 *  ============================ */
function initSupabase() {
  try {
    if (!window.supabase) {
      throw new Error("Supabase CDN script not loaded. Check index.html include.");
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    log("Supabase initialized.");
  } catch (err) {
    safeError("Supabase init failed:", err);
  }
}

/** ============================
 *  6) CAMERA ACCESS
 *  ============================ */
async function enableCamera() {
  setStatus("REQUESTING CAMERA...");
  log("Requesting camera permission...");

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("getUserMedia not supported in this browser.");
    }

    // Request camera. NOTE: On many browsers, permission requires user gesture.
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    videoEl.srcObject = mediaStream;
    setStatus("CAMERA READY");
    log("Camera permission granted, stream active.");

    captureBtn.disabled = false;
    stopBtn.disabled = false;

  } catch (err) {
    safeError("Camera permission denied or failed:", err);
    log("Camera permission step failed.");
  }
}

function stopCamera() {
  try {
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      mediaStream = null;
      videoEl.srcObject = null;
      log("Camera stopped.");
    }
    captureBtn.disabled = true;
    stopBtn.disabled = true;
    setStatus("IDLE");
  } catch (err) {
    safeError("Stop camera failed:", err);
  }
}

/** ============================
 *  7) CAPTURE FRAME -> UPLOAD
 *  ============================ */
async function captureAndUpload() {
  setStatus("CAPTURING...");
  log("Capturing snapshot...");

  try {
    if (!supabase) throw new Error("Supabase not initialized.");
    if (!mediaStream || !videoEl.videoWidth) {
      throw new Error("Camera not ready or video metadata not loaded yet.");
    }

    // Draw the current video frame to canvas
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;

    canvasEl.width = w;
    canvasEl.height = h;

    const ctx = canvasEl.getContext("2d");
    ctx.drawImage(videoEl, 0, 0, w, h);

    // Convert canvas to Blob (JPEG)
    const blob = await new Promise((resolve, reject) => {
      canvasEl.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob returned null."))),
        "image/jpeg",
        0.92
      );
    });

    log("Snapshot captured:", { bytes: blob.size, type: blob.type, w, h });

    setStatus("UPLOADING...");

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `snapshot_${timestamp}.jpg`;
    const objectPath = makeObjectPath(filename);

    // Upload requires ArrayBuffer or Blob; supabase-js supports Blob in browsers.
    const { data, error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(objectPath, blob, {
        contentType: "image/jpeg",
        upsert: false
      });

    if (error) {
      log("Upload failed:", error);
      setStatus("UPLOAD FAILED");
      return;
    }

    log("Upload success:", data);
    setStatus("UPLOADED");

    // Runner jump “reward” animation
    triggerRunnerJump();

  } catch (err) {
    safeError("Capture/upload failed:", err);
    log("Capture/upload step failed.");
  }
}

/** ============================
 *  8) LOAD ARCHIVE (CODE: 8899)
 *  ============================ */
async function unlockArchive() {
  const code = (codeInput.value || "").trim();
  if (code !== "8899") {
    setGalleryStatus("DENIED");
    log("Unlock denied: wrong code.");
    return;
  }

  setGalleryStatus("UNLOCKED");
  setStatus("LOADING ARCHIVE...");
  log("Unlock accepted. Loading bucket listing...");

  try {
    if (!supabase) throw new Error("Supabase not initialized.");

    // List files in bucket (optionally within a folder prefix)
    const folder = (BUCKET_PREFIX || "").trim().replace(/^\/+|\/+$/g, "");

    const { data: list, error: listErr } = await supabase
      .storage
      .from(BUCKET_NAME)
      .list(folder, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" }
      });

    if (listErr) {
      log("List failed:", listErr);
      setStatus("LIST FAILED");
      return;
    }

    log("List success:", list);
    renderGalleryList(list, folder);

    setStatus("ARCHIVE LOADED");
  } catch (err) {
    safeError("Unlock/archive load failed:", err);
  }
}

/** Render thumbnails safely. Uses signed URLs by default. */
async function renderGalleryList(list, folder) {
  galleryEl.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    galleryEl.innerHTML = `<div class="muted">No images found.</div>`;
    return;
  }

  // Filter out folders (Supabase list entries can include "id" / "name"; folders often have null metadata)
  const files = list.filter((x) => x?.name && !x.name.endsWith("/"));

  for (const file of files) {
    const name = file.name;
    const objectPath = folder ? `${folder}/${name}` : name;

    // Create UI shell first
    const card = document.createElement("div");
    card.className = "thumb";

    const img = document.createElement("img");
    img.alt = name;
    img.loading = "lazy";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = name;

    card.appendChild(img);
    card.appendChild(meta);
    galleryEl.appendChild(card);

    // Prefer signed URLs (works even if bucket is private).
    try {
      const { data, error } = await supabase
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(objectPath, 60 * 10); // 10 minutes

      if (error) {
        log("Signed URL failed for", objectPath, error);
        // Fallback: public URL (requires bucket public policy)
        const { data: pub } = supabase.storage.from(BUCKET_NAME).getPublicUrl(objectPath);
        img.src = pub?.publicUrl || "";
      } else {
        img.src = data.signedUrl;
      }
    } catch (err) {
      log("Thumbnail URL generation error for", objectPath, err);
    }
  }
}

/** ============================
 *  9) EVENT WIRING
 *  ============================ */
function wireEvents() {
  enableBtn.addEventListener("click", enableCamera);
  captureBtn.addEventListener("click", captureAndUpload);
  stopBtn.addEventListener("click", stopCamera);

  unlockBtn.addEventListener("click", unlockArchive);

  codeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") unlockArchive();
  });

  // Nice-to-have: if user navigates away, stop camera.
  window.addEventListener("beforeunload", () => {
    try { stopCamera(); } catch (_) {}
  });
}

/** ============================
 *  10) BOOT
 *  ============================ */
(function boot() {
  setStatus("BOOTING...");
  setGalleryStatus("LOCKED");

  initSupabase();
  wireEvents();

  setStatus("IDLE");
  log("Boot complete.");

  // NOTE: Many browsers block camera permission prompts unless triggered by a user gesture.
  // So we do NOT auto-call enableCamera() here.
})();
