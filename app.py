from flask import Flask, render_template, request, jsonify, send_file, Response
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from fpdf import FPDF
from datetime import datetime
from modules.genai_explainer import generate_genai_explanation
import os
import re


app = Flask(__name__)

REPORTS_DIR = "reports"
os.makedirs(REPORTS_DIR, exist_ok=True)

# MongoDB connection
uri = os.getenv("MONGO_URI")

client = None
enzyme_collection = None

if uri:
    try:
        client = MongoClient(uri, server_api=ServerApi("1"))
        client.admin.command("ping")
        print("Successfully connected to MongoDB!")

        db = client["enzyme_database"]
        enzyme_collection = db["enzymes"]

    except Exception as e:
        print("MongoDB connection error:", e)
else:
    print("MONGO_URI not found. Enzyme lookup will be disabled.")


GENETIC_CODE = {
    "ATA": "I", "ATC": "I", "ATT": "I", "ATG": "M",
    "ACA": "T", "ACC": "T", "ACG": "T", "ACT": "T",
    "AAC": "N", "AAT": "N", "AAA": "K", "AAG": "K",
    "AGC": "S", "AGT": "S", "AGA": "R", "AGG": "R",
    "CTA": "L", "CTC": "L", "CTG": "L", "CTT": "L",
    "CCA": "P", "CCC": "P", "CCG": "P", "CCT": "P",
    "CAC": "H", "CAT": "H", "CAA": "Q", "CAG": "Q",
    "CGA": "R", "CGC": "R", "CGG": "R", "CGT": "R",
    "GTA": "V", "GTC": "V", "GTG": "V", "GTT": "V",
    "GCA": "A", "GCC": "A", "GCG": "A", "GCT": "A",
    "GAC": "D", "GAT": "D", "GAA": "E", "GAG": "E",
    "GGA": "G", "GGC": "G", "GGG": "G", "GGT": "G",
    "TCA": "S", "TCC": "S", "TCG": "S", "TCT": "S",
    "TTC": "F", "TTT": "F", "TTA": "L", "TTG": "L",
    "TAC": "Y", "TAT": "Y", "TAA": "*", "TAG": "*",
    "TGC": "C", "TGT": "C", "TGA": "*", "TGG": "W"
}

AMINO_ACID_NAMES = {
    "A": "Alanine", "R": "Arginine", "N": "Asparagine",
    "D": "Aspartic Acid", "C": "Cysteine", "Q": "Glutamine",
    "E": "Glutamic Acid", "G": "Glycine", "H": "Histidine",
    "I": "Isoleucine", "L": "Leucine", "K": "Lysine",
    "M": "Methionine", "F": "Phenylalanine", "P": "Proline",
    "S": "Serine", "T": "Threonine", "W": "Tryptophan",
    "Y": "Tyrosine", "V": "Valine", "*": "Stop Codon"
}


def clean_dna_sequence(dna_sequence):
    return dna_sequence.upper().replace(" ", "").replace("\n", "").replace("\r", "")


def validate_dna_sequence(dna_sequence):
    if not dna_sequence:
        return False, "Please enter a DNA sequence."

    if not re.fullmatch("[ATGC]+", dna_sequence):
        return False, "Invalid DNA sequence. Only A, T, G, and C are allowed."

    if len(dna_sequence) % 3 != 0:
        return False, "DNA sequence length must be a multiple of 3."

    return True, "Valid DNA sequence."


def transcribe_dna_to_mrna(dna_sequence):
    return dna_sequence.replace("T", "U")


def create_codon_mapping(dna_sequence):
    codon_mapping = []
    protein_sequence = ""

    for position, i in enumerate(range(0, len(dna_sequence), 3), start=1):
        codon = dna_sequence[i:i + 3]
        amino_acid = GENETIC_CODE.get(codon, "X")
        amino_acid_name = AMINO_ACID_NAMES.get(amino_acid, "Unknown")

        protein_sequence += amino_acid

        codon_mapping.append({
            "position": position,
            "dna_codon": codon,
            "mrna_codon": codon.replace("T", "U"),
            "amino_acid": amino_acid,
            "amino_acid_name": amino_acid_name
        })

    return protein_sequence, codon_mapping


def find_enzyme(protein_sequence):
    if enzyme_collection is None:
        return None

    return enzyme_collection.find_one({"protein_sequence": protein_sequence})


