const SUPABASE_URL = "https://edafkomypijighnizyee.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pR7et-ooMnmBQus4X5vHRg_-1O4_OSi";
const BUCKET = "photos";

const supabase = supabaseJs.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const btn = document.getElementById("enable");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const statusEl = document.getElementById("status");

let stream = null;

btn.addEventListener("click", async () => {
  try {
    log("User clicked ENABLE");

    status("REQUESTING CAMERA");

    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    log("Camera permission granted");

    await waitForVideoReady(video);

    log("Video ready, capturing frame");
    status("CAPTURING");

    captureAndUpload();

  } catch (err) {
    console.error("Camera flow failed", err);
    status("ERROR");
  }
});

async function waitForVideoReady(video) {
  if (video.videoWidth > 0) return;
  await new Promise(resolve => {
    video.onloadedmetadata = resolve;
  });
}

async function captureAndUpload() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  canvas.getContext("2d").drawImage(video, 0, 0);

  const blob = await new Promise(r => canvas.toBlob(r, "image/png"));

  log("Snapshot captured", blob.size);

  status("UPLOADING");

  const filename = `snap_${Date.now()}.png`;

  const { error } = await supabase
    .storage
    .from(BUCKET)
    .upload(filename, blob);

  if (error) {
    console.error("Upload failed", error);
    status("UPLOAD FAILED");
    return;
  }

  log("Upload success");
  status("DONE");
}

function status(t) {
  statusEl.textContent = t;
}

function log(...args) {
  console.log("[FLOW]", ...args);
}
