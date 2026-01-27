// Region mappings for countries with messy Foursquare data
// This provides clean, standardized region/state/province names

export const REGION_MAPPINGS: Record<string, string[]> = {
  // United States - All 50 states + territories
  US: [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming", "District of Columbia",
    "Puerto Rico", "Guam", "US Virgin Islands"
  ],

  // Canada - All 13 provinces and territories
  CA: [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick",
    "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
    "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
    "Yukon"
  ],

  // Mexico - All 32 states
  MX: [
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
    "Chiapas", "Chihuahua", "Coahuila", "Colima", "Durango", "Guanajuato",
    "Guerrero", "Hidalgo", "Jalisco", "México", "Mexico City", "Michoacán",
    "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
    "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco",
    "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
  ],

  // United Kingdom - Countries and major regions
  GB: [
    "England", "Scotland", "Wales", "Northern Ireland",
    // England regions
    "East Midlands", "East of England", "Greater London", "North East England",
    "North West England", "South East England", "South West England",
    "West Midlands", "Yorkshire and the Humber"
  ],

  // Australia - All 8 states and territories
  AU: [
    "Australian Capital Territory", "New South Wales", "Northern Territory",
    "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia"
  ],

  // Germany - All 16 states
  DE: [
    "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen",
    "Hamburg", "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern",
    "North Rhine-Westphalia", "Rhineland-Palatinate", "Saarland",
    "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia"
  ],

  // France - All 18 regions
  FR: [
    "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Brittany",
    "Centre-Val de Loire", "Corsica", "Grand Est", "Hauts-de-France",
    "Île-de-France", "Normandy", "Nouvelle-Aquitaine", "Occitanie",
    "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
    "Guadeloupe", "Martinique", "French Guiana", "Réunion", "Mayotte"
  ],

  // Spain - All 17 autonomous communities
  ES: [
    "Andalusia", "Aragon", "Asturias", "Balearic Islands", "Basque Country",
    "Canary Islands", "Cantabria", "Castile and León", "Castile-La Mancha",
    "Catalonia", "Extremadura", "Galicia", "La Rioja", "Community of Madrid",
    "Murcia", "Navarre", "Valencian Community"
  ],

  // Italy - All 20 regions
  IT: [
    "Abruzzo", "Aosta Valley", "Apulia", "Basilicata", "Calabria",
    "Campania", "Emilia-Romagna", "Friuli-Venezia Giulia", "Lazio",
    "Liguria", "Lombardy", "Marche", "Molise", "Piedmont", "Sardinia",
    "Sicily", "Trentino-South Tyrol", "Tuscany", "Umbria", "Veneto"
  ],

  // Brazil - All 27 states
  BR: [
    "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará",
    "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão",
    "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará",
    "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro",
    "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima",
    "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
  ],

  // India - All 28 states and 8 union territories
  IN: [
    // States
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    // Union Territories
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ],

  // Japan - All 47 prefectures
  JP: [
    "Aichi", "Akita", "Aomori", "Chiba", "Ehime", "Fukui", "Fukuoka",
    "Fukushima", "Gifu", "Gunma", "Hiroshima", "Hokkaido", "Hyogo",
    "Ibaraki", "Ishikawa", "Iwate", "Kagawa", "Kagoshima", "Kanagawa",
    "Kochi", "Kumamoto", "Kyoto", "Mie", "Miyagi", "Miyazaki", "Nagano",
    "Nagasaki", "Nara", "Niigata", "Oita", "Okayama", "Okinawa", "Osaka",
    "Saga", "Saitama", "Shiga", "Shimane", "Shizuoka", "Tochigi", "Tokushima",
    "Tokyo", "Tottori", "Toyama", "Wakayama", "Yamagata", "Yamaguchi", "Yamanashi"
  ],

  // China - All 34 provincial-level divisions
  CN: [
    // Provinces
    "Anhui", "Fujian", "Gansu", "Guangdong", "Guizhou", "Hainan", "Hebei",
    "Heilongjiang", "Henan", "Hubei", "Hunan", "Jiangsu", "Jiangxi", "Jilin",
    "Liaoning", "Qinghai", "Shaanxi", "Shandong", "Shanxi", "Sichuan", "Yunnan",
    "Zhejiang",
    // Autonomous Regions
    "Guangxi", "Inner Mongolia", "Ningxia", "Tibet", "Xinjiang",
    // Municipalities
    "Beijing", "Chongqing", "Shanghai", "Tianjin",
    // Special Administrative Regions
    "Hong Kong", "Macau"
  ],

  // Argentina - All 24 provinces
  AR: [
    "Buenos Aires", "Buenos Aires City", "Catamarca", "Chaco", "Chubut",
    "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa",
    "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta",
    "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
    "Tierra del Fuego", "Tucumán"
  ],

  // South Africa - All 9 provinces
  ZA: [
    "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
    "Mpumalanga", "North West", "Northern Cape", "Western Cape"
  ],

  // Netherlands - All 12 provinces
  NL: [
    "Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen",
    "Limburg", "North Brabant", "North Holland", "Overijssel",
    "South Holland", "Utrecht", "Zeeland"
  ],

  // Switzerland - All 26 cantons
  CH: [
    "Aargau", "Appenzell Ausserrhoden", "Appenzell Innerrhoden", "Basel-Landschaft",
    "Basel-Stadt", "Bern", "Fribourg", "Geneva", "Glarus", "Graubünden",
    "Jura", "Lucerne", "Neuchâtel", "Nidwalden", "Obwalden", "Schaffhausen",
    "Schwyz", "Solothurn", "St. Gallen", "Thurgau", "Ticino", "Uri",
    "Valais", "Vaud", "Zug", "Zurich"
  ],

  // Poland - All 16 voivodeships
  PL: [
    "Greater Poland", "Kuyavian-Pomeranian", "Lesser Poland", "Lodz",
    "Lower Silesian", "Lublin", "Lubusz", "Masovian", "Opole", "Podkarpackie",
    "Podlaskie", "Pomeranian", "Silesian", "Subcarpathian", "Warmian-Masurian",
    "West Pomeranian"
  ],

  // Sweden - All 21 counties
  SE: [
    "Blekinge", "Dalarna", "Gävleborg", "Gotland", "Halland", "Jämtland",
    "Jönköping", "Kalmar", "Kronoberg", "Norrbotten", "Örebro", "Östergötland",
    "Skåne", "Södermanland", "Stockholm", "Uppsala", "Värmland", "Västerbotten",
    "Västernorrland", "Västmanland", "Västra Götaland"
  ],

  // Norway - All 11 counties
  NO: [
    "Agder", "Innlandet", "Møre og Romsdal", "Nordland", "Oslo",
    "Rogaland", "Troms og Finnmark", "Trøndelag", "Vestfold og Telemark",
    "Vestland", "Viken"
  ],

  // New Zealand - All 16 regions
  NZ: [
    "Auckland", "Bay of Plenty", "Canterbury", "Gisborne", "Hawke's Bay",
    "Manawatū-Whanganui", "Marlborough", "Nelson", "Northland", "Otago",
    "Southland", "Taranaki", "Tasman", "Waikato", "Wellington", "West Coast"
  ],

  // Ireland - All 26 counties
  IE: [
    "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway",
    "Kerry", "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick",
    "Longford", "Louth", "Mayo", "Meath", "Monaghan", "Offaly",
    "Roscommon", "Sligo", "Tipperary", "Waterford", "Westmeath",
    "Wexford", "Wicklow"
  ]
};

// Helper function to get regions for a country
export function getRegionsForCountry(countryCode: string): string[] | null {
  return REGION_MAPPINGS[countryCode] || null;
}

// Helper function to check if a country has region mappings
export function hasRegionMapping(countryCode: string): boolean {
  return countryCode in REGION_MAPPINGS;
}
