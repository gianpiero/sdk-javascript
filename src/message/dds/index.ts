/*
 Copyright 2021 The CloudEvents Authors
 SPDX-License-Identifier: Apache-2.0
*/

import { constants } from "buffer";
import { Binding, Deserializer, CloudEvent, CloudEventV1, CONSTANTS, Message, ValidationError, Headers } from "../..";
import { base64AsBinary, isString, isStringOrThrow } from "../../event/validation";

export {
  DDS, DDSMessageFactory
};
export type { DDSMessage };


interface IDDSBody {
  binary_data?: Buffer,
  json_dds_data?: string,
  text_data?: string,
  packed_dds?: Buffer 
}

/**
 * Extends the base {@linkcode Message} interface to include DDS attributes, some of which
 * are aliases of the {Message} attributes.
 */
interface DDSMessage<T = IDDSBody> extends Message<T> {
  datacontenttype: string | undefined | unknown,
  datacontentencoding: string | undefined | unknown,
  [key: string]: unknown; // Allow additional properties
}

/**
 * Binding for DDS transport support
 * @implements @linkcode Binding
 */
const DDS: Binding = {
  binary,  
  structured,
  toEvent: toEvent as Deserializer,
  isEvent
};

/**
 * Converts a CloudEvent into a DDSMessage<T> with the event's data as the message payload
 * @param {CloudEventV1} event a CloudEvent 
 * @returns {DDSMessage<T>} the event serialized as an DDSMessage<T> with binary encoding
 * @implements {Serializer}
 */
function binary<T>(event: CloudEventV1<T>): DDSMessage<T> {
  const properties = { ...event };

  let body = properties.data as T;

  if (!body && properties.data_base64) {
    body = base64AsBinary(properties.data_base64) as unknown as T;
  }

  delete properties.data;
  delete properties.data_base64;

  return DDSMessageFactory(event.datacontenttype as string, properties, body);
}


/**
 * Converts a CloudEvent into an DDSMessage<T> with the event as the message payload
 * @param {CloudEventV1} event a CloudEvent 
 * @returns {DDSMessage<T>} the event serialized as an DDSMessage<T> with structured encoding
 * @implements {Serializer}
 */
function structured<T>(event: CloudEventV1<T>): DDSMessage<T> {

  // headers is a mandatory field of Message
  const headers: Headers = { 
    ...{ [CONSTANTS.HEADER_CONTENT_TYPE]: event.datacontenttype }, 
  };

  const properties = {...event}

  // Conver the time in the DDS format
  let time = {
    sec: 0,
    nanosec:0
  }

  if (typeof properties.time === 'string') {
    const dateObj = new Date(properties.time);
    const millisecondsSinceEpoch = dateObj.getTime();
    time.sec = Math.floor(millisecondsSinceEpoch / 1000);
    time.nanosec = (millisecondsSinceEpoch % 1000) * 1e6;
  }
  delete properties.time


  let m_body = properties.data
  delete properties.data

  let m_datacontenttype = properties.datacontenttype;
  delete properties.datacontenttype

  let m_datacontentencoding = properties.datacontentencoding;
  delete properties.datacontentencoding

  if (m_datacontentencoding == 'json' || m_datacontentencoding === undefined) {
    let json_dds_data_obj;
    try {
      json_dds_data_obj = JSON.stringify(m_body)
    } catch (err) {
      throw err;
    }
    return {
      datacontentencoding: m_datacontentencoding,
      datacontenttype: m_datacontenttype,
      ...properties,
      ...{time},
      headers: headers,
      body: {json_dds_data:  json_dds_data_obj}
    }  
  } else if (m_datacontentencoding == 'text') {
    if (!isString(m_body)) {
      throw ("Not a valid string")
    }
    return {
      datacontentencoding: m_datacontentencoding,
      datacontenttype: m_datacontenttype,
      ...properties,
      ...{time},
      headers: headers,
      body: {text_data: m_body }
    }
  } else {
    throw new ValidationError("dataencoding");
  }
}

/**
 * A helper function to create an DDSMessage<T> object, with "User Properties" as an alias
 * for "headers" and "payload" an alias for body, and a "PUBLISH" record with a "Content Type"
 * property.
 * @param {string} contentType the "Content Type" attribute on PUBLISH
 * @param {Record<string, unknown>} headers the headers and "User Properties"
 * @param {T} body the message body/payload
 * @returns {DDSMessage<T>} a message initialized with the provided attributes
 */
function DDSMessageFactory<T>(contentType: string, headers: Record<string, unknown>, body: T): DDSMessage<T> {

  return {
    datacontentencoding: undefined,
    datacontenttype: undefined,
    body,
    headers: headers as Headers,
  };
}

/**
 * Converts an DDSMessage<T> into a CloudEvent
 * @param {DDSMessage<T>} message the message to deserialize
 * @param {boolean} strict determines if a ValidationError will be thrown on bad input - defaults to false
 * @returns {CloudEventV1<T>} an event
 * @implements {Deserializer}
 */
function toEvent<T>(message: Message<T>, strict: boolean = false): CloudEventV1<T> | CloudEventV1<T>[] {
  if (strict && !isEvent(message)) {
    throw new ValidationError("No CloudEvent detected");
  }
  
  let body;
  if (isJsonDDSMessage(message as DDSMessage)) {
    body = JSON.parse((message.body as any)['json_dds_data'])
    delete message.body
    
  } else if (isTextDDSMessage(message as DDSMessage)) {
    body = (message.body as any)['text_data']
    delete message.body
  } else {
    //todo
    
  }

  // Convert time back
  // Convert DDS time to JavaScript Date object
  const time = (message as any)['time'];
  let time_s = undefined;
  if (time) {
    const millisecondsSinceEpoch = time.sec * 1000 + Math.floor(time.nanosec / 1e6);
    const dateObj = new Date(millisecondsSinceEpoch);
    time_s = dateObj.toISOString();
  }
  

  return new CloudEvent<T>({
    ...message,
    time: time_s,
    data: body,
  }, false);
}

/**
 * Determine if the message is a CloudEvent
 * @param {DDSMessage<T>} message an DDSMessage
 * @returns {boolean} true if the message contains an event
 */
function isEvent<T>(message: Message<T>): boolean {
  return isBinaryMessage(message as DDSMessage) || isStructuredMessage(message as DDSMessage);
}

function isBinaryMessage<T>(message: DDSMessage<T>): boolean {
  return !!message.body && typeof message.body === 'object' &&
    ('binary_data' in message.body || 'packed_dds' in message.body);
}

function isStructuredMessage<T>(message: DDSMessage<T>): boolean {
  return !!message.body && typeof message.body === 'object' &&
    ('json_dds_data' in message.body || 'text_data' in message.body);
}

function isJsonDDSMessage(message: DDSMessage): boolean {
  return !!message.body && typeof message.body === 'object' && 'json_dds_data' in message.body;
}

function isTextDDSMessage(message: DDSMessage): boolean {
  return !!message.body && typeof message.body === 'object' && 'text_data' in message.body;
}