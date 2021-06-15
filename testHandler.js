//import your handler file or main file of Lambda
let handler = require('./dist/processQueue/processQueue');

const event = {
    "Records": [
        {
            "messageId": "1fef97b1-0763-4af0-acd9-ae06b2e078a0",
            "receiptHandle": "AQEBa2kX4jzptXXXg3m4caooNr9y7DonY6nPlvyI6RN4Lm1yMSqT33WhDyi+EA2nd4Zjb4shlupg/v6ge46KB2/FyP0nulbN8VJW9uOcqKTmDLHkOgaHFveqLuh5W6FvPLPe7AUdVWQTjnPVyDAJYtG+gfsV0resoXP7OlW+SYcUduAc/uGuTx3vC7/YA/F13Mrtq+/D2EI2hRYuxyUHEnrz3N4f8ceuhPLB/fhvi3ahcZ63SyuszVKhl0d4BKGi6QUQ95krP++22dMcQtyj3RvQFn9Wod26nLEFEblyvaRfwxJZwaBojAS07iFdFF3/vWOTRTXzfM3tn4L/GGiNojvnFyAD48s68KscRiv70oVIuKKaMzGU96WKBFosfswKXBIHE6e2hE+N8FGievGoKC7IVNZB31OXgVfbVoiYt2w62EEjnkXoujMrLPYLlxxt50QeX4GBWxo9lMMyyRkmOqXKwQ==",
            "body": "{\"start\":1623691561597,\"end\":1623691561597,\"location\":\"45.4852,-122.796\"}",
            "attributes": {
                "ApproximateReceiveCount": "19",
                "SentTimestamp": "1623777962965",
                "SenderId": "AROAT5UWLOWA4DL4DVC6T:FillWeatherQueueFunction",
                "ApproximateFirstReceiveTimestamp": "1623777962965"
            },
            "messageAttributes": {},
            "md5OfBody": "0b52bf77a49fee977c784c46030535ba",
            "eventSource": "aws:sqs",
            "eventSourceARN": "arn:aws:sqs:us-west-2:269824521601:cascade-energy-weather-data-WeatherDataQueue-1F3LXLLFCVS2A",
            "awsRegion": "us-west-2"
        }
    ]
}

//Call your exports function with required params
//In AWS lambda these are event, content, and callback
//event and content are JSON object and callbcack is a function
//In my example i'm using empty JSON
handler.handler(event, //event
    {}, //content
    function(data,ss) {  //callback function with two arguments 
        console.log(data);
    });