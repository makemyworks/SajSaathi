/**
 * Base configuration seed (safe for production): service categories, India + all 36 states/UTs,
 * feature flags and settings. Contains NO providers, reviews or customers.
 * Cities are added by the founder from Admin → Locations → Cities as operations actually launch.
 */
import type { Ctx } from "./context";
import type { Category, FieldDef } from "./types";
import { newId } from "./util";

const F = (key: string, en: string, hi: string, type: FieldDef["type"], scope: FieldDef["scope"], extra: Partial<FieldDef> = {}): FieldDef => ({ key, label: { en, hi }, type, scope, ...extra });
const opt = (value: string, en: string, hi: string) => ({ value, label: { en, hi } });

const baseRules = { minLeadMinutes: 60, maxAdvanceDays: 30, slotStepMinutes: 15, bufferMinutes: 0, requiresConsent: false };
const basePolicy = { freeUntilHours: 4, lateFeePercent: 0, noShowFeePercent: 0 };

export function seedCategories(now: Date): Omit<Category, "_id">[] {
  return [
    {
      slug: "salon-beauty", vertical: "salon", icon: "Scissors", sortOrder: 10,
      name: { en: "Salon & grooming", hi: "सैलून और ग्रूमिंग" },
      description: { en: "Haircuts, beard, shaving, colour, hair spa, facials, threading, waxing, manicure, pedicure and grooming packages — for everyone.", hi: "हेयरकट, दाढ़ी, शेविंग, कलर, हेयर स्पा, फेशियल, थ्रेडिंग, वैक्सिंग, मैनीक्योर, पेडीक्योर और ग्रूमिंग पैकेज — सभी के लिए।" },
      providerTypes: ["Salon", "Parlour", "Barber", "Hairstylist", "Beautician"],
      requiredCredentials: [{ key: "shop_establishment", label: { en: "Shop & Establishment registration (if you have a shop)", hi: "शॉप एवं एस्टैब्लिशमेंट पंजीकरण (दुकान हो तो)" }, mandatory: false }],
      verificationRequirements: [{ en: "Government photo ID of the owner", hi: "मालिक का सरकारी फोटो पहचान पत्र" }, { en: "Photos of the shop or work", hi: "दुकान या काम की फोटो" }],
      onboardingFields: [
        F("serves", "Who do you serve?", "आप किसे सेवा देते हैं?", "multiselect", "provider", { required: true, options: [opt("men", "Men", "पुरुष"), opt("women", "Women", "महिलाएं"), opt("kids", "Children", "बच्चे")] }),
        F("chairs", "Number of chairs / stations", "कुर्सियों / स्टेशनों की संख्या", "number", "provider", { min: 1, max: 100 }),
        F("experience_years", "Years of experience", "अनुभव (वर्ष)", "number", "provider", { required: true, min: 0, max: 60 }),
        F("hygiene", "Do you use fresh towels and sterilised tools for every customer?", "क्या आप हर ग्राहक के लिए साफ़ तौलिया और कीटाणुरहित औज़ार इस्तेमाल करते हैं?", "boolean", "provider", { required: true }),
      ],
      bookingFields: [F("hair_length", "Hair length (optional)", "बालों की लंबाई (वैकल्पिक)", "select", "customer", { options: [opt("short", "Short", "छोटे"), opt("medium", "Medium", "मध्यम"), opt("long", "Long", "लंबे")] })],
      serviceFields: [F("for", "Suitable for", "किसके लिए", "multiselect", "service", { options: [opt("men", "Men", "पुरुष"), opt("women", "Women", "महिलाएं"), opt("kids", "Children", "बच्चे")] })],
      atHomeAllowed: true, inStoreAllowed: true, bookingRules: baseRules, cancellationPolicy: basePolicy,
      disallowedClaims: ["dermatologist", "doctor", "clinic", "medical"],
      features: { staff: true, packages: true, branches: true }, status: "active", visible: true, createdAt: now, updatedAt: now,
    },
    {
      slug: "bridal-occasion", vertical: "bridal", icon: "Sparkles", sortOrder: 20,
      name: { en: "Bridal & occasions", hi: "ब्राइडल और खास मौके" },
      description: { en: "Bridal, engagement and party makeup, hairstyling, mehndi, groom styling, family packages and photoshoot styling.", hi: "ब्राइडल, सगाई और पार्टी मेकअप, हेयरस्टाइलिंग, मेहंदी, दूल्हे की स्टाइलिंग, परिवार पैकेज और फोटोशूट स्टाइलिंग।" },
      providerTypes: ["Makeup artist", "Mehndi artist", "Hairstylist", "Bridal studio"],
      requiredCredentials: [{ key: "portfolio_link", label: { en: "Portfolio link (Instagram / website)", hi: "पोर्टफोलियो लिंक (इंस्टाग्राम / वेबसाइट)" }, mandatory: false }],
      verificationRequirements: [{ en: "Government photo ID", hi: "सरकारी फोटो पहचान पत्र" }, { en: "At least 5 photos of your own work", hi: "आपके अपने काम की कम से कम 5 फोटो" }],
      onboardingFields: [
        F("experience_years", "Years of experience", "अनुभव (वर्ष)", "number", "provider", { required: true, min: 0, max: 60 }),
        F("travels", "Do you travel to venues?", "क्या आप वेन्यू पर जाते हैं?", "boolean", "provider"),
        F("products", "Main product brands you use", "मुख्य प्रोडक्ट ब्रांड जो आप इस्तेमाल करते हैं", "text", "provider"),
      ],
      bookingFields: [
        F("event_date", "Event date", "कार्यक्रम की तारीख", "date", "customer", { required: true }),
        F("people", "Number of people", "लोगों की संख्या", "number", "customer", { min: 1, max: 30 }),
        F("venue", "Venue / city", "वेन्यू / शहर", "text", "customer"),
      ],
      serviceFields: [F("trial_included", "Trial included", "ट्रायल शामिल", "boolean", "service")],
      atHomeAllowed: true, inStoreAllowed: true,
      bookingRules: { ...baseRules, minLeadMinutes: 24 * 60, maxAdvanceDays: 365, slotStepMinutes: 30 },
      cancellationPolicy: { freeUntilHours: 72, lateFeePercent: 25, noShowFeePercent: 50 },
      features: { staff: true, packages: true }, status: "active", visible: true, createdAt: now, updatedAt: now,
    },
    {
      slug: "massage-wellness", vertical: "wellness", icon: "Leaf", sortOrder: 30,
      name: { en: "Massage & wellness", hi: "मसाज और वेलनेस" },
      description: { en: "Professional, non-sexual relaxation massage, spa appointments and wellness sessions by verified therapists.", hi: "सत्यापित थेरेपिस्ट द्वारा पेशेवर, गैर-यौन रिलैक्सेशन मसाज, स्पा अपॉइंटमेंट और वेलनेस सेशन।" },
      providerTypes: ["Spa", "Massage therapist", "Wellness centre"],
      requiredCredentials: [
        { key: "training_certificate", label: { en: "Massage / spa therapy training certificate", hi: "मसाज / स्पा थेरेपी प्रशिक्षण प्रमाणपत्र" }, mandatory: true },
        { key: "local_licence", label: { en: "Local licence or registration, where your city requires one", hi: "स्थानीय लाइसेंस या पंजीकरण, जहाँ आपके शहर में ज़रूरी हो" }, mandatory: false },
      ],
      verificationRequirements: [{ en: "Government photo ID", hi: "सरकारी फोटो पहचान पत्र" }, { en: "Training certificate", hi: "प्रशिक्षण प्रमाणपत्र" }, { en: "Signed Provider Code of Conduct", hi: "हस्ताक्षरित प्रदाता आचार संहिता" }],
      onboardingFields: [
        F("experience_years", "Years of professional experience", "पेशेवर अनुभव (वर्ष)", "number", "provider", { required: true, min: 0, max: 60 }),
        F("code_of_conduct", "I will provide only professional, non-sexual services and respect customer boundaries at all times", "मैं केवल पेशेवर, गैर-यौन सेवाएं दूंगा/दूंगी और हमेशा ग्राहक की सीमाओं का सम्मान करूंगा/करूंगी", "boolean", "provider", { required: true }),
        F("linen", "Fresh linen and sanitised equipment for every client", "हर ग्राहक के लिए साफ़ चादर और सैनिटाइज़्ड उपकरण", "boolean", "provider", { required: true }),
      ],
      bookingFields: [
        F("pressure", "Preferred pressure", "पसंदीदा दबाव", "select", "customer", { options: [opt("light", "Light", "हल्का"), opt("medium", "Medium", "मध्यम"), opt("firm", "Firm", "तेज़")] }),
        F("therapist_pref", "Therapist preference (optional)", "थेरेपिस्ट पसंद (वैकल्पिक)", "select", "customer", { options: [opt("any", "No preference", "कोई भी"), opt("female", "Female therapist", "महिला थेरेपिस्ट"), opt("male", "Male therapist", "पुरुष थेरेपिस्ट")] }),
        F("health_note", "Anything the therapist should avoid? (injury, pregnancy, etc.)", "थेरेपिस्ट को किस चीज़ से बचना चाहिए? (चोट, गर्भावस्था आदि)", "textarea", "customer", { private: true }),
      ],
      serviceFields: [],
      atHomeAllowed: true, inStoreAllowed: true,
      bookingRules: { ...baseRules, bufferMinutes: 15, requiresConsent: true, consentText: { en: "This is a professional, non-sexual wellness service. It is not medical treatment. Either party may stop the session at any time if they feel uncomfortable. Inappropriate requests or behaviour lead to an immediate end of the session and removal from Saj Saathi. If you have a medical condition, please consult a doctor first.", hi: "यह एक पेशेवर, गैर-यौन वेलनेस सेवा है। यह चिकित्सा उपचार नहीं है। असहज महसूस होने पर कोई भी पक्ष किसी भी समय सेशन रोक सकता है। अनुचित माँग या व्यवहार पर सेशन तुरंत बंद होगा और Saj Saathi से हटा दिया जाएगा। कोई बीमारी हो तो पहले डॉक्टर से सलाह लें।" } },
      cancellationPolicy: { freeUntilHours: 6, lateFeePercent: 20, noShowFeePercent: 50 },
      safetyNotice: { en: "Professional, non-sexual services only. Not a medical treatment.", hi: "केवल पेशेवर, गैर-यौन सेवाएं। यह चिकित्सा उपचार नहीं है।" },
      disallowedClaims: ["doctor", "physiotherapist", "physiotherapy", "cure", "treatment", "happy ending", "body to body", "erotic", "sensual", "nuru", "b2b"],
      features: { staff: true, packages: true }, status: "active", visible: true, createdAt: now, updatedAt: now,
    },
    {
      slug: "pet-grooming", vertical: "pet", icon: "PawPrint", sortOrder: 40,
      name: { en: "Pet grooming", hi: "पेट ग्रूमिंग" },
      description: { en: "Bathing, haircuts, nail clipping and coat care for dogs and cats — at a groomer or at home. Groomers are not veterinarians.", hi: "कुत्तों और बिल्लियों के लिए नहलाना, बाल काटना, नाखून काटना और कोट की देखभाल — ग्रूमर के यहाँ या घर पर। ग्रूमर पशु चिकित्सक नहीं होते।" },
      providerTypes: ["Pet grooming salon", "Mobile pet groomer"],
      requiredCredentials: [{ key: "grooming_training", label: { en: "Pet grooming training or experience proof", hi: "पेट ग्रूमिंग प्रशिक्षण या अनुभव का प्रमाण" }, mandatory: false }],
      verificationRequirements: [{ en: "Government photo ID", hi: "सरकारी फोटो पहचान पत्र" }, { en: "Photos of grooming setup", hi: "ग्रूमिंग सेटअप की फोटो" }],
      onboardingFields: [
        F("animals", "Animals you groom", "आप किन जानवरों की ग्रूमिंग करते हैं", "multiselect", "provider", { required: true, options: [opt("dog", "Dogs", "कुत्ते"), opt("cat", "Cats", "बिल्लियाँ")] }),
        F("max_size", "Largest dog size you handle", "आप कितने बड़े कुत्ते संभालते हैं", "select", "provider", { options: [opt("small", "Small (under 10 kg)", "छोटा (10 किलो से कम)"), opt("medium", "Medium (10–25 kg)", "मध्यम (10–25 किलो)"), opt("large", "Large (over 25 kg)", "बड़ा (25 किलो से ज़्यादा)")] }),
        F("experience_years", "Years of grooming experience", "ग्रूमिंग अनुभव (वर्ष)", "number", "provider", { required: true, min: 0, max: 50 }),
      ],
      bookingFields: [
        F("pet_type", "Pet", "पालतू", "select", "customer", { required: true, options: [opt("dog", "Dog", "कुत्ता"), opt("cat", "Cat", "बिल्ली")] }),
        F("pet_size", "Size", "आकार", "select", "customer", { required: true, options: [opt("small", "Small", "छोटा"), opt("medium", "Medium", "मध्यम"), opt("large", "Large", "बड़ा")] }),
        F("breed", "Breed (optional)", "नस्ल (वैकल्पिक)", "text", "customer"),
        F("handling", "Special handling notes (nervous, bites, recent surgery…)", "विशेष ध्यान (डरता है, काटता है, हाल में सर्जरी…)", "textarea", "customer"),
        F("vaccinated", "Vaccinations are up to date", "टीकाकरण अद्यतन है", "boolean", "customer", { required: true }),
      ],
      serviceFields: [F("sizes", "Pet sizes", "पालतू का आकार", "multiselect", "service", { options: [opt("small", "Small", "छोटा"), opt("medium", "Medium", "मध्यम"), opt("large", "Large", "बड़ा")] })],
      atHomeAllowed: true, inStoreAllowed: true,
      bookingRules: { ...baseRules, bufferMinutes: 15, requiresConsent: true, consentText: { en: "Groomers provide grooming only, not veterinary care. If your pet seems unwell, the groomer may stop and suggest you see a vet.", hi: "ग्रूमर केवल ग्रूमिंग करते हैं, पशु चिकित्सा नहीं। पालतू अस्वस्थ लगे तो ग्रूमर काम रोककर पशु चिकित्सक को दिखाने की सलाह दे सकते हैं।" } },
      cancellationPolicy: basePolicy,
      safetyNotice: { en: "Grooming only — groomers are not veterinarians.", hi: "केवल ग्रूमिंग — ग्रूमर पशु चिकित्सक नहीं हैं।" },
      disallowedClaims: ["vet", "veterinarian", "veterinary", "doctor", "treatment", "cure"],
      features: { staff: true, petProfile: true }, status: "active", visible: true, createdAt: now, updatedAt: now,
    },
    {
      slug: "senior-fitness", vertical: "senior_fitness", icon: "HeartHandshake", sortOrder: 50,
      name: { en: "Active ageing & senior fitness", hi: "बुज़ुर्गों के लिए फ़िटनेस" },
      description: { en: "Gentle exercise, balance and flexibility sessions, walking companions and low-impact home fitness with experienced trainers. Not medical or physiotherapy care.", hi: "अनुभवी ट्रेनर के साथ हल्का व्यायाम, संतुलन और लचीलापन, वॉकिंग साथी और घर पर कम-प्रभाव वाली फ़िटनेस। यह चिकित्सा या फ़िज़ियोथेरेपी नहीं है।" },
      providerTypes: ["Fitness trainer", "Yoga instructor", "Walking companion"],
      requiredCredentials: [
        { key: "fitness_certificate", label: { en: "Fitness / yoga instructor certificate", hi: "फ़िटनेस / योग प्रशिक्षक प्रमाणपत्र" }, mandatory: true },
        { key: "first_aid", label: { en: "First-aid / CPR certificate", hi: "प्राथमिक चिकित्सा / CPR प्रमाणपत्र" }, mandatory: true },
      ],
      verificationRequirements: [{ en: "Government photo ID", hi: "सरकारी फोटो पहचान पत्र" }, { en: "Fitness and first-aid certificates", hi: "फ़िटनेस और प्राथमिक चिकित्सा प्रमाणपत्र" }],
      onboardingFields: [
        F("experience_years", "Years training older adults", "बुज़ुर्गों को प्रशिक्षण का अनुभव (वर्ष)", "number", "provider", { required: true, min: 0, max: 50 }),
        F("languages", "Languages you speak", "आप कौन-सी भाषाएँ बोलते हैं", "text", "provider", { required: true }),
        F("no_medical_claims", "I understand I must not present myself as a doctor or physiotherapist or promise medical results", "मैं समझता/समझती हूँ कि मुझे स्वयं को डॉक्टर या फ़िज़ियोथेरेपिस्ट नहीं बताना है और चिकित्सा परिणाम का वादा नहीं करना है", "boolean", "provider", { required: true }),
      ],
      bookingFields: [
        F("participant_name", "Participant's name", "प्रतिभागी का नाम", "text", "customer", { required: true }),
        F("participant_age", "Participant's age", "प्रतिभागी की उम्र", "number", "customer", { min: 40, max: 110 }),
        F("doctor_ok", "The participant's doctor has said light exercise is okay (recommended)", "प्रतिभागी के डॉक्टर ने हल्के व्यायाम की अनुमति दी है (सलाह दी जाती है)", "boolean", "customer"),
        F("mobility_note", "Mobility needs or things to avoid", "चलने-फिरने की ज़रूरतें या जिनसे बचना है", "textarea", "customer", { private: true }),
        F("emergency_contact", "Emergency contact (name & phone)", "आपातकालीन संपर्क (नाम और फ़ोन)", "text", "customer", { required: true, private: true }),
      ],
      serviceFields: [F("intensity", "Intensity", "तीव्रता", "select", "service", { options: [opt("very_light", "Very light", "बहुत हल्का"), opt("light", "Light", "हल्का"), opt("moderate", "Moderate", "मध्यम")] })],
      atHomeAllowed: true, inStoreAllowed: true,
      bookingRules: { ...baseRules, minLeadMinutes: 12 * 60, slotStepMinutes: 30, bufferMinutes: 15, requiresConsent: true, consentText: { en: "Trainers on Saj Saathi are not doctors or physiotherapists and do not provide medical treatment. Exercise carries some risk; please check with a doctor before starting, stop if you feel pain, dizziness or breathlessness, and call emergency services (112) if needed.", hi: "Saj Saathi के ट्रेनर डॉक्टर या फ़िज़ियोथेरेपिस्ट नहीं हैं और चिकित्सा उपचार नहीं करते। व्यायाम में कुछ जोखिम होता है; शुरू करने से पहले डॉक्टर से पूछें, दर्द, चक्कर या साँस फूलने पर रुकें और ज़रूरत हो तो आपातकालीन सेवा (112) पर कॉल करें।" } },
      cancellationPolicy: { freeUntilHours: 12, lateFeePercent: 0, noShowFeePercent: 0 },
      safetyNotice: { en: "General fitness support only — not medical care or physiotherapy.", hi: "केवल सामान्य फ़िटनेस सहायता — चिकित्सा या फ़िज़ियोथेरेपी नहीं।" },
      disallowedClaims: ["doctor", "physiotherapist", "physiotherapy", "physio", "rehabilitation", "rehab", "cure", "treatment", "therapy for"],
      features: { staff: false }, status: "active", visible: true, createdAt: now, updatedAt: now,
    },
  ];
}

