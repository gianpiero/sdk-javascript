/* eslint-disable */
const path = require('path')
const sleep = require('sleep')
const rti = require('rticonnextdds-connector')
const configFile = path.join(__dirname, '/../CloudEvent.xml')



const run = async () => {
  const connector = new rti.Connector('CEParticipantLibrary::CEParticipantSub', configFile)
  const input = connector.getInput("CESubscriber::CEReader");

  try {
    console.log('Waiting for publications...')
    await input.waitForPublications()

    console.log('Waiting for data...')
    for (let i = 0; i < 500; i++) {
      await input.wait()
      input.take()
      for (const sample of input.samples.validDataIter) {
        // You can obtain all the fields as a JSON object
        const data = sample.getJson()
        console.log(JSON.stringify(data))

        const cdrBuff = sample.cdr
        console.log(cdrBuff)
        
      }

      // for (let i=0; i < input.samples.length; i++) {
      //   const pointer = input.samples.getNative(i)
      //   const b_size = -1
      //   const res = RTI_Connector_DDS_DynamicData_to_cdr_buffer(pointer,NULL,b_size)
      // }
    }
  } catch (err) {
    console.log('Error encountered: ' + err)
  }
  connector.close()
}

run()