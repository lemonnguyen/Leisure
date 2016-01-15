// Generated by CoffeeScript 1.10.0
(function() {
  var slice = [].slice;

  define(['handlebars', './export', './editor', './coffee-script'], function(Handlebars, Exports, Editor, CoffeeScript) {
    var activateScripts, activating, addController, addView, compile, configurePanels, controllers, create, defaults, escapeAttr, escapeHtml, getController, getControllers, getPanel, getPendingViews, getTemplate, getTemplates, getView, hasView, imageRefreshCounter, initializePendingViews, mergeContext, mergeExports, nextImageSrc, pendingViews, prevImageSrc, pushPendingInitialzation, refreshImage, registerHelper, removeController, removeView, renderView, root, runTemplate, setPanelExpanded, showMessage, simpleRenderView, templates, viewIdCounter, viewKey, withContext;
    compile = Handlebars.compile, create = Handlebars.create, registerHelper = Handlebars.registerHelper;
    mergeExports = Exports.mergeExports;
    escapeHtml = Editor.escapeHtml;
    templates = {};
    controllers = {};
    defaults = {
      controllers: {},
      templates: {}
    };
    root = null;
    activating = false;
    viewIdCounter = 0;
    pendingViews = [];
    imageRefreshCounter = 0;
    getTemplates = function(isDefault) {
      if (isDefault) {
        return defaults.templates;
      } else {
        return templates;
      }
    };
    getTemplate = function(type) {
      var ref;
      return (ref = templates[type]) != null ? ref : defaults.templates[type];
    };
    getControllers = function(isDefault) {
      if (isDefault) {
        return defaults.controllers;
      } else {
        return controllers;
      }
    };
    getController = function(type) {
      var ref;
      return (ref = controllers[type]) != null ? ref : defaults.controllers[type];
    };
    nextImageSrc = function(src) {
      var hashLoc, ref, ref1, slide;
      if ((ref = (slide = (ref1 = root.context.currentView) != null ? ref1.closest('.slideholder') : void 0)) != null ? ref.length : void 0) {
        slide.attr('imgCount', imageRefreshCounter);
      }
      if ((hashLoc = src.indexOf('#')) === -1) {
        hashLoc = src.length;
      }
      return (src.substring(0, hashLoc)) + "#" + imageRefreshCounter;
    };
    prevImageSrc = function(src) {
      var count, hashLoc, ref, ref1, slide;
      count = ((ref = (slide = (ref1 = root.context.currentView) != null ? ref1.closest('.slideholder') : void 0)) != null ? ref.length : void 0) ? Number(slide.attr('imgCount')) : imageRefreshCounter - 1;
      if ((hashLoc = src.indexOf('#')) === -1) {
        hashLoc = src.length;
      }
      return (src.substring(0, hashLoc)) + "#" + count;
    };
    refreshImage = function(img) {
      var att, i, len, newImg, ref;
      if (img.src.indexOf("file:") === 0) {
        newImg = document.createElement('img');
        ref = img.attributes;
        for (i = 0, len = ref.length; i < len; i++) {
          att = ref[i];
          newImg.setAttribute(att.name, att.value);
        }
        newImg.onload = function() {
          return $(img).replaceWith(newImg);
        };
        return newImg.src = nextImageSrc(img.src);
      }
    };
    viewKey = function(type, context) {
      if (context) {
        return (type.trim()) + "/" + (context.trim());
      } else {
        return type != null ? type.trim() : void 0;
      }
    };
    addView = function(type, context, template, isDefault) {
      var name;
      getTemplates(isDefault)[name = viewKey(type, context)] = compile(template);
      return Handlebars.registerPartial(name, "{{#viewWrapper '" + name + "' this}}" + template + "{{/viewWrapper}}");
    };
    removeView = function(type, context, template, isDefault) {
      var name;
      delete getTemplates(isDefault)[name = viewKey(type, context)];
      return Handlebars.unregisterPartial(name);
    };
    getView = hasView = function(type, context) {
      return getTemplate(viewKey(type, context)) || getTemplate(type);
    };
    withContext = function(context, func) {
      var oldContext, value;
      oldContext = root.context;
      root.context = context;
      try {
        value = func();
      } finally {
        root.context = oldContext;
      }
      return value;
    };
    mergeContext = function(subcontext, func) {
      return withContext(_.merge({}, root.context, subcontext), func);
    };
    Handlebars.registerHelper('view', function(item, contextName, options) {
      var block, data;
      if (!options) {
        options = contextName;
        contextName = null;
      }
      data = typeof item === 'string' ? (block = context.editor.options.getBlock(data), block != null ? block.yaml : void 0) : (item != null ? item.yaml : void 0) && item._id ? (block = item, item.yaml) : (block = null, item);
      if (data != null ? data.type : void 0) {
        return renderView(data.type, contextName, data, null, false, block);
      }
    });
    Handlebars.registerHelper('viewWrapper', function(name, data, opts) {
      return simpleRenderView("data-view='" + name + "' data-requested-view='" + name + "' class='view'", name, opts.fn, this);
    });
    renderView = function(type, contextName, data, targets, block, blockName) {
      var attr, attrs, classAttr, i, isTop, key, len, node, ref, ref1, ref2, requestedKey, results, settings, template, value;
      isTop = !((ref = root.context) != null ? ref.topView : void 0);
      requestedKey = key = viewKey(type, contextName);
      if (!(template = getTemplate(key))) {
        key = type;
        contextName = null;
        if (!(template = getTemplate(key))) {
          return;
        }
      }
      settings = {
        type: type,
        contextName: contextName
      };
      if (isTop) {
        settings.subviews = {};
        if (block) {
          settings.subviews[block._id] = true;
        }
      }
      attrs = "data-view='" + key + "' data-requested-view='" + requestedKey + "'";
      classAttr = 'view';
      ref2 = (ref1 = root.context.viewAttrs) != null ? ref1 : {};
      for (attr in ref2) {
        value = ref2[attr];
        if (attr === 'class') {
          classAttr += " " + value;
        } else {
          attrs += " " + attr + "='" + value + "'";
        }
      }
      attrs += " class='" + classAttr + "'";
      if (block && blockName) {
        attrs += " data-view-block-name='" + blockName + "'";
      } else if (block) {
        attrs += " data-view-block='" + block._id + "'";
      }
      if (targets) {
        if (!isTop && block) {
          root.context.subviews[block._id] = true;
        }
        results = [];
        for (i = 0, len = targets.length; i < len; i++) {
          node = targets[i];
          settings.view = node;
          results.push(mergeContext(settings, function() {
            var html, n;
            root.context.data = data;
            if (block) {
              root.context.block = block;
            }
            if (isTop) {
              root.context.topView = node;
            }
            html = runTemplate(template, data, {
              data: root.context
            });
            if (isTop) {
              attrs += " data-ids='" + (_.keys(settings.subviews).join(' ')) + "'";
            }
            n = $("<span " + attrs + ">" + html + "</span>");
            $(node).replaceWith(n);
            return activateScripts(n, root.context);
          }));
        }
        return results;
      } else {
        return mergeContext(settings, function() {
          return simpleRenderView(attrs, key, template, data, block);
        });
      }
    };
    runTemplate = function() {
      var args, err, error, ref, template;
      template = arguments[0], args = 2 <= arguments.length ? slice.call(arguments, 1) : [];
      try {
        return template.apply(null, args);
      } catch (error) {
        err = error;
        console.log((ref = err.stack) != null ? ref : err.msg);
        return " <span class='error'>[Error in template]</span> ";
      }
    };
    simpleRenderView = function(attrs, key, template, data, block) {
      var id;
      id = "view-" + (viewIdCounter++);
      (function(context) {
        return pendingViews.push(function() {
          return activateScripts($("#" + id), context);
        });
      })(root.context);
      attrs += " id='" + id + "'";
      if (block) {
        root.context.subviews[block._id] = true;
      }
      root.context.simpleViewId = id;
      return "<span " + attrs + ">" + (runTemplate(template, data, {
        data: root.context
      })) + "</span>";
    };
    initializePendingViews = function() {
      var func, i, len, p, results;
      imageRefreshCounter++;
      p = pendingViews;
      pendingViews = [];
      results = [];
      for (i = 0, len = p.length; i < len; i++) {
        func = p[i];
        results.push(func());
      }
      return results;
    };
    activateScripts = function(el, context) {
      if (!activating) {
        return withContext(_.merge({}, context), function() {
          var i, img, j, k, len, len1, len2, newScript, ref, ref1, ref2, ref3, results, script;
          root.context.currentView = el;
          activating = true;
          try {
            ref = $(el).find('script');
            for (i = 0, len = ref.length; i < len; i++) {
              script = ref[i];
              if (!script.type || script.type === 'text/javascript') {
                newScript = document.createElement('script');
                newScript.type = 'text/javascript';
                newScript.textContent = script.textContent;
                newScript.src = script.src;
                root.currentScript = newScript;
                script.parentNode.insertBefore(newScript, script);
                script.remove();
              }
            }
            ref1 = $(el).find('script[type="text/coffeescript"]').add($(el).find('script[type="text/literate-coffeescript"]'));
            for (j = 0, len1 = ref1.length; j < len1; j++) {
              script = ref1[j];
              root.currentScript = script;
              CoffeeScript.run(script.innerHTML);
            }
            if ((ref2 = getController($(el).attr('data-view'))) != null) {
              if (typeof ref2.initializeView === "function") {
                ref2.initializeView(el, context.data);
              }
            }
            ref3 = el.find('img');
            results = [];
            for (k = 0, len2 = ref3.length; k < len2; k++) {
              img = ref3[k];
              results.push(refreshImage(img));
            }
            return results;
          } finally {
            root.currentScript = null;
            activating = false;
          }
        });
      }
    };
    addController = function(type, name, func, isDefault) {
      return getControllers(isDefault)[viewKey(type, name)] = func;
    };
    removeController = function(type, name, isDefault) {
      return delete getControllers(isDefault)[viewKey(type, name)];
    };
    getPendingViews = function() {
      return pendingViews;
    };
    pushPendingInitialzation = function(pending) {
      return pendingViews.push(pending);
    };
    getPanel = function(view) {
      return $(view).closest('.expandable-panel');
    };
    configurePanels = function(view) {
      var ep;
      $(view).find('.hidden-panel').children().filter('.label').append(" <i class='fa fa-arrow-right'></i>").button();
      $(view).find('.expandable-panel').children().filter('.label').append(" <i class='fa fa-arrow-left'></i><i class='fa fa-arrow-right'></i>").button().on('click', function() {
        getPanel(this).addClass('expand');
        return getPanel(this).find("[name='hiddenFocus']")[0].focus();
      });
      ep = $(view).find('.expandable-panel');
      $("<input name='hiddenFocus' class='hiddenTextField'>").appendTo(ep);
      ep.mouseenter(function() {
        return getPanel(this).removeClass('contract');
      });
      ep.click((function(e) {
        if (!$(e.target).closest('input,button').length) {
          return getPanel(this).find("[name='hiddenFocus']")[0].focus();
        }
      }));
      ep.find('input').focus(function() {
        return getPanel(this).addClass('expand');
      });
      ep.find('input').blur(function() {
        return getPanel(this).removeClass('expand');
      });
      return ep.find('button').click(function() {
        return getPanel(this).addClass('contract');
      });
    };
    setPanelExpanded = function(view, expand) {
      var panel;
      panel = getPanel(view);
      panel.removeClass((expand ? 'contract' : 'expand'));
      return panel.addClass((expand ? 'expand' : 'contract'));
    };
    showMessage = function(node, title, str, opts, func) {
      var dialog;
      dialog = $("<div title=" + (escapeAttr(title)) + "><div>" + str + "</div></div>").appendTo(node).dialog(_.merge({
        close: function() {
          return dialog.remove();
        }
      }, opts != null ? opts : {}));
      return typeof func === "function" ? func(dialog) : void 0;
    };
    escapeAttr = function(text) {
      return escapeHtml(text).replace(/['"&]/g, function(c) {
        switch (c) {
          case '"':
            return '&quot;';
          case "'":
            return '&#39;';
          case '&':
            return '&amp;';
        }
      });
    };
    return root = mergeExports({
      UI: {
        withContext: withContext,
        mergeContext: mergeContext,
        renderView: renderView,
        addView: addView,
        removeView: removeView,
        hasView: hasView,
        getView: getView,
        addController: addController,
        removeController: removeController,
        initializePendingViews: initializePendingViews,
        getPendingViews: getPendingViews,
        viewKey: viewKey,
        configurePanels: configurePanels,
        context: null,
        showMessage: showMessage,
        escapeAttr: escapeAttr,
        refreshImage: refreshImage,
        nextImageSrc: nextImageSrc,
        prevImageSrc: prevImageSrc,
        pushPendingInitialzation: pushPendingInitialzation,
        setPanelExpanded: setPanelExpanded,
        activateScripts: activateScripts,
        activatePendingScript: activatePendingScript,
        pendingScripts: []
      },
      Handlebars: Handlebars
    }).UI;
  });

}).call(this);

//# sourceMappingURL=ui.js.map
