let latestMutationReport = "";

function getCodonTableDNA() {
  return {
    TTT: "Phenylalanine", TTC: "Phenylalanine", TTA: "Leucine", TTG: "Leucine",
    CTT: "Leucine", CTC: "Leucine", CTA: "Leucine", CTG: "Leucine",
    ATT: "Isoleucine", ATC: "Isoleucine", ATA: "Isoleucine", ATG: "Methionine",
    GTT: "Valine", GTC: "Valine", GTA: "Valine", GTG: "Valine",

    TCT: "Serine", TCC: "Serine", TCA: "Serine", TCG: "Serine",
    CCT: "Proline", CCC: "Proline", CCA: "Proline", CCG: "Proline",
    ACT: "Threonine", ACC: "Threonine", ACA: "Threonine", ACG: "Threonine",
    GCT: "Alanine", GCC: "Alanine", GCA: "Alanine", GCG: "Alanine",

    TAT: "Tyrosine", TAC: "Tyrosine", TAA: "Stop", TAG: "Stop",
    CAT: "Histidine", CAC: "Histidine", CAA: "Glutamine", CAG: "Glutamine",
    AAT: "Asparagine", AAC: "Asparagine", AAA: "Lysine", AAG: "Lysine",
    GAT: "Aspartic Acid", GAC: "Aspartic Acid",
    GAA: "Glutamic Acid", GAG: "Glutamic Acid",

    TGT: "Cysteine", TGC: "Cysteine", TGA: "Stop", TGG: "Tryptophan",
    CGT: "Arginine", CGC: "Arginine", CGA: "Arginine", CGG: "Arginine",
    AGT: "Serine", AGC: "Serine", AGA: "Arginine", AGG: "Arginine",
    GGT: "Glycine", GGC: "Glycine", GGA: "Glycine", GGG: "Glycine"
  };
}

function cleanDNA(sequence) {
  return sequence.toUpperCase().replace(/\s/g, "");
}

function isValidDNA(sequence) {
  return /^[ATGC]+$/.test(sequence);
}

function loadMutationSample() {
  document.getElementById("originalDNA").value = "ATGGAATTTTAA";
  document.getElementById("mutatedDNA").value = "ATGGTTTTTAA";
}

function clearMutation() {
  document.getElementById("originalDNA").value = "";
  document.getElementById("mutatedDNA").value = "";

  document.getElementById("mutationPosition").textContent = "---";
  document.getElementById("mutationType").textContent = "---";
  document.getElementById("originalCodon").textContent = "---";
  document.getElementById("mutatedCodon").textContent = "---";
  document.getElementById("originalAmino").textContent = "---";
  document.getElementById("mutatedAmino").textContent = "---";
  document.getElementById("changedNucleotides").textContent = "---";
  document.getElementById("changedCodons").textContent = "---";
  document.getElementById("sequenceComparison").textContent = "---";
  document.getElementById("mutationImpact").textContent = "---";

  const badge = document.getElementById("severityBadge");
  badge.textContent = "Awaiting Analysis";
  badge.className = "severity-badge";

  latestMutationReport = "";
}

function getFirstChange(original, mutated) {
  const minLength = Math.min(original.length, mutated.length);

  for (let i = 0; i < minLength; i++) {
    if (original[i] !== mutated[i]) {
      return i;
    }
  }

  if (original.length !== mutated.length) {
    return minLength;
  }

  return -1;
}

function getChangedNucleotides(original, mutated) {
  const changes = [];
  const maxLength = Math.max(original.length, mutated.length);

  for (let i = 0; i < maxLength; i++) {
    const originalBase = original[i] || "-";
    const mutatedBase = mutated[i] || "-";

    if (originalBase !== mutatedBase) {
      changes.push(
        `Position ${i + 1}: ${originalBase} → ${mutatedBase}`
      );
    }
  }

  return changes.length ? changes.join("\n") : "No nucleotide changes detected.";
}

function formatCodons(sequence) {
  const codons = [];

  for (let i = 0; i < sequence.length; i += 3) {
    codons.push(sequence.substring(i, i + 3));
  }

  return codons.join(" ");
}

function createSequenceComparison(original, mutated, firstChange) {
  if (firstChange === -1) {
    return "Original: " + formatCodons(original) +
           "\nMutated : " + formatCodons(mutated) +
           "\n\nNo sequence change detected.";
  }

  const originalFormatted = formatCodons(original);
  const mutatedFormatted = formatCodons(mutated);

  const codonIndex = Math.floor(firstChange / 3);
  const pointerSpaces = " ".repeat(10 + codonIndex * 4);

  return (
    "Original: " + originalFormatted +
    "\n" +
    "Mutated : " + mutatedFormatted +
    "\n" +
    pointerSpaces + "↑" +
    "\nChange detected near codon " + (codonIndex + 1)
  );
}

function updateSeverityBadge(severity) {
  const badge = document.getElementById("severityBadge");

  badge.className = "severity-badge";

  if (severity === "Low") {
    badge.textContent = "Low Impact";
    badge.classList.add("severity-low");
  } else if (severity === "Moderate") {
    badge.textContent = "Moderate Impact";
    badge.classList.add("severity-medium");
  } else if (severity === "High") {
    badge.textContent = "High Impact";
    badge.classList.add("severity-high");
  } else if (severity === "Critical") {
    badge.textContent = "Critical Impact";
    badge.classList.add("severity-critical");
  } else {
    badge.textContent = "No Impact";
  }
}

