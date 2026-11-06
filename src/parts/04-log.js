    /**
     * 客户端半边只提供 `console.log` 与 `console.error` —— **没有 `console.warn`**。
     * 而且日志本身不该有能力搞坏主流程（一次 console.warn 抛错就会把整条精修链路打断），
     * 所以统一包一层，绝不外抛。
     */
    const log = (message, ...rest) => {
      try {
        console.log(message, ...rest)
      } catch {
        /* 日志失败无所调*/
      }
    }
    const warn = (message, ...rest) => {
      try {
        console.error(message, ...rest)
      } catch {
        /* 日志失败无所调*/
      }
    }
