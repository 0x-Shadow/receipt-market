export type ReceiptFixture = {
  name: string;
  input: string;
  expected: {
    storeChain: string;
    itemCount: number;
    total?: number | null;
    items: { name: string; price: number }[];
  };
};

export const fixtures: ReceiptFixture[] = [
  {
    name: "Sklavenitis standard format",
    input: `ΣΚΛΑΒΕΝΙΤΗΣ ΧΑΛΑΝΔΡΙ
ΑΓΓΟΥΡΙΑ 1KG 1,29
ΝΤΟΜΑΤΕΣ 1KG 1,59
ΓΑΛΑ 1L 1,89
ΨΩΜΙ ΤΟΣΤ 0,79
ΣΥΝΟΛΟ 5,56`,
    expected: {
      storeChain: "Sklavenitis",
      itemCount: 4,
      total: 5.56,
      items: [
        { name: "ΑΓΓΟΥΡΙΑ 1KG", price: 1.29 },
        { name: "ΝΤΟΜΑΤΕΣ 1KG", price: 1.59 },
        { name: "ΓΑΛΑ 1L", price: 1.89 },
        { name: "ΨΩΜΙ ΤΟΣΤ", price: 0.79 },
      ],
    },
  },
  {
    name: "Sklavenitis with discounts",
    input: `ΣΚΛΑΒΕΝΙΤΗΣ ΑΓΙΑ ΠΑΡΑΣΚΕΥΗ
ΦΕΤΑ ΠΟΠ 400G 4,89
ΕΚΠΤΩΣΗ -0,50
ΓΑΛΑ 1L 1,89
ΣΥΝΟΛΟ 6,28`,
    expected: {
      storeChain: "Sklavenitis",
      itemCount: 3,
      total: 6.28,
      items: [
        { name: "ΦΕΤΑ ΠΟΠ 400G", price: 4.89 },
        { name: "ΕΚΠΤΩΣΗ", price: 0.5 },
        { name: "ΓΑΛΑ 1L", price: 1.89 },
      ],
    },
  },
  {
    name: "Lidl with quantity multipliers",
    input: `LIDL HELLAS ΜΑΡΟΥΣΙ
ΜΠΑΝΑΝΕΣ 1KG 1,29
2x ΧΥΜΟΣ ΠΟΡΤΟΚΑΛΙ 1L 2,58
ΓΑΛΑ 1L 1,89
ΣΥΝΟΛΟ 5,76`,
    expected: {
      storeChain: "Lidl",
      itemCount: 3,
      total: 5.76,
      items: [
        { name: "ΜΠΑΝΑΝΕΣ 1KG", price: 1.29 },
        { name: "2x ΧΥΜΟΣ ΠΟΡΤΟΚΑΛΙ 1L", price: 2.58 },
        { name: "ΓΑΛΑ 1L", price: 1.89 },
      ],
    },
  },
  {
    name: "Masoutis with €/kg unit prices",
    input: `ΜΑΣΟΥΤΗΣ ΣΟΥΠΕΡ ΜΑΡΚΕΤ
ΜΟΣΧΑΡΙ ΚΙΛΟ 12,50
ΧΥΜΟΣ ΤΟΜΑΤΑΣ 1L 2,19
ΣΥΝΟΛΟ 14,69`,
    expected: {
      storeChain: "Masoutis",
      itemCount: 2,
      total: 14.69,
      items: [
        { name: "ΜΟΣΧΑΡΙ ΚΙΛΟ", price: 12.5 },
        { name: "ΧΥΜΟΣ ΤΟΜΑΤΑΣ 1L", price: 2.19 },
      ],
    },
  },
  {
    name: "AB Vasilopoulos format",
    input: `ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ
ΚΑΦΕΣ ΕΛΛΗΝΙΚΟΣ 250G 3,49
ΖΑΧΑΡΗ 1KG 1,19
ΣΥΝΟΛΟ 4,68`,
    expected: {
      storeChain: "AB",
      itemCount: 2,
      total: 4.68,
      items: [
        { name: "ΚΑΦΕΣ ΕΛΛΗΝΙΚΟΣ 250G", price: 3.49 },
        { name: "ΖΑΧΑΡΗ 1KG", price: 1.19 },
      ],
    },
  },
  {
    name: "My Market format",
    input: `MY MARKET ΑΘΗΝΑ
ΝΕΡΟ 1,5L 0,59
ΚΡΕΜΑ ΜΑΛΑΚΗ 200G 2,89
ΣΥΝΟΛΟ 3,48`,
    expected: {
      storeChain: "My Market",
      itemCount: 2,
      total: 3.48,
      items: [
        { name: "ΝΕΡΟ 1,5L", price: 0.59 },
        { name: "ΚΡΕΜΑ ΜΑΛΑΚΗ 200G", price: 2.89 },
      ],
    },
  },
  {
    name: "Multi-line product name",
    input: `ΣΚΛΑΒΕΝΙΤΗΣ
ΚΑΤΣΙΚΙΣΙΟ ΚΡΕΑΣ
ΨΗΤΟ ΟΛΟΚΛΗΡΟ 8,99
ΠΑΤΑΤΕΣ 1KG 1,29
ΣΥΝΟΛΟ 10,28`,
    expected: {
      storeChain: "Sklavenitis",
      itemCount: 2,
      total: 10.28,
      items: [
        { name: "ΨΗΤΟ ΟΛΟΚΛΗΡΟ", price: 8.99 },
        { name: "ΠΑΤΑΤΕΣ 1KG", price: 1.29 },
      ],
    },
  },
  {
    name: "OCR mistakes (0 instead of O)",
    input: `ΣΚΛΑΒΕΝΙΤΗΣ
ΦΕΤΑ Π0Π 400G 4,89
ΓΑΛΑ 1L 1,89
ΣΥΝΟΛΟ 6,78`,
    expected: {
      storeChain: "Sklavenitis",
      itemCount: 2,
      total: 6.78,
      items: [
        { name: "ΦΕΤΑ Π0Π 400G", price: 4.89 },
        { name: "ΓΑΛΑ 1L", price: 1.89 },
      ],
    },
  },
  {
    name: "VAT lines and subtotal",
    input: `LIDL
ΜΠΑΝΑΝΕΣ 1KG 1,29
ΓΑΛΑ 1L 1,89
ΥΠΟΣΥΝΟΛΟ 3,18
ΦΠΑ 13% 0,35
ΣΥΝΟΛΟ 3,53`,
    expected: {
      storeChain: "Lidl",
      itemCount: 2,
      total: 3.53,
      items: [
        { name: "ΜΠΑΝΑΝΕΣ 1KG", price: 1.29 },
        { name: "ΓΑΛΑ 1L", price: 1.89 },
      ],
    },
  },
  {
    name: "Decimal points instead of commas",
    input: `ΣΚΛΑΒΕΝΙΤΗΣ
ΑΓΓΟΥΡΙΑ 1KG 1.29
ΝΤΟΜΑΤΕΣ 1KG 1.59
ΣΥΝΟΛΟ 2.88`,
    expected: {
      storeChain: "Sklavenitis",
      itemCount: 2,
      total: 2.88,
      items: [
        { name: "ΑΓΓΟΥΡΙΑ 1KG", price: 1.29 },
        { name: "ΝΤΟΜΑΤΕΣ 1KG", price: 1.59 },
      ],
    },
  },
  {
    name: "ΕΚΠΤΩΣΗ discount keyword",
    input: `ΜΑΣΟΥΤΗΣ
ΦΕΤΑ ΠΟΠ 400G 4,89
ΕΚΠΤΩΣΗ -0,50
ΓΑΛΑ 1L 1,89
ΣΥΝΟΛΟ 6,28`,
    expected: {
      storeChain: "Masoutis",
      itemCount: 3,
      total: 6.28,
      items: [
        { name: "ΦΕΤΑ ΠΟΠ 400G", price: 4.89 },
        { name: "ΕΚΠΤΩΣΗ", price: 0.5 },
        { name: "ΓΑΛΑ 1L", price: 1.89 },
      ],
    },
  },
  {
    name: "Percentage discount",
    input: `LIDL
ΜΠΑΝΑΝΕΣ 1KG 1,29
10% ΕΚΠΤΩΣΗ -0,13
ΓΑΛΑ 1L 1,89
ΣΥΝΟΛΟ 3,05`,
    expected: {
      storeChain: "Lidl",
      itemCount: 3,
      total: 3.05,
      items: [
        { name: "ΜΠΑΝΑΝΕΣ 1KG", price: 1.29 },
        { name: "ΕΚΠΤΩΣΗ", price: 0.12 },
        { name: "ΓΑΛΑ 1L", price: 1.89 },
      ],
    },
  },
  {
    name: "ΤΕΜ quantity indicator",
    input: `ΣΚΛΑΒΕΝΙΤΗΣ
ΑΓΓΟΥΡΙΑ ΤΕΜ 1,29
ΝΤΟΜΑΤΕΣ ΤΕΜ 1,59
ΣΥΝΟΛΟ 2,88`,
    expected: {
      storeChain: "Sklavenitis",
      itemCount: 2,
      total: 2.88,
      items: [
        { name: "ΑΓΓΟΥΡΙΑ ΤΕΜ", price: 1.29 },
        { name: "ΝΤΟΜΑΤΕΣ ΤΕΜ", price: 1.59 },
      ],
    },
  },
  {
    name: "Mixed Greek/Latin product names",
    input: `MY MARKET
Coca Cola 1,5L 1,89
ΝΕΡΟ 1,5L 0,59
ΣΥΝΟΛΟ 2,48`,
    expected: {
      storeChain: "My Market",
      itemCount: 2,
      total: 2.48,
      items: [
        { name: "Coca Cola 1,5L", price: 1.89 },
        { name: "ΝΕΡΟ 1,5L", price: 0.59 },
      ],
    },
  },
  {
    name: "Very long product names",
    input: `ΣΚΛΑΒΕΝΙΤΗΣ
ΚΑΤΣΙΚΙΣΙΟ ΚΡΕΑΣ ΨΗΤΟ ΟΛΟΚΛΗΡΟ ΣΕ ΞΥΛΟΚΑΡΒΟΥΝΟ ΜΕ ΑΛΑΤΙ ΚΑΙ ΡΙΓΑΝΗ 8,99
ΣΥΝΟΛΟ 8,99`,
    expected: {
      storeChain: "Sklavenitis",
      itemCount: 1,
      total: 8.99,
      items: [
        { name: "ΚΑΤΣΙΚΙΣΙΟ ΚΡΕΑΣ ΨΗΤΟ ΟΛΟΚΛΗΡΟ ΣΕ ΞΥΛΟΚΑΡΒΟΥΝΟ ΜΕ ΑΛΑΤΙ ΚΑΙ ΡΙΓΑΝΗ", price: 8.99 },
      ],
    },
  },
  {
    name: "Short product names",
    input: `LIDL
ΨΩΜΙ 0,79
ΨΑΡΙ 3,49
ΣΥΝΟΛΟ 4,28`,
    expected: {
      storeChain: "Lidl",
      itemCount: 2,
      total: 4.28,
      items: [
        { name: "ΨΩΜΙ", price: 0.79 },
        { name: "ΨΑΡΙ", price: 3.49 },
      ],
    },
  },
  {
    name: "Prices over 100€",
    input: `ΜΑΣΟΥΤΗΣ
ΚΡΕΑΣ ΒΟΔΙΝΟ ΚΙΛΟ 125,00
ΚΡΕΑΣ ΧΟΙΡΙΝΟ ΚΙΛΟ 89,50
ΣΥΝΟΛΟ 214,50`,
    expected: {
      storeChain: "Masoutis",
      itemCount: 2,
      total: 214.5,
      items: [
        { name: "ΚΡΕΑΣ ΒΟΔΙΝΟ ΚΙΛΟ", price: 125.0 },
        { name: "ΚΡΕΑΣ ΧΟΙΡΙΝΟ ΚΙΛΟ", price: 89.5 },
      ],
    },
  },
  {
    name: "Very cheap items under 1€",
    input: `MY MARKET
ΝΕΡΟ 1,5L 0,59
ΨΩΜΙ ΤΟΣΤ 0,79
ΣΥΝΟΛΟ 1,38`,
    expected: {
      storeChain: "My Market",
      itemCount: 2,
      total: 1.38,
      items: [
        { name: "ΝΕΡΟ 1,5L", price: 0.59 },
        { name: "ΨΩΜΙ ΤΟΣΤ", price: 0.79 },
      ],
    },
  },
  {
    name: "ΥΠΟΣΥΝΟΛΟ subtotal",
    input: `ΣΚΛΑΒΕΝΙΤΗΣ
ΑΓΓΟΥΡΙΑ 1KG 1,29
ΝΤΟΜΑΤΕΣ 1KG 1,59
ΥΠΟΣΥΝΟΛΟ 2,88
ΣΥΝΟΛΟ 2,88`,
    expected: {
      storeChain: "Sklavenitis",
      itemCount: 2,
      total: 2.88,
      items: [
        { name: "ΑΓΓΟΥΡΙΑ 1KG", price: 1.29 },
        { name: "ΝΤΟΜΑΤΕΣ 1KG", price: 1.59 },
      ],
    },
  },
  {
    name: "ΡΕΣΤΑ change amount",
    input: `LIDL
ΜΠΑΝΑΝΕΣ 1KG 1,29
ΓΑΛΑ 1L 1,89
ΣΥΝΟΛΟ 3,18
ΜΕΤΡΗΤΑ 5,00
ΡΕΣΤΑ 1,82`,
    expected: {
      storeChain: "Lidl",
      itemCount: 2,
      total: 3.18,
      items: [
        { name: "ΜΠΑΝΑΝΕΣ 1KG", price: 1.29 },
        { name: "ΓΑΛΑ 1L", price: 1.89 },
      ],
    },
  },
];
