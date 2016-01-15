// Generated by CoffeeScript 1.10.0
(function() {
  define(['./org', 'lib/js-yaml', 'lib/lazy'], function(Org, Yaml, Lazy) {
    var Drawer, HTML, Headline, Keyword, Meat, Results, Source, UnknownDeclaration, _L, blockSource, checkMerged, checkProps, checkSingleNode, createChildrenDocs, createCodeBlockDoc, createDocFromOrg, createHtmlBlockDoc, createOrgDoc, crnl, docRoot, dump, getCodeItems, getSourceNodeType, isCodeBlock, isMergeable, isSourceEnd, isYaml, lineCodeBlockType, linkDocs, orgDoc, parseOrgMode, replaceOrgDoc, safeLoad;
    Headline = Org.Headline, Source = Org.Source, HTML = Org.HTML, Keyword = Org.Keyword, Drawer = Org.Drawer, Meat = Org.Meat, UnknownDeclaration = Org.UnknownDeclaration, Results = Org.Results, parseOrgMode = Org.parseOrgMode;
    safeLoad = Yaml.safeLoad, dump = Yaml.dump;
    _L = Lazy._;
    getCodeItems = function(org) {
      var result, type;
      if (!getSourceNodeType(org)) {
        return {};
      } else {
        result = {};
        while (!isSourceEnd(org)) {
          if (type = getSourceNodeType(org)) {
            if (type === 'html') {
              if (result.first) {
                return result;
              } else {
                return {
                  source: org,
                  first: org,
                  last: org
                };
              }
            }
            if (!result.first) {
              result.first = org;
            } else if (type === 'name') {
              return result;
            }
            if (result[type] != null) {
              return result;
            }
            result.last = result[type] = org;
            if (type === 'results') {
              break;
            }
          } else if (org instanceof Drawer || org instanceof Keyword || org instanceof UnknownDeclaration) {
            break;
          }
          org = org.next;
        }
        if (result.source) {
          return result;
        } else {
          return {};
        }
      }
    };
    isCodeBlock = function(org) {
      var first;
      if (org instanceof Keyword && org.name.match(/^name$/i)) {
        first = getCodeItems(org).first;
        return first;
      } else {
        return org instanceof Source;
      }
    };
    getSourceNodeType = function(org) {
      if (org instanceof Source) {
        return 'source';
      } else if (org instanceof HTML) {
        return 'html';
      } else if (org instanceof Results) {
        return 'results';
      } else if (org instanceof Drawer && org.name.toLowerCase() === 'expected') {
        return 'expected';
      } else if (org instanceof Keyword && org.name.match(/^name$/i)) {
        return 'name';
      } else if (org instanceof Keyword && org.name.match(/^error$/i)) {
        return 'error';
      } else {
        return false;
      }
    };
    isSourceEnd = function(org) {
      return !org || org instanceof Headline;
    };
    createDocFromOrg = function(org, collection, reloading, filter) {
      var block, doc;
      doc = orgDoc(org);
      if (filter != null) {
        doc = (function() {
          var i, len, results1;
          results1 = [];
          for (i = 0, len = doc.length; i < len; i++) {
            block = doc[i];
            results1.push(filter(block));
          }
          return results1;
        })();
      }
      replaceOrgDoc(doc, collection, reloading);
      return collection;
    };
    docRoot = function(collection) {
      var ref, ref1;
      return (ref = ((ref1 = collection.leisure) != null ? ref1 : collection.leisure = {}).info) != null ? ref : (collection.leisure.info = collection.findOne({
        info: true
      }));
    };
    replaceOrgDoc = function(docArray, collection, reloading) {
      var doc, i, info, len, results1;
      if (reloading) {
        collection.remove({
          info: {
            '$exists': false
          }
        });
      } else {
        collection.remove();
      }
      linkDocs(docArray);
      if (reloading) {
        info = collection.leisure.info;
        info.head = docArray.length > 0 ? docArray[0]._id : null;
        collection.update(info._id, info);
      } else {
        info = collection.leisure.info = {
          info: true,
          head: docArray.length > 0 ? docArray[0]._id : null,
          _id: new Meteor.Collection.ObjectID().toJSONValue()
        };
        collection.insert(info);
      }
      results1 = [];
      for (i = 0, len = docArray.length; i < len; i++) {
        doc = docArray[i];
        results1.push(collection.insert(doc));
      }
      return results1;
    };
    linkDocs = function(docs) {
      var doc, i, len, prev, results1;
      prev = null;
      results1 = [];
      for (i = 0, len = docs.length; i < len; i++) {
        doc = docs[i];
        doc._id = new Meteor.Collection.ObjectID().toJSONValue();
        if (prev) {
          prev.next = doc._id;
          doc.prev = prev._id;
        }
        results1.push(prev = doc);
      }
      return results1;
    };
    orgDoc = function(org) {
      return createOrgDoc(org, false)[0].toArray();
    };
    lineCodeBlockType = function(line) {
      var type;
      type = line && root.matchLine(line);
      if (type === 'srcStart' || type === 'srcEnd' || type === 'htmlStart' || type === 'htmlEnd') {
        return 'code';
      } else if (line.match(/^#+name:/i)) {
        return 'code';
      } else if (type === 'headline-1') {
        return 'headline';
      } else {
        return 'chunk';
      }
    };
    createOrgDoc = function(org, local) {
      var children, next, ref, ref1, result;
      next = org.next;
      if (org instanceof Headline) {
        local = local || (org.level === 1 && org.properties.local);
        children = createChildrenDocs(org, local);
        result = org.level === 0 ? (org.children.length && children) || _L([
          {
            text: '\n',
            type: 'chunk',
            offset: org.offset
          }
        ]) : _L([
          {
            text: org.text,
            type: 'headline',
            level: org.level,
            offset: org.offset,
            properties: org.properties
          }
        ]).concat(children);
      } else if (org instanceof HTML) {
        ref = createHtmlBlockDoc(org), result = ref[0], next = ref[1];
      } else if (isCodeBlock(org)) {
        ref1 = createCodeBlockDoc(org), result = ref1[0], next = ref1[1];
      } else {
        result = _L(checkProps(org, [
          {
            text: org.allText(),
            type: 'chunk',
            offset: org.offset
          }
        ]));
      }
      if (local) {
        result.each(function(item) {
          return item.local = true;
        });
      }
      return [result, next];
    };
    checkProps = function(org, block) {
      if (typeof org.isProperties === "function" ? org.isProperties() : void 0) {
        return block.properties = org.properties();
      }
    };
    createChildrenDocs = function(org, local) {
      var child, childDoc, children, mergedText, offset, properties, ref, ref1, ref2;
      children = _L();
      child = org.children[0];
      if (child) {
        mergedText = '';
        properties = _L();
        offset = org.children[0].offset;
        while (child) {
          if (isMergeable(child)) {
            mergedText += child.allText();
            if (typeof child.properties === "function" ? child.properties() : void 0) {
              properties = properties.merge(typeof child.properties === "function" ? child.properties() : void 0);
            }
            child = child.next;
          } else {
            ref = checkMerged(mergedText, properties, children, offset), mergedText = ref[0], properties = ref[1], children = ref[2];
            ref1 = createOrgDoc(child, local), childDoc = ref1[0], child = ref1[1];
            children = children.concat([childDoc]);
            offset = child != null ? child.offset : void 0;
          }
        }
        ref2 = checkMerged(mergedText, properties, children, offset), mergedText = ref2[0], properties = ref2[1], children = ref2[2];
      }
      return children;
    };
    isMergeable = function(org) {
      return !(org instanceof Headline || org instanceof HTML || isCodeBlock(org));
    };
    checkMerged = function(mergedText, properties, children, offset) {
      var child;
      if (mergedText !== '') {
        child = {
          text: mergedText,
          type: 'chunk',
          offset: offset
        };
        if (!properties.isEmpty()) {
          child.properties = properties.toObject();
        }
        children = children.concat([child]);
      }
      return ['', _L(), children];
    };
    createCodeBlockDoc = function(org) {
      var attr, err, error, expected, first, firstOffset, l, last, name, nm, obj, ref, ref1, ref2, results, source, text, val;
      text = '';
      ref = getCodeItems(org), first = ref.first, name = ref.name, source = ref.source, last = ref.last, expected = ref.expected, results = ref.results;
      if (!first) {
        return [
          _L([
            {
              text: org.allText(),
              type: 'chunk',
              offset: org.offset
            }
          ]), org.next
        ];
      } else {
        firstOffset = first.offset;
        while (first !== last.next) {
          text += first.allText();
          first = first.next;
        }
        obj = {
          text: text,
          type: 'code',
          offset: firstOffset
        };
        if (source.attributes()) {
          attr = {};
          ref1 = source.attributes();
          for (nm in ref1) {
            val = ref1[nm];
            attr[nm.toLowerCase()] = val;
          }
        } else {
          attr = null;
        }
        obj.codeAttributes = attr;
        obj.codePrelen = source.contentPos + source.offset - firstOffset;
        obj.codePostlen = text.length - obj.codePrelen - source.content.length;
        if (expected) {
          obj.codeContent = source.content;
          obj.codeTestActual = results.content();
          obj.codeTextExpected = expected.content();
          obj.codeTestResult = !results ? 'unknown' : expected.content() === results.content() ? 'pass' : 'fail';
        }
        if (name) {
          obj.codeName = name.info.trim();
        }
        if (((ref2 = obj.codeAttributes) != null ? ref2.local : void 0) != null) {
          obj.local = true;
        }
        if (l = source.lead()) {
          obj.language = l.trim();
        }
        if (isYaml(source)) {
          try {
            obj.yaml = safeLoad(source.content);
          } catch (error) {
            err = error;
            obj.yaml = null;
          }
        }
        return [_L([obj]), last.next];
      }
    };
    createHtmlBlockDoc = function(org) {
      var a, obj, text;
      text = org.allText();
      obj = {
        text: text,
        type: 'code',
        offset: org.offset
      };
      obj.codePrelen = org.contentPos;
      obj.codePostlen = text.length - obj.codePrelen - org.contentLength;
      obj.language = 'html';
      if (a = org.attributes()) {
        obj.codeAttributes = a;
      }
      return [_L([obj]), org.next];
    };
    isYaml = function(org) {
      return org instanceof Source && org.info.match(/^ *yaml\b/i);
    };
    checkSingleNode = function(text) {
      var docJson, docs, org;
      docs = {};
      org = parseOrgMode(text);
      docJson = (org.children.length > 1 ? orgDoc(org) : orgDoc(org.children[0]))[0];
      return docJson;
    };
    crnl = function(data) {
      if (typeof data === 'string') {
        return data.replace(/\r\n/g, '\n');
      } else if (data.text) {
        data.text = crnl(data.text);
        return data;
      } else {
        return data;
      }
    };
    blockSource = function(block) {
      return block && block.text.substring(block.codePrelen, block.text.length - block.codePostlen);
    };
    return {
      getCodeItems: getCodeItems,
      isCodeBlock: isCodeBlock,
      createDocFromOrg: createDocFromOrg,
      checkSingleNode: checkSingleNode,
      orgDoc: orgDoc,
      docRoot: docRoot,
      linkDocs: linkDocs,
      isYaml: isYaml,
      crnl: crnl,
      lineCodeBlockType: lineCodeBlockType,
      blockSource: blockSource
    };
  });

}).call(this);

//# sourceMappingURL=docOrg.js.map
