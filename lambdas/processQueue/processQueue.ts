// Read weather data for given location(s)
// Transform data
// Write data to dynamodb
import { AWSError, DynamoDB } from 'aws-sdk'
import { IHourlyWeatherData } from '../models/iHourlyWeatherData'
import { IWeatherModel } from '../models/iWeatherModel'
const https = require('https')

const API_KEY: string = process.env.API_KEY // 'BPK6NX8ZR3A87WYVF3GE98GUU' Get from environment variable
const UNIT_GROUP: string = 'us'
const TABLE_NAME: string = process.env.TABLE_NAME
const db: DynamoDB = new DynamoDB()

const retrieveWeatherData = function (location: string, start: Date = null, end: Date = null) { 
    var requestUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}`

    if (start) requestUrl+=`/${start}`
    if (start && end) requestUrl+=`/${end}`
    requestUrl+=`?unitGroup=${UNIT_GROUP}&key=${API_KEY}&include=${encodeURIComponent('obs,hours')}`

    return new Promise(function(resolve, reject) {
		https.get(requestUrl, function (res) { 
		  var statusCode= res.statusCode;
		  const contentType = res.headers['content-type'];

		  var error;
		  if (statusCode !== 200) {
			error = `Request Failed. Status Code: ${statusCode}`;
		  } else if (!/^application\/json/.test(contentType)) {
			error = `Invalid content-type. Expected application/json but received ${contentType}`;		  
			statusCode=500;
		  }
		  
		  res.setEncoding('utf8');
		  let rawData = '';
		  res.on('data', (chunk) => { rawData += chunk; });
		  res.on('end', () => {
			try {
				if (error) {
					console.error(`Error: ${error}. Details: ${rawData}`);
					reject(`Error: ${error}. Details: ${rawData}`);
				} else {
					resolve(JSON.parse(rawData));
				}
			} catch (e) {
			  console.error(`Unexpected error ${e.message}`);
			  reject(`Unexpected error ${e.message}`);
			}
		  });
		}).on('error', (e) => {
			console.error(`Error 3 ${e}`);;
			 reject(`Communication error ${e}`);
		});
	});
}

const dayWeatherToItem = (dayWeather: IWeatherModel) => {    
    return {
        'Name': {
            'S': dayWeather.name
        },
        'LatitudeLongitude': {
            'S': dayWeather.latitudeLongitude
        },
        'Date' : {
            'S': dayWeather.date.toISOString()
        },
        'Maximum': {
            'N': dayWeather.maximum.toString()
        },
        'Minimum': {
            'N': dayWeather.minimum.toString()
        },
        'Stations': {
            'SS': dayWeather.stations
        }
    }
}

const hourlyWeatherToItem = (hourlyWeather: IHourlyWeatherData) => {

    return {
        'Date': {
            'S': hourlyWeather.date.toISOString()    
        },
        'Hour': {
            'N': hourlyWeather.hour.toString()
        },
        'Temperature': {
            'N': hourlyWeather.temperature.toString()
        },
        'WindChill': {
            'N': hourlyWeather.windChill.toString()
        },
        'HeatIndex': {
            'N': hourlyWeather.heatIndex.toString()
        },
        'Precipitation': {
            'N': hourlyWeather.precipitation.toString()
        },
        'Snow': {
            'N': hourlyWeather.snow.toString()
        },
        'SnowDepth': {
            'N': hourlyWeather.snowDepth.toString()
        },
        'WindSpeed': {
            'N': hourlyWeather.windSpeed.toString()
        },
        'WindDirection': {
            'N': hourlyWeather.windDirection.toString()
        },
        'Windgust': {
            'N': hourlyWeather.windgust.toString()
        },
        'Visibility': {
            'N': hourlyWeather.visibility.toString()
        },
        'CloudCover': {
            'N': hourlyWeather.cloudCover.toString()
        },
        'RelativeHumidity': {
            'N': hourlyWeather.relativeHumidity.toString()
        },
        'Conditions': {
            'S': hourlyWeather.conditions
        }
    }
}

const addDayData = (weather: IWeatherModel) => {
    const params: DynamoDB.PutItemInput = {
        TableName: TABLE_NAME,
        Item: dayWeatherToItem(weather)
    }

    db.putItem(params, (err: AWSError, data: DynamoDB.PutItemOutput) => {
    })

    weather.hourlyData?.forEach((hourData: IHourlyWeatherData) => {
        addHourlyData(hourData)
    })
}

const addHourlyData = (data: IHourlyWeatherData) => {
    const params: DynamoDB.PutItemInput = {
        TableName: TABLE_NAME,
        Item: hourlyWeatherToItem(data)
    }

    db.putItem(params, (err: AWSError, data: DynamoDB.PutItemOutput) => {
    })
}

const parseWeatherData: (data: any) => Array<IWeatherModel> = (data: any) => {
    let weatherData: Array<IWeatherModel> = new Array<IWeatherModel>()

    data.days.foreach((dayData: any) => {
        let weather: IWeatherModel = {
            latitudeLongitude: `${dayData.latitude},${dayData.longitude}`,
            name: dayData.resolvedAddress,
            date: dayData.datetime,
            maximum: dayData.tempmax,
            minimum: dayData.tempmin,
            stations: [...dayData.stations.map(s => s?.name)]
        }

        let hourlyData: Array<IHourlyWeatherData> = new Array<IHourlyWeatherData>()

        dayData.hours.foreach((hourData: any) => {
            let hourWeather: IHourlyWeatherData = {
                date: weather.date,
                hour: hourData.datetime.split(':')[0] as number, // This is in the format: 01:00:00 for 1am
                temperature: hourData.temp,
                windChill: hourData.windChill,
                heatIndex: hourData.uvindex,
                precipitation: hourData.precip,
                snow: hourData.snow,
                snowDepth: hourData.snowdepth,
                windSpeed: hourData.windspeed,
                windDirection: hourData.winddir,
                windgust: hourData.windgust,
                visibility: hourData.visibility,
                cloudCover: hourData.cloudcover,
                relativeHumidity: hourData.humidty,
                conditions: hourData.conditions
            }

            hourlyData.push(hourWeather)
        })

        weatherData.push(weather)
    })

    return weatherData
}

export const handler = async (event: any = {}, context: any = {}): Promise<any> => {
    console.log("EVENT: \n" + JSON.stringify(event, null, 2))
    console.log("CONTEXT: \n" + JSON.stringify(context, null, 2))

    return new Promise<any>(async (resolve, reject) => {
        try {
            event.locations.foreach(async (location) => {
                const data: any = await retrieveWeatherData(event.location, event.start, event.end)
            
                const weatherData: Array<IWeatherModel> = parseWeatherData(data)
                weatherData.forEach((dayData: IWeatherModel) => {
                    addDayData(dayData)               
                })
            })
            resolve({status: 200})
        } catch(err) {
            reject({status: 500})
            // Report/record error       
        }
    })
}