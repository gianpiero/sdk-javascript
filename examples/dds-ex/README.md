# DDS Example

## How To Start

Install and compile:

```bash
npm install
npm run compile
```


Then, start

```bash
npm start
```

The basic example creates a DDS Event Consumer  (receive). Once a new DDS Sample is received is converted into an Event and printed on the screen.

The example then, create a DDS Event Producer (emit). This emits on event, writes it and waits untill it's received by all subcription and then it exists. 