import { IHourlyWeatherData } from "./iHourlyWeatherData";

export interface IWeatherModel {
    'name': string,
    'latitudeLongitude': string,
    'date': Date,
    'maximum': number,
    'minimum': number,
    'hourlyData'?: Array<IHourlyWeatherData>,
    'stations': Array<string>
}