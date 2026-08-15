let latestReport = "";

function loadSample() {
  document.getElementById("dnaInput").value =
    "ATGAAAGCTATCGGTCGCATGATTTTCGCTGAAAGATTTGTCCC";
}

function clearInput() {
  document.getElementById("dnaInput").value = "";
}

function analyzeDNA() {
  const dna = document.getElementById("dnaInput").value.toUpperCase().replace(/\s/g, "");

  if (dna === "") {
    alert("Please enter a DNA sequence.");
    return;
  }

  if (!/^[ATGC]+$/.test(dna)) {
    alert("Invalid DNA sequence. Use only A, T, G and C.");
    return;
  }

  const now = new Date();
  const reportDate = now.toLocaleDateString();
  const reportTime = now.toLocaleTimeString();

  const mrna = dna.replace(/T/g, "U");

  const codonTable = {
    UUU:"Phenylalanine", UUC:"Phenylalanine", UUA:"Leucine", UUG:"Leucine",
    CUU:"Leucine", CUC:"Leucine", CUA:"Leucine", CUG:"Leucine",
    AUU:"Isoleucine", AUC:"Isoleucine", AUA:"Isoleucine", AUG:"Methionine",
    GUU:"Valine", GUC:"Valine", GUA:"Valine", GUG:"Valine",
    UCU:"Serine", UCC:"Serine", UCA:"Serine", UCG:"Serine",
    CCU:"Proline", CCC:"Proline", CCA:"Proline", CCG:"Proline",
    ACU:"Threonine", ACC:"Threonine", ACA:"Threonine", ACG:"Threonine",
    GCU:"Alanine", GCC:"Alanine", GCA:"Alanine", GCG:"Alanine",
    UAU:"Tyrosine", UAC:"Tyrosine", UAA:"Stop", UAG:"Stop",
    CAU:"Histidine", CAC:"Histidine", CAA:"Glutamine", CAG:"Glutamine",
    AAU:"Asparagine", AAC:"Asparagine", AAA:"Lysine", AAG:"Lysine",
    GAU:"Aspartic Acid", GAC:"Aspartic Acid",
    GAA:"Glutamic Acid", GAG:"Glutamic Acid",
    UGU:"Cysteine", UGC:"Cysteine", UGA:"Stop", UGG:"Tryptophan",
    CGU:"Arginine", CGC:"Arginine", CGA:"Arginine", CGG:"Arginine",
    AGU:"Serine", AGC:"Serine", AGA:"Arginine", AGG:"Arginine",
    GGU:"Glycine", GGC:"Glycine", GGA:"Glycine", GGG:"Glycine"
  };

  const aminoShort = {
    "Methionine":"M", "Phenylalanine":"F", "Leucine":"L",
    "Isoleucine":"I", "Valine":"V", "Serine":"S",
    "Proline":"P", "Threonine":"T", "Alanine":"A",
    "Tyrosine":"Y", "Histidine":"H", "Glutamine":"Q",
    "Asparagine":"N", "Lysine":"K", "Aspartic Acid":"D",
    "Glutamic Acid":"E", "Cysteine":"C", "Tryptophan":"W",
    "Arginine":"R", "Glycine":"G"
  };

  const hydropathy = {
    A:1.8, R:-4.5, N:-3.5, D:-3.5, C:2.5,
    Q:-3.5, E:-3.5, G:-0.4, H:-3.2, I:4.5,
    L:3.8, K:-3.9, M:1.9, F:2.8, P:-1.6,
    S:-0.8, T:-0.7, W:-0.9, Y:-1.3, V:4.2
  };

  const countA = (dna.match(/A/g) || []).length;
  const countT = (dna.match(/T/g) || []).length;
  const countG = (dna.match(/G/g) || []).length;
  const countC = (dna.match(/C/g) || []).length;

  const gcContent = (((countG + countC) / dna.length) * 100).toFixed(2);
  const meltingTemp = (2 * (countA + countT) + 4 * (countG + countC)).toFixed(1);
  const molecularWeight = (dna.length * 330).toLocaleString();

  const startIndex = mrna.indexOf("AUG");
  const startCodon = startIndex !== -1 ? "AUG" : "Not Found";
  const startPosition = startIndex !== -1 ? startIndex + 1 : "-";

  let stopCodonFound = "Not Found";
  let stopPosition = "-";

  let protein = [];
  let codonRows = "";

  for (let i = 0; i < mrna.length - 2; i += 3) {
    const codon = mrna.substring(i, i + 3);
    const aminoAcid = codonTable[codon] || "Unknown";

    codonRows += `<tr><td>${codon}</td><td>${aminoAcid}</td></tr>`;

    if (aminoAcid === "Stop") {
      stopCodonFound = codon;
      stopPosition = i + 1;
      break;
    }

    protein.push(aminoAcid);
  }

  const shortProtein = protein.map(a => aminoShort[a]).filter(Boolean);

  let totalHydro = 0;
  shortProtein.forEach(a => {
    totalHydro += hydropathy[a] || 0;
  });

  const avgHydropathy = shortProtein.length
    ? (totalHydro / shortProtein.length).toFixed(2)
    : "0.00";

  const proteinCharacter = avgHydropathy > 0 ? "Hydrophobic" : "Hydrophilic";
  const proteinMW = (shortProtein.length * 110).toLocaleString() + " Da";

  let coloredDNA = "";
  dna.split("").forEach(base => {
    coloredDNA += `<span class="base-${base.toLowerCase()}">${base}</span>`;
  });

  let bubbles = "";
  shortProtein.forEach(amino => {
    bubbles += `<div class="amino-bubble">${amino}</div>`;
  });

  document.getElementById("totalLength").textContent = dna.length + " bp";
  document.getElementById("gcContent").textContent = gcContent + "%";
  document.getElementById("meltingTemp").textContent = meltingTemp + " °C";
  document.getElementById("molecularWeight").textContent = molecularWeight + " Da";
  document.getElementById("totalCodons").textContent = Math.floor(mrna.length / 3);
  document.getElementById("proteinLength").textContent = protein.length + " amino acids";

  document.getElementById("startCodon").textContent = startCodon;
  document.getElementById("startPosition").textContent = startPosition;
  document.getElementById("stopCodon").textContent = stopCodonFound;
  document.getElementById("stopPosition").textContent = stopPosition;

  document.getElementById("countA").textContent = countA;
  document.getElementById("countT").textContent = countT;
  document.getElementById("countG").textContent = countG;
  document.getElementById("countC").textContent = countC;

  document.getElementById("coloredDNA").innerHTML = coloredDNA;
  document.getElementById("mrnaOutput").textContent = mrna;
  document.getElementById("proteinOutput").textContent = protein.join(" - ");
  document.getElementById("codonTableBody").innerHTML = codonRows;

  document.getElementById("residueCount").textContent = shortProtein.length;
  document.getElementById("proteinMW").textContent = proteinMW;
  document.getElementById("avgHydropathy").textContent = avgHydropathy;
  document.getElementById("proteinCharacter").textContent = proteinCharacter;
  document.getElementById("aminoBubbles").innerHTML = bubbles;

  latestReport =
`PROTEOTRANSLATE ANALYSIS REPORT

Generated Date : ${reportDate}
Generated Time : ${reportTime}

DNA Sequence:
${dna}

mRNA Sequence:
${mrna}

Protein Sequence:
${protein.join(" - ")}

SEQUENCE STATISTICS

Length: ${dna.length} bp
GC Content: ${gcContent}%
Melting Temperature: ${meltingTemp} °C
DNA Molecular Weight: ${molecularWeight} Da
Total Codons: ${Math.floor(mrna.length / 3)}

START / STOP CODON ANALYSIS

Start Codon: ${startCodon}
Start Position: ${startPosition}

Stop Codon: ${stopCodonFound}
Stop Position: ${stopPosition}

NUCLEOTIDE COMPOSITION

Adenine (A): ${countA}
Thymine (T): ${countT}
Guanine (G): ${countG}
Cytosine (C): ${countC}

PROTEIN PROPERTIES

Protein Residues: ${shortProtein.length}
Protein Molecular Weight: ${proteinMW}
Average Hydropathy: ${avgHydropathy}
Protein Character: ${proteinCharacter}

Generated by ProteoTranslate`;
}

