export interface IHourlyWeatherData {
    'location': string,
    'date': Date,
    'hour': number,
    'temperature': number,
    'windChill': number,
    'heatIndex': number,
    'precipitation': number,
    'snow': number,
    'snowDepth': number,
    'windSpeed': number,
    'windDirection': number,
    'windgust': number,
    'visibility': number,
    'cloudCover': number,
    'relativeHumidity': number,
    'conditions': string
}