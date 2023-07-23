import puppeteer, { Browser, Page } from 'puppeteer'
import { PuppeteerScreenRecorder, PuppeteerScreenRecorderOptions } from 'puppeteer-screen-recorder'
import WebSocket from 'ws'
import fs from 'fs'
import sanitize from "sanitize-filename"
import date from 'date-and-time'


const info = (message: string, ...remaining: any) => {
  const now = new Date();
  const datetime = date.format(now, 'YYYY/MM/DD HH:mm:ss');
  console.log(`INFO | ${datetime} | ${message}`, remaining.length > 0 ? remaining : '')
}

const debug = (message: string, ...remaining: any) => {
  const now = new Date();
  const datetime = date.format(now, 'YYYY/MM/DD HH:mm:ss');
  console.log(`DEBUG | ${datetime} | ${message}`, remaining.length > 0 ? remaining : '')
}

const error = (message: string) => {
  console.log(`ERROR | ${message}`)
}

let file_name: string = ""
let stream_live: boolean = false
let stream_recording: boolean = false
let stopping_recording: boolean = false
let chat_running: boolean = false
let chat_starting: boolean = false
let websocketConnected: boolean = false;



const getStreamTitle = (streams: Streams) => {
  if (streams.youtube) {
    return streams.youtube.status_text
  } else if (streams.kick) {
    return streams.kick.status_text
  } else if (streams.rumble) {
    return streams.rumble.status_text
  }
}

interface Streams {
  twitch?: StreamInfo;
  youtube?: StreamInfo;
  facebook?: StreamInfo;
  rumble?: StreamInfo;
  kick?: StreamInfo;
}
interface StreamInfo {
  live: boolean | null;
  game: string | null;
  preview: string | null;
  status_text: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration: number | null;
  viewers: number | null;
  id: number | null;
  platform: string | null;
  type: string | null;
}

let pingTimeout: any;
async function startWebsocket() {
  info("Starting WebSocket")
  const ws = new WebSocket('wss://live.destiny.gg');

  function heartbeat() {
    clearTimeout(pingTimeout);

    debug('Heartbeat')
    // Use `WebSocket#terminate()`, which immediately destroys the connection,
    // instead of `WebSocket#close()`, which waits for the close timer.
    // Delay should be equal to the interval at which your server
    // sends out pings plus a conservative assumption of the latency.
    pingTimeout = setTimeout(() => {
      websocketConnected = false
      ws.terminate();
    }, 120000 + 1000);
  }

  ws.on('error', (e) => error(`Error ${e}`));
  ws.on('message', (data: string) => {
    websocketConnected = true
    const response = JSON.parse(data)
    debug('Websocket:', response)

    if (response.type == "dggApi:streamInfo") {
      const streams: Streams = response.data.streams
      const live = Boolean(streams.twitch || streams.facebook || streams.rumble || streams.kick || streams.youtube?.live)
      const title = getStreamTitle(streams)
      debug("Streams are:", streams);
      if (stream_live != live) {
        stream_live = live
        file_name = sanitize(title || "")
        info(`Stream is now ${live ? 'live' : 'offline'}`)
        info(`Stream title is: ${title}`)
      }
    }
  })
  ws.on('open', () => {
    websocketConnected = true
    heartbeat()
  });
  ws.on('ping', heartbeat);
  ws.on('close', function clear() {
    websocketConnected = false
    clearTimeout(pingTimeout);
  });

  info("WebSocket started")
}



const Config: PuppeteerScreenRecorderOptions = {
  followNewTab: false,
  fps: 60,
  ffmpeg_Path: null,
  videoFrame: {
    width: 450,
    height: 1080,
  },
  videoCrf: 16,
  videoCodec: 'libx264',
  videoPreset: 'ultrafast',
  videoBitrate: 6000,
};

let page: Page;
async function run_chat() {
  info('Starting chat')
  chat_starting = true
  const browser: Browser = await puppeteer.launch({ headless: 'new', executablePath: '/usr/bin/chromium-browser', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  page = await browser.newPage();
  await page.goto('https://www.destiny.gg/embed/onstreamchat');
  await page.setViewport({
    width: 450,
    height: 1080,
    deviceScaleFactor: 1,
  })
  await page.evaluate(() => {
    let dom = document.body;
    dom.style.background = 'black'
  });
  chat_running = true
  chat_starting = false
  info('Started chat')
};

let writeStream: any;
let recorder: PuppeteerScreenRecorder;
async function startRecording() {
  info("Starting recording")
  recorder = new PuppeteerScreenRecorder(page, Config);
  const now = new Date();
  const datetime = date.format(now, 'YYYY-MM-DD_HH-mm');

  writeStream = fs.createWriteStream(`./recordings/${datetime}_${file_name}.webm`);

  await recorder.startStream(writeStream);
  stream_recording = true
  info("Started recording")
}

async function stopRecording() {
  info("Stopping recording")
  stopping_recording = true
  await recorder.stop()
  stream_recording = false
  if (writeStream) {
    writeStream.close()
  }
  stopping_recording = false
  info("Stopped recording")

}

async function main_loop() {
  const canRunChat = Boolean(!chat_running && !chat_starting)
  const canStartRecording = Boolean(chat_running && stream_live && !stream_recording)
  const canStopRecording = Boolean(chat_running && !stream_live && stream_recording && recorder && !stopping_recording)

  if (!websocketConnected) {
    await startWebsocket()
  }

  if (canRunChat) {
    await run_chat()
  }

  if (canStartRecording) {
    await startRecording()
  }

  if (canStopRecording) {
    await stopRecording()
  }
}

//setInterval(stoperino, 5000);
setInterval(() => {
  stream_live = !stream_live
}, 20000)
setInterval(main_loop, 500);
