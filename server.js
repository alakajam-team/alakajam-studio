const express = require('express')
const expressNunjucks = require('express-nunjucks')
const http = require('http')
const socketIo = require('socket.io')
const moment = require('moment')
const colors = require('colors/safe')
const fs = require('fs')
const path = require('path')

// ========== Constants

const PORT = 3000
const DATA_ROOT = path.join(__dirname, 'data')
const ROOMS_FILE = path.join(DATA_ROOT, 'rooms.json')
const STATIC_ROOTS = [path.join(__dirname, 'static'), DATA_ROOT]
const STATE_SAVE_MIN_DELAY = 1000
const STATE_FULL_REFRESH_DELAY = 5000

// ========== Globals

let app = express()
let httpServer = http.Server(app)
let io = socketIo(httpServer)
let clients = 0

// ========== Routes

loadRooms(rooms => {
  let roomIds = Object.keys(rooms)

  // Pages & assets

  app.set('views', path.join(__dirname, '/static'))
  expressNunjucks(app, { watch: true, noCache: true })

  app.get('/', (req, res) => {
    res.render('index', { rooms })
  })
  app.get('/room/:roomId', (req, res) => {
    res.render('room', { roomId: req.params.roomId })
  })

  STATIC_ROOTS.map(root => app.use(express.static(root)))

  // SocketIO

  io.on('connection', function (socket) {
    clients++
    log(`Client joined: ${socket.id}. Total clients: ${clients}`)

    let socketRoom = rooms[socket.handshake.query.roomId]
    socket.join(socketRoom.id)
    socket.emit('init', socketRoom)

    socket.on('state update', stateData => {
      for (let key in stateData) {
        let stateDataItem = stateData[key]
        if (typeof stateData[key] === 'object') {
          socketRoom.state[key] = Object.assign(socketRoom.state[key] || {}, stateDataItem) // data can be a partial state
        } else {
          socketRoom.state[key] = stateDataItem // special data
        }
      }
      
      io.to(socketRoom.id).emit('state update', stateData)
      saveState(socketRoom)
    })

    socket.on('disconnect', function () {
      clients--
      log(`Client left: ${socket.id}. Total clients: ${clients}`)
    })
  })

  setInterval(() => roomIds.map(roomId => {
    let room = rooms[roomId]
    io.to(roomId).emit('state update', room.state)
    saveState(room)
  }), STATE_FULL_REFRESH_DELAY)

  httpServer.listen(3000, () => log(`Alakajam! Studio launched on *:${PORT}`))
})

// ========== State management

function loadRooms(callback) {
  loadJSON(ROOMS_FILE, roomsData => {
    let rooms = {}
    for (let index in roomsData) {
      loadRoom(index, roomsData, rooms, callback)
    }
  })
}

function loadRoom(index, roomsData, rooms, callback) {
  let roomData = roomsData[index]
  let dataPath = path.join(DATA_ROOT, roomData.data_path)
  let statePath = path.join(DATA_ROOT, roomData.state_path)

  // Load data & state
  loadJSON(dataPath, data => {
    loadJSON(statePath, state => {
      roomData.data = data
      roomData.state = state
      rooms[roomData.id] = roomData

      // Auto-refresh room data upon file change
      fs.watch(dataPath, () => {
        loadJSON(dataPath, data => {
          console.log(`${dataPath} refreshed`)
          roomData.data = data
        })
      })

      // Fire callback when all rooms are loaded
      if (Object.keys(rooms).length === roomsData.length) {
        callback(rooms)
      }
    }, {})
  })
}

function loadJSON(file, callback, defaultJSON = undefined) {
  fs.readFile(file, (err, buffer) => {
    if (!err) {
      try {
        callback(JSON.parse(buffer))
      } catch (e) {
        err = e
      }
    }
    if (err) {
      if (defaultJSON) {
        callback(defaultJSON)
      } else {
        error(err)
      }
    }
  })
}

function saveState(room) {
  let statePath = path.join(DATA_ROOT, room.state_path)
  let state = room.state || {}
  let now = new Date().getTime()
  if (!state.lastSaved || now - state.lastSaved > STATE_SAVE_MIN_DELAY) {
    state.lastSaved = now
    let stateString = JSON.stringify(state, null, 2)
    fs.writeFile(statePath, stateString, (err) => {
      if (err) error(err)
    })
  }
}

// ========== Misc functions

function log() {
  let argsWithTimestamp = [getTimestamp(), colors.green('INFO')]
  for (let argument of arguments) argsWithTimestamp.push(argument)
  console.log.apply(null, argsWithTimestamp)
}

function error() {
  let argsWithTimestamp = [getTimestamp(), colors.red('ERROR')]
  for (let argument of arguments) argsWithTimestamp.push(argument)
  console.log.apply(null, argsWithTimestamp)
}

function getTimestamp() {
  return moment().format('YYYY-MM-DD HH:mm:ss')
}
