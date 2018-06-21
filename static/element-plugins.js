var ElementPlugin = function (options) {
    // A mandatory name of the element type, to be referenced in the data.json file
    this.name = options.name

    // Called when an element of this type is being created
    // onElementCreate($element, elementData)
    this.onElementCreate = options.onElementCreate || function () { }

    // Called when an element of this type is being updated
    // onElementUpdate($element, elementState)
    this.onElementUpdate = options.onElementUpdate || function () { }

    // Called on each element of this type, every frame
    // update($element)
    this.update = options.update

    // Plugin initialization
    // init()
    if (options.init) options.init()
}

// Image plugin (default)

Studio.registerElementPlugin(new ElementPlugin({
    name: 'image',

    onElementCreate: function ($element, elementData) {
        _getPictureSize(elementData.path, function (width, height) {
            $element.css({
                'background-image': 'url(' + elementData.path + ')',
                'background-size': 'cover',
                'min-width': (elementData.width || width) + 'px',
                'min-height': (elementData.height || height) + 'px'
            })

            if (elementData.tooltip) {
                var tliteOptions = { grav: 's' }
                $element.attr('data-tlite', elementData.tooltip)
                $element.addClass('has-tooltip')
                tlite(function (el) { 
                    if (el.classList.contains('has-tooltip')) {
                        return tliteOptions
                    }
                })
                if (elementData.tooltip_pinned) {
                    tlite.show($element[0], tliteOptions)
                    $element.addClass('clear-tooltip')
                }
            }
        })
    }
}))

function _getPictureSize(src, callback) {
    var img = new Image()
    img.onload = function () { callback(this.width, this.height) }
    img.src = src;
}

// Background plugin

Studio.registerElementPlugin(new ElementPlugin({
    name: 'background',
    watchUpdate: true,

    onElementCreate: function ($element, elementData) {
        $element.css({
            'background-image': 'url(' + elementData.path + ')',
            'background-size': 'cover',
            'min-width': Studio.$scene.width() + 'px',
            'min-height': Studio.$scene.height() + 'px'
        })
        if (elementData.speed_x) {
            var speed = { x: elementData.speed_x, y: elementData.speed_y }
            $element.data('speed', speed)
        }
    },

    update: function ($element) {
        var speed = $element.data('speed')
        if (speed && speed.x) {
            var newX = speed.x + $element.data('position-x') || 0
            var newY = speed.y + $element.data('position-y') || 0
            $element.css({
                'background-position-x': newX + 'px',
                'background-position-y': newY + 'px'
            })
            $element.data('position-x', newX)
            $element.data('position-y', newY)
        }
    }
}))

// Sound plugin

Studio.registerElementPlugin(new ElementPlugin({
    name: 'sound'
}))

// iframe plugin

Studio.registerElementPlugin(new ElementPlugin({
    name: 'iframe',

    onElementCreate: function ($element, elementData) {
        var widthWithUnit = (elementData.width || 400) + 'px'
        var heightWithUnit = (elementData.height || 400) + 'px'

        $element.css({
            'min-width': widthWithUnit,
            'min-height': heightWithUnit
        })
        $element.append('<iframe src="' + elementData.path + '" scrolling="no" \
            width="' + widthWithUnit + '" height="' + heightWithUnit + '" />')
    }
}))
