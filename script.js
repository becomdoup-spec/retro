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

// CHECK CODE TO SHOW GALLERY
async function checkCode() {
  const code = document.getElementById("code").value;
  if (code === "8899") {
    loadGallery();
  } else {
    alert("ACCESS DENIED");
  }
}

// LOAD ALL IMAGES FROM SUPABASE
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
