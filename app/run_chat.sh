#!/bin/sh
echo 'Running chat and xvfb script'
export DISPLAY=:44
xvfb-run \
  --server-num 44 \
  -s "-nocursor -ac -screen 0 500x600x24" \
  chromium \
  --no-sandbox \
  --temp-profile \
  --window-size=500,600 \
  --disable-gpu \
  --window-position=0,0 \
  --app="https://www.destiny.gg/embed/onstreamchat" &
sleep 5s
xdotool mousemove 0 0
echo 'CHAT STARTED'
