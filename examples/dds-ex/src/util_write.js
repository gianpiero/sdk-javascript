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


    const type = "org.cncf.cloudevents.example";
    const source = "urn:event:from:myapi/resource/123";
    const time = new Date().toISOString();
    const subject = "subject.ext";
    const dataschema = "http://cloudevents.io/schema.json";
    const datacontenttype = "application/json";
    const id = "b46cf653-d48a-4b90-8dfa-355c01061361";
    const ext1Name = "extension1";
    const ext1Value = "foobar";
    const ext2Name = "extension2";
    const ext2Value = "acme";

    
    const data = {
      foo: "bar",
    };

    const m1 = {
      id,
      source,
      specversion: "1.0",
      type,
      datacontenttype,
      dataschema,
      subject
      // time
      // data,
      // [ext1Name]: ext1Value,
      // [ext2Name]: ext2Value,
    }

    console.log(m1)

    console.log('Writing...')
    for (let i = 0; i < 1; i++) {
      output.instance.setFromJson(m1)
      // output.instance.setFromJson({id:"1",source:"src",specversion:"v1",type:"t",data_key:"k", data: {text_data:"Just a string"}})
      // output.instance.setFromJson({id:"1",source:"src",specversion:"v1",type:"t",data_key:"k"})
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