function generateReport() {
  if (latestReport === "") {
    alert("Please analyze a DNA sequence first.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.text("ProteoTranslate", 20, 20);

  doc.setFontSize(13);
  doc.text("DNA to Protein Analysis Report", 20, 30);

  doc.line(20, 35, 190, 35);

  doc.setFontSize(10);
  const lines = doc.splitTextToSize(latestReport, 170);
  doc.text(lines, 20, 45);

  doc.save("ProteoTranslate_Report.pdf");
}

document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector(".enquiry-form");

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      alert("Your enquiry has been submitted successfully!");
      form.reset();
    });
  }
});

function getCodonTableDNA() {
  return {
    TTT:"Phenylalanine", TTC:"Phenylalanine", TTA:"Leucine", TTG:"Leucine",
    CTT:"Leucine", CTC:"Leucine", CTA:"Leucine", CTG:"Leucine",
    ATT:"Isoleucine", ATC:"Isoleucine", ATA:"Isoleucine", ATG:"Methionine",
    GTT:"Valine", GTC:"Valine", GTA:"Valine", GTG:"Valine",
    TCT:"Serine", TCC:"Serine", TCA:"Serine", TCG:"Serine",
    CCT:"Proline", CCC:"Proline", CCA:"Proline", CCG:"Proline",
    ACT:"Threonine", ACC:"Threonine", ACA:"Threonine", ACG:"Threonine",
    GCT:"Alanine", GCC:"Alanine", GCA:"Alanine", GCG:"Alanine",
    TAT:"Tyrosine", TAC:"Tyrosine", TAA:"Stop", TAG:"Stop",
    CAT:"Histidine", CAC:"Histidine", CAA:"Glutamine", CAG:"Glutamine",
    AAT:"Asparagine", AAC:"Asparagine", AAA:"Lysine", AAG:"Lysine",
    GAT:"Aspartic Acid", GAC:"Aspartic Acid",
    GAA:"Glutamic Acid", GAG:"Glutamic Acid",
    TGT:"Cysteine", TGC:"Cysteine", TGA:"Stop", TGG:"Tryptophan",
    CGT:"Arginine", CGC:"Arginine", CGA:"Arginine", CGG:"Arginine",
    AGT:"Serine", AGC:"Serine", AGA:"Arginine", AGG:"Arginine",
    GGT:"Glycine", GGC:"Glycine", GGA:"Glycine", GGG:"Glycine"
  };
}