export const INDIA_STATES: [string, string, "state" | "union_territory"][] = [
  ["AP", "Andhra Pradesh", "state"], ["AR", "Arunachal Pradesh", "state"], ["AS", "Assam", "state"], ["BR", "Bihar", "state"],
  ["CG", "Chhattisgarh", "state"], ["GA", "Goa", "state"], ["GJ", "Gujarat", "state"], ["HR", "Haryana", "state"],
  ["HP", "Himachal Pradesh", "state"], ["JH", "Jharkhand", "state"], ["KA", "Karnataka", "state"], ["KL", "Kerala", "state"],
  ["MP", "Madhya Pradesh", "state"], ["MH", "Maharashtra", "state"], ["MN", "Manipur", "state"], ["ML", "Meghalaya", "state"],
  ["MZ", "Mizoram", "state"], ["NL", "Nagaland", "state"], ["OD", "Odisha", "state"], ["PB", "Punjab", "state"],
  ["RJ", "Rajasthan", "state"], ["SK", "Sikkim", "state"], ["TN", "Tamil Nadu", "state"], ["TS", "Telangana", "state"],
  ["TR", "Tripura", "state"], ["UP", "Uttar Pradesh", "state"], ["UK", "Uttarakhand", "state"], ["WB", "West Bengal", "state"],
  ["AN", "Andaman and Nicobar Islands", "union_territory"], ["CH", "Chandigarh", "union_territory"],
  ["DH", "Dadra and Nagar Haveli and Daman and Diu", "union_territory"], ["DL", "Delhi", "union_territory"],
  ["JK", "Jammu and Kashmir", "union_territory"], ["LA", "Ladakh", "union_territory"], ["LD", "Lakshadweep", "union_territory"],
  ["PY", "Puducherry", "union_territory"],
];

