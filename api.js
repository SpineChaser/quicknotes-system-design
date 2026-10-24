const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.getElementById("load-btn");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitButton = document.getElementById("submit-btn");
const statusMessage = document.getElementById("status");
const notesList = document.getElementById("notes-list");

let notes = [];

// Reusable request helper: every API call checks HTTP status before reading JSON.
async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`The server returned status ${response.status}. Please try again.`);
  }

  // DELETE may return an empty response body; callers can opt out of JSON parsing.
  if (options.method === "DELETE") {
    return { data: null, status: response.status };
  }

  const data = await response.json();
  return { data, status: response.status };
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = "status";
  if (type) statusMessage.classList.add(type);
}

function renderNotes() {
  notesList.replaceChildren();

  if (notes.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-state";
    emptyItem.textContent = "No notes to show yet. Load notes or create your first note.";
    notesList.appendChild(emptyItem);
    return;
  }

  notes.forEach((note) => {
    const item = document.createElement("li");
    item.className = "note-card";

    const title = document.createElement("h3");
    title.textContent = note.title || "Untitled note";

    const body = document.createElement("p");
    body.textContent = note.body || "No body provided.";

    const meta = document.createElement("div");
    meta.className = "note-meta";
    meta.textContent = `Note ID: ${note.id}`;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteNote(note.id, deleteButton));

    item.append(title, body, meta, deleteButton);
    notesList.appendChild(item);
  });
}

async function loadNotes() {
  loadButton.disabled = true;
  setStatus("Loading notes...");

  try {
    const result = await request(`${API_URL}?_limit=10`);
    notes = result.data;

    if (notes.length === 0) {
      renderNotes();
      setStatus("The server returned no notes.", "success");
      return;
    }

    renderNotes();
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    setStatus(`Could not load notes. ${error.message}`, "error");
    notesList.replaceChildren();
  } finally {
    loadButton.disabled = false;
  }
}

async function createNote(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title) {
    setStatus("Please enter a title before creating a note.", "error");
    titleInput.focus();
    return;
  }

  if (title.length > 100) {
    setStatus("The title must be 100 characters or fewer.", "error");
    titleInput.focus();
    return;
  }

  submitButton.disabled = true;
  setStatus("Creating note...");

  try {
    const result = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ title, body, userId: 1 })
    });

    const createdNote = result.data;
    // JSONPlaceholder simulates POST and usually returns id 101; it does not persist the note.
    notes = [createdNote, ...notes];
    renderNotes();
    setStatus(`Note created (status ${result.status}, id ${createdNote.id}).`, "success");
    noteForm.reset();
  } catch (error) {
    setStatus(`Could not create the note. ${error.message}`, "error");
  } finally {
    submitButton.disabled = false;
  }
}

async function deleteNote(noteId, button) {
  const previousLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Deleting...";

  try {
    await request(`${API_URL}/${encodeURIComponent(noteId)}`, {
      method: "DELETE"
    });

    // JSONPlaceholder does not permanently delete server data. Remove it from this page's local list.
    notes = notes.filter((note) => String(note.id) !== String(noteId));
    renderNotes();
    setStatus(`Note ${noteId} deleted from this page (JSONPlaceholder simulates deletion).`, "success");
  } catch (error) {
    setStatus(`Could not delete note ${noteId}. ${error.message}`, "error");
    button.disabled = false;
    button.textContent = previousLabel;
  } finally {
    // renderNotes() may replace the button; re-enabling the old element is harmless.
    button.disabled = false;
  }
}

loadButton.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
renderNotes();
