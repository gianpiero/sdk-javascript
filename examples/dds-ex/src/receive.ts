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


const receive = async () => {
  
  
  try {
    console.log('Waiting for publications...')
    await input.waitForPublications()
    
    console.log('Waiting for data...')
    for (;;) {
      await input.wait()
      input.take()
      for (const sample of input.samples.validDataIter) {
        // You can obtain all the fields as a JSON object
        const data = sample.getJson()
        // toEvent: tranforms a DDSMessage to a cloudEvent
        const event = DDS.toEvent(data);

        if (data.body.json_dds_data) {
          console.log("Body was JSON:")
        } else if (data.body.text_data) {
          console.log("Body was TEXT:")
        } else if (data.body.binary_data) {
          console.log("Body was BINARY:")
          let data_b = (event as any)['data']
          let data_s = data_b.toString('utf-8')
          console.log("The string sent was: '" + data_s +"'")
        } else if (data.body.packed_dds_data) {
          console.log("Body was CDR:")
          const cdrBuff = (event as any)['data']
          u_output.instance.setFromCdr(cdrBuff)
          console.log("the sample was:")
          console.log(u_output.instance.getJson())
        } 
        console.log(event)
        
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