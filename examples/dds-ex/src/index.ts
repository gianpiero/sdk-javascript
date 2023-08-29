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
        console.log(event)
      }
    }
  } catch (err) {
    console.log('Error encountered: ' + err)
  }
  connector.close()
}

const emit = async () => {
  
  
  const type = "org.cncf.cloudevents.example";
  const source = "urn:event:from:myapi/resource/123";
  const time = new Date().toISOString();
  const dataschema = "http://cloudevents.io/schema.json";
  
  const ext1Name = "extension1";
  const ext1Value = "foobar";
  const ext2Name = "extension2";
  const ext2Value = "acme";
  
  interface Ibody {
    color: string,
    x: number,
    y: number,
    shapesize: number
  }
  const bodyRed: Ibody = {
    color: "red",
    x: 120.0,
    y: 42.0,
    shapesize: 20
  };

  const bodyBlue: Ibody = {
    color: "blue",
    x: 120.0,
    y: 42.0,
    shapesize: 20
  };
  
  // cloudevent+dds / json
  const ce_dds_json_obj = new CloudEvent({
    specversion: "1.0",
    id: "b46cf653-d48a-4b90-8dfa-355c01061361",
    type,
    source,
    datacontenttype: "application/cloudevent+dds",
    subject: "SQUARE",
    time,
    dataschema,
    datacontentencoding: 'json',
    data: bodyRed,
    datakey: bodyRed.color
    // [ext1Name]: ext1Value,
    // [ext2Name]: ext2Value,
  })
  
  // cloudevent+dds / json  (default)
  const ce_dds_json_default_obj = new CloudEvent({
    specversion: "1.0",
    id: "b46cf653-d48a-4b90-8dfa-355c01061362",
    type,
    source,
    datacontenttype: "application/cloudevent+dds",
    subject: "SQUARE",
    time,
    dataschema,
    //datacontentencoding: undefined,
    data: bodyBlue,
    datakey: bodyBlue.color
    // [ext1Name]: ext1Value,
    // [ext2Name]: ext2Value,
  })
  
  const ce_dds_text_obj = new CloudEvent({
    specversion: "1.0",
    id: "b46cf653-d48a-4b90-8dfa-355c01061363",
    type,
    source,
    datacontenttype: "application/cloudevent+dds",
    subject: "SQUARE",
    time,
    dataschema,
    datakey:"t",
    datacontentencoding: "text",
    data: "just normal text",
    // [ext1Name]: ext1Value,
    // [ext2Name]: ext2Value,
  })

  const ce_dds_binary_obj = new CloudEvent({
    specversion: "1.0",
    id: "b46cf653-d48a-4b90-8dfa-355c01061364",
    type,
    source,
    datacontenttype: "application/cloudevent+dds",
    subject: "SQUARE",
    time,
    dataschema,
    datakey:"b",
    datacontentencoding: "binary",
    data: Buffer.from("just normal text" as string)
    // [ext1Name]: ext1Value,
    // [ext2Name]: ext2Value,
  })
  
  try {
    console.log('Waiting for subscriptions...')
    await output.waitForSubscriptions()
    //CloudEvent into a DDSMessage<T>
    
    console.log('Writing... msg_dds_json_obj')
    const msg_dds_json_obj = DDS.structured(ce_dds_json_obj);
    console.log(msg_dds_json_obj)
    output.instance.setFromJson(msg_dds_json_obj)
    output.write()
    output.clearMembers()
    sleep.msleep(500)
    
    console.log('Writing... msg_dds_json_default_obj')
    const msg_dds_json_default_obj = DDS.structured(ce_dds_json_default_obj);
    console.log(msg_dds_json_default_obj)
    output.instance.setFromJson(msg_dds_json_default_obj)
    output.write()
    output.clearMembers()
    sleep.msleep(500)
    
    console.log('Writing... msg_dds_text_obj')
    const msg_dds_text_obj = DDS.structured(ce_dds_text_obj);
    console.log(msg_dds_text_obj)
    output.instance.setFromJson(msg_dds_text_obj)
    output.write()
    output.clearMembers()
    sleep.msleep(500)
    
    console.log('Writing... msg_dds_binary_obj')
    const msg_dds_binary_obj = DDS.binary(ce_dds_binary_obj);
    console.log(msg_dds_binary_obj)
    output.instance.setFromJson(msg_dds_binary_obj)
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
  // we don't close the connector because it is shared with the receiver
  //connector.close()
}

// Run both functions concurrently using async/await and Promise.all()
(async () => {
  const emitPromise = emit();
  const receivePromise = receive();
  
  await Promise.all([emitPromise, receivePromise]);
})();