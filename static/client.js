Studio = (function () {

    // Properties

    this.$scene = null
    this.socket = null

    // Local data²

    var self = this
    var $legend = null
    var elements = {}
    var keyboardActions = {}
    var activeKeyboardActions = {}
    var updateInterval = null
    var actionPlugins = {}
    var elementPlugins = {}
    var elementUpdates = []

    // Public API

    this.init = function (roomId, sceneSelector, legendSelector) {
        this.socket = io('/?roomId=' + roomId, { transports: ['websocket'] })
        this.socket.on('reconnect_attempt', function () { this.socket.io.opts.transports = ['polling', 'websocket'] })

        this.$scene = $(sceneSelector)
        $legend = $(legendSelector)

        elements = {}
        keyboardActions = {}
        activeKeyboardActions = {}

        // Event bindings

        if (!updateInterval) {
            updateInterval = setInterval(this._update, 1000 / 60.0)
            $(document).keydown(function (event) {
                if (event.key) self._handleKeyDown(event.key.toUpperCase())
            })
            $(document).keyup(function (event) {
                if (event.key) self._handleKeyUp(event.key.toUpperCase())
            })
        }

        // Message routes

        this.$scene.addClass('loading')

        this.socket.on('init', function (roomInfo) {
            self.$scene.removeClass('loading')
            self._createScene(roomInfo.data)
            self._updateScene(roomInfo.state)
        })

        this.socket.on('state update', function (stateData) {
           self._updateScene(stateData)
        })
    }

    this.registerActionPlugin = function (plugin) {
        actionPlugins[plugin.name] = plugin
    }

    this.registerElementPlugin = function (plugin) {
        elementPlugins[plugin.name] = plugin
    }

    this.emitElementUpdate = function ($element, data) {
        var timestamp = new Date().getTime()
        $element.data('timestamp', timestamp)
        var stateData = { timestamp: timestamp }
        stateData[$element.attr('id')] = data
        this.socket.emit('state update', stateData)
    }

    // Scene management

    this._createScene = function (data) {
        elements = {}
        keyboardActions = {}
        activeKeyboardActions = {}

        this.$scene.html('')
        this.$scene.css({
            'width': data.width + 'px',
            'height': data.height + 'px',
            'margin-left': '-' + (data.width / 2) + 'px',
            'margin-top': '-' + (data.height / 2) + 'px'
        })

        $legend.html('')
        data.elements.forEach(function (elementData) {
            elements[elementData.id] = self._createElement(elementData)
        })

        interact('.draggable')
            .draggable({
                restrict: {
                    restriction: 'parent',
                    elementRect: { top: 0.5, left: 0.5, bottom: 0.5, right: 0.5 }
                },
                onmove: function (event) {
                    $element = $(event.target)
                    for (var pluginName in actionPlugins) {
                        var plugin = actionPlugins[pluginName]
                        if (plugin && plugin.watchDragEvents) {
                            plugin.update($element, event.dx, event.dy)
                        }
                    }
                }
            })
    }

    this._updateScene = function (state) {
        for (var elementId in state) {
            if (elements[elementId]) {
                this._updateElement(elements[elementId], state[elementId])
            }
        }
    }

    this._createElement = function (elementData) {
        var elementType = elementData.type || 'image'
        var $element = $('<div \
            id="' + elementData.id + '" \
            data-type="' + elementType + '" \
            class="element" />')
        $element.css({
            'position': 'absolute',
            'left': elementData.init_x || 0,
            'top': elementData.init_y || 0,
            'z-index': elementData.z || 0,
            'display': elementData.init_hidden ? 'none' : 'block'
        })

        this.$scene.append($element)
        $element = $('#' + elementData.id)
            
        var elementPlugin = elementPlugins[elementType]
        if (elementPlugin) {
            elementPlugin.onElementCreate($element, elementData)
            if (elementPlugin.update) {
                elementUpdates.push($element)
            }
        }

        var actions = elementData.actions
        if (actions) {
            $element.data('plugins', Object.keys(actions))
            for (var pluginName in actions) {
                this._registerAction(actions[pluginName], pluginName, $element)
                var plugin = actionPlugins[pluginName]
                if (plugin) {
                    plugin.onElementCreate($element, elementData)
                } else {
                    console.error("Unsupported action plugin: " + pluginName)
                }
            }
        }

        return $element
    }

    this._updateElement = function ($element, elementState) {
        // XXX Small risk of desync, eg. if someone toggles a sprite while someone else drags it
        var currentTimestamp = $element.data('timestamp')
        if (!currentTimestamp || currentTimestamp < elementState.timestamp) {
            $element.data('timestamp', elementState.timestamp)

            var elementPlugin = elementPlugins[$element.data('type')]
            if (elementPlugin) {
                elementPlugin.onElementUpdate($element, elementState)
            }

            var actions = $element.data('plugins')
            if (actions) {
                for (var index in actions) {
                    var pluginName = actions[index]
                    if (actionPlugins[pluginName]) {
                        actionPlugins[pluginName].onElementUpdate($element, elementState)
                    }
                }
            }
        }
    }

    // Input and plugins management

    this._registerAction = function (key, pluginName, $element) {
        if (typeof key === 'string') {
            keyboardActions[key.toUpperCase()] = {
                'pluginName': pluginName,
                '$element': $element
            }
            $legend.append('[' + key.toUpperCase() + ' = ' + $element.attr('id') + ' ' + pluginName + '] ')
        }
    }

    this._handleKeyDown = function (key) {
        if (keyboardActions[key] && !activeKeyboardActions[key]) {
            var action = keyboardActions[key]
            var plugin = actionPlugins[action.pluginName]
            if (plugin) {
                plugin.start(action.$element)
                activeKeyboardActions[key] = action
            }
        }
    }

    this._update = function () {
        elementUpdates.forEach(function ($element) {
            elementPlugins[$element.data('type')].update($element)
        })

        for (var key in activeKeyboardActions) {
            var action = keyboardActions[key]
            actionPlugins[action.pluginName].update(action.$element)
        }
    }

    this._handleKeyUp = function (key) {
        if (activeKeyboardActions[key]) {
            var action = activeKeyboardActions[key]
            actionPlugins[action.pluginName].end(action.$element)
            delete activeKeyboardActions[key]
        }
    }

    return this
})()
