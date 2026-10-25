import type { SearchRegion } from './search-contract'

// Countries by search region, lower-case English names as normalized by countryName().
const REGION_COUNTRIES: Record<SearchRegion, string[]> = {
    'North America': ['united states', 'canada'],
    'Latin America': [
        'mexico', 'guatemala', 'belize', 'honduras', 'el salvador', 'nicaragua',
        'costa rica', 'panama', 'cuba', 'dominican republic', 'puerto rico',
        'jamaica', 'bahamas', 'trinidad and tobago', 'barbados', 'colombia',
        'venezuela', 'ecuador', 'peru', 'bolivia', 'brazil', 'paraguay',
        'uruguay', 'argentina', 'chile',
    ],
    Europe: [
        'united kingdom', 'ireland', 'france', 'germany', 'netherlands',
        'belgium', 'luxembourg', 'switzerland', 'austria', 'italy', 'spain',
        'portugal', 'denmark', 'norway', 'sweden', 'finland', 'iceland',
        'poland', 'czech republic', 'czechia', 'slovakia', 'hungary',
        'romania', 'bulgaria', 'greece', 'croatia', 'slovenia', 'serbia',
        'bosnia and herzegovina', 'montenegro', 'north macedonia', 'albania',
        'estonia', 'latvia', 'lithuania', 'ukraine', 'moldova', 'belarus',
        'malta', 'cyprus', 'monaco', 'liechtenstein', 'andorra', 'san marino',
    ],
    'Middle East & Africa': [
        'united arab emirates', 'saudi arabia', 'qatar', 'bahrain', 'kuwait',
        'oman', 'israel', 'jordan', 'lebanon', 'turkey', 'turkiye', 'iran',
        'iraq', 'egypt', 'morocco', 'algeria', 'tunisia', 'libya', 'nigeria',
        'ghana', 'kenya', 'ethiopia', 'tanzania', 'uganda', 'rwanda',
        'south africa', 'senegal', 'ivory coast', 'cote d ivoire', 'cameroon',
        'angola', 'zambia', 'zimbabwe', 'botswana', 'namibia', 'mozambique',
        'mauritius',
    ],
    'Asia Pacific': [
        'china', 'hong kong', 'macau', 'taiwan', 'japan', 'south korea',
        'korea', 'singapore', 'malaysia', 'indonesia', 'thailand', 'vietnam',
        'philippines', 'india', 'pakistan', 'bangladesh', 'sri lanka', 'nepal',
        'australia', 'new zealand', 'cambodia', 'myanmar', 'laos', 'mongolia',
        'kazakhstan', 'uzbekistan', 'brunei', 'fiji', 'papua new guinea',
    ],
}

/** The region of a normalized country name, or null when the country is not mapped. */
export function regionOf(country: string): SearchRegion | null {
    for (const [region, countries] of Object.entries(REGION_COUNTRIES))
        if (countries.includes(country)) return region as SearchRegion
    return null
}
