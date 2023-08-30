/* eslint-disable */
import { CloudEvent, Headers, DDS, DDSMessage } from "cloudevents";
const path = require('path')
const sleep = require('sleep')
const rti = require('rticonnextdds-connector')
const configFile = path.join(__dirname, '/../CloudEvent.xml')
console.log(configFile)

const connector = new rti.Connector('CEParticipantLibrary::CEParticipantPubSub', configFile)
const input  = connector.getInput("CESubscriber::CEReader");
const output = connector.getOutput("CEPublisher::CEWriter");

const u_connector = new rti.Connector('UtilParticipantLibrary::UtilParticipantPubSub', configFile)
const u_input  = u_connector.getInput("UtilSubscriber::SquareReader");
const u_output = u_connector.getOutput("UtilPublisher::SquareWriter");



const receive = async () => {
  
  
  try {
    console.log('Waiting for publications...')
    await u_input.waitForPublications()
    
    console.log('Waiting for data...')
    for (;;) {
      await u_input.wait()
      u_input.take()
      for (const sample of u_input.samples.validDataIter) {
        // You can obtain all the fields as a JSON object
        const data = sample.getJson()
        // toEvent: tranforms a DDSMessage to a cloudEvent
        
        const event = new CloudEvent({
          specversion: "1.0",
          id: "b46cf653-d48a-4b90-8dfa-355c01061361",
          type: "org.cncf.cloudevents.example",
          source: "urn:event:from:myapi/resource/123",
          datacontenttype: "application/cloudevent+dds",
          datacontentencoding: 'json',
          subject: "Received Shape",
          time: new Date().toISOString(),
          dataschema: "http://cloudevents.io/schema.json",
          data: data,
          datakey: data.color
        })
        
        try {
          console.log('Waiting for subscriptions...')
          await output.waitForSubscriptions()
          //CloudEvent into a DDSMessage<T>
          
          console.log('Writing CE... ')
          const msg_dds_json_obj = DDS.structured(event);
          output.instance.setFromJson(msg_dds_json_obj)
          output.write()
          output.clearMembers()
          sleep.msleep(500)
          
          console.log('Writer waiting for subs to receive!')
          // Wait for all subscriptions to receive the data before exiting
          await output.wait()
          console.log('Writer Done!')
        } catch (err) {
          console.log('Error encountered: ' + err)
        }


        console.log(data)
        
      }
    }
  } catch (err) {
    console.log('Error encountered: ' + err)
  }
  connector.close()
}



// Run both functions concurrently using async/await and Promise.all()
(async () => {
  const receivePromise = receive();
  
  await Promise.all([receivePromise]);
})();