// Configuration
const API_URL = "https://netflix-rating-predictor.onrender.com/predict";
const GENRES = [
  "Drama",
  "Comedy",
  "Action",
  "Thriller",
  "Romance",
  "Documentary",
  "Horror",
  "Sci-Fi",
  "Animation",
  "Crime",
  "Fantasy",
  "Biography",
  "Mystery",
  "Adventure",
  "Family",
  "History",
  "Sport",
  "Music",
  "War",
  "Western",
];

// Initialization: Populate Genre Checkboxes
const genreGrid = document.getElementById("genre-grid");
GENRES.forEach((g) => {
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.name = "genre";
  checkbox.value = g;

  // Enforce max 4 genres logic natively
  checkbox.addEventListener("change", function () {
    const checkedBoxes = document.querySelectorAll(
      'input[name="genre"]:checked',
    );
    if (checkedBoxes.length > 4) {
      this.checked = false;
      alert("Maximum of 4 genres allowed for model input.");
    }
  });

  label.appendChild(checkbox);
  label.appendChild(document.createTextNode(g));
  genreGrid.appendChild(label);
});

// Update label based on Format (Movie vs TV Show)
function updateFormatLabel() {
  const isMovie =
    document.querySelector('input[name="formatType"]:checked').value ===
    "Movie";
  document.getElementById("duration-label").textContent = isMovie
    ? "Runtime (mins)"
    : "Total Seasons";
}

// Step Navigation and Validation
function validateAndGoStep(step) {
  if (step === 2) {
    const title = document.getElementById("title").value.trim();
    const year = document.getElementById("releaseYear").value;
    const genres = document.querySelectorAll('input[name="genre"]:checked');

    if (!title) return alert("Validation Error: Title is required.");
    if (!year) return alert("Validation Error: Release Year is required.");
    if (genres.length === 0)
      return alert("Validation Error: At least one genre must be selected.");
  }
  goStep(step);
}

function goStep(step) {
  document
    .querySelectorAll(".step-section")
    .forEach((el) => el.classList.remove("active"));
  document.getElementById(`step-${step}`).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Determine color class based on score
function getScoreClass(score) {
  const num = parseFloat(score);
  if (num >= 7.5) return "good";
  if (num >= 5.5) return "avg";
  return "poor";
}

// Main Prediction Logic
async function predict() {
  const btn = document.getElementById("predict-btn");
  const warningBox = document.getElementById("status-warning");
  const errorBox = document.getElementById("status-error");

  errorBox.style.display = "none";
  warningBox.style.display = "none";

  btn.disabled = true;
  btn.textContent = "Processing...";

  // Render free tier cold-start warning
  const wakeTimer = setTimeout(() => {
    warningBox.style.display = "block";
  }, 3000);

  // Collect values
  const selectedGenres = Array.from(
    document.querySelectorAll('input[name="genre"]:checked'),
  ).map((cb) => cb.value);
  const payload = {
    title: document.getElementById("title").value.trim(),
    type: document.querySelector('input[name="formatType"]:checked').value,
    releaseYear: parseInt(document.getElementById("releaseYear").value),
    genres: selectedGenres,
    language: document.getElementById("language").value,
    country: document.getElementById("country").value,
    cast: document.getElementById("cast").value.trim() || null,
    director: document.getElementById("director").value.trim() || null,
    description: document.getElementById("description").value.trim() || null,
    popularity: parseFloat(document.getElementById("popularity").value) || 0,
    voteCount: parseInt(document.getElementById("voteCount").value) || 0,
    actual_rating:
      parseFloat(document.getElementById("actualRating").value) || null,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const data = await response.json();
    clearTimeout(wakeTimer);
    warningBox.style.display = "none";
    renderResults(payload, data);
  } catch (err) {
    clearTimeout(wakeTimer);
    warningBox.style.display = "none";
    errorBox.textContent =
      "API Connection Failed. Please ensure the backend server is running.";
    errorBox.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Execute Prediction";
  }
}

// Render Results Output
function renderResults(payload, data) {
  const predicted = parseFloat(data.predictedRating).toFixed(1);
  const actual = payload.actual_rating;

  document.getElementById("res-title").textContent = payload.title;
  document.getElementById("res-meta").textContent =
    `${payload.type} | Released: ${payload.releaseYear} | Genres: ${payload.genres.join(", ")}`;

  const row = document.getElementById("ratings-row");

  let predClass = getScoreClass(predicted);
  let conf = data.confidence || "High";

  if (actual) {
    const actualStr = parseFloat(actual).toFixed(1);
    const actualClass = getScoreClass(actualStr);

    const diffValue = parseFloat(predicted) - parseFloat(actual);
    const absDiff = Math.abs(diffValue);
    const diffText =
      diffValue > 0 ? `+${diffValue.toFixed(1)}` : diffValue.toFixed(1);

    // Apply new constraints based on the absolute difference
    if (absDiff <= 0.3) {
      predClass = "good";
      conf = "High";
    } else if (absDiff <= 0.6) {
      predClass = "avg";
      conf = "Somewhat Confident";
    } else {
      predClass = "poor";
      conf = "Low";
    }

    row.innerHTML = `
          <div class="score-box">
            <h3>Model Prediction</h3>
            <div class="score-value ${predClass}">${predicted}</div>
          </div>
          <div class="vs-text">Δ ${diffText}</div>
          <div class="score-box">
            <h3>Actual Rating</h3>
            <div class="score-value ${actualClass}">${actualStr}</div>
          </div>
        `;
  } else {
    row.innerHTML = `
          <div class="score-box">
            <h3>Model Prediction</h3>
            <div class="score-value ${predClass}">${predicted}</div>
          </div>
        `;
  }

  document.getElementById("insight-box").innerHTML =
    `<strong>Analysis Output:</strong> The model yielded a prediction of ${predicted}/10.0 with a <strong>${conf}</strong> confidence interval, heavily weighted by the provided genre mix, format type, and available metadata.`;

  goStep(3);
}

// Reset Form
function resetForm() {
  // Clear all text/number inputs
  const inputs = document.querySelectorAll(
    'input[type="text"], input[type="number"], textarea',
  );
  inputs.forEach((input) => (input.value = ""));

  // Reset radio and checkboxes
  document
    .querySelectorAll('input[name="genre"]')
    .forEach((cb) => (cb.checked = false));
  document.querySelector('input[value="Movie"]').checked = true;

  // Reset selects to first option
  document.querySelectorAll("select").forEach((sel) => (sel.selectedIndex = 0));

  updateFormatLabel();
  goStep(1);
}
