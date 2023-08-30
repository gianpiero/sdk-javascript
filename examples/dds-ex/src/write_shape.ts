/* eslint-disable */
const path = require('path')
const sleep = require('sleep')
const rti = require('rticonnextdds-connector')
const configFile = path.join(__dirname, '/../CloudEvent.xml')
console.log(configFile)

const u_connector = new rti.Connector('UtilParticipantLibrary::UtilParticipantPubSub', configFile)
const u_input  = u_connector.getInput("UtilSubscriber::SquareReader");
const u_output = u_connector.getOutput("UtilPublisher::SquareWriter");



const emit = async () => {

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
  
  try {
    console.log('Waiting for subscriptions...')
    await u_output.waitForSubscriptions()
    //CloudEvent into a DDSMessage<T>
    
    console.log('Writing...')
    
    u_output.instance.setFromJson(bodyRed)
    u_output.write()
    u_output.clearMembers()
    sleep.msleep(500)
    
    console.log('Writer waiting for subs to receive!')
    // Wait for all subscriptions to receive the data before exiting
    await u_output.wait()
    console.log('Writer Done!')
  } catch (err) {
    console.log('Error encountered: ' + err)
  }
  u_connector.close()
}

// Run both functions concurrently using async/await and Promise.all()
(async () => {
  const emitPromise = emit();
  
  await Promise.all([emitPromise]);
})();