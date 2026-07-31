export default new Proxy({}, {
  get(target, prop) {
    if (typeof prop === 'string') {
      return async (...args: any[]) => {
        // Here we don't know the file name in the generic proxy,
        // but for MVP we can just pass the function name and assume global uniqueness,
        // or we can pass a dummy file name if not strictly required for MVP single file.
        // Let's pass the function name.
        const response = await $fetch('/__script_server_rpc', {
          method: 'POST',
          body: {
            functionName: prop,
            args
          }
        })
        return response
      }
    }
    return Reflect.get(target, prop)
  }
})
