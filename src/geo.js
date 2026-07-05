// Regionen europäischer Länder zum Abhaken. Erweiterbar: einfach Land + Regionen ergänzen.
// Schlüssel = deutscher Ländername (passt zu den Ländern im Urlaubsplaner).

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
