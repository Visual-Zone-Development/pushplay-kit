# Engine export sample

What a game made in an engine looks like to PushPlay: the repo is not a JavaScript project, the engine has written a web export and a Linux build into `export/`, and `pushplay.json` says where they are. The "engine" here is a stand-in (the web page draws a spinning shape after a loading pause, the Linux build is a shell script), so the sample stays a few kilobytes.

- `build.outputs` names the folder for each platform; each `entry` is a file inside its folder.
- The web build is played by the check; the Linux build is checked to be a program and packaged.
- `launch` passes an argument to the Linux build, and the script reads `PUSHPLAY`, which the launcher sets, to know it was started from there.
