export type Language = "en" | "hi" | "mr";

export interface TranslationStrings {
  app_title: string;
  tagline: string;
  emergency_btn: string;
  emergency_notice: string;
  disclaimer: string;
  demo_banner: string;
  welcome_title: string;
  welcome_subtitle: string;
  consent_title: string;
  consent_desc: string;
  consent_text_scope: string;
  consent_voice_scope: string;
  consent_case_link: string;
  consent_grant_btn: string;
  consent_skip_btn: string;
  checkin_title: string;
  checkin_question_1: string;
  checkin_question_2: string;
  checkin_question_3: string;
  checkin_voice_prompt: string;
  checkin_text_prompt: string;
  checkin_submit: string;
  checkin_skip: string;
  checkin_success: string;
  chat_assistant_title: string;
  chat_placeholder: string;
  chat_send: string;
  privacy_title: string;
  pause_monitoring: string;
  withdraw_consent: string;
  request_deletion: string;
  audit_title: string;
}

export const translations: Record<Language, TranslationStrings> = {
  en: {
    app_title: "RESQ-MIND",
    tagline: "Trauma-Aware Well-Being Intelligence",
    emergency_btn: "Emergency Assistance",
    emergency_notice: "Direct human helpline access — no AI models involved",
    disclaimer: "Prototype AI risk estimate — not a clinical diagnosis.",
    demo_banner: "DEMO ENVIRONMENT — SYNTHETIC DATA ONLY",
    welcome_title: "Confidential Well-Being Support",
    welcome_subtitle: "A safe, supportive space accompanying you throughout your case journey.",
    consent_title: "Informed & Revocable Consent",
    consent_desc: "You control how your information is processed. You can pause or withdraw your consent at any time without any effect on your case or legal entitlements.",
    consent_text_scope: "Allow periodic text check-ins",
    consent_voice_scope: "Allow optional voice check-ins for rhythm & tone analysis",
    consent_case_link: "Allow linking with case calendar for stress support",
    consent_grant_btn: "Confirm & Continue",
    consent_skip_btn: "Skip for now, ask me later",
    checkin_title: "Weekly Check-In",
    checkin_question_1: "How safe and secure have you felt this week?",
    checkin_question_2: "How has your sleep and physical rest been?",
    checkin_question_3: "How manageable has your daily stress level felt?",
    checkin_voice_prompt: "Record a short voice note (Optional)",
    checkin_text_prompt: "Share anything on your mind in your own words (Optional)",
    checkin_submit: "Submit Confidential Check-In",
    checkin_skip: "I don't want to answer right now",
    checkin_success: "Thank you. Your responses have been safely saved to your personal baseline.",
    chat_assistant_title: "Conversational Well-Being Guide",
    chat_placeholder: "Type how you are feeling in your own words...",
    chat_send: "Send",
    privacy_title: "Privacy & Consent Controls",
    pause_monitoring: "Pause Monitoring Temporarily",
    withdraw_consent: "Withdraw Consent Completely",
    request_deletion: "Request Complete Data Deletion",
    audit_title: "My Activity & Data Access Trail"
  },
  hi: {
    app_title: "RESQ-MIND",
    tagline: "आघात-संवेदनशील कल्याण निगरानी",
    emergency_btn: "आपातकालीन सहायता",
    emergency_notice: "सीधा मानव हेल्पलाइन संपर्क — कोई AI मॉडल शामिल नहीं",
    disclaimer: "प्रोटोटाइप AI जोखिम अनुमान — यह कोई चिकित्सीय निदान नहीं है।",
    demo_banner: "डेमो वातावरण — केवल सिंथेटिक (काल्पनिक) डेटा",
    welcome_title: "गोपनीय कल्याण सहायता",
    welcome_subtitle: "आपकी कानूनी प्रक्रिया के दौरान आपका साथ देने वाला एक सुरक्षित मंच।",
    consent_title: "सहमति और गोपनीयता",
    consent_desc: "आपका अपनी जानकारी पर पूरा नियंत्रण है। आप अपनी सहमति कभी भी रोक या वापस ले सकते हैं, इसका आपके मामले पर कोई प्रभाव नहीं पड़ेगा।",
    consent_text_scope: "समय-समय पर लिखित संदेश द्वारा हालचाल जानने की अनुमति दें",
    consent_voice_scope: "वैकल्पिक आवाज चेक-इन की अनुमति दें",
    consent_case_link: "तनाव प्रबंधन हेतु अदालत की तारीखों को जोड़ने की अनुमति दें",
    consent_grant_btn: "पुष्टि करें और आगे बढ़ें",
    consent_skip_btn: "अभी छोड़ें, बाद में पूछें",
    checkin_title: "साप्ताहिक चेक-इन",
    checkin_question_1: "इस सप्ताह आपने स्वयं को कितना सुरक्षित महसूस किया?",
    checkin_question_2: "आपकी नींद और आराम कैसा रहा?",
    checkin_question_3: "दैनिक तनाव से निपटना आपके लिए कितना संभव रहा?",
    checkin_voice_prompt: "एक छोटा वॉयस नोट रिकॉर्ड करें (वैकल्पिक)",
    checkin_text_prompt: "अपने शब्दों में कुछ भी साझा करें (वैकल्पिक)",
    checkin_submit: "गोपनीय चेक-इन जमा करें",
    checkin_skip: "मैं अभी उत्तर नहीं देना चाहता",
    checkin_success: "धन्यवाद। आपके उत्तर सुरक्षित रूप से दर्ज कर लिए गए हैं।",
    chat_assistant_title: "कल्याण सहायक बातचीत",
    chat_placeholder: "आप कैसा महसूस कर रहे हैं, यहाँ लिखें...",
    chat_send: "भेजें",
    privacy_title: "गोपनीयता एवं सहमति सेटिंग्स",
    pause_monitoring: "निगरानी को अस्थायी रूप से रोकें",
    withdraw_consent: "सहमति पूरी तरह वापस लें",
    request_deletion: "सारा डेटा हटाने का अनुरोध करें",
    audit_title: "मेरी गतिविधि एवं डेटा एक्सेस रिकॉर्ड"
  },
  mr: {
    app_title: "RESQ-MIND",
    tagline: "आघात-संवेदनशील मानसिक स्वास्थ बुद्धिमत्ता",
    emergency_btn: "तात्काळ मदत",
    emergency_notice: "थेट मानवी हेल्पलाइन संपर्क — कोणताही AI मॉडेल नाही",
    disclaimer: "प्रोटोटाइप AI जोखीम अंदाज — हे कोणतेही वैद्यकीय निदान नाही.",
    demo_banner: "डेमो वातावरण — फक्त कृत्रिम (सिंथेटिक) डेटा",
    welcome_title: "गोपनीय कल्याण सहाय्य",
    welcome_subtitle: "आपल्या न्यायालयीन प्रक्रियेदरम्यान सुरक्षित आणि विश्वासू साथीदार.",
    consent_title: "माहितीपूर्ण व ऐच्छिक संमती",
    consent_desc: "आपल्या माहितीवर आपले पूर्ण नियंत्रण आहे. आपण कधीही संमती थांबवू किंवा मागे घेऊ शकता.",
    consent_text_scope: "नियमित मजकूर चेक-इनची अनुमती द्या",
    consent_voice_scope: "पर्यायी व्हॉइस चेक-इनची अनुमती द्या",
    consent_case_link: "खटल्याच्या तारखांशी समन्वय साधण्याची अनुमती द्या",
    consent_grant_btn: "संमती देऊन पुढे जा",
    consent_skip_btn: "आत्ता नको, नंतर विचारा",
    checkin_title: "साप्ताहिक चेक-इन",
    checkin_question_1: "या आठवड्यात आपल्याला किती सुरक्षित वाटले?",
    checkin_question_2: "आपली झोप आणि विश्रांती कशी झाली?",
    checkin_question_3: "दैनिक तणाव सांभाळणे किती शक्य झाले?",
    checkin_voice_prompt: "छोटा व्हॉईस संदेश रेकॉर्ड करा (पर्यायी)",
    checkin_text_prompt: "आपल्या भावना आपल्या शब्दांत मांडा (पर्यायी)",
    checkin_submit: "गोपनीय चेक-इन नोंदवा",
    checkin_skip: "मला आत्ता उत्तर द्यायचे नाही",
    checkin_success: "धन्यवाद. आपली नोंद सुरक्षितपणे जतन करण्यात आली आहे.",
    chat_assistant_title: "संभाषण स्वास्थ मार्गदर्शक",
    chat_placeholder: "आपल्याला कसे वाटते ते येथे लिहा...",
    chat_send: "पाठवा",
    privacy_title: "गोपनीयता आणि संमती व्यवस्थापन",
    pause_monitoring: "निगरानी तात्पुरती थांबवा",
    withdraw_consent: "संमती पूर्णपणे मागे घ्या",
    request_deletion: "डेटा नष्ट करण्याची विनंती करा",
    audit_title: "माझा डेटा व वापर इतिहास"
  }
};
