// Read weather data for given location(s)
// Transform data
// Write data to dynamodb
import { AWSError, DynamoDB } from 'aws-sdk'
import { IHourlyWeatherData } from './iHourlyWeatherData'
import { IWeatherModel } from './iWeatherModel'
const https = require('https')

const API_KEY: string | undefined = process.env.API_KEY
const UNIT_GROUP: string = 'us'
const TABLE_NAME: string | undefined = process.env.TABLE_NAME
const db: DynamoDB = new DynamoDB()

const retrieveWeatherData = function (location: string, start: Date | null = null, end: Date | null = null) { 
    let requestUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}`
    //console.log('retrieving weather data')

    if (start) {
        const startDate: Date = new Date(start)
        requestUrl+=`/${startDate.getFullYear()}-${startDate.getMonth()}-${startDate.getDay()}`
    }

    requestUrl+=`?unitGroup=${UNIT_GROUP}&key=${API_KEY}&include=${encodeURIComponent('obs,hours')}`

    //console.log(requestUrl)
    return new Promise(function(resolve, reject) {
		https.get(requestUrl, function (res: any) { 
		  var statusCode= res.statusCode;
		  const contentType = res.headers['content-type'];

		  var error: string;
		  if (statusCode !== 200) {
			error = `Request Failed. Status Code: ${statusCode}`;
		  } else if (!/^application\/json/.test(contentType)) {
			error = `Invalid content-type. Expected application/json but received ${contentType}`;		  
			statusCode=500;
		  }
		  
		  res.setEncoding('utf8');
		  let rawData = '';
		  res.on('data', (chunk: string) => { rawData += chunk; });
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
		}).on('error', (e: any) => {
			console.error(`Error 3 ${e}`);;
			 reject(`Communication error ${e}`);
		});
	});
}

const hourlyWeatherToItem = (hourlyWeather: IHourlyWeatherData, dayWeather: IWeatherModel) => {
    //console.log(JSON.stringify(hourlyWeather))
    let item: any = {
        'Name': {
            'S': hourlyWeather.location
        },
        'Date': {
            'S': hourlyWeather.date.toString()    
        },
        'LatitudeLongitude': {
            'S': dayWeather.latitudeLongitude
        },
        'Hour': {
            'N': hourlyWeather.hour.toString()
        }
    }

    if (hourlyWeather.temperature) {
        item.Temperature = {
            'N': hourlyWeather.temperature.toString()
        } 
    }
    if (hourlyWeather.windChill) {
        item.WindChill = {
            'N': hourlyWeather.windChill.toString()
        } 
    }
    if (hourlyWeather.heatIndex) {
        item.HeatIndex = {
            'N': hourlyWeather.heatIndex.toString()
        }
    }
    if (hourlyWeather.precipitation) {
        item.Precipitation = {
            'N': hourlyWeather.precipitation.toString()
        } 
    }
     if (hourlyWeather.snow){
         item.Snow = {
            'N': hourlyWeather.snow.toString()
        } 
     }
     if (hourlyWeather.snowDepth) {
         item.SnowDepth = {
            'N': hourlyWeather.snowDepth.toString()
        }
     }
     if (hourlyWeather.windSpeed) {
         item.WindSpeed = {
            'N': hourlyWeather.windSpeed.toString()
        } 
     }
     if (hourlyWeather.windDirection) {
         item.WindDirection = {
            'N': hourlyWeather.windDirection.toString()
        } 
     }
     if (hourlyWeather.windgust) {
         item.Windgust = {
            'N': hourlyWeather.windgust.toString()
        } 
     }
     if (hourlyWeather.visibility) {
         item.Visibility = {
            'N': hourlyWeather.visibility.toString()
        }
     }
     if (hourlyWeather.cloudCover) {
         item.CloudCover = {
            'N': hourlyWeather.cloudCover.toString()
        } 
     }
     if (hourlyWeather.relativeHumidity) {
         item.RelativeHumidity = {
            'N': hourlyWeather.relativeHumidity.toString()
        } 
     }
     if (hourlyWeather.conditions) {
         item.Conditions = {
            'S': hourlyWeather.conditions.toString()
        }
     }
     if (dayWeather.stations && dayWeather.stations.filter(s => !!s).length > 0) {
         item.Stations = {
            'SS': dayWeather.stations
        } 
     }

     return item
}

const addWeatherData = (weather: IWeatherModel) => {
    weather.hourlyData?.forEach((hourData: IHourlyWeatherData) => {
        let item = hourlyWeatherToItem(hourData, weather) 

        const params: DynamoDB.PutItemInput = {
            TableName: TABLE_NAME as string,
            Item: item
        }

        db.putItem(params, (err: AWSError, data: DynamoDB.PutItemOutput) => {
            if (err) {
                console.log(`error adding item: ${JSON.stringify(err)}`)
            }
            else {
                console.log(`item added: ${JSON.stringify(data)}`)
            }
        })
    })    
}

const parseWeatherData: (data: any) => Array<IWeatherModel> = (data: any) => {
    let weatherData: Array<IWeatherModel> = new Array<IWeatherModel>()

    console.log(`Weather data: ${JSON.stringify(data)}`)
    data.days.forEach((dayData: any) => {
        let weather: IWeatherModel = {
            latitudeLongitude: `${data?.latitude},${data?.longitude}`,
            name: data?.resolvedAddress,
            date: dayData?.datetime,
            maximum: dayData?.tempmax,
            minimum: dayData?.tempmin,
            stations: (dayData.stations) ? [...dayData.stations.map((s: any) => s?.name)] : []
        }

        let hourlyData: Array<IHourlyWeatherData> = new Array<IHourlyWeatherData>()

    dayData.hours.forEach((hourData: any) => {
            let hourWeather: IHourlyWeatherData = {
                location: weather.name,
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
        weather.hourlyData = hourlyData
        weatherData.push(weather)
    })

    return weatherData
}

export const handler = (event: any = {}, context: any = {}) => {
    //console.log("EVENT: \n" + JSON.stringify(event, null, 2))
    //console.log("CONTEXT: \n" + JSON.stringify(context, null, 2))

    event.Records.forEach((record: any) => {
        const locationRecord = JSON.parse(record?.body)
        //console.log(`locationRecord: ${JSON.stringify(locationRecord)}`)
        retrieveWeatherData(locationRecord?.location, locationRecord?.start, locationRecord?.end).then(data => {
            const weatherData: Array<IWeatherModel> = parseWeatherData(data)
            weatherData.forEach((dayData: IWeatherModel) => {
                addWeatherData(dayData)               
            })
        })
    })
}