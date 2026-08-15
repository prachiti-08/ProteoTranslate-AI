import tkinter as tk
from tkinter import messagebox
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

# MongoDB connection
uri = "mongodb+srv://User0:tISAUtXeYsD9EQsC@cluster0.xyxbg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(uri, server_api=ServerApi('1'))

try:
    client.admin.command('ping')
    print("Pinged your deployment. Successfully connected to MongoDB!")
except Exception as e:
    print("Error connecting to MongoDB:", e)

# Database and collection setup
db = client['enzyme_database']  # Replace with your database name
enzyme_collection = db['enzymes']  # Replace with your collection name

# Genetic code dictionary to map codons to amino acids
GENETIC_CODE = {
    'ATA': 'I', 'ATC': 'I', 'ATT': 'I', 'ATG': 'M',
    'ACA': 'T', 'ACC': 'T', 'ACG': 'T', 'ACT': 'T',
    'AAC': 'N', 'AAT': 'N', 'AAA': 'K', 'AAG': 'K',
    'AGC': 'S', 'AGT': 'S', 'AGA': 'R', 'AGG': 'R',
    'CTA': 'L', 'CTC': 'L', 'CTG': 'L', 'CTT': 'L',
    'CCA': 'P', 'CCC': 'P', 'CCG': 'P', 'CCT': 'P',
    'CAC': 'H', 'CAT': 'H', 'CAA': 'Q', 'CAG': 'Q',
    'CGA': 'R', 'CGC': 'R', 'CGG': 'R', 'CGT': 'R',
    'GTA': 'V', 'GTC': 'V', 'GTG': 'V', 'GTT': 'V',
    'GCA': 'A', 'GCC': 'A', 'GCG': 'A', 'GCT': 'A',
    'GAC': 'D', 'GAT': 'D', 'GAA': 'E', 'GAG': 'E',
    'GGA': 'G', 'GGC': 'G', 'GGG': 'G', 'GGT': 'G',
    'TCA': 'S', 'TCC': 'S', 'TCG': 'S', 'TCT': 'S',
    'TTC': 'F', 'TTT': 'F', 'TTA': 'L', 'TTG': 'L',
    'TAC': 'Y', 'TAT': 'Y', 'TAA': '', 'TAG': '',
    'TGC': 'C', 'TGT': 'C', 'TGA': '_', 'TGG': 'W',
}

def translate_dna_to_protein(dna_sequence):
    dna_sequence = dna_sequence.upper()
    if len(dna_sequence) % 3 != 0:
        messagebox.showerror("Error", "DNA sequence length is not a multiple of 3.")
        return ""
    
    protein_sequence = ""
    for i in range(0, len(dna_sequence), 3):
        codon = dna_sequence[i:i+3]
        protein_sequence += GENETIC_CODE.get(codon, 'X')  # 'X' for unknown codons
    return protein_sequence

def find_enzyme(protein_sequence):
    protein_sequence = protein_sequence.upper()  # Ensure case consistency
    print(f"Querying MongoDB with protein sequence: {protein_sequence}")

    # Print all documents in collection for debugging
    all_enzymes = enzyme_collection.find()
    print("All stored enzymes in MongoDB:")
    for enzyme in all_enzymes:
        print("Stored enzyme:", enzyme)

    # Perform the actual query
    enzyme = enzyme_collection.find_one({"protein_sequence": protein_sequence})
    if enzyme:
        print(f"Enzyme found: {enzyme}")
        return enzyme["name"]
    else:
        print("Enzyme not found in MongoDB.")
    return None

# Function to handle the translation when button is clicked
def on_translate():
    dna_sequence = dna_entry.get()
    if not dna_sequence:
        messagebox.showwarning("Input Error", "Please enter a DNA sequence.")
        return
    
    protein_sequence = translate_dna_to_protein(dna_sequence)
    if protein_sequence:
        enzyme = find_enzyme(protein_sequence)
        if enzyme:
            result_label.config(text=f"Protein Sequence: {protein_sequence}\nEnzyme: {enzyme}")
        else:
            result_label.config(text=f"Protein Sequence: {protein_sequence}\nEnzyme: Not found")

# Create the main window
root = tk.Tk()
root.title("DNA to Protein Translator")

# Create and place widgets
tk.Label(root, text="Enter DNA Sequence:").pack(pady=10)

dna_entry = tk.Entry(root, width=50)
dna_entry.pack(pady=5)

translate_button = tk.Button(root, text="Translate", command=on_translate)
translate_button.pack(pady=10)

result_label = tk.Label(root, text="Protein Sequence: ")
result_label.pack(pady=10)

# Run the application
root.mainloop()
