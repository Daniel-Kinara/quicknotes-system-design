// ---------- Settings ----------
const API_URL = "https://jsonplaceholder.typicode.com/posts";

// ---------- Elements ----------
const loadBtn = document.querySelector("#load-btn");
const statusMessage = document.querySelector("#status");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");
const notesList = document.querySelector("#notes-list");

// ---------- State ----------
let notes = [];
let nextKey = 1; // our own list key, because JSONPlaceholder gives every new note id 101

// ---------- Helpers ----------
function setStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = type ? "status-" + type : "";
}

function setBusy(isBusy) {
  loadBtn.disabled = isBusy;
  submitBtn.disabled = isBusy;
  document.querySelectorAll(".delete-btn").forEach(function (button) {
    button.disabled = isBusy;
  });
}

function friendlyError(error) {
  if (error instanceof TypeError) {
    return "Could not reach the server. Check your internet connection and try again.";
  }
  return "Something went wrong: " + error.message;
}

// ---------- One reusable request function ----------
async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = new Error(
      "The server answered with status " + response.status,
    );
    error.status = response.status;
    throw error;
  }

  const text = await response.text();
  return {
    status: response.status,
    data: text ? JSON.parse(text) : null,
  };
}

// ---------- Render ----------
function render() {
  notesList.replaceChildren();

  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-message";
    empty.textContent = 'No notes to show. Click "Load notes" or create one.';
    notesList.appendChild(empty);
    return;
  }

  notes.forEach(function (note) {
    const li = document.createElement("li");
    li.className = "note-card";

    const title = document.createElement("h3");
    title.textContent = note.title;

    const body = document.createElement("p");
    body.textContent = note.body;

    li.append(title, body);
    notesList.appendChild(li);
  });
}

// ---------- GET: load notes ----------
async function loadNotes() {
  setBusy(true);
  setStatus("Loading notes...", "loading");

  try {
    const result = await request(API_URL + "?_limit=10");

    notes = result.data.map(function (post) {
      return {
        key: nextKey++,
        id: post.id,
        title: post.title,
        body: post.body,
        local: false,
      };
    });
    render();

    if (notes.length === 0) {
      setStatus("The server has no notes yet.", "success");
    } else {
      const word = notes.length === 1 ? "note" : "notes";
      setStatus(`Loaded ${notes.length} ${word} from the server.`, "success");
    }
  } catch (error) {
    setStatus(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

loadBtn.addEventListener("click", loadNotes);

// ---------- Start ----------
render();
