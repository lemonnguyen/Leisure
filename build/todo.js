// Generated by CoffeeScript 1.9.3
(function() {
  define(['./org', './docOrg', './editor', './editorSupport', 'lib/lodash.min', 'jquery'], function(Org, DocOrg, Editor, EditorSupport, _, $) {
    var Todo, computeNewStructure, parseOrgMode, stdTodo, todoForEditor;
    parseOrgMode = Org.parseOrgMode;
    computeNewStructure = Editor.computeNewStructure;
    Todo = (function() {
      function Todo(data, inputStates) {
        var i, len, prev, ref, state, todoPat;
        this.data = data;
        inputStates = inputStates || stdTodo;
        this.states = {};
        todoPat = '';
        prev = null;
        ref = inputStates.todo.concat(inputStates.done);
        for (i = 0, len = ref.length; i < len; i++) {
          state = ref[i];
          state.name = state.name.toUpperCase();
          this.states[state.name] = state;
          if (prev) {
            state.prev = prev;
            prev.next = state;
          }
          prev = state;
          todoPat += "\\b" + state.name + "\\b|";
        }
        this.startState = inputStates.todo[0] || inputStates.done[0];
        if (prev) {
          this.endState = prev;
        }
        this.statePat = new RegExp("^(\\*+)( +(" + todoPat + ") *)", 'i');
      }

      Todo.prototype.shiftRight = function(docPos, block) {
        block = this.data.getBlock(block || this.data.blockForOffset(docPos));
        if (block.type === 'headline') {
          this.cycleTodo(block, true);
          return true;
        }
      };

      Todo.prototype.shiftLeft = function(docPos, block) {
        block = this.data.getBlock(block || this.data.blockForOffset(docPos));
        if (block.type === 'headline') {
          this.cycleTodo(block, false);
          return true;
        }
      };

      Todo.prototype.cycleTodo = function(block, forward) {
        var m, newText, next, ref, ref1, ref2, ref3, start, state;
        if (m = block.text.match(this.statePat)) {
          state = m[2].trim();
          next = state ? forward ? ((ref = this.states[state.toUpperCase()]) != null ? (ref1 = ref.next) != null ? ref1.name : void 0 : void 0) || '' : ((ref2 = this.states[state.toUpperCase()]) != null ? (ref3 = ref2.prev) != null ? ref3.name : void 0 : void 0) || '' : forward ? this.startState.name : this.endState.name;
          newText = m[1] + ' ' + next + (next ? ' ' : '') + block.text.substring(m[0].length);
          start = this.data.offsetForBlock(block);
          return this.data.replaceText(start, start + block.text.length, newText);
        }
      };

      Todo.prototype.bind = function(opts) {
        opts.bindings['S-RIGHT'] = (function(_this) {
          return function(editor, e, r) {
            if (_this.shiftRight(opts.editor.docOffset(r))) {
              e.originalEvent.stopPropagation();
              return e.originalEvent.preventDefault();
            }
          };
        })(this);
        return opts.bindings['S-LEFT'] = (function(_this) {
          return function(editor, e, r) {
            if (_this.shiftLeft(opts.editor.docOffset(r))) {
              e.originalEvent.stopPropagation();
              return e.originalEvent.preventDefault();
            }
          };
        })(this);
      };

      return Todo;

    })();
    todoForEditor = function(ed, todoDefs) {
      return new Todo(ed.options.data, todoDefs).bind(ed.options);
    };
    stdTodo = {
      todo: [
        {
          name: 'TODO'
        }
      ],
      done: [
        {
          name: 'DONE'
        }
      ]
    };
    return {
      Todo: Todo,
      todoForEditor: todoForEditor
    };
  });

}).call(this);

//# sourceMappingURL=todo.js.map
