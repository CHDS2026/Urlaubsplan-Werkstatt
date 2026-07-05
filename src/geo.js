// Regionen europäischer Länder zum Abhaken (deutsche Namen).
export const EUROPE_REGIONS = {
  Deutschland: ["Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"],
  Österreich: ["Burgenland", "Kärnten", "Niederösterreich", "Oberösterreich", "Salzburg", "Steiermark", "Tirol", "Vorarlberg", "Wien"],
  Schweiz: ["Aargau", "Appenzell Ausserrhoden", "Appenzell Innerrhoden", "Basel-Landschaft", "Basel-Stadt", "Bern", "Freiburg", "Genf", "Glarus", "Graubünden", "Jura", "Luzern", "Neuenburg", "Nidwalden", "Obwalden", "Schaffhausen", "Schwyz", "Solothurn", "St. Gallen", "Tessin", "Thurgau", "Uri", "Waadt", "Wallis", "Zug", "Zürich"],
  Polen: ["Niederschlesien", "Kujawien-Pommern", "Lublin", "Lebus", "Łódź", "Kleinpolen", "Masowien", "Oppeln", "Karpatenvorland", "Podlachien", "Pommern", "Schlesien", "Heiligkreuz", "Ermland-Masuren", "Großpolen", "Westpommern"],
  Italien: ["Abruzzen", "Aostatal", "Apulien", "Basilikata", "Kalabrien", "Kampanien", "Emilia-Romagna", "Friaul-Julisch Venetien", "Latium", "Ligurien", "Lombardei", "Marken", "Molise", "Piemont", "Sardinien", "Sizilien", "Toskana", "Trentino-Südtirol", "Umbrien", "Venetien"],
  Frankreich: ["Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire", "Korsika", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Okzitanien", "Pays de la Loire", "Provence-Alpes-Côte d'Azur"],
  Spanien: ["Andalusien", "Aragonien", "Asturien", "Balearen", "Baskenland", "Kanarische Inseln", "Kantabrien", "Kastilien-La Mancha", "Kastilien und León", "Katalonien", "Extremadura", "Galicien", "La Rioja", "Madrid", "Murcia", "Navarra", "Valencia"],
  Niederlande: ["Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen", "Limburg", "Noord-Brabant", "Noord-Holland", "Overijssel", "Utrecht", "Zeeland", "Zuid-Holland"],
  Belgien: ["Flandern", "Wallonien", "Brüssel"],
  Portugal: ["Norte", "Centro", "Lissabon", "Alentejo", "Algarve", "Azoren", "Madeira"],
  Tschechien: ["Prag", "Mittelböhmen", "Südböhmen", "Pilsen", "Karlsbad", "Aussig", "Reichenberg", "Königgrätz", "Pardubice", "Vysočina", "Südmähren", "Olmütz", "Zlín", "Mährisch-Schlesien"],
  Griechenland: ["Attika", "Zentralmakedonien", "Kreta", "Thessalien", "Peloponnes", "Epirus", "Westgriechenland", "Südägäis", "Nordägäis", "Ionische Inseln"],
};

export const regionKey = (land, region) => `${land}::${region}`;
export const europeCountries = Object.keys(EUROPE_REGIONS);

// Namens-Normalisierung (klein, ohne Akzente/Sonderzeichen) für robustes Vergleichen
export const normCountry = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

// Kartendaten nutzen teils Kurz-/Sonderschreibweisen -> auf Standardnamen abbilden
export const NE_ALIAS = {
  "Bosnia and Herz.": "Bosnia and Herzegovina", "Dem. Rep. Congo": "Democratic Republic of the Congo",
  "Congo": "Republic of the Congo", "Central African Rep.": "Central African Republic",
  "S. Sudan": "South Sudan", "Eq. Guinea": "Equatorial Guinea", "W. Sahara": "Western Sahara",
  "Dominican Rep.": "Dominican Republic", "Solomon Is.": "Solomon Islands", "Falkland Is.": "Falkland Islands",
  "Timor-Leste": "East Timor", "Côte d'Ivoire": "Ivory Coast", "eSwatini": "Eswatini",
  "Czechia": "Czech Republic", "Dem. Rep. Korea": "North Korea", "Korea": "South Korea",
  "Macedonia": "North Macedonia", "Republic of Serbia": "Serbia", "United Republic of Tanzania": "Tanzania",
  "The Bahamas": "Bahamas", "Cabo Verde": "Cape Verde", "Lao PDR": "Laos", "Brunei Darussalam": "Brunei",
  "Republic of Korea": "South Korea",
};

// Vollständige Zuordnung deutscher -> englischer (Karten-)Ländernamen
export const COUNTRY_DE_EN = {
  // Europa
  "Deutschland": "Germany", "Österreich": "Austria", "Schweiz": "Switzerland", "Liechtenstein": "Liechtenstein",
  "Italien": "Italy", "Frankreich": "France", "Spanien": "Spain", "Portugal": "Portugal", "Andorra": "Andorra",
  "Niederlande": "Netherlands", "Belgien": "Belgium", "Luxemburg": "Luxembourg", "Monaco": "Monaco",
  "Polen": "Poland", "Tschechien": "Czech Republic", "Slowakei": "Slovakia", "Ungarn": "Hungary",
  "Slowenien": "Slovenia", "Kroatien": "Croatia", "Bosnien und Herzegowina": "Bosnia and Herzegovina",
  "Serbien": "Serbia", "Montenegro": "Montenegro", "Kosovo": "Kosovo", "Albanien": "Albania",
  "Nordmazedonien": "North Macedonia", "Griechenland": "Greece", "Bulgarien": "Bulgaria", "Rumänien": "Romania",
  "Moldau": "Moldova", "Moldawien": "Moldova", "Ukraine": "Ukraine", "Belarus": "Belarus", "Weißrussland": "Belarus",
  "Russland": "Russia", "Vereinigtes Königreich": "United Kingdom", "Großbritannien": "United Kingdom",
  "England": "United Kingdom", "Schottland": "United Kingdom", "Wales": "United Kingdom", "Irland": "Ireland",
  "Norwegen": "Norway", "Schweden": "Sweden", "Finnland": "Finland", "Dänemark": "Denmark", "Island": "Iceland",
  "Estland": "Estonia", "Lettland": "Latvia", "Litauen": "Lithuania", "Malta": "Malta", "Zypern": "Cyprus",
  "San Marino": "San Marino", "Vatikanstadt": "Vatican", "Vatikan": "Vatican",
  // Asien
  "Türkei": "Turkey", "Georgien": "Georgia", "Armenien": "Armenia", "Aserbaidschan": "Azerbaijan",
  "Kasachstan": "Kazakhstan", "Usbekistan": "Uzbekistan", "Turkmenistan": "Turkmenistan",
  "Kirgisistan": "Kyrgyzstan", "Tadschikistan": "Tajikistan", "Afghanistan": "Afghanistan", "Pakistan": "Pakistan",
  "Indien": "India", "Nepal": "Nepal", "Bhutan": "Bhutan", "Bangladesch": "Bangladesh", "Sri Lanka": "Sri Lanka",
  "Malediven": "Maldives", "China": "China", "Mongolei": "Mongolia", "Japan": "Japan", "Südkorea": "South Korea",
  "Nordkorea": "North Korea", "Taiwan": "Taiwan", "Myanmar": "Myanmar", "Birma": "Myanmar", "Thailand": "Thailand",
  "Laos": "Laos", "Kambodscha": "Cambodia", "Vietnam": "Vietnam", "Malaysia": "Malaysia", "Singapur": "Singapore",
  "Indonesien": "Indonesia", "Brunei": "Brunei", "Philippinen": "Philippines", "Osttimor": "East Timor",
  "Iran": "Iran", "Irak": "Iraq", "Syrien": "Syria", "Libanon": "Lebanon", "Israel": "Israel",
  "Palästina": "Palestine", "Jordanien": "Jordan", "Saudi-Arabien": "Saudi Arabia", "Jemen": "Yemen",
  "Oman": "Oman", "Vereinigte Arabische Emirate": "United Arab Emirates", "Katar": "Qatar", "Bahrain": "Bahrain",
  "Kuwait": "Kuwait",
  // Afrika
  "Ägypten": "Egypt", "Libyen": "Libya", "Tunesien": "Tunisia", "Algerien": "Algeria", "Marokko": "Morocco",
  "Westsahara": "Western Sahara", "Mauretanien": "Mauritania", "Mali": "Mali", "Niger": "Niger",
  "Tschad": "Chad", "Sudan": "Sudan", "Südsudan": "South Sudan", "Eritrea": "Eritrea", "Dschibuti": "Djibouti",
  "Äthiopien": "Ethiopia", "Somalia": "Somalia", "Kenia": "Kenya", "Uganda": "Uganda", "Ruanda": "Rwanda",
  "Burundi": "Burundi", "Tansania": "Tanzania", "Demokratische Republik Kongo": "Democratic Republic of the Congo",
  "Republik Kongo": "Republic of the Congo", "Gabun": "Gabon", "Äquatorialguinea": "Equatorial Guinea",
  "Kamerun": "Cameroon", "Zentralafrikanische Republik": "Central African Republic", "Nigeria": "Nigeria",
  "Benin": "Benin", "Togo": "Togo", "Ghana": "Ghana", "Elfenbeinküste": "Ivory Coast",
  "Burkina Faso": "Burkina Faso", "Senegal": "Senegal", "Gambia": "Gambia", "Guinea": "Guinea",
  "Guinea-Bissau": "Guinea-Bissau", "Sierra Leone": "Sierra Leone", "Liberia": "Liberia", "Kap Verde": "Cape Verde",
  "Angola": "Angola", "Sambia": "Zambia", "Malawi": "Malawi", "Mosambik": "Mozambique", "Simbabwe": "Zimbabwe",
  "Botswana": "Botswana", "Namibia": "Namibia", "Südafrika": "South Africa", "Lesotho": "Lesotho",
  "Eswatini": "Eswatini", "Swasiland": "Eswatini", "Madagaskar": "Madagascar", "Mauritius": "Mauritius",
  // Amerika
  "USA": "United States of America", "Vereinigte Staaten": "United States of America", "Kanada": "Canada",
  "Mexiko": "Mexico", "Guatemala": "Guatemala", "Belize": "Belize", "Honduras": "Honduras",
  "El Salvador": "El Salvador", "Nicaragua": "Nicaragua", "Costa Rica": "Costa Rica", "Panama": "Panama",
  "Kuba": "Cuba", "Jamaika": "Jamaica", "Haiti": "Haiti", "Dominikanische Republik": "Dominican Republic",
  "Bahamas": "Bahamas", "Trinidad und Tobago": "Trinidad and Tobago", "Kolumbien": "Colombia",
  "Venezuela": "Venezuela", "Guyana": "Guyana", "Suriname": "Suriname", "Ecuador": "Ecuador", "Peru": "Peru",
  "Brasilien": "Brazil", "Bolivien": "Bolivia", "Paraguay": "Paraguay", "Chile": "Chile", "Argentinien": "Argentina",
  "Uruguay": "Uruguay",
  // Ozeanien
  "Australien": "Australia", "Neuseeland": "New Zealand", "Papua-Neuguinea": "Papua New Guinea",
  "Fidschi": "Fiji", "Salomonen": "Solomon Islands", "Vanuatu": "Vanuatu", "Neukaledonien": "New Caledonia",
};

// Aus einem (deutschen oder englischen) Ländernamen den Karten-Namen ableiten
export function toMapCountry(land) {
  const s = (land || "").trim();
  if (!s) return null;
  return COUNTRY_DE_EN[s] || s;
}

// Länder (Natural-Earth-Schreibweise), die auf der Europa-Regionenkarte gezeigt werden
export const EUROPEAN_ADMIN = new Set([
  "Germany", "Austria", "Switzerland", "Liechtenstein", "Poland", "Czechia", "Czech Republic",
  "Slovakia", "Hungary", "Slovenia", "Croatia", "Italy", "France", "Spain", "Portugal", "Andorra",
  "Netherlands", "Belgium", "Luxembourg", "Denmark", "Norway", "Sweden", "Finland", "Iceland",
  "Ireland", "United Kingdom", "Estonia", "Latvia", "Lithuania", "Romania", "Bulgaria", "Greece",
  "Serbia", "Republic of Serbia", "Kosovo", "Albania", "Montenegro", "North Macedonia", "Macedonia",
  "Bosnia and Herz.", "Bosnia and Herzegovina", "Moldova", "Malta", "San Marino", "Monaco",
]);