export const DEFAULT_FLAGS = [
  { key: "online_payments", enabled: true, description: "Show 'Pay online' when Razorpay keys are configured" },
  { key: "memberships", enabled: false, description: "Customer membership pages" },
  { key: "referrals", enabled: false, description: "Referral programme page" },
  { key: "care_products", enabled: false, description: "Saj Saathi Care — personal-care products (no checkout built)" },
  { key: "pro_supplies", enabled: false, description: "Saj Saathi Pro — professional supplies (no checkout built)" },
  { key: "academy", enabled: false, description: "Saj Saathi Academy" },
  { key: "careers", enabled: false, description: "Saj Saathi Careers" },
  { key: "maintenance_mode", enabled: false, description: "Customer site shows a maintenance notice and bookings pause" },
];

export async function seedBase(ctx: Ctx) {
  const now = ctx.now();
  const result = { categories: 0, states: 0, flags: 0, countries: 0 };
  for (const c of seedCategories(now)) {
    if (!(await ctx.repo.col<Category>("categories").findOne({ slug: c.slug }))) {
      await ctx.repo.col<Category>("categories").insertOne({ _id: newId(), ...c });
      result.categories++;
    }
  }
  const countries = ctx.repo.col<{ _id: string; code: string }>("countries");
  if (!(await countries.findOne({ code: "IN" }))) {
    await countries.insertOne({ _id: newId(), code: "IN", name: "India", currency: "INR", timezone: "Asia/Kolkata", paymentGateway: "razorpay", active: true, updatedAt: now } as never);
    result.countries++;
  }
  const states = ctx.repo.col<{ _id: string; code: string }>("states");
  for (const [code, name, type] of INDIA_STATES) {
    if (!(await states.findOne({ code }))) { await states.insertOne({ _id: newId(), code, name, type, country: "IN", active: true, updatedAt: now } as never); result.states++; }
  }
  const flags = ctx.repo.col<{ _id: string; key: string }>("feature_flags");
  for (const f of DEFAULT_FLAGS) if (!(await flags.findOne({ key: f.key }))) { await flags.insertOne({ _id: newId(), ...f, updatedAt: now } as never); result.flags++; }
  const settings = ctx.repo.col<{ _id: string }>("settings");
  if (!(await settings.findOne({ _id: "platform" }))) {
    await settings.insertOne({ _id: "platform", bookingFeePaise: 0, bookingFeeTaxPercent: 18, defaultCommissionPercent: 10, supportEmail: "", supportPhone: "", maintenanceMessage: "", updatedAt: now } as never);
  }
  return result;
}
