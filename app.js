import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
getStorage(app);
getAuth(app);

const gallery = document.getElementById("firebaseGallery");

// Har user ka ek unique ID — localStorage mein save hoga
function getUserId() {
  let uid = localStorage.getItem("smartalone_uid");
  if (!uid) {
    uid = "user_" + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem("smartalone_uid", uid);
  }
  return uid;
}

// Like toggle — Firestore mein save hoga
window.toggleLike = async function(btn) {
  const postId = btn.dataset.postId;
  if (!postId || btn.disabled) return;

  const userId = getUserId();
  const likeRef = doc(db, "likes", postId + "_" + userId);
  const postRef = doc(db, "likes_count", postId);
  const countEl = btn.querySelector(".like-count");
  const alreadyLiked = btn.dataset.liked === "true";
  const oldCount = Math.max(0, parseInt(countEl?.textContent, 10) || 0);

  btn.disabled = true;
  btn.classList.add("is-loading");

  // UI turant update (optimistic)
  const newLiked = !alreadyLiked;
  btn.dataset.liked = String(newLiked);
  btn.classList.toggle("liked", newLiked);
  if (countEl) countEl.textContent = String(Math.max(0, oldCount + (newLiked ? 1 : -1)));

  try {
    await setDoc(likeRef, { liked: newLiked, userId, postId }, { merge: true });

    // setDoc + merge + increment works even when the count document does not exist.
    await setDoc(postRef, { count: increment(newLiked ? 1 : -1) }, { merge: true });

    if (newLiked) {
      btn.classList.add("like-pop");
      setTimeout(() => btn.classList.remove("like-pop"), 220);
    }
  } catch (error) {
    console.error("Like update failed:", error);

    // Roll back UI if Firebase rejects the write.
    btn.dataset.liked = String(alreadyLiked);
    btn.classList.toggle("liked", alreadyLiked);
    if (countEl) countEl.textContent = String(oldCount);
  } finally {
    btn.disabled = false;
    btn.classList.remove("is-loading");
  }
};

// Kisi bhi post ke liye like button setup karo
async function setupLikeBtn(btn, postId) {
  if (!btn || !postId) return;
  btn.dataset.postId = postId;
  btn.dataset.liked = btn.dataset.liked || "false";

  const userId = getUserId();
  const likeRef = doc(db, "likes", postId + "_" + userId);
  const postRef = doc(db, "likes_count", postId);
  const countEl = btn.querySelector(".like-count");

  try {
    const likeSnap = await getDoc(likeRef);
    const liked = likeSnap.exists() && likeSnap.data().liked === true;
    btn.dataset.liked = String(liked);
    btn.classList.toggle("liked", liked);
  } catch (error) {
    console.warn("Could not read like state:", error);
  }

  onSnapshot(postRef, snap => {
    const count = snap.exists() ? Number(snap.data().count || 0) : 0;
    if (countEl) countEl.textContent = String(Math.max(0, count));
  }, error => {
    console.warn("Could not read like count:", error);
  });
}

// Static cards ke liye (index.html mein hardcoded)
document.querySelectorAll(".card-like[data-post-id]").forEach(btn => {
  setupLikeBtn(btn, btn.dataset.postId);
});
document.querySelectorAll(".hero-like[data-post-id]").forEach(btn => {
  setupLikeBtn(btn, btn.dataset.postId);
});

// ── HTML escape ──
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[ch]));
}

// ── Photo-wise SEO ──
function updatePhotoSEO(postId, post) {
  const seoTitle = String(post.seoTitle || post.title || "Bhim Majhi Photo").trim();
  const seoAlt = String(post.seoAlt || post.title || "Bhim Majhi photo").trim();
  const seoDescription = String(post.seoDescription || `${seoTitle} - Bhim Majhi photo`).trim();
  const keywords = String(post.seoKeywords || "Bhim Majhi, photo").trim();

  let schema = document.getElementById("photoSeoSchema");
  if (!schema) {
    schema = document.createElement("script");
    schema.id = "photoSeoSchema";
    schema.type = "application/ld+json";
    document.head.appendChild(schema);
  }

  let items = [];
  try { items = JSON.parse(schema.textContent || "[]"); } catch (_) {}

  const imageObject = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "@id": `${location.origin}${location.pathname}?photo=${encodeURIComponent(postId)}#image`,
    "name": seoTitle,
    "description": seoDescription,
    "keywords": keywords,
    "caption": seoTitle,
    "contentUrl": post.mediaUrl,
    "url": `${location.origin}${location.pathname}?photo=${encodeURIComponent(postId)}`,
    "author": { "@type": "Person", "name": "Bhim Majhi" },
    "inLanguage": "hi"
  };

  const index = items.findIndex(item => item["@id"] === imageObject["@id"]);
  if (index >= 0) items[index] = imageObject;
  else items.push(imageObject);
  schema.textContent = JSON.stringify(items);
}

// ── Firebase se aane wale cards ──
function createCard(postId, post) {
  const card = document.createElement("div");
  card.className = "gallery-card";

  const title = escapeHTML(post.title || "New Frame");
  const tag   = escapeHTML(post.tag   || "#smartalone");
  const seoTitle = escapeHTML(post.seoTitle || post.title || "Bhim Majhi Photo");
  const seoAlt = escapeHTML(post.seoAlt || post.title || "Bhim Majhi photo");
  const type  = post.mediaType === "video" ? "Video" : "Photo";
  const date  = post.createdAt?.toDate
    ? post.createdAt.toDate().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
    : "2026";

  const media = post.mediaType === "video"
    ? `<video src="${post.mediaUrl}" controls playsinline preload="metadata" title="${seoTitle}"></video>`
    : `<img src="${post.mediaUrl}" alt="${seoAlt}" title="${seoTitle}" loading="lazy">`;

  card.innerHTML = `
    ${media}
    <div class="card-overlay">
      <h3>${title}</h3>
      <div class="card-meta">${type} · ${date}</div>
      <span class="card-tag">${tag}</span>
    </div>
    <button class="like-btn card-like" onclick="toggleLike(this)" aria-label="Like">
      <i class="fas fa-heart"></i>
      <span class="like-count">0</span>
    </button>
  `;

  // Photo-wise SEO schema for search engines. Visual design is untouched.
  updatePhotoSEO(postId, post);

  // Like button setup
  const likeBtn = card.querySelector(".card-like");
  setupLikeBtn(likeBtn, postId);

  return card;
}

// Real-time posts listener
const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(postsQuery, snapshot => {
  gallery.replaceChildren();
  snapshot.forEach(docSnap => {
    gallery.appendChild(createCard(docSnap.id, docSnap.data()));
  });
}, error => {
  console.error("Firebase posts error:", error);
});

