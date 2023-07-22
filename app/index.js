const WebSocket = require('ws');
const { spawn, exec } = require('child_process');

const debug = (process, message) => {
  console.log(`DEBUG | ${process} | ${message}`)
}

const info = (process, message) => {
  console.log(`INFO | ${process} | ${message}`)
}

const error = (process, message) => {
  console.log(`ERROR | ${process} | ${message}`)
}

let CHAT_RUNNING = false
let RECORDING = false
let STREAM_LIVE = false

let chat_process;
let recording_process;

ws = new WebSocket('wss://live.destiny.gg');

ws.on('error', (e) => error("WS", e));
ws.on('message', (data) => {
  const response = JSON.parse(data)

  if (response.type == "dggApi:streamInfo") {
    const streams = response.data.streams
    const live = Boolean(streams.twitch || streams.facebook || streams.rumble || streams.kick || streams.youtube.live)
    if (STREAM_LIVE != live) {
      STREAM_LIVE = live
      info('WS', `Stream is now ${live ? 'live' : 'offline'}`)
    }
  }
})

const start_chat = () => {
  chat_process = spawn('bash', ['./run_chat.sh'], { shell: true });
  chat_process.stdout.on('data', (data) => {
    debug('CHAT', data)
  });

  chat_process.stderr.on('data', (data) => {
    error('CHAT', data)
  });
}

const start_recording = () => {
  recording_process = spawn('bash', ['./record.sh'], { shell: true });
  recording_process.stdout.on('data', (data) => {
    debug('RECORD', data)
    RECORDING = true
  });

  recording_process.stderr.on('data', (data) => {
    error('RECORD', data)
  });

  recording_process.on('exit', function(code, signal) {
    info('RECORD', `Exited with: code ${code} and signal ${signal}`);
    RECORDING = false
  });

}

function check_chat_status() {
  exec('pidof Xvfb', (_, stdout, _) => {
    if (stdout.length > 0) {
      CHAT_RUNNING = true
    }
  });
}

function main_loop() {
  console.log('Stuff');

  check_chat_status()

  if (!CHAT_RUNNING) {
    start_chat()
  }

  if (CHAT_RUNNING && STREAM_LIVE && !RECORDING) {
    start_recording()
  }

  if (!STREAM_LIVE && RECORDING) {
    recording_process.kill('SIGINT')
  }
}

setInterval(main_loop, 10000);