function analyzeMutation() {
  const original = cleanDNA(document.getElementById("originalDNA").value);
  const mutated = cleanDNA(document.getElementById("mutatedDNA").value);

  if (original === "" || mutated === "") {
    alert("Please enter both original and mutated DNA sequences.");
    return;
  }

  if (!isValidDNA(original) || !isValidDNA(mutated)) {
    alert("Invalid DNA sequence. Use only A, T, G and C.");
    return;
  }

  const codonTable = getCodonTableDNA();
  const firstChange = getFirstChange(original, mutated);

  let changedPosition = "---";
  let originalCodon = "---";
  let mutatedCodon = "---";
  let originalAmino = "---";
  let mutatedAmino = "---";
  let mutationType = "No Mutation Detected";
  let severity = "None";
  let impact = "Both DNA sequences are identical. No protein-level impact is expected.";

  if (firstChange !== -1) {
    changedPosition = firstChange + 1;

    const codonStart = Math.floor(firstChange / 3) * 3;

    originalCodon = original.substring(codonStart, codonStart + 3);
    mutatedCodon = mutated.substring(codonStart, codonStart + 3);

    originalAmino = codonTable[originalCodon] || "Incomplete/Unknown";
    mutatedAmino = codonTable[mutatedCodon] || "Incomplete/Unknown";

    if (original.length !== mutated.length) {
      if (Math.abs(original.length - mutated.length) % 3 !== 0) {
        mutationType = "Frameshift Mutation";
        severity = "Critical";
        impact =
          "Reading frame disruption detected. Downstream codons may be altered significantly, producing a highly changed or non-functional protein.";
      } else if (mutated.length > original.length) {
        mutationType = "Insertion";
        severity = "High";
        impact =
          "Extra nucleotide(s) were inserted. Since the length change is divisible by 3, one or more codons may be added without shifting the reading frame.";
      } else {
        mutationType = "Deletion";
        severity = "High";
        impact =
          "Nucleotide(s) were deleted. Since the length change is divisible by 3, one or more codons may be removed without shifting the reading frame.";
      }
    } else {
      if (originalAmino === mutatedAmino) {
        mutationType = "Silent Mutation";
        severity = "Low";
        impact =
          "The codon changed but still codes for the same amino acid. No major protein-level effect is usually expected.";
      } else if (mutatedAmino === "Stop") {
        mutationType = "Nonsense Mutation";
        severity = "Critical";
        impact =
          "A premature stop codon was introduced. Protein synthesis may terminate early, producing a truncated protein.";
      } else if (originalAmino === "Stop" && mutatedAmino !== "Stop") {
        mutationType = "Stop-loss Mutation";
        severity = "High";
        impact =
          "The original stop codon was altered. Translation may continue beyond the expected termination point.";
      } else {
        mutationType = "Missense Mutation";
        severity = "Moderate";
        impact =
          "The mutation changed the encoded amino acid. This may affect protein folding, stability, activity, or molecular interactions.";
      }
    }
  }

  const changedNucleotides = getChangedNucleotides(original, mutated);
  const changedCodons =
    firstChange === -1
      ? "No codon-level change detected."
      : `Original Codon: ${originalCodon} → ${originalAmino}\nMutated Codon : ${mutatedCodon} → ${mutatedAmino}`;

  const sequenceComparison =
    createSequenceComparison(original, mutated, firstChange);

  document.getElementById("mutationPosition").textContent = changedPosition;
  document.getElementById("mutationType").textContent = mutationType;
  document.getElementById("originalCodon").textContent = originalCodon;
  document.getElementById("mutatedCodon").textContent = mutatedCodon;
  document.getElementById("originalAmino").textContent = originalAmino;
  document.getElementById("mutatedAmino").textContent = mutatedAmino;
  document.getElementById("changedNucleotides").textContent = changedNucleotides;
  document.getElementById("changedCodons").textContent = changedCodons;
  document.getElementById("sequenceComparison").textContent = sequenceComparison;
  document.getElementById("mutationImpact").textContent = impact;

  updateSeverityBadge(severity);

  const now = new Date();
  const reportDate = now.toLocaleDateString();
  const reportTime = now.toLocaleTimeString();

  latestMutationReport =
`PROTEOTRANSLATE
MUTATION ANALYSIS REPORT

Generated Date : ${reportDate}
Generated Time : ${reportTime}

Original DNA Sequence:
${original}

Mutated DNA Sequence:
${mutated}

MUTATION SUMMARY

Changed Position:
${changedPosition}

Mutation Classification:
${mutationType}

Predicted Biological Severity:
${severity}

Original Codon:
${originalCodon}

Mutated Codon:
${mutatedCodon}

Original Amino Acid:
${originalAmino}

Mutated Amino Acid:
${mutatedAmino}

CHANGED NUCLEOTIDES

${changedNucleotides}

CHANGED CODONS

${changedCodons}

SEQUENCE COMPARISON

${sequenceComparison}

BIOLOGICAL INTERPRETATION

${impact}

Generated by ProteoTranslate
GenAI Powered DNA & Protein Intelligence Platform`;
}

function generateMutationReport() {
  if (latestMutationReport === "") {
    alert("Please perform mutation analysis first.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.text("ProteoTranslate", 20, 20);

  doc.setFontSize(13);
  doc.text("Mutation Analysis Report", 20, 30);

  doc.line(20, 35, 190, 35);

  doc.setFontSize(10);

  const lines = doc.splitTextToSize(latestMutationReport, 170);
  doc.text(lines, 20, 45);

  doc.save("ProteoTranslate_Mutation_Report.pdf");
}