def generate_report_file(dna_sequence, mrna_sequence, protein_sequence, codon_mapping, enzyme_name):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(REPORTS_DIR, f"dna_protein_report_{timestamp}.pdf")

    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    pdf.set_font("Arial", "B", 16)
    pdf.cell(0, 10, "DNA & Protein Analysis Report", ln=True, align="C")
    pdf.ln(5)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, "DNA Sequence", ln=True)

    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 8, dna_sequence)
    pdf.ln(2)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, "mRNA Sequence", ln=True)

    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 8, mrna_sequence)
    pdf.ln(2)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, "Protein Sequence", ln=True)

    pdf.set_font("Arial", "", 11)
    pdf.multi_cell(0, 8, protein_sequence)
    pdf.ln(2)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, "Sequence Statistics", ln=True)

    pdf.set_font("Arial", "", 11)
    pdf.cell(0, 8, f"DNA Length: {len(dna_sequence)} nucleotides", ln=True)
    pdf.cell(0, 8, f"Total Codons: {len(codon_mapping)}", ln=True)
    pdf.cell(0, 8, f"Stop Codons: {protein_sequence.count('*')}", ln=True)
    pdf.cell(0, 8, f"Enzyme Match: {enzyme_name}", ln=True)

    pdf.ln(5)

    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, "Codon Mapping", ln=True)

    pdf.set_font("Arial", "B", 10)

    pdf.cell(15, 8, "#", border=1)
    pdf.cell(30, 8, "DNA", border=1)
    pdf.cell(30, 8, "mRNA", border=1)
    pdf.cell(25, 8, "AA", border=1)
    pdf.cell(80, 8, "Amino Acid", border=1)
    pdf.ln()

    pdf.set_font("Arial", "", 10)

    for item in codon_mapping:
        pdf.cell(15, 8, str(item["position"]), border=1)
        pdf.cell(30, 8, item["dna_codon"], border=1)
        pdf.cell(30, 8, item["mrna_codon"], border=1)
        pdf.cell(25, 8, item["amino_acid"], border=1)
        pdf.cell(80, 8, item["amino_acid_name"], border=1)
        pdf.ln()

    pdf.output(file_path)

    return file_path


@app.route("/")
def home():
    return render_template("index.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/contact")
def contact():
    return render_template("contact.html")
@app.route("/dna-analysis")
def dna_analysis():
    return render_template("dna_analysis.html")

@app.route("/mutation")
def mutation():
    return render_template("mutation.html")

@app.route("/genai", methods=["GET", "POST"])
def genai():
    explanation = None

    if request.method == "POST":
        dna_sequence = request.form.get("dna_sequence", "").upper().strip()
        mrna_sequence = request.form.get("mrna_sequence", "").upper().strip()
        protein_sequence = request.form.get("protein_sequence", "").upper().strip()
        original_protein = request.form.get("original_protein", "").upper().strip()
        mutated_protein = request.form.get("mutated_protein", "").upper().strip()

        explanation = generate_genai_explanation(
            dna_sequence,
            mrna_sequence,
            protein_sequence,
            original_protein,
            mutated_protein
        )

    return render_template("genai.html", explanation=explanation)

@app.route("/research")
def research():
    return render_template("research.html")


@app.route("/translate", methods=["POST"])
def translate():
    data = request.get_json()
    dna_sequence = clean_dna_sequence(data.get("dna_sequence", ""))

    is_valid, message = validate_dna_sequence(dna_sequence)

    if not is_valid:
        return jsonify({"error": message}), 400

    mrna_sequence = transcribe_dna_to_mrna(dna_sequence)
    protein_sequence, codon_mapping = create_codon_mapping(dna_sequence)

    enzyme_info = find_enzyme(protein_sequence)
    enzyme_name = enzyme_info.get("name", "Not found") if enzyme_info else "Not found"

    return jsonify({
        "dna_sequence": dna_sequence,
        "mrna_sequence": mrna_sequence,
        "protein_sequence": protein_sequence,
        "codon_mapping": codon_mapping,
        "sequence_length": len(dna_sequence),
        "codon_count": len(codon_mapping),
        "stop_codon_count": protein_sequence.count("*"),
        "enzyme_name": enzyme_name
    })


@app.route("/view_report", methods=["POST"])
def view_report():
    data = request.get_json()
    dna_sequence = clean_dna_sequence(data.get("dna_sequence", ""))

    is_valid, message = validate_dna_sequence(dna_sequence)

    if not is_valid:
        return Response(message, status=400, mimetype="text/plain")

    mrna_sequence = transcribe_dna_to_mrna(dna_sequence)
    protein_sequence, codon_mapping = create_codon_mapping(dna_sequence)

    enzyme_info = find_enzyme(protein_sequence)
    enzyme_name = enzyme_info.get("name", "Not found") if enzyme_info else "Not found"

    report_content = f"""
DNA & Protein Analysis Report
=============================

DNA Sequence:
{dna_sequence}

mRNA Sequence:
{mrna_sequence}

Protein Sequence:
{protein_sequence}

Enzyme Name:
{enzyme_name}

Codon Mapping:
"""

    for item in codon_mapping:
        report_content += (
            f"Position {item['position']}: "
            f"DNA {item['dna_codon']} -> "
            f"mRNA {item['mrna_codon']} -> "
            f"{item['amino_acid']} ({item['amino_acid_name']})\n"
        )

    return Response(report_content, mimetype="text/plain")


@app.route("/generate_report", methods=["POST"])
def generate_report():
    data = request.get_json()
    dna_sequence = clean_dna_sequence(data.get("dna_sequence", ""))

    is_valid, message = validate_dna_sequence(dna_sequence)

    if not is_valid:
        return jsonify({"error": message}), 400

    mrna_sequence = transcribe_dna_to_mrna(dna_sequence)
    protein_sequence, codon_mapping = create_codon_mapping(dna_sequence)

    enzyme_info = find_enzyme(protein_sequence)
    enzyme_name = enzyme_info.get("name", "Not found") if enzyme_info else "Not found"

    report_path = generate_report_file(
        dna_sequence,
        mrna_sequence,
        protein_sequence,
        codon_mapping,
        enzyme_name
    )

    return send_file(report_path, as_attachment=True)


if __name__ == "__main__":
    app.run(debug=True)
