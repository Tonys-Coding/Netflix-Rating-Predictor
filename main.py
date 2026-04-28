from datetime import datetime
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import joblib
import numpy as np
import pandas as pd
from scipy.sparse import hstack, csr_matrix


model = joblib.load("netflix_model.pkl")
tfidf = joblib.load("tfidf_vectorizer.pkl")
feature_names = joblib.load("feature_cols.pkl")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

languages = {
    "English": "en",
    "Spanish": "es",
    "French": "fr",
    "German": "de",
    "Italian": "it",
    "Portuguese": "pt",
    "Japanese": "ja",
    "Korean": "ko",
    "Hindi": "hi",
    "Russian": "ru",
    "Hebrew": "he",
    "Swedish": "sv",
    "Mandarin": "zh",
    "Arabic": "ar",
    "Norwegian": "no",
    "Danish": "da",
    "Polish": "pl",
    # Add more languages as needed
}


class MovieInput(BaseModel):
    title: str
    type: str
    releaseYear: int
    genres: list[str]
    language: str | None = None
    cast: str | None = None
    director: str | None = None
    country: str | None = None
    description: str | None = None
    popularity: float | None = None
    voteCount: int | None = None
    actualRating: float | None = None  # Optional for evaluation purposes




@app.get("/")
def check():
    return {"message": "API is working!"}


@app.post("/predict")   #POST 
def predict(movie: MovieInput):

    #Step 1: Create a row of all zeros for the input features
    row = {col: 0 for col in feature_names}

    #Step 2: Fill the structured fields

    now = datetime.now()
    description = movie.description or ""
    cast = movie.cast or ""
    director = movie.director or ""
    country = movie.country or ""
    genre_str = ", ".join(movie.genres)
    lang_code = languages.get(movie.language or "English", "en")




    row["is_tv"] = 1 if movie.type.lower() == "TV Show" else 0
    row["release_year"] = movie.releaseYear
    row["popularity"] = movie.popularity or 0
    row["vote_count"] = movie.voteCount or 0
    row["added_year"] = now.year
    row["added_month"] = now.month
    row["years_before_netflix"] = now.year - movie.releaseYear
    row["desc_length"] = len(description.split())
    row["cast_size"] = len(cast.split(",")) if cast else 0


    #Step 3: Set genre flags
    for genre in movie.genres:
        col = f"genre_{genre.strip().lower()}"
        if col in row:
            row[col] = 1 if genre in genre_str else 0


    #Step 4: set language flags
    for col in feature_names:
        if col.startswith("lang_"):
            l = col[len("lang_"):]
            row[col] = 1 if l == lang_code else 0


    #Step 5: Actor Flags
    for col in feature_names:
        if col.startswith("cast_"):
            c = col[len("cast_"):]
            row[col] = 1 if c in cast else 0

    #Step 6: Director Flags
    for col in feature_names:
        if col.startswith("director_"):
            d = col[len("director_"):]
            row[col] = 1 if d in director else 0

    #Step 7: Country Flags
    for col in feature_names:
        if col.startswith("country_"):
            c = col[len("country_"):]
            row[col] = 1 if c in country else 0

    #Step 8: Predict
    input_df = pd.DataFrame([row])[feature_names]

    #Step 9: TF-IDF for description
    desc_vector = tfidf.transform([description])

    #Step 10: Combine & Predict
    combined = hstack([csr_matrix(input_df.values), desc_vector])
    predicted = model.predict(combined)[0]

    return {
        "predictedRating": round(float(predicted), 2),
        "confidence": "High"
    }

    