function loadMutationSample() {
  document.getElementById("originalDNA").value = "ATGGAATTTTAA";
  document.getElementById("mutatedDNA").value = "ATGGTTTTTAA";
}

function clearMutation() {
  document.getElementById("originalDNA").value = "";
  document.getElementById("mutatedDNA").value = "";

  document.getElementById("mutationPosition").textContent = "---";
  document.getElementById("originalCodon").textContent = "---";
  document.getElementById("mutatedCodon").textContent = "---";
  document.getElementById("originalAmino").textContent = "---";
  document.getElementById("mutatedAmino").textContent = "---";
  document.getElementById("mutationType").textContent = "---";
  document.getElementById("mutationImpact").textContent = "---";
}

function analyzeMutation() {
  const original = document.getElementById("originalDNA").value.toUpperCase().replace(/\s/g, "");
  const mutated = document.getElementById("mutatedDNA").value.toUpperCase().replace(/\s/g, "");

  if (original === "" || mutated === "") {
    alert("Please enter both original and mutated DNA sequences.");
    return;
  }

  if (!/^[ATGC]+$/.test(original) || !/^[ATGC]+$/.test(mutated)) {
    alert("Invalid DNA sequence. Use only A, T, G and C.");
    return;
  }

  const codonTable = getCodonTableDNA();

  let mutationType = "";
  let impact = "";
  let changedPosition = "-";

  if (original.length !== mutated.length) {
    if (mutated.length > original.length) {
      mutationType = "Insertion";
      impact = "Extra nucleotide(s) inserted. This may alter codons and affect protein structure.";
    } else {
      mutationType = "Deletion";
      impact = "Nucleotide(s) deleted. This may remove codons or disturb protein translation.";
    }

    if (Math.abs(original.length - mutated.length) % 3 !== 0) {
      mutationType = "Frameshift Mutation";
      impact = "Sequence length changed by a number not divisible by 3. Reading frame is shifted, which can severely alter the protein.";
    }
  }

  let firstChange = -1;
  const minLength = Math.min(original.length, mutated.length);

  for (let i = 0; i < minLength; i++) {
    if (original[i] !== mutated[i]) {
      firstChange = i;
      break;
    }
  }

  if (firstChange === -1 && original.length !== mutated.length) {
    firstChange = minLength;
  }

  if (firstChange === -1) {
    mutationType = "No Mutation Detected";
    impact = "Both DNA sequences are identical.";
    changedPosition = "-";
  } else {
    changedPosition = firstChange + 1;
  }

  const codonStart = firstChange !== -1 ? Math.floor(firstChange / 3) * 3 : 0;

  const originalCodon = original.substring(codonStart, codonStart + 3);
  const mutatedCodon = mutated.substring(codonStart, codonStart + 3);

  const originalAmino = codonTable[originalCodon] || "Incomplete/Unknown";
  const mutatedAmino = codonTable[mutatedCodon] || "Incomplete/Unknown";

  if (original.length === mutated.length && firstChange !== -1) {
    if (originalAmino === mutatedAmino) {
      mutationType = "Silent Mutation";
      impact = "Codon changed, but amino acid remains the same. Protein structure is usually not affected.";
    } else if (mutatedAmino === "Stop") {
      mutationType = "Nonsense Mutation";
      impact = "Mutation created a stop codon. Protein synthesis may stop early, producing a shortened protein.";
    } else {
      mutationType = "Missense Mutation";
      impact = "Amino acid changed, which may affect protein structure or function.";
    }
  }

  document.getElementById("mutationPosition").textContent = changedPosition;
  document.getElementById("originalCodon").textContent = originalCodon || "---";
  document.getElementById("mutatedCodon").textContent = mutatedCodon || "---";
  document.getElementById("originalAmino").textContent = originalAmino;
  document.getElementById("mutatedAmino").textContent = mutatedAmino;
  document.getElementById("mutationType").textContent = mutationType;
  document.getElementById("mutationImpact").textContent = impact;
}