Common client/server code

    define [], ->
      badMasterIdError: (id)->
        code: 1
        type: 'error'
        error: "Bad master Id: #{id}"
      badMsgTypeError: (msg)->
        code: 2
        type: 'error'
        error: "Bad message type: #{msg.type}"
