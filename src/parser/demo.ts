import { parseGreekReceipt } from "./greekReceiptParser";

const SKLAVENITIS = `
ΣΚΛΑΒΕΝΙΤΗΣ ΕΛΛ.ΥΠΕΡΑΓΟΡΕΣ
ΦΕΤΑ ΠΟΠ ΗΠΕΙΡΟΣ 400G    4,89
ΓΑΛΑ ΦΡΕΣΚΟ ΔΕΛΤΑ 1L     1,89
ΨΩΜΙ ΤΟΣΤ ΠΑΠΑΔΟΠΟΥΛΟΥ   2,10
ΣΥΝΟΛΟ                  8,88
ΦΠΑ ΠΕΡΙΛΑΜΒΑΝΕΤΑΙ
ΕΥΧΑΡΙΣΤΟΥΜΕ
`;

const LIDL = `
LIDL HELLAS
ΓΡΑΒΙΕΡΑ ΚΡΗΤΗΣ 300G 3,49
ΜΠΑΝΑΝΕΣ 1KG 1,29
TOTAL 4,78
`;

const MASOUTIS = `
ΜΑΣΟΥΤΗΣ ΣΟΥΠΕΡ ΜΑΡΚΕΤ
ΜΑΚΑΡΟΝΙΑ ΜΙΣΚΟ 500G 0,89
ΣΑΛΤΣΑ PUMMARO 1,20
ΣΥΝΟΛΟ 2,09
`;

for (const [name, txt] of [["Sklavenitis", SKLAVENITIS], ["Lidl", LIDL], ["Masoutis", MASOUTIS]] as const) {
  const r = parseGreekReceipt(txt);
  console.log(`\n=== ${name} ===`);
  console.log(JSON.stringify(r, null, 2));
}
console.log("\n✅ 0€ parser demo OK — no API key used.");
