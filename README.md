A weird multiplayer toy, for streams.

## Initial setup

Requirement: NodeJS 7.6+

* `npm install`
* `node server.js`
* Browse to `http://localhost:3000`

Most of the code is in `server.js` and `static/index.html`.

## Developer tools

Prerequisites: `npm install -g browser-refresh node-inspector forever`

* `browser-refresh server.js`: Launches the app, and makes the server and browser refresh when needed upon file changes.
* `node-debug server.js`: Launches the app in debug mode.
* `forever start forever.json`: Launches the app, making it automatically recover in case of crashes. Can then be stopped with `forever stop studio`.

## Data formats

### `data/data.json` 

**Root attributes**

* `width` Width of the scene in pixels
* `height` Height of the scene in pixels
* `elements` An array of Elements

**Element attributes: general**

* `id` A unique identifier. Also used for building the controls legend
* `path` The picture path
* `background` *(optional)* If true, the picture size will be adapted to fit the scene
* `z` *(optional)* The z-index. Set to zero by default

**Element attributes: actions**

* `actions.talk` *(optional)* A key to hold in order to animate the sprite as if it was talking
* `actions.toggle` *(optional)* A key to press to toggle the spite visibility
* `actions.move` *(optional)* True if the element can be moved

**Element attributes: initial state**

These attributes can be overrided by the live scene state.

* `init_hidden` *(optional)* Whether the element is hidden
* `init_x` *(optional)* Horizontal position
* `init_y` *(optional)* Vertical position


### `data/state.json` 

A map of element states. The keys are the IDs of the elements, the values may have the following keys:

* `hidden` Whether the element is visible
* `x` Horizontal position
* `y` Vertical position
