Studio = (function () {
  // Properties

  var self = this
  var socket = null
  var $scene = null
  var $legend = null
  var elements = {}
  var keyboardActions = {}
  var activeKeyboardActions = {}
  var updateInterval = null
  var plugins = {}

  // Public API

  this.init = function (sceneSelector, legendSelector) {
    socket = io({ transports: ['websocket'] })
    socket.on('reconnect_attempt', function () { socket.io.opts.transports = ['polling', 'websocket'] })

    $scene = $(sceneSelector)
    $legend = $(legendSelector)

    elements = {}
    keyboardActions = {}
    activeKeyboardActions = {}

    // Event bindings

    $scene.addClass('loading')

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

    socket.on('init', function (initialData) {
      self._createScene(initialData.data)
      self._updateScene(initialData.state)
    })

    socket.on('state update', function (stateData) {
      self._updateScene(stateData)
    })
  }

  this.registerActionPlugin = function (plugin) {
    plugins[plugin.name] = plugin
  }

  this.emitElementUpdate = function ($element, data) {
    var stateData = {}
    stateData[$element.attr('id')] = data
    socket.emit('state update', stateData)
  }

  // Scene management

  this._createScene = function (data) {
    elements = {}
    keyboardActions = {}
    activeKeyboardActions = {}

    $scene.removeClass('loading')
    $scene.html('')
    $scene.css({
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
          for (var pluginName in plugins) {
            if (plugins[pluginName].watchDragEvents) {
              plugins[pluginName].update($element, event.dx, event.dy)
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
    var $element = $('<img \
            id="' + elementData.id + '" \
            src="' + elementData.path + '" \
            class="element" />')
    $element.css({
      'position': 'absolute',
      'left': elementData.init_x || 0,
      'top': elementData.init_y || 0,
      'z-index': elementData.z || 0,
      'display': elementData.init_hidden ? 'none' : 'block'
    })
    if (elementData.background) {
      $element.css({
        'width': $scene.width() + 'px',
        'height': $scene.height() + 'px'
      })
    }

    $scene.append($element)
    $element = $('#' + elementData.id)

    var actions = elementData.actions
    if (actions) {
      $element.data('plugins', Object.keys(actions))
      for (var pluginName in actions) {
        this._registerAction(actions[pluginName], pluginName, $element)
        plugins[pluginName].onElementCreate($element)
      }
    }

    return $element
  }

  this._updateElement = function ($element, elementState) {
    var actions = $element.data('plugins')
    if (actions) {
      for (var index in actions) {
        var pluginName = actions[index]
        plugins[pluginName].onElementUpdate($element, elementState)
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
      var plugin = plugins[action.pluginName]
      if (plugin) {
        plugin.start(action.$element)
        activeKeyboardActions[key] = action
      }
    }
  }

  this._update = function () {
    for (var key in activeKeyboardActions) {
      console.log(key)
      var action = keyboardActions[key]
      plugins[action.pluginName].update(action.$element)
    }
  }

  this._handleKeyUp = function (key) {
    if (activeKeyboardActions[key]) {
      var action = activeKeyboardActions[key]
      plugins[action.pluginName].end(action.$element)
      delete activeKeyboardActions[key]
    }
  }

  return this
})()
