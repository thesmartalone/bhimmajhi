import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";
import { cloudinaryConfig } from "./cloudinary-config.js";


// ========================================
// FIREBASE
// ========================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// ========================================
// ELEMENTS
// ========================================

const loginBox =
  document.getElementById("loginBox");

const uploadBox =
  document.getElementById("uploadBox");

const loginMsg =
  document.getElementById("loginMsg");

const status =
  document.getElementById("status");

const progressBar =
  document.getElementById("progressBar");

const progressPercent =
  document.getElementById("progressPercent");

const userEmail =
  document.getElementById("userEmail");

const uploadBtn =
  document.getElementById("uploadBtn");

const postsBox =
  document.getElementById("postsBox");

const postsList =
  document.getElementById("postsList");


// ========================================
// LOGIN
// ========================================

document
  .getElementById("loginBtn")
  .addEventListener("click", async () => {

    const email =
      document
        .getElementById("email")
        .value
        .trim();

    const password =
      document
        .getElementById("password")
        .value;


    if (!email || !password) {

      loginMsg.textContent =
        "Email aur password bharo.";

      return;
    }


    loginMsg.textContent =
      "Login ho raha hai...";


    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      loginMsg.textContent = "";

    } catch (error) {

      console.error(error);

      loginMsg.textContent =
        "Login failed: " +
        error.message;
    }

  });


// ========================================
// LOGOUT
// ========================================

document
  .getElementById("logoutBtn")
  .addEventListener("click", async () => {

    await signOut(auth);

  });


// ========================================
// AUTH STATE
// ========================================

onAuthStateChanged(auth, user => {

  if (user) {

    loginBox.hidden = true;

    uploadBox.hidden = false;

    postsBox.hidden = false;

    userEmail.textContent =
      user.email || user.uid;

    startPostsListener();

  } else {

    loginBox.hidden = false;

    uploadBox.hidden = true;

    postsBox.hidden = true;

    stopPostsListener();

  }

});


// ========================================
// POSTS LIST
// ========================================

let unsubscribePosts = null;


function escapeHTML(value = "") {

  return String(value).replace(
    /[&<>"']/g,
    ch => (
      {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[ch]
    )
  );

}


function renderPosts(snapshot) {

  postsList.replaceChildren();


  if (snapshot.empty) {

    const empty =
      document.createElement("p");

    empty.className = "posts-empty";

    empty.textContent =
      "Abhi tak koi post nahi hai.";

    postsList.appendChild(empty);

    return;
  }


  snapshot.forEach(docSnap => {

    const post = docSnap.data();

    const postId = docSnap.id;


    const item =
      document.createElement("div");

    item.className = "post-item";


    const title =
      escapeHTML(post.title || "New Frame");

    const tag =
      escapeHTML(post.tag || "#smartalone");

    const thumbSrc =
      post.mediaType === "video"
        ? ""
        : (post.mediaUrl || "");


    item.innerHTML = `
      ${
        thumbSrc
          ? `<img class="post-thumb" src="${thumbSrc}" alt="${title}">`
          : `<div class="post-thumb"></div>`
      }
      <div class="post-info">
        <div class="post-name">${title}</div>
        <div class="post-tag">${tag}</div>
      </div>
      <button class="post-delete" type="button">
        🗑 Delete
      </button>
    `;


    const deleteBtn =
      item.querySelector(".post-delete");

    deleteBtn.addEventListener(
      "click",
      () => deletePost(postId, deleteBtn)
    );


    postsList.appendChild(item);

  });

}


function startPostsListener() {

  if (unsubscribePosts) {
    return;
  }


  const postsQuery = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc")
  );


  unsubscribePosts = onSnapshot(
    postsQuery,
    renderPosts,
    error => {

      console.error(
        "Posts listener error:",
        error
      );

      postsList.replaceChildren();

      const errMsg =
        document.createElement("p");

      errMsg.className = "posts-empty";

      errMsg.textContent =
        "❌ Posts load nahi hue.";

      postsList.appendChild(errMsg);

    }
  );

}


function stopPostsListener() {

  if (unsubscribePosts) {

    unsubscribePosts();

    unsubscribePosts = null;

  }

  postsList.replaceChildren();

}


async function deletePost(postId, buttonEl) {

  const confirmed =
    window.confirm(
      "Ye post delete karna hai? Ye action undo nahi ho sakta."
    );


  if (!confirmed) {
    return;
  }


  buttonEl.disabled = true;

  buttonEl.textContent =
    "Deleting...";


  try {

    await deleteDoc(
      doc(db, "posts", postId)
    );

  } catch (error) {

    console.error(
      "Delete error:",
      error
    );

    alert(
      "❌ Delete nahi hua: " +
      error.message
    );

    buttonEl.disabled = false;

    buttonEl.textContent =
      "🗑 Delete";

  }

}


// ========================================
// PROGRESS RESET
// ========================================

function resetProgress() {

  progressBar.style.width =
    "0%";

  progressPercent.textContent =
    "0%";

}


// ========================================
// PROGRESS
// ========================================

function setProgress(percent) {

  const value =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(percent)
      )
    );


  progressBar.style.width =
    `${value}%`;


  progressPercent.textContent =
    `${value}%`;

}


// ========================================
// CLOUDINARY WIDGET
// ========================================

let uploadWidget = null;


