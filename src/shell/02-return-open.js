    return {
      name: '@u2a5f/dsh-selection-annotations',
      // 客户端上下文只把**已声明的**服务/命名空间挂到 ctx 上：
      // `remote` 是远程门面，`remote.workspaceFiles` 是其中一个命名空间。少声明一个，
      // 取值就会直接抛（实测 `remote.workspaceFiles` 抛，导致读原文整条失败）——
      // 官方同类插件（dsh-client-ui-sidebar-documentpreview、dsh-api-workspace-files）都这么写。
      inject: ['slots', 'sessions', 'conversation', 'remote', 'remote.workspaceFiles', 'locale'],
      apply(ctx) {
