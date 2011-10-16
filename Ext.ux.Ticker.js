Ext.ux.Ticker = Ext.extend(Ext.BoxComponent, {
    baseCls: 'x-ticker',
    direction: 'left',

    // Set by reload method to tell the store to reload once
    // the ticker is scrolled to the end
    reloadStore: false,
    
    els: [],

    msgHandlers: {},

    autoStart: true,

    autoEl: {
        tag: 'div',
        cls: 'x-ticker-wrap'
    },

    setPosInfo: function() {
        var posInfo;
        switch (this.direction) {
        case "left":
        case "right":
            posInfo = { left: this.width || this.el.getWidth() };
            this.task.run = this.scroll.horz;
            break;
        case "up":
        case "down":
            posInfo = { top: this.height || this.el.getHeight() };
            this.task.run = this.scroll.vert;
            break;
        }
        posInfo.position = 'relative';

        this.posInfo = posInfo;
    },

    // Define your own if on how you want to group message differently
    setReloadStore: function() {
        this.store.on('load', function(store, records, opts) {
            var warnMsg = [], infoMsg = [];
            for (var i = 0; i < records.length; i++) {
                var rec = records[i];
                var dt = Date.parseDate(rec.data.time, "U");
                if (rec.data.type == 1) {
                    warnMsg.push({ id: rec.data.id, msg: dt.format('G:i:s') + ' ' + rec.data.message + '. ' });
                } else if (rec.data.type == 2) {
                    infoMsg.push({ id: rec.data.id, msg: dt.format('G:i:s') + ' ' + rec.data.message + '. ' });
                }
            }

            this.reloadStore = false;
            this.updateMessages({ warn: warnMsg, info: infoMsg });
        }, this);
    },

    // Store the messages and when the ticker scrolls to the end
    // then format the new messages
    updateMessages: function(msgs) {

        // If no content setup yet, then setup now
        if (!this.contentEl && this.rendered) {
            //console.log("updateMessages - format event msgs");
            this.setMessages(msgs);
        } else {
            //console.log("updateMessages - store new msgs");
            this.newMessages = msgs;
        }
    },

    // If msgs is string, then just update element
    // If object with warn or info fields, then add some color tags
    setMessages: function(msgs) {
        if (!this.contentEl) {
            this.contentEl = this.el.createChild({ tag: 'span', style: this.posInfo });
            // Mouse over stop ticking
            this.contentEl.on('mouseover', function() {
                this.speed_save = this.speed;
                this.speed = 0;
            }, this);
            // Mouse out - resume
            this.contentEl.on('mouseout', function() {
                this.speed = this.speed_save;
            }, this);
            this.contentEl.removeClass(['x-hidden', 'x-hide-display']);
        }

        if (typeof msgs == 'string') {
            this.contentEl.update(msgs);
            return;
        }

        for (var i = 0; i < this.els.length; i++)
            this.els[i].remove();
        this.els = [];

        // Setup warn messages
        if (msgs.warn && msgs.warn.length) {
            this.els.push(this.contentEl.createChild({ tag: 'font', html:  "Warning", cls: 'x-ticker-warn' }));
            Ext.each(msgs.warn, function(item) {
                // Put the msgHandlers into scope of click method
                item.msgHandlers = this.msgHandlers;
                var el = this.contentEl.createChild({ tag: 'span', html: item.msg, cls: 'x-ticker-message' });
                el.on('click', function() {
                    //Ext.Msg.alert('Warning', 'U have clicked warning event message ' + this.id); 
                    if (this.msgHandlers && this.msgHandlers.warn) {
                        this.msgHandlers.warn(this.id, this.msg);
                    }
                }, item);
                this.els.push(el);
            }, this); 
        }

        // Setup info messages
        if (msgs.info && msgs.info.length) {
            this.els.push(this.contentEl.createChild({ tag: 'font', html:  "Info", cls: 'x-ticker-info' }));
            Ext.each(msgs.info, function(item) {
                // Put the msgHandlers into scope of click method
                item.msgHandlers = this.msgHandlers;
                var el = this.contentEl.createChild({ tag: 'span', html: item.msg, cls: 'x-ticker-message' });
                el.on('click', function() {
                    if (this.msgHandlers && this.msgHandlers.info) {
                        this.msgHandlers.info(this.id, this.msg);
                    }
                    //Ext.Msg.alert('Info', 'U have clicked info event message ' + this.id); 
                }, item);
                this.els.push(el);
            }, this); 
        }   
    },

    reload: function() {
        this.reloadStore = true;
        if (!this.running)
            this.start();
    },

    bindMsgHandler: function(type, handler) {
        this.msgHandlers[type] = handler;
    },

    afterRender: function() {
        // Default speed
        if (!this.speed) {
            this.speed = (this.direction == 'left' || this.direction == 'right') ? 2 : 1;
        }
        this.task = {
            interval: 30,
            scope: this
        }

        this.setPosInfo();

        if (this.contentEl) {
            var ce = Ext.getDom(this.contentEl);
            this.el.dom.appendChild(ce);
            this.contentEl = Ext.get(ce);
            this.contentEl.setPositioning(posInfo);
            this.contentEl.removeClass(['x-hidden', 'x-hide-display']);
        }

        Ext.ux.Ticker.superclass.afterRender.call(this);

        // If store is provided, then bind the load method
        if (this.store) {
            this.setReloadStore();
        }

        if (this.autoStart && this.contentEl) {
            this.running = true;
            Ext.TaskMgr.start(this.task);
        } else if (this.pendingStart) {
            if (this.newMessages) {
                this.setMessages(this.newMessages);
                this.newMessages = null;
            }
            this.running = true;
            //console.log("Rendered: start pending taskMgr task");
            Ext.TaskMgr.start(this.task);
        }
    },

    // Stop scroll and clear the content
    stop: function() {
        if (this.task) {
            Ext.TaskMgr.stop(this.task);
            this.running = false;
        }
        if (this.contentEl) {
            this.contentEl.update('');
        }
    },

    start: function() {
        if (this.store) {
            //console.log("Load ticker store");
            this.store.load();
        }

        if (this.rendered) {
            //console.log("Start ticker running task");
            Ext.TaskMgr.start(this.task);
            this.running = true;
        } else {
            //console.log("Pending start ticker running task");
            this.pendingStart = true;
        }
    },

    onDestroy: function() {
        if (this.task) {
            Ext.TaskMgr.stop(this.task);
            this.running = false;
        }
    },

    scroll: {
        horz: function() {
            if (!this.contentEl)
                return;
            var checkNewMsg = false;
            var contentEl = this.contentEl;
            var left = contentEl.getLeft(true);
            var width = contentEl.getWidth();
            if (this.direction == 'left') {
                if (left <= -width) {
                    checkNewMsg = true; 
                    left = this.width;
                } else {
                    left -= this.speed;
                }
            } else {
                if (left >= this.width) {
                    left = -width;
                } else {
                    left += this.speed;
                }
            }
            contentEl.setLeft(left);

            if (checkNewMsg) {
                // This is the wrap over. If set for reload, then stop the ticking task
                if (this.newMessages) {
                    //console.log('horz - set messages');
                    this.setMessages(this.newMessages);
                    this.newMessages = null;
                }
                // If set for reload, then stop the ticking task
                // Call the store async load event and indirectly start this ticker task
                if (this.store && this.reloadStore) {
                    //console.log('horz - store load');
                    this.store.load();
                }
            }
        },

        vert: function() {
            var contentEl = this.contentEl;
            var top = contentEl.getTop(true);
            var height = contentEl.getHeight();
            if (this.direction == 'up') {
                if (top <= -height) {
                    top = this.el.getHeight(true);
                } else {
                    top -= this.speed;
                }
            } else {
                if (top >= height) {
                    top = -height;
                } else {
                    top += this.speed;
                }
            }
            contentEl.setTop(top);
        }
    }
});

Ext.reg('ticker', Ext.ux.Ticker);
