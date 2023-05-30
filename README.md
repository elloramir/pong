### Notes
- This is, of course, university work done with as much pain on ass as possible, I'm lazy.
- The entry point of the game is server.js.
- No additional packages need to be installed.
- The implementation of the websocket has been tested only in Chromium-based browsers, so it is recommended to play the game using - the same.
- The multiplayer feature in the game uses a rather simplistic technique (due to time constraints during development).
- The server runs at 'x' ticks per second, but this does not necessarily mean that the game will run at the same rate.
- The server tick is only considered complete when all live matches have been updated. While there could be room for improvement - in this aspect, it was not deemed necessary for this particular case.