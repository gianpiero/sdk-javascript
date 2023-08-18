/* eslint-disable */
const path = require('path')
const sleep = require('sleep')
const rti = require('rticonnextdds-connector')
const configFile = path.join(__dirname, '/../CloudEvent.xml')



const run = async () => {
  const connector = new rti.Connector('CEParticipantLibrary::CEParticipantPub', configFile)
  const output = connector.getOutput("CEPublisher::CEWriter");
  try {
    console.log('Waiting for subscriptions...')
    await output.waitForSubscriptions()

    console.log('Writing...')
    for (let i = 0; i < 1; i++) {
      output.instance.setFromJson({id:"1",source:"src",specversion:"v1",type:"t",data_key:"k"})
      output.write()
      sleep.msleep(500)
    }

    console.log('Exiting...')
    // Wait for all subscriptions to receive the data before exiting
    await output.wait()
  } catch (err) {
    console.log('Error encountered: ' + err)
  }
  connector.close()
}

run()