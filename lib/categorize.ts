import type { Category } from "./domain";

interface BrandRule {
  pattern: RegExp;
  merchant: string;
  category: Category;
}

/**
 * Indian merchant rules. Ordered most specific first. A missing match falls back
 * to generic category keywords and finally "Other" (or "Income" for credits).
 */
const BRANDS: BrandRule[] = [
  // food delivery & restaurants
  { pattern: /swiggy\s*instamart/i, merchant: "Swiggy Instamart", category: "Groceries" },
  { pattern: /swiggy/i, merchant: "Swiggy", category: "Food & dining" },
  { pattern: /zomato/i, merchant: "Zomato", category: "Food & dining" },
  { pattern: /eatsure|dominos|domino's|pizza hut|mcdonald|kfc|burger king|subway/i, merchant: "Quick service restaurant", category: "Food & dining" },
  { pattern: /third wave|blue tokai|starbucks|chaayos|chai point|cafe coffee day|ccd/i, merchant: "Cafe", category: "Food & dining" },
  { pattern: /faasos|behrouz|ovenstory|box8|freshmenu|eatfit/i, merchant: "Cloud kitchen", category: "Food & dining" },
  { pattern: /restaurant|dhaba|biryani|hotel.*food|bakery|sweets/i, merchant: "Restaurant", category: "Food & dining" },

  // groceries
  { pattern: /blinkit|grofers/i, merchant: "Blinkit", category: "Groceries" },
  { pattern: /zepto/i, merchant: "Zepto", category: "Groceries" },
  { pattern: /bigbasket|bbdaily|bbnow/i, merchant: "BigBasket", category: "Groceries" },
  { pattern: /dmart|d-mart/i, merchant: "DMart", category: "Groceries" },
  { pattern: /reliance fresh|reliance smart|more retail|spencer|nature's basket|supermarket|grocery|kirana|provision/i, merchant: "Grocery store", category: "Groceries" },

  // shopping
  { pattern: /amazon|amzn/i, merchant: "Amazon", category: "Shopping" },
  { pattern: /flipkart/i, merchant: "Flipkart", category: "Shopping" },
  { pattern: /myntra/i, merchant: "Myntra", category: "Shopping" },
  { pattern: /ajio|nykaa|meesho|tatacliq|snapdeal|firstcry|decathlon|croma|reliance digital|vijay sales/i, merchant: "Retail", category: "Shopping" },

  // transport & fuel
  { pattern: /uber/i, merchant: "Uber", category: "Transport" },
  { pattern: /ola\b|olacabs/i, merchant: "Ola", category: "Transport" },
  { pattern: /rapido/i, merchant: "Rapido", category: "Transport" },
  { pattern: /irctc|indian rail/i, merchant: "Indian Railways", category: "Transport" },
  { pattern: /redbus|abhibus/i, merchant: "Bus booking", category: "Transport" },
  { pattern: /indigo|air india|vistara|akasa|spicejet/i, merchant: "Airline", category: "Transport" },
  { pattern: /hp pay|iocl|bpcl|indian oil|petrol|fuel|diesel|fastag|parking|metro rail|bmrcl|dmrc/i, merchant: "Fuel & transit", category: "Transport" },

  // subscriptions & entertainment
  { pattern: /netflix/i, merchant: "Netflix", category: "Entertainment" },
  { pattern: /prime video|amazon prime|amzn prime/i, merchant: "Prime Video", category: "Entertainment" },
  { pattern: /hotstar|disney/i, merchant: "Disney+ Hotstar", category: "Entertainment" },
  { pattern: /zee5|sonyliv|jiocinema|jio cinema|aha\b/i, merchant: "Streaming", category: "Entertainment" },
  { pattern: /spotify|gaana|wynk|youtube premium|apple music/i, merchant: "Music streaming", category: "Entertainment" },
  { pattern: /google one|icloud|apple\.com|dropbox/i, merchant: "Cloud storage", category: "Entertainment" },
  { pattern: /bookmyshow|pvr|inox|cinema/i, merchant: "Movies", category: "Entertainment" },
  { pattern: /audible|kindle unlimited/i, merchant: "Audible", category: "Entertainment" },

  // utilities & telecom
  { pattern: /airtel/i, merchant: "Airtel", category: "Utilities" },
  { pattern: /jio|reliance jio/i, merchant: "Jio", category: "Utilities" },
  { pattern: /vodafone|vi postpaid|bsnl/i, merchant: "Telecom", category: "Utilities" },
  { pattern: /act fibernet|excitel|hathway|broadband|wifi/i, merchant: "Broadband", category: "Utilities" },
  { pattern: /electricity|tata power|adani electricity|bescom|mseb|torrent power|cesc/i, merchant: "Electricity", category: "Utilities" },
  { pattern: /indane|hp gas|bharat gas|mahanagar gas|gas bill|water bill|municipal/i, merchant: "Gas & water", category: "Utilities" },

  // housing
  { pattern: /rent|landlord|nobroker|housing society|maintenance/i, merchant: "Rent & housing", category: "Rent" },
  { pattern: /home loan|housing loan/i, merchant: "Home loan", category: "EMI & loans" },

  // insurance
  { pattern: /lic\b|life insurance|policybazaar|acko|digit insurance|star health|hdfc life|icici pru|max life|term plan|insurance/i, merchant: "Insurance", category: "Insurance" },

  // health
  { pattern: /apollo|pharmeasy|netmeds|1mg|medplus|practo|hospital|clinic|diagnostic|dental|lab test/i, merchant: "Health", category: "Health" },

  // education
  { pattern: /udemy|coursera|unacademy|byju|vedantu|school|college|tuition|exam fee|university/i, merchant: "Education", category: "Education" },

  // debt & investments
  { pattern: /emi\b|loan emi|credit card payment|card payment|nach|auto debit|mandate|bajaj finance|hdb financial/i, merchant: "Loan payment", category: "EMI & loans" },
  { pattern: /zerodha|groww|kuvera|indmoney|upstox|angel one|mutual fund|sip\b|nps|ppf|etf/i, merchant: "Investment", category: "Investments" },

  // cash, tax, giving, income
  { pattern: /atm|cash withdrawal|cash dep/i, merchant: "Cash", category: "Cash" },
  { pattern: /income tax|advance tax|tds|gst payment/i, merchant: "Tax", category: "Taxes" },
  { pattern: /donation|ngo|temple|charity|give india/i, merchant: "Giving", category: "Giving" },
  { pattern: /salary|payroll|stipend|wages/i, merchant: "Salary", category: "Income" },
  { pattern: /interest credit|fd interest|savings interest/i, merchant: "Interest", category: "Income" },
  { pattern: /refund|reversal|cashback/i, merchant: "Refund", category: "Income" },
  { pattern: /freelance|consulting|invoice|professional fees/i, merchant: "Freelance income", category: "Income" },
];

const GENERIC: { pattern: RegExp; category: Category }[] = [
  { pattern: /upi|neft|imps|rtgs|transfer|sent to|received from/i, category: "Other" },
  { pattern: /charge|fee|gst|penalty/i, category: "Other" },
];

export function classify(
  description: string,
  direction: "debit" | "credit"
): { merchant: string; category: Category } {
  const text = description.replace(/\s+/g, " ").trim();
  for (const rule of BRANDS) {
    if (rule.pattern.test(text)) return { merchant: rule.merchant, category: rule.category };
  }
  for (const rule of GENERIC) {
    if (rule.pattern.test(text)) {
      return {
        merchant: cleanMerchant(text),
        category: direction === "credit" ? "Income" : rule.category,
      };
    }
  }
  return {
    merchant: cleanMerchant(text),
    category: direction === "credit" ? "Income" : "Other",
  };
}

function cleanMerchant(text: string): string {
  const cleaned = text
    .replace(/\b(upi|neft|imps|rtgs|ach|nach|pos|vps|atm|txn|ref|utr)\b/gi, " ")
    .replace(/[0-9]{6,}/g, " ")
    .replace(/[^a-zA-Z0-9&.' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean).slice(0, 3).join(" ");
  const value = words || "Transaction";
  return value
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .slice(0, 40);
}

export function normalizeMerchantKey(merchant: string | null): string {
  return (merchant ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
