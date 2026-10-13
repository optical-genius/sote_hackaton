import os
import re
from typing import Dict, Any, List, Optional
from ..models.previsit import GapQuestionResponse, ExtractEntitiesResponse

class LLMEngine:
    def __init__(self):
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.gemini_key = os.getenv("GEMINI_API_KEY")

    def determine_next_question(
        self,
        service_id: str,
        current_reason: str,
        filled_fields: Dict[str, Any],
        language: str = "fi",
        acting_as: str = "self"
    ) -> GapQuestionResponse:
        """
        Determines the next missing field in the pre-visit questionnaire
        and formulates a friendly, accessible Selkokieli question with quick replies.
        """
        lang = language.lower() if language in ["fi", "sv", "en"] else "fi"

        # Check fields in priority order:
        # 1. symptom_duration
        # 2. pain_scale
        # 3. accompanying_symptoms
        # 4. daily_impact

        duration = filled_fields.get("symptom_duration")
        pain = filled_fields.get("pain_scale")
        accompanying = filled_fields.get("accompanying_symptoms")
        impact = filled_fields.get("impact_on_daily_life")

        is_third_party = acting_as == "guardian"

        if not duration:
            if lang == "sv":
                q_text = "Hur länge har personen haft dessa symtom?" if is_third_party else "Hur länge har du haft dessa symtom?"
                replies = ["Mindre än 3 dagar", "Cirka 1 vecka", "1-2 veckor", "Över en månad"]
                tip = "Ange ungefärlig tidsperiod (t.ex. dagar eller veckor)."
            elif lang == "en":
                q_text = "How long has the person experienced these symptoms?" if is_third_party else "How long have you been experiencing these symptoms?"
                replies = ["Under 3 days", "About a week", "1–2 weeks", "More than a month"]
                tip = "Select an approximate timeframe or type in your own words."
            else: # fi
                q_text = "Kuinka kauan oireet ovat kestäneet?" if is_third_party else "Kuinka kauan tämä vaiva tai oire on kestänyt?"
                replies = ["Alle 3 päivää", "Noin viikon", "1-2 viikkoa", "Yli kuukauden"]
                tip = "Selkokieli: Valitse sopiva kesto tai kirjoita omin sanoin."

            return GapQuestionResponse(
                target_field="symptom_duration",
                question_text=q_text,
                quick_replies=replies,
                selkokieli_tip=tip,
                is_completed=False
            )

        if pain is None:
            if lang == "sv":
                q_text = "Hur skulle du beskriva smärtan på en skala från 0 till 10?"
                replies = ["1-3 (Lindrig)", "4-6 (Måttlig)", "7-8 (Svår)", "9-10 (Mycket svår)", "Ingen smärta (0)"]
                tip = "0 = ingen smärta, 10 = värsta tänkbara smärta."
            elif lang == "en":
                q_text = "How would you rate the pain on a scale from 0 to 10?"
                replies = ["1-3 (Mild)", "4-6 (Moderate)", "7-8 (Severe)", "9-10 (Extreme)", "No pain (0)"]
                tip = "0 = no pain, 10 = unbearable pain."
            else: # fi
                q_text = "Miten arvioisit kivun tai haitan voimakkuutta asteikolla 0-10?"
                replies = ["1-3 (Lievä)", "4-6 (Kohtalainen)", "7-8 (Kova)", "9-10 (Sietämätön)", "Ei kipua (0)"]
                tip = "Selkokieli: 0 tarkoittaa ei kipua lainkaan, 10 tarkoittaa pahinta mahdollista kipua."

            return GapQuestionResponse(
                target_field="pain_scale",
                question_text=q_text,
                quick_replies=replies,
                selkokieli_tip=tip,
                is_completed=False
            )

        if not accompanying or len(accompanying) == 0:
            if lang == "sv":
                q_text = "Finns det några andra samtidiga symtom eller tecken?"
                replies = ["Strålande smärta", "Svullnad eller rodnad", "Feber eller frossa", "Domningar", "Inga andra symtom"]
                tip = "Välj ett eller flera alternativ som stämmer."
            elif lang == "en":
                q_text = "Are there any other accompanying symptoms or warning signs?"
                replies = ["Radiating pain", "Swelling or redness", "Fever / Chills", "Numbness or tingling", "No other symptoms"]
                tip = "Choose relevant symptoms to help the doctor prepare."
            else: # fi
                q_text = "Liittyykö vaivaan muita samanaikaisia oireita tai tuntemuksia?"
                replies = ["Säteilykipu raajoihin", "Turvotus tai kuumotus", "Lämpöily / kuume", "Puutuminen tai pistely", "Ei muita oireita"]
                tip = "Selkokieli: Voit valita listalta tai kertoa omin sanoin."

            return GapQuestionResponse(
                target_field="accompanying_symptoms",
                question_text=q_text,
                quick_replies=replies,
                selkokieli_tip=tip,
                is_completed=False
            )

        if not impact:
            if lang == "sv":
                q_text = "Hur påverkar detta vardagen, sömnen eller arbetsförmågan?"
                replies = ["Stör nattsömnen", "Svårt att gå eller röra sig", "Behov av sjukskrivning", "Hanterbart i vardagen"]
                tip = "Berätta kort hur vaivan begränsar vardagsaktiviteter."
            elif lang == "en":
                q_text = "How does this affect daily activities, sleep, or ability to work?"
                replies = ["Disrupts sleep", "Difficulty walking/moving", "Need sick leave", "Manageable in daily life"]
                tip = "Helps determine the urgency and needed support."
            else: # fi
                q_text = "Miten vaiva vaikuttaa arkeen, nukkumiseen tai liikkumiseen?"
                replies = ["Häiritsee yöunta", "Vaikeuttaa kävelyä / liikkumista", "Tarve sairauslomalle", "Pärjää arjessa toistaiseksi"]
                tip = "Selkokieli: Kerro, estääkö vaiva normaaleja askareita tai unta."

            return GapQuestionResponse(
                target_field="impact_on_daily_life",
                question_text=q_text,
                quick_replies=replies,
                selkokieli_tip=tip,
                is_completed=False
            )

        # All core fields completed!
        if lang == "sv":
            comp_text = "Tack! Alla nödvändiga förhandsuppgifter har samlats in. Du kan nu gå vidare till sammanfattningen."
        elif lang == "en":
            comp_text = "Thank you! All required pre-visit information has been gathered. You can now proceed to the summary."
        else:
            comp_text = "Kiitos! Kaikki tarvittavat esitiedot on nyt kerätty. Voit siirtyä tarkastelemaan yhteenvetoa."

        return GapQuestionResponse(
            target_field="complete",
            question_text=comp_text,
            quick_replies=[],
            selkokieli_tip=None,
            is_completed=True
        )

    def extract_entities_from_message(
        self,
        user_input: str,
        target_field: Optional[str] = None,
        language: str = "fi",
        current_data: Optional[Dict[str, Any]] = None
    ) -> ExtractEntitiesResponse:
        """
        Parses clinical entities and parameters from natural text or speech dictation.
        Safe, structured extraction without hallucinations.
        """
        text = user_input.strip()
        text_lower = text.lower()
        extracted: Dict[str, Any] = {}
        feedback = ""

        # 1. Check for pain scale (priority: explicit context or target_field == "pain_scale")
        pain_context_match = re.search(r'(?:asteikolla|asteikko|kipuaste|kipu|kiputaso|pain|scale|skala|arviolta|noin)\s*(\d{1,2})', text_lower)
        pain_slash_match = re.search(r'\b(10|[0-9])\s*/\s*10\b', text)
        range_match = re.search(r'\b([0-9])\s*-\s*([0-9])\b', text)

        if pain_slash_match:
            val = int(pain_slash_match.group(1))
            extracted["pain_scale"] = val
            feedback += f" Kirjattu kipuaste: {val}/10."
        elif pain_context_match and int(pain_context_match.group(1)) <= 10:
            val = int(pain_context_match.group(1))
            extracted["pain_scale"] = val
            feedback += f" Kirjattu kipuaste: {val}/10."
        elif target_field == "pain_scale":
            if range_match:
                val = int(range_match.group(1))
                extracted["pain_scale"] = val
                feedback += f" Kirjattu kipuaste: {val}/10."
            else:
                num_match = re.search(r'\b(10|[0-9])\b', text)
                if num_match:
                    val = int(num_match.group(1))
                    extracted["pain_scale"] = val
                    feedback += f" Kirjattu kipuaste: {val}/10."
        elif "sietämätön" in text_lower or "erittäin kova" in text_lower or "extreme" in text_lower:
            extracted["pain_scale"] = 9
            feedback += " Kirjattu kova kipu (9/10)."
        elif "ei kipua" in text_lower or "inga smärtor" in text_lower or "no pain" in text_lower:
            extracted["pain_scale"] = 0
            feedback += " Kirjattu kipuaste: 0/10."
        elif "kohtalainen" in text_lower or "måttlig" in text_lower or "moderate" in text_lower:
            extracted["pain_scale"] = 5
            feedback += " Kirjattu kohtalainen kipu (5/10)."
        elif "lievä" in text_lower or "lindrig" in text_lower or "mild" in text_lower:
            extracted["pain_scale"] = 2
            feedback += " Kirjattu lievä kipu (2/10)."

        # 2. Check for duration
        if target_field == "symptom_duration" or any(w in text_lower for w in ["päiv", "viik", "kuuk", "dagar", "veck", "månad", "days", "week", "month", "eilis", "alkoi"]):
            dur_match = re.search(r'([0-9]+\s*(?:päivää|päivän|viikkoa|viikon|kuukautta|vrk|dagar|veckor|days|weeks)|alle\s+[0-9]+\s*\w+|noin\s+[0-9]+\s*\w+|eilisestä)', text_lower)
            if dur_match:
                extracted["symptom_duration"] = dur_match.group(0).capitalize()
                feedback += f" Kirjattu kesto: '{extracted['symptom_duration']}'."
            elif target_field == "symptom_duration":
                extracted["symptom_duration"] = text
                feedback += f" Kirjattu kesto: '{text}'."

        # Check for accompanying symptoms
        symptoms_found = []
        symptom_keywords = {
            "säteily": "Säteilykipu raajoihin",
            "strål": "Strålande smärta",
            "turvo": "Turvotus",
            "kuumo": "Kuumotus / punoitus",
            "svull": "Svullnad",
            "feber": "Kuume",
            "kuume": "Kuume",
            "lämpö": "Lämpöily",
            "puutu": "Puutuminen",
            "pistely": "Pistely raajoissa",
            "domn": "Domningar",
            "numb": "Numbness",
            "yskä": "Yskä",
            "hengenahdistus": "Hengenahdistus",
            "vinkuna": "Hengityksen vinkuna"
        }
        for kw, label in symptom_keywords.items():
            if kw in text_lower:
                symptoms_found.append(label)

        if symptoms_found:
            existing = current_data.get("accompanying_symptoms", []) if current_data else []
            combined = list(set(existing + symptoms_found))
            extracted["accompanying_symptoms"] = combined
            feedback += f" Tunnistettu oireita: {', '.join(symptoms_found)}."
        elif target_field == "accompanying_symptoms":
            if "ei muita" in text_lower or "inga" in text_lower or "none" in text_lower or "ei ole" in text_lower:
                extracted["accompanying_symptoms"] = ["Ei muita todettuja liitännäisoireita"]
                feedback += " Ei liitännäisoireita."
            else:
                extracted["accompanying_symptoms"] = [text]
                feedback += f" Kirjattu liitännäisoire: '{text}'."

        # Check for daily impact
        if target_field == "impact_on_daily_life" or any(w in text_lower for w in ["uni", "sömn", "sleep", "kävel", "gå", "walk", "työ", "jobb", "work", "arki", "vardag"]):
            extracted["impact_on_daily_life"] = text
            feedback += f" Kirjattu vaikutus arkeen: '{text}'."

        # Red-flag safety detector for SOTE triage (non-diagnostic patient safety)
        red_flags = []
        if any(w in text_lower for w in ["virtsa", "pidätys", "uloste", "urin", "sfinkter"]):
            red_flags.append("Mahdollinen ratsupaikkaoireyhtymä / virtsaamishäiriö: vaatii välittömän päivystysarvion.")
        if any(w in text_lower for w in ["rintakipu", "bröstsmärta", "chest pain", "tajunnan", "halvaus"]):
            red_flags.append("Hälyttävä rintakipu tai neurologinen oire: soitto 112 tai Päivystysapu 116 117.")

        if not feedback:
            # If target field was explicitly given, assign the text directly
            if target_field:
                extracted[target_field] = text
                feedback = f"Tieto tallennettu kenttään ({target_field})."
            else:
                extracted["additional_notes"] = text
                feedback = "Tieto kirjattu lisähuomioihin."

        if red_flags:
            feedback += f" ⚠️ HUOMIO: {' '.join(red_flags)}"

        return ExtractEntitiesResponse(
            extracted_fields=extracted,
            feedback_message=feedback.strip(),
            confidence=0.96,
            completed=len(extracted) > 0
        )

llm_engine = LLMEngine()
