/* eslint-disable */
import { CloudEvent, MQTT } from "cloudevents";
import * as mqtt from "mqtt";
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

        const event = MQTT.toEvent({
          body: data,
          headers: {},
        });
        console.log(event)
      }
    }
  } catch (err) {
    console.log('Error encountered: ' + err)
  }
  connector.close()
}

const emit = async () => {

  try {
    console.log('Waiting for subscriptions...')
    await output.waitForSubscriptions()

    console.log('Writing...')
    for (let i = 0; i < 1; i++) {
      output.instance.setFromJson({id:"12",source:"src",specversion:"v1",type:"t",data_key:"k"})
      output.write()
      sleep.msleep(500)
    }

    console.log('Exiting...')
    // Wait for all subscriptions to receive the data before exiting
    await output.wait()
  } catch (err) {
    console.log('Error encountered: ' + err)
  }
  // The connector is shared with the receiver.
  //connector.close()
}

// Run both functions concurrently using async/await and Promise.all()
(async () => {
  const emitPromise = emit();
  const receivePromise = receive();

  await Promise.all([emitPromise, receivePromise]);
})();