import os
import re
import json
from flask import Blueprint, render_template, request
from google import genai
from google.genai import types
 
# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
 
genai_bp = Blueprint("genai", __name__)
 
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
 
MAX_SEQUENCE_LENGTH = 5000  # guard against absurdly large pasted input
 
DNA_PATTERN = re.compile(r"^[ACGTN]+$", re.IGNORECASE)
RNA_PATTERN = re.compile(r"^[ACGUN]+$", re.IGNORECASE)
# Standard 20 amino acids + X (unknown) + * (stop codon)
PROTEIN_PATTERN = re.compile(r"^[ACDEFGHIKLMNPQRSTVWYX*]+$", re.IGNORECASE)
 
# JSON schema Gemini must respond with — matches the template's expected keys exactly
EXPLANATION_SCHEMA = {
    "type": "object",
    "properties": {
        "bio_model_note": {"type": "string"},
        "plain_english_summary": {"type": "string"},
        "biological_role": {"type": "string"},
        "mutation_type": {"type": "string"},
        "mutation_interpretation": {"type": "string"},
        "possible_protein_impact": {"type": "string"},
        "clinical_relevance": {"type": "string"},
    },
    "required": [
        "bio_model_note", "plain_english_summary", "biological_role",
        "mutation_type", "mutation_interpretation",
        "possible_protein_impact", "clinical_relevance"
    ]
}
 
 
# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
 
def validate_sequence(sequence, pattern, label, required=False):
    """
    Cleans and validates a single sequence field.
    Returns (cleaned_sequence, error_message). error_message is None if valid.
    """
    if not sequence:
        if required:
            return None, f"{label} is required."
        return "", None
 
    cleaned = sequence.strip().upper().replace(" ", "").replace("\n", "")
 
    if len(cleaned) > MAX_SEQUENCE_LENGTH:
        return None, f"{label} exceeds maximum length of {MAX_SEQUENCE_LENGTH} characters."
 
    if not pattern.match(cleaned):
        bad_chars = sorted(set(c for c in cleaned if not pattern.match(c)))
        return None, f"{label} contains invalid characters: {', '.join(bad_chars)}"
 
    return cleaned, None
 
 
def validate_genai_inputs(dna_sequence, mrna_sequence, protein_sequence,
                           original_protein, mutated_protein):
    """
    Validates all incoming form fields.
    Returns (cleaned_data_dict, errors_list).
    """
    errors = []
    cleaned = {}
 
    cleaned["dna_sequence"], err = validate_sequence(dna_sequence, DNA_PATTERN, "DNA sequence")
    if err:
        errors.append(err)
 
    cleaned["mrna_sequence"], err = validate_sequence(mrna_sequence, RNA_PATTERN, "mRNA sequence")
    if err:
        errors.append(err)
 
    cleaned["protein_sequence"], err = validate_sequence(protein_sequence, PROTEIN_PATTERN, "Protein sequence")
    if err:
        errors.append(err)
 
    cleaned["original_protein"], err = validate_sequence(original_protein, PROTEIN_PATTERN, "Original protein sequence")
    if err:
        errors.append(err)
 
    cleaned["mutated_protein"], err = validate_sequence(mutated_protein, PROTEIN_PATTERN, "Mutated protein sequence")
    if err:
        errors.append(err)
 
    # Cross-field check: if one of the mutation pair is given, both should be
    has_original = bool(cleaned.get("original_protein"))
    has_mutated = bool(cleaned.get("mutated_protein"))
    if has_original != has_mutated:
        errors.append(
            "Both original and mutated protein sequences are required to "
            "interpret a mutation — only one was provided."
        )
 
    # At least one meaningful sequence must be present
    if not any([cleaned.get("dna_sequence"), cleaned.get("mrna_sequence"),
                cleaned.get("protein_sequence"), has_original]):
        errors.append(
            "Please provide at least one sequence (DNA, mRNA, or protein) "
            "to generate an explanation."
        )
 
    return cleaned, errors
 
 
# ---------------------------------------------------------------------------
# Gemini call
# ---------------------------------------------------------------------------
 
def build_prompt(dna_sequence, mrna_sequence, protein_sequence,
                  original_protein=None, mutated_protein=None):
    return f"""
You are a biomedical explanation assistant embedded in a DNA/protein analysis
tool called ProteoTranslate. Given the sequence data below, produce a
plain-English, non-alarmist biological explanation for a general audience.
Do not give medical diagnoses. If data is missing for a section, say so
explicitly instead of guessing.
 
DNA sequence: {dna_sequence or "Not provided"}
mRNA sequence: {mrna_sequence or "Not provided"}
Protein sequence: {protein_sequence or "Not provided"}
Original protein (pre-mutation): {original_protein or "Not provided"}
Mutated protein: {mutated_protein or "Not provided"}
 
Respond with a plain-english summary of protein function, its likely
biological role, the type of mutation (if both original and mutated
protein sequences are given), an interpretation of that mutation, its
possible impact on protein structure/function, and general clinical
relevance framed as educational, not diagnostic.
"""
 
 
def generate_genai_explanation(dna_sequence, mrna_sequence, protein_sequence,
                                original_protein=None, mutated_protein=None):
    prompt = build_prompt(dna_sequence, mrna_sequence, protein_sequence,
                           original_protein, mutated_protein)
 
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=EXPLANATION_SCHEMA,
                temperature=0.4,
            ),
        )
        return json.loads(response.text)
 
    except Exception as e:
        # Don't let the page crash if the API call fails or rate-limits
        return {
            "bio_model_note": f"AI generation failed ({type(e).__name__}); showing fallback message.",
            "plain_english_summary": "The biological explanation could not be generated at this time.",
            "biological_role": "Unavailable.",
            "mutation_type": "Unavailable",
            "mutation_interpretation": "Unavailable due to a service error.",
            "possible_protein_impact": "Unavailable.",
            "clinical_relevance": "Unavailable.",
        }
 
 
# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------
 
@genai_bp.route("/genai", methods=["GET", "POST"])
def genai_page():
    explanation = None
    errors = []
 
    if request.method == "POST":
        raw_dna = request.form.get("dna_sequence", "")
        raw_mrna = request.form.get("mrna_sequence", "")
        raw_protein = request.form.get("protein_sequence", "")
        raw_original = request.form.get("original_protein", "")
        raw_mutated = request.form.get("mutated_protein", "")
 
        cleaned, errors = validate_genai_inputs(
            raw_dna, raw_mrna, raw_protein, raw_original, raw_mutated
        )
 
        if not errors:
            explanation = generate_genai_explanation(
                cleaned["dna_sequence"],
                cleaned["mrna_sequence"],
                cleaned["protein_sequence"],
                cleaned["original_protein"],
                cleaned["mutated_protein"],
            )
 
    return render_template("genai.html", explanation=explanation, errors=errors)