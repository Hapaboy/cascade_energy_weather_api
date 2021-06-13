// Read locations from dynamodb
// Add locations to queue
// Record/report any errors

import { AWSError, DynamoDB, SQS } from 'aws-sdk'
import { uuidv4 } from 'uuid'

const TABLE_NAME: string = process.env.TABLE_NAME
const QUEUE_URL: string = process.env.QUEUE_URL

const YESTERDAY: number = new Date().setDate(new Date().getDate() -1)

type EntryListFunction = (locations: Array<any>) => SQS.SendMessageBatchRequestEntryList

const createEntryList: EntryListFunction = (locations: Array<any>) => {
    const entries: Array<SQS.SendMessageBatchRequestEntry> = new Array<SQS.SendMessageBatchRequestEntry>()
    locations?.forEach(location => {
        if (location.zipcode) {
            entries.push({
                Id: uuidv4(),
                MessageBody: JSON.stringify({
                    'start': YESTERDAY,
                    'end': YESTERDAY,
                    'location': location.zipcode
                })
            })
        }
    })
    return entries
}

export const handler = async (event: any = {}, context: any = {}): Promise<any> => {
    console.log("EVENT: \n" + JSON.stringify(event, null, 2))
    console.log("CONTEXT: \n" + JSON.stringify(context, null, 2))

    const db: DynamoDB = new DynamoDB()
    const queue: SQS = new SQS()

    const input: DynamoDB.QueryInput = {
        TableName: TABLE_NAME
    }

    db.query(input, (err: AWSError, data: DynamoDB.QueryOutput) => {
        let locations: Array<any> = new Array<any>()        
        data.Items.forEach(location => {
            locations.push(location)
            if (locations.length === 10) {
                const request: SQS.SendMessageBatchRequest = {
                    QueueUrl: QUEUE_URL,
                    Entries: createEntryList(locations)
                }
                queue.sendMessageBatch(request)
                locations.length = 0
            } 
        })
    })
}