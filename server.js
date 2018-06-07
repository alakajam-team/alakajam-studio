const express = require('express')
const http = require('http')
const socketIo = require('socket.io')
const moment = require('moment')
const colors = require('colors/safe')
const fs = require('fs')
const path = require('path')

// ========== Constants

const PORT = 3000
const STATE_FILE = path.join(__dirname, "data/state.json")
const DATA_FILE = path.join(__dirname, "data/data.json")
const STATIC_ROOTS = [path.join(__dirname, "static"), path.join(__dirname, "data")]
const STATE_SAVE_MIN_DELAY = 1000
const STATE_FULL_REFRESH_DELAY = 5000

// ========== Globals 

let app = express()
let httpServer = http.Server(app)
let io = socketIo(httpServer)
let clients = 0

// ========== Routes

STATIC_ROOTS.map(root => app.use(express.static(root)))

loadStateAndData((state, data) => {
    io.on("connection", function(socket) {
        clients++
        log(`Client joined: ${socket.id}. Total clients: ${clients}`)
        
        socket.emit("init", { data, state })

        socket.on("state update", stateData => {
            state = Object.assign(state, stateData) // data can be a partial state
            socket.broadcast.emit("state update", stateData)
            saveState(state)
        })
        socket.on("disconnect", function () {
            clients--
            log(`Client left: ${socket.id}. Total clients: ${clients}`)
        })
    })

    setInterval(() => io.emit("state update", state), STATE_FULL_REFRESH_DELAY)
    
    httpServer.listen(3000, () => log(`Alakajam! Studio launched on *:${PORT}`))
})


// ========== State management


function loadStateAndData (callback) {
    loadJSON(STATE_FILE, state => {
        loadJSON(DATA_FILE, data => {
            callback(state, data)
        })
    })
}

function loadJSON (file, callback) {
    fs.readFile(file, (err, buffer) => {
        if (err) error(err)
        else callback(JSON.parse(buffer))
    })
}

function saveState (state = {}) {
    if (!state.lastSaved || new Date().getTime() - state.lastSaved > STATE_SAVE_MIN_DELAY) {
        let stateString = JSON.stringify(state, null, 2)
        fs.writeFile(STATE_FILE, stateString)
    }
}

// ========== Misc functions

function log () {
    let argsWithTimestamp = [getTimestamp(), colors.green("INFO")]
    for (let argument of arguments) argsWithTimestamp.push(argument)
    console.log.apply(null, argsWithTimestamp)
}

function error () {
    let argsWithTimestamp = [getTimestamp(), colors.red("ERROR")]
    for (let argument of arguments) argsWithTimestamp.push(argument)
    console.log.apply(null, argsWithTimestamp)
}

function getTimestamp () {
    return moment().format('YYYY-MM-DD HH:mm:ss')
}