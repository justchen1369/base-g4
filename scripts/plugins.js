(() => {
    let fs = require("fs")
    let path = require("path")
    let vm = require("vm")

    const pluginPath = path.join(__dirname, "plugins")

    /**
     * @type {Plugin[]}
     */
    let loadedPlugins = []

    class PluginDebugMessage {
        constructor(plugin) {
            this.plugin = plugin

            this.timestamp = new Date()
        }
    }

    class PluginDebugTextMessage extends PluginDebugMessage {
        constructor(plugin, message, type) {
            super(plugin)

            this.message = message
            this.type = type

            console[this.type]("[PLUGIN] " + this.message)
        }
    }

    class PluginEventHandler {
        constructor(type, listener) {
            this.eventType = type
            this.listener = listener
        }
    }

    class Plugin {
        constructor(dir, manifestData, isRunning) {
            this.directory = dir

            this.name = manifestData.name
            this.author = manifestData.author
            this.description = manifestData.description

            this.icon = manifestData.icon

            this.version = manifestData.version

            this.scriptPath = manifestData.script

            /**
             * @type {PluginDebugMessage[]}
             */
            this.debugMessages = []

            /**
             * @type {PluginEventHandler[]}
             */
            this.eventHandlers = []

            this.isRunning = isRunning
            if (isRunning) this.run()
        }

        getPluginContext() {
            return {
                // Event handler creation/removal
                addEventListener: (eventType, listener) => {
                    let handler = new PluginEventHandler(eventType, listener)

                    this.eventHandlers.push(handler)
                },
                removeEventListener: (eventType, listener) => {
                    let index = this.eventHandlers.findIndex(h => h.eventType == eventType && h.listener == listener)
                    
                    if (index >= 0) this.eventHandlers.splice(index, 1)
                },

                // Debug messages
                log: (message) => {
                    this.debugMessages.push(
                        new PluginDebugTextMessage(this, message, "log")
                    )
                },
                info: (message) => {
                    this.debugMessages.push(
                        new PluginDebugTextMessage(this, message, "info")
                    )
                },
                warn: (message) => {
                    this.debugMessages.push(
                        new PluginDebugTextMessage(this, message, "warn")
                    )
                },
                error: (message) => {
                    this.debugMessages.push(
                        new PluginDebugTextMessage(this, message, "error")
                    )
                }
            }
        }

        getG4Object() {
            return {}
        }

        run() {
            let context = {
                plugin: this.getPluginContext(),
                G4: this.getG4Object()
            }
            let scriptData = fs.readFileSync(
                path.join(pluginPath, this.directory, this.scriptPath),
                "utf-8"
            )

            vm.runInNewContext(scriptData, context)
        }
    }

    function updatePluginList() {
        let list = document.querySelector("div.pluginList")
        list.innerHTML = ""

        for (let plugin of loadedPlugins) {
            let div = document.createElement("div")
            div.classList.add("plugin")

            let toggle = document.createElement("div")
            toggle.classList.add("toggle")

            let checkbox = document.createElement("input")
            checkbox.type = "checkbox"
            checkbox.id = Math.floor(Math.random() * 1000000)
            if (plugin.isRunning) checkbox.checked = true
            toggle.appendChild(checkbox)

            checkbox.addEventListener("input", () => {
                if (checkbox.checked) {
                    setPluginAsRunning(plugin.directory)
                } else {
                    setPluginAsStopped(plugin.directory)
                }
            })

            let label = document.createElement("label")
            label.htmlFor = checkbox.id

            let logo = document.createElement("img")
            logo.src = path.join(pluginPath, plugin.directory, plugin.icon)
            label.appendChild(logo)

            let name = document.createElement("p")
            name.textContent = plugin.name
            label.appendChild(name)

            toggle.appendChild(label)

            div.appendChild(toggle)

            let description = document.createElement("p")
            description.classList.add("description")
            description.textContent = plugin.description
            div.appendChild(description)

            if (plugin.isRunning) {
                let running = document.createElement("p")
                running.classList.add("running")
                running.textContent = "The plugin is enabled."
                div.appendChild(running)
            }

            let buttons = document.createElement("div")
            buttons.classList.add("buttons")

            let deleteBtn = document.createElement("button")
            deleteBtn.textContent = "Delete"
            buttons.appendChild(deleteBtn)

            let consoleBtn = document.createElement("button")
            consoleBtn.textContent = "Show console"
            buttons.appendChild(consoleBtn)

            div.appendChild(buttons)

            list.appendChild(div)
        }
    }

    function getRunningPlugins() {
        if (!localStorage.getItem("g4_runningPlugins")) localStorage["g4_runningPlugins"] = "[]"

        return JSON.parse(localStorage["g4_runningPlugins"])
    }

    function setPluginAsRunning(pluginID) {
        if (!localStorage.getItem("g4_runningPlugins")) localStorage["g4_runningPlugins"] = "[]"
        let plugins = JSON.parse(localStorage["g4_runningPlugins"])

        if (!plugins.includes(pluginID)) plugins.push(pluginID)

        localStorage["g4_runningPlugins"] = JSON.stringify(plugins)
    }

    function setPluginAsStopped(pluginID) {
        if (!localStorage.getItem("g4_runningPlugins")) localStorage["g4_runningPlugins"] = "[]"
        let plugins = JSON.parse(localStorage["g4_runningPlugins"])

        if (plugins.includes(pluginID)) plugins.splice(plugins.indexOf(pluginID), 1)

        localStorage["g4_runningPlugins"] = JSON.stringify(plugins)
    }

    function isPluginRunning(pluginID) {
        if (!localStorage.getItem("g4_runningPlugins")) localStorage["g4_runningPlugins"] = "[]"
        let plugins = JSON.parse(localStorage["g4_runningPlugins"])

        return plugins.includes(pluginID)
    }

    fs.readdirSync(pluginPath, {
        withFileTypes: true
    }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name).forEach(dir => {
        if (!fs.existsSync(path.join(pluginPath, dir, "manifest.json"))) return

        loadedPlugins.push(
            new Plugin(
                dir,
                JSON.parse(
                    fs.readFileSync(path.join(pluginPath, dir, "manifest.json"), "utf-8")
                ),
                isPluginRunning(dir)
            )
        )
    })

    updatePluginList()

    document.querySelector("button#reloadG4Btn").addEventListener("click", () => {
        location.reload()
    })
})()
