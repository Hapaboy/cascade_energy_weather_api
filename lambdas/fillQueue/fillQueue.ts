// Read locations from dynamodb
// Add locations to queue
// Record/report any errors

import { AWSError, DynamoDB, SQS } from 'aws-sdk'
import { v4 as uuidv4 } from 'uuid'
import { ILocation } from './iLocation'

const TABLE_NAME: string | undefined = process.env.TABLE_NAME
const QUEUE_URL: string | undefined = process.env.QUEUE_URL

const YESTERDAY: number = new Date().setDate(new Date().getDate() -1)

type EntryListFunction = (locations: Array<any>) => SQS.SendMessageBatchRequestEntryList

const createEntryList: EntryListFunction = (locations: Array<any>) => {
    const entries: Array<SQS.SendMessageBatchRequestEntry> = new Array<SQS.SendMessageBatchRequestEntry>()
    locations?.forEach(location => {
        console.log(`location: ${location.name}`)
        if (location.latitudeLongitude) {
            entries.push({
                Id: uuidv4(),
                MessageBody: JSON.stringify({
                    'start': YESTERDAY,
                    'end': YESTERDAY,
                    'location': location.latitudeLongitude
                })
            })
        }
    })
    return entries
}

export const handler = (event: any = {}, context: any = {}) => {
    console.log("EVENT: \n" + JSON.stringify(event, null, 2))
    console.log("CONTEXT: \n" + JSON.stringify(context, null, 2))

    const db: DynamoDB = new DynamoDB()
    const queue: SQS = new SQS()

    const input: DynamoDB.QueryInput = {
        TableName: TABLE_NAME as string,
        KeyConditionExpression: 'Country = :countryAbbr',
        Select: 'ALL_ATTRIBUTES',
        ExpressionAttributeValues: {':countryAbbr':{'S':'US'}}
    }

    db.query(input, (err: AWSError, data: DynamoDB.QueryOutput) => {
        if (err) {
            console.log(`Error querying locations: ${JSON.stringify(err)}`)
        }
        console.log(`Location data: ${JSON.stringify(data)}`)
        let locations: Array<ILocation> = new Array<ILocation>()
        let count: number = 1      
        data?.Items?.forEach((locationEntry: any) => {
            console.log(`locationEntry: ${JSON.stringify(locationEntry)}`)
            const loc: ILocation = {
                name: locationEntry.Name.S,
                latitudeLongitude: `${locationEntry.Latitude.N},${locationEntry.Longitude.N}`
            }

            locations.push(loc)
            if (locations.length === 10 || data.Items?.length === count) {
                const request: SQS.SendMessageBatchRequest = {
                    QueueUrl: QUEUE_URL as string,
                    Entries: createEntryList(locations)
                }
                queue.sendMessageBatch(request, (sqsErr: AWSError, data: SQS.SendMessageBatchResult) => {
                    if (sqsErr) {
                        console.log(`SQS Error: ${JSON.stringify(sqsErr)}`)
                    }
                    else {
                        console.log(`SQS data: ${JSON.stringify(data)}`)
                    }
                })
                locations.length = 0
            } 
        })
    })
}