function createUploadWidget() {

  if (!window.cloudinary) {

    status.textContent =
      "❌ Cloudinary Widget load nahi hua.";

    return null;
  }


  const widget =
    window.cloudinary.createUploadWidget(

      {

        cloudName:
          cloudinaryConfig.cloudName,

        uploadPreset:
          cloudinaryConfig.uploadPreset,


        sources: [
          "local"
        ],


        multiple: false,


        resourceType:
          "auto",


        clientAllowedFormats: [
          "jpg",
          "jpeg",
          "png",
          "webp",
          "gif",
          "mp4",
          "webm",
          "mov",
          "avi",
          "mkv"
        ],


        maxFileSize:
          100 * 1024 * 1024,


        showAdvancedOptions:
          false,


        cropping:
          false,


        showSkipCropButton:
          false,


        folder:
          "smartalone/posts",


        styles: {

          palette: {

            window:
              "#ffffff",

            windowBorder:
              "#dddddd",

            tabIcon:
              "#111111",

            menuIcons:
              "#555555",

            textDark:
              "#111111",

            textLight:
              "#ffffff",

            link:
              "#111111",

            action:
              "#111111",

            inactiveTabIcon:
              "#999999",

            error:
              "#d32f2f",

            inProgress:
              "#555555",

            complete:
              "#222222",

            sourceBg:
              "#f5f5f5"

          }

        }

      },


      (error, result) => {


        // ==================================
        // ERROR
        // ==================================

        if (error) {

          console.error(
            "Cloudinary error:",
            error
          );


          status.textContent =
            "❌ Upload error: " +
            (
              error.message ||
              "Unknown error"
            );


          setProgress(0);

          uploadBtn.disabled = false;

          return;
        }


        if (!result) {
          return;
        }


        // ==================================
        // UPLOAD START
        // ==================================

        if (
          result.event ===
          "queues-start"
        ) {

          resetProgress();

          setProgress(1);

          status.textContent =
            "Upload start ho gaya...";

          return;
        }


        // ==================================
        // PROGRESS
        // ==================================

        if (
          result.event ===
          "queues-end"
        ) {

          setProgress(100);

          status.textContent =
            "Upload complete!";

          return;
        }


        // ==================================
        // SUCCESS
        // ==================================

        if (
          result.event ===
          "success"
        ) {

          const info =
            result.info;


          console.log(
            "Cloudinary uploaded:",
            info
          );


          savePostToFirestore(
            info
          );

        }

      }

    );


  return widget;
}


// ========================================
// SAVE POST
// ========================================

async function savePostToFirestore(info) {

  try {

    const user =
      auth.currentUser;


    if (!user) {

      throw new Error(
        "User login nahi hai."
      );

    }


    const title =
      document
        .getElementById("title")
        .value
        .trim() ||
      "New Frame";


    const tag =
      document
        .getElementById("tag")
        .value
        .trim() ||
      "#smartalone";

    // Photo-wise SEO fields. If left empty, safe values are generated from the title.
    const seoTitle =
      document.getElementById("seoTitle").value.trim() ||
      title;

    const seoAlt =
      document.getElementById("seoAlt").value.trim() ||
      `${title} - Bhim Majhi`;

    const seoKeywords =
      document.getElementById("seoKeywords").value.trim() ||
      [title, tag.replace(/^#/, ""), "Bhim Majhi", "photo"].filter(Boolean).join(", ");

    const seoDescription =
      document.getElementById("seoDescription").value.trim() ||
      `${title} - Bhim Majhi photo`;


    const resourceType =
      info.resource_type || "image";


    const mediaType =
      resourceType === "video"
        ? "video"
        : "image";


    const mediaUrl =
      info.secure_url;


    if (!mediaUrl) {

      throw new Error(
        "Cloudinary URL nahi mila."
      );

    }


    status.textContent =
      "Post database me save ho raha hai...";


    // ==================================
    // FIRESTORE
    // ==================================

    await addDoc(
      collection(db, "posts"),
      {

        title:

          title,

        tag:

          tag,

        // Photo-wise SEO metadata
        seoTitle:

          seoTitle,

        seoAlt:

          seoAlt,

        seoKeywords:

          seoKeywords,

        seoDescription:

          seoDescription,

        mediaUrl:

          mediaUrl,

        mediaType:

          mediaType,

        cloudinaryPublicId:

          info.public_id || "",

        cloudinaryResourceType:

          resourceType,

        format:

          info.format || "",

        createdAt:

          serverTimestamp(),

        createdBy:

          user.uid

      }
    );


    // ==================================
    // DONE
    // ==================================

    setProgress(100);


    status.textContent =
      "✅ Post live ho gaya!";


    document
      .getElementById("title")
      .value = "";


    document
      .getElementById("tag")
      .value = "";

    document.getElementById("seoTitle").value = "";
    document.getElementById("seoAlt").value = "";
    document.getElementById("seoKeywords").value = "";
    document.getElementById("seoDescription").value = "";


    uploadBtn.disabled =
      false;


  } catch (error) {

    console.error(
      "Firestore error:",
      error
    );


    status.textContent =
      "❌ Post save nahi hua: " +
      error.message;


    uploadBtn.disabled =
      false;

  }

}


// ========================================
// UPLOAD BUTTON
// ========================================

uploadBtn.addEventListener(
  "click",
  () => {

    const user =
      auth.currentUser;


    if (!user) {

      status.textContent =
        "❌ Pehle login karo.";

      return;
    }


    resetProgress();


    status.textContent =
      "Cloudinary upload window khul raha hai...";


    uploadBtn.disabled =
      true;


    if (!uploadWidget) {

      uploadWidget =
        createUploadWidget();

    }


    if (!uploadWidget) {

      uploadBtn.disabled =
        false;

      return;
    }


    uploadWidget.open();

  }
);

        
