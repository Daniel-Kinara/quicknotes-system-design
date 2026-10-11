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

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", function () {
      deleteNote(note);
    });

    li.append(title, body, deleteBtn);
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

// ---------- POST: create a note ----------
async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  // Validation: a title is required (max 100 characters), the body is optional
  if (title === "") {
    setStatus("Please enter a title.", "error");
    return;
  }
  if (title.length > 100) {
    setStatus("The title must be 100 characters or fewer.", "error");
    return;
  }

  setBusy(true);
  setStatus("Creating note...", "loading");

  try {
    const result = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ title: title, body: body, userId: 1 }),
    });

    notes.unshift({
      key: nextKey++,
      id: result.data.id,
      title: result.data.title,
      body: result.data.body,
      local: true,
    });
    render();
    noteForm.reset();
    setStatus(
      `Note created (status ${result.status}, id ${result.data.id}).`,
      "success",
    );
  } catch (error) {
    setStatus(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

noteForm.addEventListener("submit", createNote);

// ---------- DELETE: remove a note ----------
// JSONPlaceholder is a practice API: it accepts our requests and answers as if
// they worked, but it never actually saves or removes anything. A note we create
// always comes back with id 101, and that note does not really exist on the server.
// So: we send DELETE /posts/{id} for every note, and when the server succeeds we
// remove the note from our own list (our list is the source of truth in this demo).
// If the server answers 404 for a note we created ourselves, that is expected,
// because the server never stored it, so we still remove it from the list.
async function deleteNote(note) {
  setBusy(true);
  setStatus("Deleting note...", "loading");

  try {
    try {
      await request(API_URL + "/" + note.id, { method: "DELETE" });
    } catch (error) {
      if (!(note.local && error.status === 404)) {
        throw error;
      }
    }

    notes = notes.filter(function (item) {
      return item.key !== note.key;
    });
    render();
    setStatus(`Note ${note.id} deleted.`, "success");
  } catch (error) {
    setStatus(friendlyError(error), "error");
  } finally {
    setBusy(false);
  }
}

// ---------- Start ----------
render();
