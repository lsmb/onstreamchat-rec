#!/bin/sh
echo 'Running recording script'
FILE_NAME=`date +"%m-%d-%Y-%H-%M"`

ffmpeg -y -f x11grab -video_size 500x600 -draw_mouse 0 -framerate 24 -i :44 -vcodec libx264 -preset ultrafast -qp 0 -pix_fmt yuv444p ./recordings/${FILE_NAME}.mkv
